/**
 * Cliente das *write actions* da API do Windsor.ai.
 *
 * Só roda no servidor — a chave (`WINDSOR_API_KEY`) vive em variável de
 * ambiente e nunca pode chegar ao navegador, mesmo padrão do cliente da Meta
 * (src/lib/instagram.ts) e do WhatsApp (src/lib/whatsapp.ts).
 *
 * Por que passar pelo Windsor em vez de falar direto com a Meta: quem guarda a
 * autorização da conta `@paganelliimoveis` é o Windsor. Ele renova o token do
 * Instagram sozinho, então a plataforma deixa de depender de um token de longa
 * duração colado à mão que expira a cada 60 dias.
 *
 * O contrato é o mesmo para qualquer conector:
 *   GET  /{conector}/actions  → lista as ações e o JSONSchema de cada uma
 *   POST /{conector}/actions  → executa `{ account, action, params }`
 */

const BASE_PADRAO = "https://connectors.windsor.ai";

/**
 * O Windsor executa a publicação de forma síncrona: ele fala com a Meta, que
 * baixa cada imagem e processa o container antes de aceitar o publish. Um
 * carrossel de 10 fotos leva dezenas de segundos, daí a folga.
 */
const TIMEOUT_PADRAO_MS = 120_000;

interface Credenciais {
  apiKey: string;
  baseUrl: string;
}

export function credenciaisWindsor(): Credenciais | null {
  const apiKey = process.env.WINDSOR_API_KEY;
  if (!apiKey) return null;
  return {
    apiKey,
    baseUrl: (process.env.WINDSOR_API_URL || BASE_PADRAO).replace(/\/+$/, ""),
  };
}

export type ResultadoAcao =
  | { ok: true; dados: Record<string, unknown> }
  | { ok: false; erro: string };

/**
 * Extrai a mensagem de erro do Windsor, que muda de campo conforme a camada
 * que falhou: validação de parâmetros, o próprio Windsor ou a plataforma de
 * destino (que devolve o erro da Meta repassado).
 */
function mensagemErro(corpo: unknown, status: number): string {
  if (typeof corpo === "string" && corpo.trim()) return corpo.trim();

  const objeto = corpo as Record<string, unknown> | null;
  const bruta =
    (objeto?.error as string) ||
    (objeto?.message as string) ||
    (objeto?.detail as string) ||
    ((objeto?.error as Record<string, unknown> | undefined)?.message as string);

  if (typeof bruta === "string" && bruta.trim()) return bruta.trim();

  // Os códigos documentados pelo Windsor, para o caso de vir corpo vazio.
  if (status === 403) return "WINDSOR_WRITE_ACTIONS_DESABILITADAS";
  if (status === 404) return "WINDSOR_CONECTOR_DESCONHECIDO";
  return `WINDSOR_HTTP_${status}`;
}

/**
 * Executa uma write action num conector do Windsor.
 *
 * `account` é o id da conta conectada (para o Instagram, o próprio @ do
 * perfil) e `action` é um id devolvido pelo endpoint de listagem — nunca um
 * palpite, porque o conjunto de ações varia por conector.
 */
export async function executarAcao(entrada: {
  conector: string;
  conta: string;
  acao: string;
  parametros?: Record<string, unknown>;
  timeoutMs?: number;
}): Promise<ResultadoAcao> {
  const credenciais = credenciaisWindsor();
  if (!credenciais) {
    return { ok: false, erro: "WINDSOR_SEM_API_KEY" };
  }

  // A chave vai nos dois lugares de propósito. O header seria o suficiente na
  // documentação geral da API, mas os exemplos do endpoint de actions usam
  // `?api_key=` — e mandar só no header devolvia `Not authorized`. Query string
  // acaba em log de proxy, o que é o preço de funcionar.
  const url =
    `${credenciais.baseUrl}/${encodeURIComponent(entrada.conector)}/actions` +
    `?api_key=${encodeURIComponent(credenciais.apiKey)}`;

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": credenciais.apiKey,
      },
      body: JSON.stringify({
        account: entrada.conta,
        action: entrada.acao,
        params: entrada.parametros ?? {},
      }),
      signal: AbortSignal.timeout(entrada.timeoutMs ?? TIMEOUT_PADRAO_MS),
    });

    const texto = await resposta.text();
    let json: unknown = null;
    try {
      json = texto ? JSON.parse(texto) : null;
    } catch {
      json = texto;
    }

    if (!resposta.ok) {
      return { ok: false, erro: mensagemErro(json, resposta.status) };
    }

    // Sucesso pode vir como objeto ou como uma frase em `result`. Normalizamos
    // para objeto para quem chama não ter que lidar com os dois formatos.
    if (json && typeof json === "object") {
      return { ok: true, dados: json as Record<string, unknown> };
    }
    return { ok: true, dados: { result: texto } };
  } catch (erro) {
    if (erro instanceof Error && erro.name === "TimeoutError") {
      return { ok: false, erro: "WINDSOR_TIMEOUT" };
    }
    return { ok: false, erro: erro instanceof Error ? erro.message : "WINDSOR_ERRO_DESCONHECIDO" };
  }
}
