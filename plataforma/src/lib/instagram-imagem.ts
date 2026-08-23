/**
 * Normalização das fotos para o formato aceito pelo Instagram.
 *
 * Só roda no servidor (depende de `sharp` e da service role key do Supabase).
 *
 * Por que existe: o Instagram recusa imagens fora da faixa de proporção
 * 4:5 (0.8) a 1.91:1, e foto de imóvel em retrato costuma ser 3:4 (0.75) —
 * ou seja, seria rejeitada pela Meta com um erro genérico. Em vez de deixar
 * a publicação falhar, cada foto é reenquadrada para 1080x1350 (4:5, o
 * formato que ocupa mais área no feed) antes de ir para a Meta.
 *
 * A imagem tratada é salva em `instagram/{anuncioId}/` no mesmo bucket das
 * fotos e reaproveitada nas republicações — o nome do arquivo é derivado do
 * conteúdo da URL de origem, então a mesma foto não é processada duas vezes.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import sharp from "sharp";

const BUCKET_NAME = "paganelli-imoveis";

/** 4:5 — o enquadramento vertical que ocupa mais área no feed. */
const LARGURA = 1080;
const ALTURA = 1350;

/** Validade da URL assinada entregue à Meta. */
const VALIDADE_URL_SEGUNDOS = 60 * 60 * 24 * 7;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/**
 * Baixa, reenquadra e sobe uma foto, devolvendo a URL que a Meta vai buscar.
 *
 * O corte é `cover` com atenção ao conteúdo: em foto de imóvel, cortar pelo
 * centro geométrico frequentemente decepa o telhado ou o piso, enquanto
 * `attention` mantém a região de maior contraste — a fachada, na prática.
 */
async function normalizarFoto(
  fotoUrl: string,
  anuncioId: string,
): Promise<{ ok: true; url: string } | { ok: false; erro: string }> {
  const supabase = getSupabase();
  const hash = createHash("sha1").update(fotoUrl).digest("hex").slice(0, 16);
  const caminho = `instagram/${anuncioId}/${hash}.jpg`;

  // Já processada numa publicação anterior: reaproveita.
  const { data: existente } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(caminho, VALIDADE_URL_SEGUNDOS);
  if (existente?.signedUrl) {
    return { ok: true, url: existente.signedUrl };
  }

  try {
    const resposta = await fetch(fotoUrl);
    if (!resposta.ok) {
      return { ok: false, erro: `FOTO_INACESSIVEL_HTTP_${resposta.status}` };
    }
    const original = Buffer.from(await resposta.arrayBuffer());

    const tratada = await sharp(original)
      .rotate()
      .resize(LARGURA, ALTURA, { fit: "cover", position: sharp.strategy.attention })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    const { error: erroUpload } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(caminho, tratada, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/jpeg",
      });
    if (erroUpload) {
      return { ok: false, erro: `UPLOAD_FALHOU: ${erroUpload.message}` };
    }

    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(caminho, VALIDADE_URL_SEGUNDOS);
    if (!urlData?.signedUrl) {
      return { ok: false, erro: "URL_ASSINADA_INDISPONIVEL" };
    }

    return { ok: true, url: urlData.signedUrl };
  } catch (erro) {
    return {
      ok: false,
      erro: erro instanceof Error ? erro.message : "ERRO_AO_PROCESSAR_IMAGEM",
    };
  }
}

/**
 * Normaliza a lista de fotos preservando a ordem da galeria.
 *
 * Fotos individuais que falharem são descartadas com um aviso no log — perder
 * um slide do carrossel é melhor do que abortar a publicação inteira. Só
 * retorna erro quando não sobra nenhuma imagem utilizável.
 */
export async function prepararImagens(
  fotosUrls: string[],
  anuncioId: string,
): Promise<{ ok: true; urls: string[] } | { ok: false; erro: string }> {
  const urls: string[] = [];

  for (const fotoUrl of fotosUrls) {
    const resultado = await normalizarFoto(fotoUrl, anuncioId);
    if (resultado.ok) {
      urls.push(resultado.url);
    } else {
      console.error(`Anúncio ${anuncioId}: foto ignorada na publicação. ${resultado.erro}`);
    }
  }

  if (urls.length === 0) {
    return { ok: false, erro: "NENHUMA_IMAGEM_PROCESSADA" };
  }
  return { ok: true, urls };
}
