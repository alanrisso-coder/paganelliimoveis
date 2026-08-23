import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exigirPermissao } from "@/lib/sessao-servidor";

/** Trilha de auditoria. Somente leitura — não há rota para editar ou apagar log. */
export async function GET(request: Request) {
  try {
    const auth = await exigirPermissao("ver_logs", request);
    if (!auth.ok) return auth.resposta;

    const parametros = new URL(request.url).searchParams;
    const limite = Math.min(Number(parametros.get("limite")) || 200, 500);

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("logs_auditoria")
      .select(
        "id, usuario_id, acao, entidade, entidade_id, usuario_afetado_id, detalhe, resultado, criado_em"
      )
      .order("criado_em", { ascending: false })
      .limit(limite);

    if (error) {
      console.error("Erro ao listar logs:", error.message);
      return NextResponse.json({ error: "Não foi possível carregar o registro." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar logs:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
