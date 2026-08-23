import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exigirPermissao } from "@/lib/sessao-servidor";

/**
 * Log das mensagens de WhatsApp disparadas na conversão de lead em cliente.
 *
 * Só leitura, e só para quem acompanha leads: cada linha traz o telefone de
 * uma pessoa real e o resultado do envio.
 */
export async function GET(request: Request) {
  try {
    const auth = await exigirPermissao("ver_leads", request);
    if (!auth.ok) return auth.resposta;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");
    const clienteId = searchParams.get("cliente_id");

    const supabase = getSupabaseAdmin();
    let consulta = supabase
      .from("whatsapp_mensagens")
      .select("*")
      .order("criado_em", { ascending: false });

    if (leadId) consulta = consulta.eq("lead_id", leadId);
    if (clienteId) consulta = consulta.eq("cliente_id", clienteId);

    const { data, error } = await consulta;

    if (error) {
      console.error("Erro ao listar mensagens de WhatsApp:", error.message);
      return NextResponse.json(
        { error: "Não foi possível carregar o histórico de mensagens." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de mensagens de WhatsApp:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
