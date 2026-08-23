import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { expiraEmMinutos, gerarToken, MINUTOS_VALIDADE_TOKEN_SENHA } from "@/lib/tokens";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import { lerCorpoJson } from "@/lib/http";

/**
 * "Esqueci minha senha": registra a solicitação e cria o token de uso único.
 *
 * A resposta é sempre a mesma, exista ou não a conta — revelar quais e-mails
 * estão cadastrados entregaria a lista de acessos da imobiliária a quem
 * ficasse testando endereços.
 *
 * Enquanto não houver provedor de e-mail configurado, o link não é enviado
 * automaticamente: a solicitação aparece na trilha de auditoria e o
 * administrador gera o link em Administração → Usuários → Redefinir senha,
 * repassando por um canal que ele confirme (WhatsApp, pessoalmente). O token
 * criado aqui garante que o pedido fique registrado com hora e IP.
 */
export async function POST(request: Request) {
  const respostaGenerica = NextResponse.json(
    {
      mensagem:
        "Se existir uma conta associada a este e-mail, enviaremos instruções para redefinir sua senha.",
    },
    { status: 200 }
  );

  try {
    // Corpo inválido também devolve a resposta genérica: qualquer variação de
    // status aqui viraria um jeito de sondar o cadastro.
    const leitura = await lerCorpoJson<{ email?: string }>(request);
    if (!leitura.ok) return respostaGenerica;

    const { email } = leitura.corpo;
    if (!email) return respostaGenerica;

    const emailNormalizado = String(email).trim();
    const supabase = getSupabaseAdmin();

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("id, ativo")
      .ilike("email", emailNormalizado)
      .maybeSingle();

    // Conta inexistente ou desativada: mesma resposta, sem criar token.
    if (!usuario || !usuario.ativo) return respostaGenerica;

    // Um pedido novo invalida os anteriores — senão cada solicitação deixaria
    // mais um link válido circulando por aí.
    await supabase
      .from("usuario_tokens")
      .update({ usado_em: new Date().toISOString() })
      .eq("usuario_id", usuario.id)
      .eq("tipo", "recuperacao")
      .is("usado_em", null);

    const { hash } = gerarToken();

    await supabase.from("usuario_tokens").insert({
      usuario_id: usuario.id,
      token_hash: hash,
      tipo: "recuperacao",
      expira_em: expiraEmMinutos(MINUTOS_VALIDADE_TOKEN_SENHA),
    });

    await registrarLog({
      usuarioId: usuario.id,
      acao: ACAO.senhaRecuperacaoSolicitada,
      entidadeId: usuario.id,
      detalhe: "Solicitação feita pelo próprio usuário na tela de login.",
      ip: ipDaRequisicao(request),
    });

    return respostaGenerica;
  } catch (error) {
    console.error("Erro na recuperação de senha:", error);
    // Nem o erro pode diferenciar os casos: sempre a mesma resposta.
    return respostaGenerica;
  }
}
