import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apenasPublicos = searchParams.get("publicos") === "true";
    const imovelId = searchParams.get("imovel_id");

    const supabase = getSupabase();
    let query = supabase
      .from("anuncios")
      .select("*")
      .order("criado_em", { ascending: false });

    if (apenasPublicos) {
      query = query.eq("status", "publicado").eq("visibilidade", "publico");
    }
    if (imovelId) {
      query = query.eq("imovel_id", imovelId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Erro ao listar anúncios:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de anúncios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const anuncio = await request.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("anuncios")
      .insert([anuncio])
      .select()
      .single();

    if (error) {
      console.error("Erro ao sincronizar anúncio:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de anúncios:", error);
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
      .from("anuncios")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar anúncio:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de anúncios:", error);
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
    const { error } = await supabase.from("anuncios").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar anúncio:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de anúncios:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
