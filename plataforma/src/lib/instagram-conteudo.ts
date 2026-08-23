/**
 * Monta o conteúdo da publicação do Instagram a partir do que já está
 * cadastrado no anúncio e no imóvel.
 *
 * Regra que atravessa o arquivo inteiro: **nada é inventado**. Todo campo
 * ausente simplesmente não entra na legenda — não existe placeholder, nem
 * "consulte-nos", nem valor estimado. Por isso quase tudo aqui é
 * `push` condicional em vez de template fixo.
 *
 * Roda tanto no servidor (rota de publicação) quanto no client (prévia do
 * modal), então não pode importar nada que dependa de env de servidor.
 */

import type { Anuncio, Imovel } from "./types";
import { formatarArea, formatarMoeda, rotuloTipoImovel } from "./format";
import { CONTATO } from "./contato";

/** Limite da Meta para a legenda. */
export const MAX_CARACTERES_LEGENDA = 2200;
/** Limite da Meta para hashtags por publicação. */
export const MAX_HASHTAGS = 30;

/** Quantas hashtags realmente usamos — o limite da Meta é bem acima do bom senso. */
const HASHTAGS_ALVO = 12;

export interface DadosPublicacao {
  legenda: string;
  linkAnuncio: string;
  /** Fotos na ordem definida pela galeria do anúncio, capa primeiro. */
  fotos: string[];
  fotoCapa?: string;
}

/**
 * URL pública do anúncio. Depende de `NEXT_PUBLIC_SITE_URL` — sem ela não há
 * como montar um link absoluto, e um link relativo não serve para o
 * Instagram. O fallback existe só para o ambiente de desenvolvimento.
 */
export function urlPublicaAnuncio(imovel: Imovel): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}/imoveis/${imovel.slug}`;
}

/**
 * Fotos do anúncio na ordem da galeria, começando pela capa.
 *
 * `ordemGaleria` e `capaIndice` são índices sobre `imovel.fotos`, e nenhum dos
 * dois tem garantia de estar em dia com a lista de fotos atual — daí o filtro
 * contra índices que não existem mais.
 */
export function fotosDoAnuncio(anuncio: Anuncio, imovel: Imovel): string[] {
  const ordenadas = anuncio.ordemGaleria.length
    ? anuncio.ordemGaleria.map((i) => imovel.fotos[i]).filter(Boolean)
    : [...imovel.fotos];

  const capa = imovel.fotos[anuncio.capaIndice];
  if (capa) {
    // A capa escolhida no painel deve ser o primeiro slide do carrossel.
    return [capa, ...ordenadas.filter((f) => f !== capa)];
  }
  return ordenadas;
}

/** Preço a divulgar: venda quando houver, senão aluguel. */
function linhaPreco(imovel: Imovel): string | null {
  if (imovel.valores.venda) return `💰 ${formatarMoeda(imovel.valores.venda)}`;
  if (imovel.valores.aluguel) return `💰 ${formatarMoeda(imovel.valores.aluguel)}/mês`;
  return null;
}

/** Ficha técnica em linha única. Cada item só aparece se tiver valor. */
function linhaFicha(imovel: Imovel): string | null {
  const { metragens } = imovel;
  const partes: string[] = [];

  const area = metragens.areaConstruida || metragens.areaTotal;
  if (area) partes.push(formatarArea(area));
  if (metragens.dormitorios) {
    partes.push(`${metragens.dormitorios} ${metragens.dormitorios === 1 ? "dormitório" : "dormitórios"}`);
  }
  if (metragens.suites) {
    partes.push(`${metragens.suites} ${metragens.suites === 1 ? "suíte" : "suítes"}`);
  }
  if (metragens.vagas) {
    partes.push(`${metragens.vagas} ${metragens.vagas === 1 ? "vaga" : "vagas"}`);
  }

  return partes.length ? `📐 ${partes.join(" · ")}` : null;
}

function normalizarHashtag(texto: string): string {
  const limpo = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((p, i) => (i === 0 ? p.toLowerCase() : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()))
    .join("");
  return limpo ? `#${limpo}` : "";
}

/**
 * Hashtags derivadas do próprio imóvel — tipo, finalidade, bairro, cidade —
 * mais um punhado de termos de mercado. Sem lista genérica de 30 tags: o
 * excesso pesa contra o alcance e destoa do tom da marca.
 */
