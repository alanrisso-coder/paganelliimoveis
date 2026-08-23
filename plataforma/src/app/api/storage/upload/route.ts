import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { autenticar } from "@/lib/sessao-servidor";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Variáveis de ambiente Supabase não configuradas");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const BUCKET_NAME = "paganelli-imoveis";
const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

// Recomprime a imagem mantendo a mesma resolução (largura/altura),
// apenas reduzindo o tamanho do arquivo através de uma codificação mais eficiente.
async function otimizarImagem(buffer: Buffer, mimeType: string) {
  const imagem = sharp(buffer).rotate();

  if (mimeType === "image/png") {
    return {
      buffer: await imagem.png({ compressionLevel: 9, palette: true }).toBuffer(),
      mimeType: "image/png",
    };
  }

  return {
    buffer: await imagem.jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
    mimeType: "image/jpeg",
  };
}

export async function POST(request: NextRequest) {
  try {
    // Qualquer pessoa logada envia arquivo (a foto de perfil é o caso comum),
    // mas ninguém de fora: aberta, esta rota era hospedagem de arquivos
    // gratuita no bucket da imobiliária, servida pelo domínio dela.
    const auth = await autenticar();
    if (!auth.ok) return auth.resposta;

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

    const arrayBuffer = await arquivo.arrayBuffer();
    let buffer = Buffer.from(arrayBuffer);
    let nomeOriginal = arquivo.name
      .replace(/[^a-z0-9.-]/gi, "_")
      .toLowerCase();
    let contentType = arquivo.type;

    if ((pasta === "fotos" || pasta === "avatares") && TIPOS_IMAGEM.includes(arquivo.type)) {
      try {
        const otimizada = await otimizarImagem(buffer, arquivo.type);
        buffer = otimizada.buffer;
        contentType = otimizada.mimeType;
        nomeOriginal = nomeOriginal.replace(
          /\.(jpe?g|png|webp)$/i,
          otimizada.mimeType === "image/png" ? ".png" : ".jpg"
        );
      } catch {
        // Se a otimização falhar, envia o arquivo original sem compressão.
      }
    }

    const timestamp = Date.now();
    const caminho = `${pasta}/${imovelId}/${timestamp}_${nomeOriginal}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(caminho, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType,
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
