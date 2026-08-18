import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/** Tamanho do código de verificação: os primeiros dígitos do telefone cadastrado. */
const TAMANHO_CODIGO = 7;

/**
 * Segundo fator do login. Recebe e-mail, senha e código juntos e revalida
 * os dois fatores nesta mesma chamada — o primeiro passo (/api/auth/login)
 * só existe para dar feedback rápido de senha errada antes de pedir o
 * código; a autorização de fato só acontece aqui.
 */
export async function POST(request: Request) {
  try {
    const { email, senha, codigo } = await request.json();

    if (!email || !senha || !codigo) {
      return NextResponse.json(
        { error: "Informe e-mail, senha e código." },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("*")
      .ilike("email", String(email).trim())
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar usuário:", error);
      return NextResponse.json(
        { error: "Erro interno do servidor" },
        { status: 500 }
      );
    }

    if (!usuario || !usuario.ativo) {
      return NextResponse.json(
        { error: "Não foi possível concluir o acesso." },
        { status: 401 }
      );
    }

    const senhaValida =
      String(senha).trim().toLowerCase() === usuario.email.trim().toLowerCase();
    if (!senhaValida) {
      return NextResponse.json(
        { error: "Sessão expirada. Informe a senha novamente." },
        { status: 401 }
      );
    }

    const digitosTelefone = String(usuario.telefone || "").replace(/\D/g, "");
    const codigoEsperado = digitosTelefone.slice(0, TAMANHO_CODIGO);
    const codigoDigitado = String(codigo).replace(/\D/g, "");

    if (
      codigoEsperado.length < TAMANHO_CODIGO ||
      codigoDigitado !== codigoEsperado
    ) {
      return NextResponse.json(
        { error: "Código de verificação incorreto." },
        { status: 401 }
      );
    }

    return NextResponse.json({ data: usuario }, { status: 200 });
  } catch (error) {
    console.error("Erro na verificação de código:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
