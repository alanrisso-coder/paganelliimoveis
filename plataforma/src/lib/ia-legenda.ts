/**
 * Geração da legenda do Instagram por IA (Claude API).
 *
 * Só roda no servidor — `ANTHROPIC_API_KEY` nunca vai para o navegador.
 *
 * Modular de propósito: a rota chama `gerarLegendaIA` e recebe um texto ou um
 * motivo de indisponibilidade. Trocar de provedor significa reescrever este
 * arquivo, sem tocar na rota nem no modal.
 *
 * A legenda gerada NUNCA é publicada direto: volta para um campo editável no
 * modal, o usuário revisa e só então confirma.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Anuncio, Imovel } from "./types";
import {
  MAX_CARACTERES_LEGENDA,
  hashtagsDoImovel,
  truncarLegenda,
  urlPublicaAnuncio,
} from "./instagram-conteudo";
import { formatarArea, formatarMoeda, rotuloTipoImovel } from "./format";
import { CONTATO } from "./contato";

const MODELO = "claude-opus-5";

export interface ResultadoLegenda {
  sucesso: boolean;
  legenda?: string;
  erro?: string;
}

export function iaConfigurada(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const INSTRUCOES = `Você escreve legendas de Instagram para a Paganelli Imóveis, imobiliária de Palhoça e Grande Florianópolis.

Posicionamento da marca: curadoria em vez de catálogo, transparência sobre valor, atendimento pessoal da corretora responsável. O tom é comercial e sofisticado, nunca sensacionalista — sem "IMPERDÍVEL", sem "OPORTUNIDADE ÚNICA", sem fileiras de emoji.

Regras invioláveis:
- Use SOMENTE os dados fornecidos. Não invente metragem, número de dormitórios, acabamento, vista, proximidade de serviços, condição de pagamento ou qualquer característica que não esteja nos dados.
- Se um dado não foi informado, simplesmente não o mencione. Nunca escreva "consulte-nos" para preencher lacuna.
- Não prometa rentabilidade, valorização futura nem condição de financiamento.

Formato:
- Abra com uma linha que desperte interesse a partir do diferencial mais forte do imóvel.
- Em seguida, os dados objetivos, de forma escaneável.
- Destaque no máximo quatro diferenciais reais.
- Feche com CTA convidando a conhecer o imóvel, informando que o link do anúncio completo está disponível.
- Inclua o link e as hashtags exatamente como fornecidos, ao final.
- Máximo de ${MAX_CARACTERES_LEGENDA} caracteres. Use emoji com moderação, como marcador de seção.

Responda APENAS com o texto da legenda, sem aspas, sem comentário, sem título.`;

/** Descreve o imóvel para o modelo, omitindo todo campo vazio. */
function dadosDoImovel(anuncio: Anuncio, imovel: Imovel): string {
  const linhas: string[] = [];
  const adicionar = (rotulo: string, valor: unknown) => {
    if (valor === undefined || valor === null || valor === "" || valor === 0) return;
    linhas.push(`${rotulo}: ${valor}`);
  };

  adicionar("Título do anúncio", anuncio.titulo || imovel.titulo);
  adicionar("Subtítulo", anuncio.subtitulo);
  adicionar("Tipo", rotuloTipoImovel[imovel.tipo]);
  adicionar("Finalidade", imovel.finalidade);
  adicionar("Bairro", imovel.endereco.bairro);
  adicionar("Cidade", `${imovel.endereco.cidade}/${imovel.endereco.estado}`);
  adicionar("Valor de venda", imovel.valores.venda && formatarMoeda(imovel.valores.venda));
  adicionar("Valor de aluguel", imovel.valores.aluguel && `${formatarMoeda(imovel.valores.aluguel)}/mês`);
  adicionar("Condomínio", imovel.valores.condominio && formatarMoeda(imovel.valores.condominio));
  adicionar("Área total", imovel.metragens.areaTotal && formatarArea(imovel.metragens.areaTotal));
  adicionar("Área construída", imovel.metragens.areaConstruida && formatarArea(imovel.metragens.areaConstruida));
  adicionar("Dormitórios", imovel.metragens.dormitorios);
  adicionar("Suítes", imovel.metragens.suites);
  adicionar("Banheiros", imovel.metragens.banheiros);
  adicionar("Vagas", imovel.metragens.vagas);
  adicionar("Características", imovel.caracteristicas.join(", "));
  adicionar("Diferenciais", imovel.diferenciais.join(", "));
  adicionar("Destaques do anúncio", anuncio.destaques.join(", "));
  adicionar("Descrição curta", imovel.descricaoCurta);
  adicionar("Exclusivo da imobiliária", imovel.exclusivo ? "sim" : undefined);
  adicionar("Aceita financiamento", imovel.aceitaFinanciamento ? "sim" : undefined);
  adicionar("Aceita permuta", imovel.aceitaPermuta ? "sim" : undefined);

  return linhas.join("\n");
}

