/**
 * Publicação no Instagram através do Windsor.ai.
 *
 * Só roda no servidor. É o provedor usado por `publicarNoInstagram`
 * (src/lib/instagram.ts) quando o Windsor está configurado; o cliente direto
 * da Graph API continua no lugar como alternativa.
 *
 * A diferença prática em relação a falar direto com a Meta é que aqui a
 * publicação é **uma chamada só**: o Windsor cuida do container, da espera e
 * do publish do lado dele. Em compensação a resposta é mais pobre — pode vir
 * só uma frase de confirmação, sem id nem permalink —, então tudo que
 * conseguirmos extrair é oportunista e a ausência não invalida o sucesso.
 *
 * As URLs entregues ao Windsor são as mesmas assinadas do Supabase já usadas
 * com a Meta (src/lib/instagram-imagem.ts): quem baixa a imagem é a Meta, no
 * fim da linha, então os requisitos de formato não mudam.
 */

import type { ResultadoPublicacao } from "./instagram";
import { executarAcao, credenciaisWindsor } from "./windsor";

/**
 * O conector de *leitura* do Instagram no Windsor é o `instagram_public`; quem
 * publica é o `instagram`. São conexões separadas e autorizadas separadamente.
 */
const CONECTOR = "instagram";

const ACAO_IMAGEM = "create_image_post";
const ACAO_CARROSSEL = "create_carousel_post";

/** O carrossel do Windsor exige pelo menos 2 imagens; com 1 vai post simples. */
const MIN_IMAGENS_CARROSSEL = 2;

export function contaInstagramWindsor(): string | null {
  return process.env.WINDSOR_INSTAGRAM_ACCOUNT?.trim() || null;
}

/** Só assume a publicação quando tem chave e conta — senão o provedor é a Meta. */
export function windsorConfigurado(): boolean {
  return Boolean(credenciaisWindsor() && contaInstagramWindsor());
}

/**
 * Procura o id da mídia e o permalink na resposta, aceitando tanto um objeto
 * quanto a frase de confirmação. Nenhum dos dois é obrigatório: o post já foi
 * ao ar quando chegamos aqui.
 */
function extrairIdentificacao(dados: Record<string, unknown>): {
  postId?: string;
  permalink?: string;
} {
  const candidatos: Record<string, unknown>[] = [dados];
  const aninhado = dados.result ?? dados.data ?? dados.response;
  if (aninhado && typeof aninhado === "object") {
    candidatos.push(aninhado as Record<string, unknown>);
  }

  let postId: string | undefined;
  let permalink: string | undefined;

  for (const objeto of candidatos) {
    for (const chave of ["id", "media_id", "post_id", "ig_media_id"]) {
      const valor = objeto[chave];
      if (!postId && (typeof valor === "string" || typeof valor === "number")) {
        postId = String(valor);
      }
    }
    for (const chave of ["permalink", "post_url", "url"]) {
      const valor = objeto[chave];
      if (!permalink && typeof valor === "string" && valor.startsWith("http")) {
        permalink = valor;
      }
    }
  }

  // Resposta em texto: garimpa o que der, sem inventar o que não estiver lá.
  const texto = typeof dados.result === "string" ? dados.result : "";
  if (texto) {
    if (!permalink) {
      permalink = texto.match(/https:\/\/(?:www\.)?instagram\.com\/\S+/)?.[0]?.replace(/[.,)]+$/, "");
    }
    if (!postId) {
      postId = texto.match(/\b\d{15,20}\b/)?.[0];
    }
  }

  return { postId, permalink };
}

/**
 * Publica uma ou mais imagens com a legenda informada.
 *
 * A escolha entre post simples e carrossel é feita pela quantidade de imagens
 * — são ações diferentes no Windsor, com schemas diferentes.
 */
export async function publicarViaWindsor(params: {
  imagensUrls: string[];
  legenda: string;
}): Promise<ResultadoPublicacao> {
  const conta = contaInstagramWindsor();
  if (!conta) {
    return { sucesso: false, erro: "WINDSOR_SEM_CONTA" };
  }

  const imagens = params.imagensUrls;
  if (imagens.length === 0) {
    return { sucesso: false, erro: "SEM_IMAGENS" };
  }

  const carrossel = imagens.length >= MIN_IMAGENS_CARROSSEL;
  const resultado = await executarAcao({
    conector: CONECTOR,
    conta,
    acao: carrossel ? ACAO_CARROSSEL : ACAO_IMAGEM,
    parametros: carrossel
      ? { image_urls: imagens, caption: params.legenda }
      : { image_url: imagens[0], caption: params.legenda },
  });

  if (!resultado.ok) {
    return { sucesso: false, erro: resultado.erro };
  }

  const { postId, permalink } = extrairIdentificacao(resultado.dados);
  return { sucesso: true, postId, permalink };
}
