import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import { lerCorpoJson } from "@/lib/http";
import { paraISO } from "@/lib/format";
import { COLUNAS_GASTO } from "@/lib/financeiro";

/**
 * Ação "Marcar como reembolsado".
 *
 * Existe separada do PATCH porque é uma operação de um clique com efeito
 * carimbado pelo servidor: a data é a de hoje e o autor é quem está logado.
 * Se isso viesse do corpo da requisição, a interface poderia mandar qualquer
 * data e qualquer nome — e o registro deixaria de ser prova de nada.
 *
 * Corrigir a data depois é possível pelo formulário de edição, que exige a
 * mesma permissão `marcar_reembolso`.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await exigirPermissao("marcar_reembolso", request);
    if (!auth.ok) return auth.resposta;

    const { id } = await params;

    // O corpo é opcional: só a observação vem de fora.
    let observacao: string | null = null;
    const leitura = await lerCorpoJson<{ observacao?: unknown }>(request);
    if (leitura.ok && leitura.corpo.observacao) {
      observacao = String(leitura.corpo.observacao).trim() || null;
    }

    const supabase = getSupabaseAdmin();

    const { data: atualBruto } = await supabase
      .from("gastos")
      .select("id, descricao, valor, responsavel_id, reembolso_necessario, reembolso_status")
      .eq("id", id)
      .is("excluido_em", null)
      .maybeSingle();

    const atual = atualBruto as unknown as {
      descricao: string;
      valor: string | number;
      responsavel_id: string | null;
      reembolso_necessario: boolean;
      reembolso_status: string;
    } | null;

    if (!atual) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    if (!atual.reembolso_necessario) {
      return NextResponse.json(
        { error: "Este gasto não está marcado como reembolsável. Edite o lançamento primeiro." },
        { status: 400 }
      );
    }

    if (atual.reembolso_status === "reembolsado") {
      return NextResponse.json({ error: "Este gasto já está reembolsado." }, { status: 409 });
    }

    const hoje = paraISO(new Date());

    const { data, error } = await supabase
      .from("gastos")
      .update({
        reembolso_status: "reembolsado",
        reembolso_data: hoje,
        reembolso_por: auth.usuario.id,
        reembolso_em: new Date().toISOString(),
        atualizado_por: auth.usuario.id,
        ...(observacao ? { reembolso_observacao: observacao } : {}),
      })
      .eq("id", id)
      .select(COLUNAS_GASTO)
      .single();

    if (error) {
      console.error("Erro ao marcar reembolso:", error.message);
      return NextResponse.json(
        { error: "Não foi possível registrar o reembolso." },
        { status: 400 }
      );
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.gastoReembolsado,
      entidade: "gasto",
      entidadeId: id,
      usuarioAfetadoId: atual.responsavel_id,
      detalhe: `Reembolsou "${atual.descricao}" (R$ ${Number(atual.valor).toFixed(2)}) em ${hoje}.`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de reembolso:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
