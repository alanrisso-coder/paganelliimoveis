import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { COLUNAS_USUARIO, getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashSenha } from "@/lib/senha";
import { erroDeSenha } from "@/lib/senha-regras";
import { expiraEmMinutos, gerarToken, MINUTOS_VALIDADE_TOKEN_SENHA } from "@/lib/tokens";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { bloqueioPromoverAdministrador, ehPerfilValido } from "@/lib/permissoes";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";

/**
 * Listagem e criação de usuários.
 *
 * Toda a autorização acontece aqui, no servidor: esconder o menu no painel não
 * impede ninguém de chamar a rota direto. `exigirPermissao` resolve a sessão
 * pelo cookie, confere o perfil na matriz de RBAC e registra a tentativa
 * quando nega.
 */

/**
 * Id do novo usuário.
 *
 * O schema usa TEXT em vez de UUID e quem gera o id é a aplicação, não o banco
 * (ver `id()` em src/lib/store.tsx e os ids do seed: "u1", "u2"). Aqui a parte
 * aleatória vem de `randomUUID` em vez de `Math.random` porque isto roda no
 * servidor, onde a colisão afetaria todos os usuários — e não custa nada.
 */
function novoIdUsuario(): string {
  return `u_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** Iniciais para o avatar, no mesmo formato que o resto do painel usa. */
function iniciaisDoNome(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export async function GET(request: Request) {
  try {
    const auth = await exigirPermissao("ver_usuarios", request);
    if (!auth.ok) return auth.resposta;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("usuarios")
      .select(COLUNAS_USUARIO)
      .order("criado_em", { ascending: true });

    if (error) {
      console.error("Erro ao listar usuários:", error.message);
      return NextResponse.json({ error: "Não foi possível carregar os usuários." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro na listagem de usuários:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ip = ipDaRequisicao(request);

  try {
    const auth = await exigirPermissao("gerenciar_usuarios", request);
    if (!auth.ok) return auth.resposta;

    const corpo = await request.json();
    const nome = String(corpo.nome ?? "").trim();
    const email = String(corpo.email ?? "").trim();
    const perfil = corpo.perfil;
    const telefone = String(corpo.telefone ?? "").trim();
    const creci = String(corpo.creci ?? "").trim();
    const senhaTemporaria = corpo.senhaTemporaria ? String(corpo.senhaTemporaria) : null;

    if (!nome) return NextResponse.json({ error: "Informe o nome completo." }, { status: 400 });

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    if (!ehPerfilValido(perfil)) {
      return NextResponse.json({ error: "Perfil de acesso inválido." }, { status: 400 });
    }

    const impedimento = bloqueioPromoverAdministrador(auth.usuario, perfil);
    if (impedimento) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.acessoNegado,
        detalhe: impedimento,
        resultado: "negado",
        ip,
      });
      return NextResponse.json({ error: impedimento }, { status: 403 });
    }

    // Senha temporária é opcional, mas quando existe precisa ser tão forte
    // quanto qualquer outra — ela dá acesso real até a primeira troca.
    if (senhaTemporaria) {
      const problema = erroDeSenha(senhaTemporaria);
      if (problema) return NextResponse.json({ error: problema }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: jaExiste } = await supabase
      .from("usuarios")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (jaExiste) {
      return NextResponse.json({ error: "Já existe um usuário com esse e-mail." }, { status: 409 });
    }

    const { data: criado, error } = await supabase
      .from("usuarios")
      .insert({
        id: novoIdUsuario(),
        nome,
        email,
        telefone: telefone || null,
        perfil,
        creci: creci || null,
        avatar_iniciais: iniciaisDoNome(nome),
        ativo: corpo.ativo === false ? false : true,
        senha_hash: senhaTemporaria ? hashSenha(senhaTemporaria) : null,
        // Senha definida pelo administrador é sempre provisória.
        precisa_trocar_senha: Boolean(senhaTemporaria),
        criado_por: auth.usuario.id,
      })
      .select(COLUNAS_USUARIO)
      .single();

    if (error) {
      console.error("Erro ao criar usuário:", error.message);
      return NextResponse.json({ error: "Não foi possível criar o usuário." }, { status: 500 });
    }

    // Sem senha temporária, o acesso nasce por convite: o administrador copia
    // o link e entrega ao novo usuário, que define a própria senha. Assim a
    // senha nunca transita por quem administra.
    let linkConvite: string | null = null;
    if (!senhaTemporaria) {
      const { token, hash } = gerarToken();
      await supabase.from("usuario_tokens").insert({
        usuario_id: criado.id,
        token_hash: hash,
        tipo: "convite",
        expira_em: expiraEmMinutos(MINUTOS_VALIDADE_TOKEN_SENHA),
        criado_por: auth.usuario.id,
      });
      linkConvite = `${new URL(request.url).origin}/redefinir-senha?token=${token}`;
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.usuarioCriado,
      entidadeId: criado.id,
      usuarioAfetadoId: criado.id,
      detalhe: `Criou ${nome} (${email}) com perfil ${perfil}.`,
      ip,
    });

    return NextResponse.json({ data: criado, linkConvite }, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
