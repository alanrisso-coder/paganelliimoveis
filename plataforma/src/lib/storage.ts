import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Variáveis de ambiente Supabase não configuradas");
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const BUCKET_NAME = "paganelli-imoveis";

export async function uploadArquivo(
  arquivo: File,
  pasta: "fotos" | "plantas" | "documentos" | "videos",
  imovelId: string
) {
  const timestamp = Date.now();
  const nomeOriginal = arquivo.name
    .replace(/[^a-z0-9.-]/gi, "_")
    .toLowerCase();
  const caminho = `${pasta}/${imovelId}/${timestamp}_${nomeOriginal}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(caminho, arquivo, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(`Upload falhou: ${error.message}`);

  // Gerar URL assinada (válida por 1 ano)
  const { data: urlData } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(caminho, 60 * 60 * 24 * 365);

  return {
    url: urlData?.signedUrl || "",
    caminho,
  };
}

export async function deletarArquivo(caminho: string) {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([caminho]);

  if (error) throw new Error(`Exclusão falhou: ${error.message}`);
}

export async function obterUrlPublica(caminho: string) {
  const { data } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(caminho);

  return data.publicUrl;
}
