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

    const supabase = getSupabase();

    if (id) {
      const { data, error } = await supabase
        .from("visitas")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Erro ao obter visita:", error);
        return NextResponse.json({ error: error.message }, { status: 404 });
      }

      return NextResponse.json({ data }, { status: 200 });
    }

    const { data, error } = await supabase
      .from("visitas")
      .select("*")
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao listar visitas:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de visitas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const visita = await request.json();
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("visitas")
      .insert([visita])
      .select()
      .single();

    if (error) {
      console.error("Erro ao sincronizar visita:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de visitas:", error);
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
      .from("visitas")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar visita:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de visitas:", error);
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
    const { error } = await supabase.from("visitas").delete().eq("id", id);

    if (error) {
      console.error("Erro ao deletar visita:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de visitas:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
