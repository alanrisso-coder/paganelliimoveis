import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Primeiro fator do login: confirma e-mail + senha antes de pedir o código
 * de verificação. Não retorna dados do usuário — apenas se pode avançar.
 */
export async function POST(request: Request) {
  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json(
        { error: "Informe e-mail e senha." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("email, ativo")
      .ilike("email", String(email).trim())
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar usuário:", error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    if (!usuario) {
      return NextResponse.json(
        { error: "Não encontramos um acesso com esse e-mail." },
        { status: 401 }
      );
    }

    if (!usuario.ativo) {
      return NextResponse.json(
        { error: "Este acesso está desativado. Fale com o administrador." },
        { status: 403 }
      );
    }

    const senhaValida =
      String(senha).trim().toLowerCase() === usuario.email.trim().toLowerCase();

    if (!senhaValida) {
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
