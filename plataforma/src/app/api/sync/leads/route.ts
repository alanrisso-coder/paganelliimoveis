import { createClient } from "@supabase/supabase-js";
import { NextResponse, after } from "next/server";
import { dispararMensagemConversaoWhatsapp } from "@/lib/whatsapp-conversao";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const supabase = getSupabase();

    if (id) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erro ao obter lead:", error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao listar leads:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de leads:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const lead = await request.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("leads")
      .insert([lead])
      .select()
      .single();

    if (error) {
      console.error("Erro ao sincronizar lead:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de leads:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, updates } = await request.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar lead:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Lead virou Cliente: dispara a notificação de WhatsApp depois da
    // resposta (não atrasa o retorno) sem depender do processo continuar
    // vivo após o response, como um fire-and-forget comum faria.
    if (updates?.status === "convertido" && data) {
      after(() => dispararMensagemConversaoWhatsapp(data));
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de leads:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar lead:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de leads:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
