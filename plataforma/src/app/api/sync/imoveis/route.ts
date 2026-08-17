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
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    const supabase = getSupabase();

    if (id || slug) {
      const query = supabase.from("imoveis").select("*");
      const { data, error } = id
        ? await query.eq("id", id).single()
        : await query.eq("slug", slug!).single();

      if (error) {
        console.error("Erro ao obter imóvel:", error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("imoveis")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao listar imóveis:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de imóveis:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const imovel = await request.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("imoveis")
      .insert([imovel])
      .select()
      .single();

    if (error) {
      console.error("Erro ao sincronizar imóvel:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de imóveis:", error);
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
      .from("imoveis")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar imóvel:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de imóveis:", error);
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
    const { error } = await supabase.from("imoveis").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar imóvel:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de imóveis:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