export function hashtagsDoImovel(imovel: Imovel): string[] {
  const tags = new Set<string>();

  tags.add(normalizarHashtag(rotuloTipoImovel[imovel.tipo]));
  if (imovel.endereco.bairro) tags.add(normalizarHashtag(imovel.endereco.bairro));
  if (imovel.endereco.cidade) tags.add(normalizarHashtag(imovel.endereco.cidade));

  if (imovel.finalidade === "venda" || imovel.finalidade === "ambos") {
    tags.add(normalizarHashtag(`${rotuloTipoImovel[imovel.tipo]} a venda`));
    tags.add("#imovelAVenda");
  }
  if (imovel.finalidade === "aluguel" || imovel.finalidade === "ambos") {
    tags.add("#imovelParaAlugar");
  }
  if (imovel.exclusivo) tags.add("#exclusividade");
  if (imovel.tipo === "cobertura" || (imovel.valores.venda ?? 0) >= 2_000_000) {
    tags.add("#altoPadrao");
  }

  tags.add("#paganelliImoveis");
  tags.add("#grandeFlorianopolis");
  tags.add("#imoveisSC");

  return [...tags].filter(Boolean).slice(0, Math.min(HASHTAGS_ALVO, MAX_HASHTAGS));
}

/**
 * Legenda padrão, usada como ponto de partida e como fallback quando a
 * geração por IA não está disponível ou falha. É sempre editável pelo
 * usuário antes de publicar.
 */
export function montarLegendaPadrao(anuncio: Anuncio, imovel: Imovel): string {
  const linhas: string[] = [];

  linhas.push(anuncio.titulo || imovel.titulo);

  const local = [imovel.endereco.bairro, imovel.endereco.cidade].filter(Boolean).join(", ");
  if (local) linhas.push(`📍 ${local}${imovel.endereco.estado ? `/${imovel.endereco.estado}` : ""}`);

  const preco = linhaPreco(imovel);
  if (preco) linhas.push(preco);

  const ficha = linhaFicha(imovel);
  if (ficha) linhas.push(ficha);

  const descricao = anuncio.subtitulo || imovel.descricaoCurta;
  if (descricao) linhas.push("", descricao);

  const destaques = (anuncio.destaques.length ? anuncio.destaques : imovel.diferenciais).slice(0, 4);
  if (destaques.length) {
    linhas.push("", ...destaques.map((d) => `• ${d}`));
  }

  linhas.push(
    "",
    "Quer conhecer este imóvel? Acesse o anúncio completo no site da Paganelli Imóveis ou fale com a nossa equipe.",
    "",
    `🔗 ${urlPublicaAnuncio(imovel)}`,
    `📱 ${CONTATO.whatsappExibicao}`,
    "",
    hashtagsDoImovel(imovel).join(" "),
  );

  return truncarLegenda(linhas.join("\n"));
}

/**
 * Garante o limite da Meta cortando por linha, não no meio de uma palavra —
 * uma legenda cortada na metade de uma frase fica pior do que uma mais curta.
 */
export function truncarLegenda(legenda: string): string {
  if (legenda.length <= MAX_CARACTERES_LEGENDA) return legenda;

  const linhas = legenda.split("\n");
  const mantidas: string[] = [];
  let total = 0;

  for (const linha of linhas) {
    if (total + linha.length + 1 > MAX_CARACTERES_LEGENDA) break;
    mantidas.push(linha);
    total += linha.length + 1;
  }

  return mantidas.join("\n").trimEnd();
}

/**
 * Campos mínimos para o anúncio poder ir ao Instagram. O botão de publicar
 * fica desabilitado enquanto isso não passar.
 */
export function validarParaInstagram(
  anuncio: Anuncio,
  imovel: Imovel | undefined,
): { valido: boolean; pendencias: string[] } {
  const pendencias: string[] = [];

  if (!imovel) {
    return { valido: false, pendencias: ["O imóvel vinculado a este anúncio não foi encontrado."] };
  }
  if (fotosDoAnuncio(anuncio, imovel).length === 0) {
    pendencias.push("O imóvel precisa de pelo menos uma foto.");
  }
  if (!anuncio.titulo && !imovel.titulo) {
    pendencias.push("O anúncio precisa de um título.");
  }
  if (!imovel.valores.venda && !imovel.valores.aluguel) {
    pendencias.push("O imóvel precisa de um valor de venda ou de aluguel.");
  }
  if (!imovel.slug) {
    pendencias.push("O imóvel precisa de um endereço público (slug) para gerar o link.");
  }
  if (anuncio.status !== "publicado" || anuncio.visibilidade !== "publico") {
    pendencias.push("O anúncio precisa estar publicado e público no site — o post leva o link dele.");
  }

  return { valido: pendencias.length === 0, pendencias };
}

/** Reúne tudo que a publicação precisa. Use depois de `validarParaInstagram`. */
export function montarDadosPublicacao(anuncio: Anuncio, imovel: Imovel): DadosPublicacao {
  const fotos = fotosDoAnuncio(anuncio, imovel);
  return {
    legenda: anuncio.instagram.legenda?.trim() || montarLegendaPadrao(anuncio, imovel),
    linkAnuncio: urlPublicaAnuncio(imovel),
    fotos,
    fotoCapa: fotos[0],
  };
}
