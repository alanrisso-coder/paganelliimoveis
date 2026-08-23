import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Somente leitura. As linhas de `whatsapp_mensagens` são escritas
 * exclusivamente pelo disparo automático em src/lib/whatsapp-conversao.ts
 * — não expor POST/PATCH/DELETE aqui evita que alguém forje um status
 * "enviado" ou apague o histórico de erro pelo cliente.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get("clienteId");
    const leadId = searchParams.get("leadId");

    if (!clienteId && !leadId) {
      return NextResponse.json({ error: "Informe clienteId ou leadId" }, { status: 400 });
    }

    const supabase = getSupabase();
    let consulta = supabase
      .from("whatsapp_mensagens")
      .select("*")
      .order("criado_em", { ascending: false });

    consulta = clienteId ? consulta.eq("cliente_id", clienteId) : consulta.eq("lead_id", leadId!);

    const { data, error } = await consulta;

    if (error) {
      console.error("Erro ao listar mensagens de WhatsApp:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de whatsapp-mensagens:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
