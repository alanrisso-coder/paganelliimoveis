import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { expiraEmMinutos, gerarToken, MINUTOS_VALIDADE_TOKEN_SENHA } from "@/lib/tokens";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { bloqueioEditarAdministrador } from "@/lib/permissoes";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import type { PerfilAcesso } from "@/lib/types";

/**
 * Gera um link de redefinição de senha para outro usuário.
 *
 * O administrador nunca define nem enxerga a senha de ninguém: ele produz um
 * link de uso único e entrega ao dono da conta, que escolhe a própria senha.
 * Enquanto não há provedor de e-mail configurado, a entrega é manual — daí o
 * link voltar na resposta para ser copiado.
 *
 * O link é um segredo equivalente à senha enquanto vale: por isso a validade é
 * curta, o uso é único, e ele não é gravado em lugar nenhum além do hash.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ip = ipDaRequisicao(request);

  try {
    const auth = await exigirPermissao("gerenciar_usuarios", request);
    if (!auth.ok) return auth.resposta;

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: alvo } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, ativo")
      .eq("id", id)
      .maybeSingle();

    if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    if (!alvo.ativo) {
      return NextResponse.json(
        { error: "Conta desativada. Reative o acesso antes de redefinir a senha." },
        { status: 400 }
      );
    }

    const impedimento = bloqueioEditarAdministrador(auth.usuario, {
      id: alvo.id,
      perfil: alvo.perfil as PerfilAcesso,
    });

    if (impedimento) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.acessoNegado,
        entidadeId: alvo.id,
        usuarioAfetadoId: alvo.id,
        detalhe: impedimento,
        resultado: "negado",
        ip,
      });
      return NextResponse.json({ error: impedimento }, { status: 403 });
    }

    // Links anteriores deixam de valer: só o mais recente abre a porta.
    await supabase
      .from("usuario_tokens")
      .update({ usado_em: new Date().toISOString() })
      .eq("usuario_id", alvo.id)
      .is("usado_em", null);

    const { token, hash } = gerarToken();

    const { error } = await supabase.from("usuario_tokens").insert({
      usuario_id: alvo.id,
      token_hash: hash,
      tipo: "recuperacao",
      expira_em: expiraEmMinutos(MINUTOS_VALIDADE_TOKEN_SENHA),
      criado_por: auth.usuario.id,
    });

    if (error) {
      console.error("Erro ao gerar token de senha:", error.message);
      return NextResponse.json({ error: "Não foi possível gerar o link." }, { status: 500 });
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.linkSenhaGerado,
      entidadeId: alvo.id,
      usuarioAfetadoId: alvo.id,
      detalhe: `Link de redefinição gerado para ${alvo.nome} (${alvo.email}).`,
      ip,
    });

    return NextResponse.json(
      {
        link: `${new URL(request.url).origin}/redefinir-senha?token=${token}`,
        validadeMinutos: MINUTOS_VALIDADE_TOKEN_SENHA,
        usuario: { nome: alvo.nome, email: alvo.email },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao gerar link de senha:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