export async function gerarLegendaIA(
  anuncio: Anuncio,
  imovel: Imovel,
): Promise<ResultadoLegenda> {
  if (!iaConfigurada()) {
    return { sucesso: false, erro: "IA_NAO_CONFIGURADA" };
  }

  const prompt = [
    "Escreva a legenda do Instagram para este imóvel.",
    "",
    "DADOS DO IMÓVEL (use apenas o que está aqui):",
    dadosDoImovel(anuncio, imovel),
    "",
    `LINK DO ANÚNCIO (inclua ao final): ${urlPublicaAnuncio(imovel)}`,
    `TELEFONE (inclua ao final): ${CONTATO.whatsappExibicao}`,
    `HASHTAGS (inclua exatamente estas, na última linha): ${hashtagsDoImovel(imovel).join(" ")}`,
  ].join("\n");

  try {
    const client = new Anthropic();
    const resposta = await client.messages.create({
      model: MODELO,
      max_tokens: 2000,
      system: INSTRUCOES,
      messages: [{ role: "user", content: prompt }],
    });

    if (resposta.stop_reason === "refusal") {
      return { sucesso: false, erro: "GERACAO_RECUSADA" };
    }

    const texto = resposta.content
      .filter((bloco): bloco is Anthropic.TextBlock => bloco.type === "text")
      .map((bloco) => bloco.text)
      .join("")
      .trim();

    if (!texto) {
      return { sucesso: false, erro: "RESPOSTA_VAZIA" };
    }

    return { sucesso: true, legenda: truncarLegenda(texto) };
  } catch (erro) {
    if (erro instanceof Anthropic.AuthenticationError) {
      return { sucesso: false, erro: "CHAVE_INVALIDA" };
    }
    if (erro instanceof Anthropic.RateLimitError) {
      return { sucesso: false, erro: "LIMITE_DE_USO" };
    }
    return {
      sucesso: false,
      erro: erro instanceof Error ? erro.message : "ERRO_DESCONHECIDO",
    };
  }
}

/** Mensagem exibida no painel quando a geração não funciona. */
export function mensagemErroIA(erro: string): string {
  if (erro === "IA_NAO_CONFIGURADA") {
    return "A geração por IA não está configurada. Edite a legenda manualmente ou fale com o administrador.";
  }
  if (erro === "CHAVE_INVALIDA") {
    return "A chave de acesso da IA é inválida ou expirou. Fale com o administrador do sistema.";
  }
  if (erro === "LIMITE_DE_USO") {
    return "O limite de uso da IA foi atingido. Tente novamente em alguns minutos.";
  }
  if (erro === "GERACAO_RECUSADA" || erro === "RESPOSTA_VAZIA") {
    return "Não foi possível gerar a legenda para este anúncio. Edite o texto manualmente.";
  }
  return "Falha ao gerar a legenda com IA. A legenda padrão continua disponível para edição.";
}
