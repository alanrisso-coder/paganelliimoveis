/**
 * Publicação no Instagram: escolha do provedor e cliente direto da Graph API.
 *
 * Há dois caminhos até o perfil `@paganelliimoveis`, e `publicarNoInstagram`
 * decide qual usar a cada publicação:
 *
 * - **Windsor.ai** (src/lib/instagram-windsor.ts), quando `WINDSOR_API_KEY` e
 *   `WINDSOR_INSTAGRAM_ACCOUNT` estão configurados. É o caminho preferido: a
 *   autorização do Instagram fica no Windsor, que renova o token sozinho, em
 *   vez de depender de um token de longa duração renovado à mão a cada 60 dias.
 * - **Graph API da Meta**, o resto deste arquivo, usado quando o Windsor não
 *   está configurado. Mantido para não amarrar a publicação a um fornecedor só.
 *
 * Só roda no servidor — nunca importar este arquivo de um componente client.
 * O token (`INSTAGRAM_ACCESS_TOKEN`) vive só em variável de ambiente e nunca
 * deve chegar ao navegador. Mesmo padrão do cliente do WhatsApp
 * (src/lib/whatsapp.ts), que fala com a mesma Graph API.
 *
 * O que vem abaixo descreve o caminho da Meta:
 *
 * A publicação é sempre em duas etapas, nunca uma chamada só:
 *   1. cria um "container" com a mídia (POST /{ig-user-id}/media);
 *   2. publica o container (POST /{ig-user-id}/media_publish).
 * Entre as duas é preciso esperar o container terminar de processar — a Meta
 * baixa a imagem da URL que passamos, então o container nasce IN_PROGRESS e
 * publicar cedo demais falha.
 *
 * Carrossel tem um nível a mais: um container por imagem (is_carousel_item),
 * depois um container do tipo CAROUSEL agrupando os filhos.
 */

import { publicarViaWindsor, windsorConfigurado } from "./instagram-windsor";

const VERSAO_PADRAO = "v21.0";

/** Limite da Meta por conta em 24h. Só informativo — quem conta é a Meta. */
export const LIMITE_PUBLICACOES_24H = 50;

/** A Meta aceita no máximo 10 itens por carrossel. */
export const MAX_IMAGENS_CARROSSEL = 10;

export interface ResultadoPublicacao {
  sucesso: boolean;
  postId?: string;
  permalink?: string;
  /** Código/mensagem técnica da Meta, para log e diagnóstico. */
  erro?: string;
}

interface Credenciais {
  token: string;
  contaId: string;
  versao: string;
}

export function credenciaisInstagram(): Credenciais | null {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const contaId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (!token || !contaId) return null;
  return {
    token,
    contaId,
    versao: process.env.INSTAGRAM_API_VERSION || VERSAO_PADRAO,
  };
}

function urlGraph(credenciais: Credenciais, caminho: string): string {
  return `https://graph.facebook.com/${credenciais.versao}/${caminho}`;
}

/** Extrai a mensagem de erro da Meta, que vem em campos diferentes conforme o caso. */
function mensagemErro(corpo: unknown, status: number): string {
  const erro = (corpo as { error?: Record<string, unknown> } | null)?.error;
  if (!erro) return `HTTP_${status}`;
  return (
    (erro.error_user_msg as string) ||
    (erro.message as string) ||
    `HTTP_${status}`
  );
}

async function postGraph(
  credenciais: Credenciais,
  caminho: string,
  parametros: Record<string, string>,
): Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; erro: string }> {
  const corpo = new URLSearchParams({ ...parametros, access_token: credenciais.token });

  try {
    const resposta = await fetch(urlGraph(credenciais, caminho), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: corpo,
    });
    const json = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      return { ok: false, erro: mensagemErro(json, resposta.status) };
    }
    return { ok: true, dados: (json ?? {}) as Record<string, unknown> };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "ERRO_DESCONHECIDO" };
  }
}

async function getGraph(
  credenciais: Credenciais,
  caminho: string,
  parametros: Record<string, string>,
): Promise<{ ok: true; dados: Record<string, unknown> } | { ok: false; erro: string }> {
  const query = new URLSearchParams({ ...parametros, access_token: credenciais.token });

  try {
    const resposta = await fetch(`${urlGraph(credenciais, caminho)}?${query}`);
    const json = await resposta.json().catch(() => null);
    if (!resposta.ok) {
      return { ok: false, erro: mensagemErro(json, resposta.status) };
    }
    return { ok: true, dados: (json ?? {}) as Record<string, unknown> };
  } catch (erro) {
    return { ok: false, erro: erro instanceof Error ? erro.message : "ERRO_DESCONHECIDO" };
  }
}

