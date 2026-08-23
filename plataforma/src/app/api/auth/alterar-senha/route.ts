import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashSenha, verificarSenha } from "@/lib/senha";
import { erroDeSenha } from "@/lib/senha-regras";
import { autenticar, criarSessao, revogarSessoesDoUsuario } from "@/lib/sessao-servidor";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";

/**
 * Troca de senha do usuário logado (Minha conta → Alterar senha).
 *
 * Quem é o usuário vem da sessão, não do corpo da requisição: antes o e-mail
 * era enviado pelo cliente, o que permitiria pedir a troca de senha de outra
 * pessoa bastando saber a senha atual dela. A senha atual continua sendo
 * exigida — é o que impede que uma sessão esquecida aberta num computador
 * compartilhado seja usada para tomar a conta.
 */
export async function POST(request: Request) {
  const ip = ipDaRequisicao(request);

  try {
    const auth = await autenticar();
    if (!auth.ok) return auth.resposta;

    const { senhaAtual, novaSenha, confirmacao } = await request.json();

    if (!senhaAtual || !novaSenha) {
      return NextResponse.json(
        { error: "Informe a senha atual e a nova senha." },
        { status: 400 }
      );
    }

    if (confirmacao !== undefined && String(novaSenha) !== String(confirmacao)) {
      return NextResponse.json(
        { error: "A confirmação não confere com a nova senha." },
        { status: 400 }
      );
    }

    const problema = erroDeSenha(String(novaSenha));
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id, email, senha_hash")
      .eq("id", auth.usuario.id)
      .maybeSingle();

    if (!usuario) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

    // Mesma ponte do login: conta que nunca definiu senha confirma com o e-mail.
    const atualConfere = usuario.senha_hash
      ? verificarSenha(String(senhaAtual), usuario.senha_hash)
      : String(senhaAtual).trim().toLowerCase() === usuario.email.trim().toLowerCase();

    if (!atualConfere) {
      await registrarLog({
        usuarioId: usuario.id,
        acao: ACAO.senhaAlterada,
        entidadeId: usuario.id,
        detalhe: "Senha atual incorreta.",
        resultado: "negado",
        ip,
      });
      return NextResponse.json({ error: "Senha atual incorreta." }, { status: 401 });
    }

    if (String(senhaAtual) === String(novaSenha)) {
      return NextResponse.json(
        { error: "A nova senha precisa ser diferente da atual." },
        { status: 400 }
      );
    }

    const agora = new Date().toISOString();
    const { error: erroUpdate } = await supabase
      .from("usuarios")
      .update({
        senha_hash: hashSenha(String(novaSenha)),
        senha_definida_em: agora,
        precisa_trocar_senha: false,
      })
      .eq("id", usuario.id);

    if (erroUpdate) {
      console.error("Erro ao atualizar senha:", erroUpdate.message);
      return NextResponse.json({ error: "Não foi possível salvar a nova senha." }, { status: 500 });
    }

    // Links de recuperação pendentes perdem a validade junto com a senha antiga.
    await supabase
      .from("usuario_tokens")
      .update({ usado_em: agora })
      .eq("usuario_id", usuario.id)
      .is("usado_em", null);

    // Derruba as outras sessões e reabre esta: quem trocou a senha continua
    // navegando, os demais dispositivos precisam entrar de novo.
    await revogarSessoesDoUsuario(usuario.id);
    await criarSessao(usuario.id, request);

    await registrarLog({
      usuarioId: usuario.id,
      acao: ACAO.senhaAlterada,
      entidadeId: usuario.id,
      detalhe: "Alterada pelo próprio usuário.",
      ip,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao trocar senha:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
