import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { hashSenha } from "@/lib/senha";
import { erroDeSenha } from "@/lib/senha-regras";
import { hashToken } from "@/lib/tokens";
import { revogarSessoesDoUsuario } from "@/lib/sessao-servidor";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import { lerCorpoJson } from "@/lib/http";

/**
 * Define a nova senha a partir de um token de convite ou recuperação.
 *
 * O token é de uso único e some assim que serve: é marcado como usado, os
 * demais tokens da conta são invalidados junto e todas as sessões abertas são
 * derrubadas. Quem tiver interceptado o link não consegue reaproveitá-lo, e
 * uma sessão que já estivesse aberta com a senha antiga não sobrevive à troca.
 */

/** Busca o token válido e o usuário dono, ou devolve o motivo da recusa. */
async function resolverToken(token: string) {
  const supabase = getSupabaseAdmin();

  const { data: registro } = await supabase
    .from("usuario_tokens")
    .select("id, usuario_id, tipo, expira_em, usado_em")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (!registro) return { erro: "Link inválido. Solicite um novo." as string };
  if (registro.usado_em) return { erro: "Este link já foi utilizado. Solicite um novo." };
  if (new Date(registro.expira_em) < new Date()) {
    return { erro: "Este link expirou. Solicite um novo." };
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, ativo")
    .eq("id", registro.usuario_id)
    .maybeSingle();

  if (!usuario || !usuario.ativo) return { erro: "Link inválido. Solicite um novo." };

  return { registro, usuario };
}

/** Confere a validade do link antes de mostrar o formulário. */
export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token) return NextResponse.json({ valido: false, error: "Link inválido." }, { status: 400 });

    const resultado = await resolverToken(token);
    if ("erro" in resultado) {
      return NextResponse.json({ valido: false, error: resultado.erro }, { status: 400 });
    }

    return NextResponse.json({ valido: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao validar token:", error);
    return NextResponse.json({ valido: false, error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const leitura = await lerCorpoJson<{
      token?: string;
      novaSenha?: string;
      confirmacao?: string;
    }>(request);
    if (!leitura.ok) return leitura.resposta;
    const { token, novaSenha, confirmacao } = leitura.corpo;

    if (!token || !novaSenha) {
      return NextResponse.json({ error: "Informe a nova senha." }, { status: 400 });
    }

    if (confirmacao !== undefined && String(novaSenha) !== String(confirmacao)) {
      return NextResponse.json({ error: "A confirmação não confere com a nova senha." }, { status: 400 });
    }

    const problema = erroDeSenha(String(novaSenha));
    if (problema) return NextResponse.json({ error: problema }, { status: 400 });

    const resultado = await resolverToken(String(token));
    if ("erro" in resultado) {
      return NextResponse.json({ error: resultado.erro }, { status: 400 });
    }

    const { registro, usuario } = resultado;
    const supabase = getSupabaseAdmin();
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
      console.error("Erro ao redefinir senha:", erroUpdate.message);
      return NextResponse.json({ error: "Não foi possível salvar a nova senha." }, { status: 500 });
    }

    // Consome este token e invalida qualquer outro que ainda estivesse de pé.
    await supabase
      .from("usuario_tokens")
      .update({ usado_em: agora })
      .eq("usuario_id", usuario.id)
      .is("usado_em", null);

    await revogarSessoesDoUsuario(usuario.id);

    await registrarLog({
      usuarioId: usuario.id,
      acao: ACAO.senhaRedefinida,
      entidadeId: usuario.id,
      detalhe: `Senha redefinida por link de ${registro.tipo}.`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json(
      { ok: true, mensagem: "Sua senha foi alterada com sucesso. Faça login com sua nova senha." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