/**
 * Espera o container sair de IN_PROGRESS. A Meta precisa baixar a imagem da
 * URL informada, então o tempo depende do tamanho do arquivo e da rede dela.
 * Sem esse passo, `media_publish` falha com "Media ID is not available".
 */
async function aguardarContainer(
  credenciais: Credenciais,
  containerId: string,
  tentativas = 15,
  intervaloMs = 2000,
): Promise<{ ok: true } | { ok: false; erro: string }> {
  for (let i = 0; i < tentativas; i++) {
    const resultado = await getGraph(credenciais, containerId, {
      fields: "status_code,status",
    });
    if (!resultado.ok) return { ok: false, erro: resultado.erro };

    const status = resultado.dados.status_code as string | undefined;
    if (status === "FINISHED") return { ok: true };
    if (status === "ERROR" || status === "EXPIRED") {
      return {
        ok: false,
        erro: (resultado.dados.status as string) || `CONTAINER_${status}`,
      };
    }
    await new Promise((r) => setTimeout(r, intervaloMs));
  }
  return { ok: false, erro: "CONTAINER_TIMEOUT" };
}

/**
 * Publica uma ou mais imagens com a legenda informada.
 *
 * `imagensUrls` precisa conter URLs HTTPS que os servidores da Meta consigam
 * baixar — elas são buscadas do lado de lá, não enviadas por nós. Isso vale
 * para os dois provedores: o Windsor repassa as URLs para a mesma Meta.
 *
 * O corte em `MAX_IMAGENS_CARROSSEL` acontece aqui, e não em cada provedor,
 * porque o limite é do Instagram — não de quem faz a chamada.
 */
export async function publicarNoInstagram(params: {
  imagensUrls: string[];
  legenda: string;
}): Promise<ResultadoPublicacao> {
  const imagens = params.imagensUrls.slice(0, MAX_IMAGENS_CARROSSEL);
  if (imagens.length === 0) {
    return { sucesso: false, erro: "SEM_IMAGENS" };
  }

  if (windsorConfigurado()) {
    return publicarViaWindsor({ imagensUrls: imagens, legenda: params.legenda });
  }
  return publicarViaMeta({ imagensUrls: imagens, legenda: params.legenda });
}

/** Caminho da Graph API: cria o container, espera processar e publica. */
async function publicarViaMeta(params: {
  imagensUrls: string[];
  legenda: string;
}): Promise<ResultadoPublicacao> {
  const credenciais = credenciaisInstagram();
  if (!credenciais) {
    return { sucesso: false, erro: "CREDENCIAIS_NAO_CONFIGURADAS" };
  }

  const imagens = params.imagensUrls;

  const containerPrincipal = await (imagens.length === 1
    ? criarContainerSimples(credenciais, imagens[0], params.legenda)
    : criarContainerCarrossel(credenciais, imagens, params.legenda));

  if (!containerPrincipal.ok) {
    return { sucesso: false, erro: containerPrincipal.erro };
  }

  const publicacao = await postGraph(credenciais, `${credenciais.contaId}/media_publish`, {
    creation_id: containerPrincipal.id,
  });
  if (!publicacao.ok) {
    return { sucesso: false, erro: publicacao.erro };
  }

  const postId = publicacao.dados.id as string | undefined;
  if (!postId) {
    return { sucesso: false, erro: "RESPOSTA_SEM_ID" };
  }

  return { sucesso: true, postId, permalink: await buscarPermalink(credenciais, postId) };
}

async function criarContainerSimples(
  credenciais: Credenciais,
  imagemUrl: string,
  legenda: string,
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  const container = await postGraph(credenciais, `${credenciais.contaId}/media`, {
    image_url: imagemUrl,
    caption: legenda,
  });
  if (!container.ok) return { ok: false, erro: container.erro };

  const id = container.dados.id as string | undefined;
  if (!id) return { ok: false, erro: "CONTAINER_SEM_ID" };

  const pronto = await aguardarContainer(credenciais, id);
  if (!pronto.ok) return { ok: false, erro: pronto.erro };

  return { ok: true, id };
}

