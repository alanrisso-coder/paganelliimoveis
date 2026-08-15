import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
    const formData = await request.formData();
    const arquivo = formData.get("arquivo") as File;
    const pasta = formData.get("pasta") as string;
    const imovelId = formData.get("imovelId") as string;

    if (!arquivo || !pasta || !imovelId) {
      return NextResponse.json(
        { erro: "Parâmetros faltando" },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const nomeOriginal = arquivo.name
      .replace(/[^a-z0-9.-]/gi, "_")
      .toLowerCase();
    const caminho = `${pasta}/${imovelId}/${timestamp}_${nomeOriginal}`;

    const arrayBuffer = await arquivo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(caminho, buffer, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      return NextResponse.json(
        { erro: `Upload falhou: ${error.message}` },
        { status: 400 }
      );
    }

    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(caminho, 60 * 60 * 24 * 365);

    return NextResponse.json({
      url: urlData?.signedUrl || "",
      caminho,
    });
  } catch (erro) {
    return NextResponse.json(
      {
        erro: erro instanceof Error ? erro.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
