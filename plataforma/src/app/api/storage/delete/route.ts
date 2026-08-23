import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { exigirPermissao } from "@/lib/sessao-servidor";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Variáveis de ambiente Supabase não configuradas");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const BUCKET_NAME = "paganelli-imoveis";

export async function POST(request: NextRequest) {
  try {
    // Apagar arquivo do bucket é destrutivo e sem desfazer: exige a mesma
    // permissão de quem edita o imóvel a que a mídia pertence.
    const auth = await exigirPermissao("editar_imovel", request);
    if (!auth.ok) return auth.resposta;

    const body = await request.json();
    const { caminho } = body;

    if (!caminho) {
      return NextResponse.json(
        { erro: "Caminho não fornecido" },
        { status: 400 }
      );
    }

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([caminho]);

    if (error) {
      return NextResponse.json(
        { erro: `Exclusão falhou: ${error.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json({ sucesso: true });
  } catch (erro) {
    return NextResponse.json(
      {
        erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