async function criarContainerCarrossel(
  credenciais: Credenciais,
  imagens: string[],
  legenda: string,
): Promise<{ ok: true; id: string } | { ok: false; erro: string }> {
  // Os filhos são criados em série de propósito: em paralelo é fácil bater
  // no rate limit da Graph API e receber um erro genérico difícil de ler.
  const filhos: string[] = [];
  for (const imagemUrl of imagens) {
    const filho = await postGraph(credenciais, `${credenciais.contaId}/media`, {
      image_url: imagemUrl,
      is_carousel_item: "true",
    });
    if (!filho.ok) return { ok: false, erro: filho.erro };

    const id = filho.dados.id as string | undefined;
    if (!id) return { ok: false, erro: "CONTAINER_FILHO_SEM_ID" };
    filhos.push(id);
  }

  for (const filhoId of filhos) {
    const pronto = await aguardarContainer(credenciais, filhoId);
    if (!pronto.ok) return { ok: false, erro: pronto.erro };
  }

  const container = await postGraph(credenciais, `${credenciais.contaId}/media`, {
    media_type: "CAROUSEL",
    children: filhos.join(","),
    caption: legenda,
  });
  if (!container.ok) return { ok: false, erro: container.erro };

  const id = container.dados.id as string | undefined;
  if (!id) return { ok: false, erro: "CONTAINER_SEM_ID" };

  const pronto = await aguardarContainer(credenciais, id);
  if (!pronto.ok) return { ok: false, erro: pronto.erro };

  return { ok: true, id };
}

/**
 * O permalink é opcional: a publicação já deu certo quando chegamos aqui, e
 * falhar em buscar a URL não deve transformar sucesso em erro.
 */
async function buscarPermalink(
  credenciais: Credenciais,
  postId: string,
): Promise<string | undefined> {
  const resultado = await getGraph(credenciais, postId, { fields: "permalink" });
  if (!resultado.ok) return undefined;
  return (resultado.dados.permalink as string) || undefined;
}

/**
 * Traduz o erro técnico da Meta numa mensagem que faz sentido no painel.
 * O texto original continua indo para `instagram_publicacoes.erro`.
 */
export function mensagemAmigavel(erro: string): string {
  if (
    erro === "CREDENCIAIS_NAO_CONFIGURADAS" ||
    erro === "WINDSOR_SEM_API_KEY" ||
    erro === "WINDSOR_SEM_CONTA"
  ) {
    return "A integração com o Instagram ainda não foi configurada. Fale com o administrador do sistema.";
  }
  // O Windsor devolve esta falha por extenso, dizendo qual usuário e onde
  // ligar. Vale repassar em vez de resumir: sem isso, o painel só diria
  // "não foi possível publicar" e ninguém saberia que falta um interruptor.
  if (/write actions are disabled/i.test(erro)) {
    return "As write actions estão desligadas na conta do Windsor.ai. Ligue em Settings → API Access (\u201cEnable write actions for Claude, ChatGPT & API\u201d) e tente de novo.";
  }
  if (erro === "WINDSOR_WRITE_ACTIONS_DESABILITADAS") {
    return "O plano do Windsor.ai não libera publicação no Instagram. Fale com o administrador do sistema.";
  }
  if (erro === "WINDSOR_CONECTOR_DESCONHECIDO" || /not connected|no account/i.test(erro)) {
    return "A conta do Instagram não está conectada no Windsor.ai. É preciso autorizar a conexão novamente.";
  }
  if (erro === "WINDSOR_TIMEOUT") {
    return "A publicação demorou demais para responder. Confira o perfil antes de tentar de novo — o post pode ter ido ao ar.";
  }
  if (erro === "SEM_IMAGENS") {
    return "Este anúncio não tem nenhuma foto disponível para publicar.";
  }
  if (erro === "CONTAINER_TIMEOUT") {
    return "O Instagram demorou demais para processar as imagens. Tente novamente em alguns minutos.";
  }
  if (/aspect ratio|proporç|dimension/i.test(erro)) {
    return "O Instagram recusou as dimensões de alguma foto. Tente publicar com outra imagem de capa.";
  }
  if (/rate limit|too many|limit reached/i.test(erro)) {
    return `Limite de publicações do Instagram atingido (${LIMITE_PUBLICACOES_24H} por dia). Tente novamente mais tarde.`;
  }
  if (/token|OAuth|session|expired/i.test(erro)) {
    return "O acesso ao Instagram expirou. É preciso renovar o token da integração.";
  }
  if (/media.*not.*available|Media ID/i.test(erro)) {
    return "O Instagram não conseguiu processar as imagens deste anúncio. Verifique se as fotos estão acessíveis.";
  }
  return "Não foi possível publicar no Instagram. O erro foi registrado para diagnóstico.";
}
