import type { CategoriaGasto, Gasto, StatusReembolso } from "./types";
import { paraISO } from "./format";

/**
 * Controle financeiro — regras e formatos compartilhados.
 *
 * Este módulo é o único ponto em que as regras de reembolso e de validação
 * ficam escritas, e ele é importado pelos dois lados: o formulário do painel e
 * as rotas em /api/financeiro. Duplicar a validação só no cliente deixaria a
 * API aceitar, via chamada direta, o lançamento que a interface recusa.
 *
 * Nada aqui pode importar `supabase-admin` (service role): o arquivo entra no
 * bundle do navegador.
 */

/* ------------------------------------------------------------ Formato do banco */

export interface DbCategoriaGasto {
  id: string;
  nome: string;
  ativa: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface DbGasto {
  id: string;
  descricao: string;
  categoria_id: string | null;
  data_gasto: string;
  /** NUMERIC(12,2) chega como string no supabase-js. */
  valor: string | number;
  responsavel_id: string | null;
  observacao: string | null;
  comprovante_url: string | null;
  comprovante_caminho: string | null;
  reembolso_necessario: boolean;
  reembolso_status: string;
  reembolso_data: string | null;
  reembolso_observacao: string | null;
  reembolso_por: string | null;
  reembolso_em: string | null;
  criado_por: string | null;
  criado_em: string;
  atualizado_por: string | null;
  atualizado_em: string;
}

/**
 * Colunas devolvidas pelas rotas de gasto.
 *
 * Fica aqui, e não no route.ts, porque um arquivo de rota do App Router só
 * pode exportar handlers HTTP e as configurações reconhecidas pelo framework —
 * exportar uma constante de lá quebraria a checagem de tipos do build.
 * `senha_hash` e afins não existem nesta tabela; a lista explícita serve para
 * `excluido_por` e `excluido_em` não vazarem para a interface.
 */
export const COLUNAS_GASTO =
  "id, descricao, categoria_id, data_gasto, valor, responsavel_id, observacao, " +
  "comprovante_url, comprovante_caminho, reembolso_necessario, reembolso_status, " +
  "reembolso_data, reembolso_observacao, reembolso_por, reembolso_em, " +
  "criado_por, criado_em, atualizado_por, atualizado_em";

export function converterDbCategoria(db: DbCategoriaGasto): CategoriaGasto {
  return { id: db.id, nome: db.nome, ativa: db.ativa, criadoEm: db.criado_em };
}

export function converterDbGasto(db: DbGasto): Gasto {
  return {
    id: db.id,
    descricao: db.descricao,
    categoriaId: db.categoria_id ?? undefined,
    dataGasto: db.data_gasto.slice(0, 10),
    // Number() e não parseFloat: "12,5" (formato errado vindo do banco) vira
    // NaN e aparece como problema, em vez de virar 12 silenciosamente.
    valor: Number(db.valor),
    responsavelId: db.responsavel_id ?? undefined,
    observacao: db.observacao ?? undefined,
    comprovanteUrl: db.comprovante_url ?? undefined,
    comprovanteCaminho: db.comprovante_caminho ?? undefined,
    reembolsoNecessario: db.reembolso_necessario,
    reembolsoStatus: (db.reembolso_status as StatusReembolso) ?? "nao_se_aplica",
    reembolsoData: db.reembolso_data?.slice(0, 10) ?? undefined,
    reembolsoObservacao: db.reembolso_observacao ?? undefined,
    reembolsoPor: db.reembolso_por ?? undefined,
    reembolsoEm: db.reembolso_em ?? undefined,
    criadoPor: db.criado_por ?? undefined,
    criadoEm: db.criado_em,
    atualizadoPor: db.atualizado_por ?? undefined,
    atualizadoEm: db.atualizado_em,
  };
}

/* -------------------------------------------------------------------- Rótulos */

export const rotuloStatusReembolso: Record<StatusReembolso, string> = {
  nao_se_aplica: "Não se aplica",
  pendente: "Pendente",
  reembolsado: "Reembolsado",
};

export const tomStatusReembolso: Record<StatusReembolso, "neutro" | "alerta" | "verde"> = {
  nao_se_aplica: "neutro",
  pendente: "alerta",
  reembolsado: "verde",
};

export const STATUS_REEMBOLSO: StatusReembolso[] = ["nao_se_aplica", "pendente", "reembolsado"];

export function ehStatusReembolsoValido(valor: unknown): valor is StatusReembolso {
  return typeof valor === "string" && (STATUS_REEMBOLSO as string[]).includes(valor);
}

/* --------------------------------------------------------------- Períodos */

export type PeriodoFinanceiro =
  | "mes"
  | "mes_anterior"
  | "3meses"
  | "ano"
  | "personalizado";

export const periodosFinanceiros: { valor: PeriodoFinanceiro; texto: string }[] = [
  { valor: "mes", texto: "Este mês" },
  { valor: "mes_anterior", texto: "Mês anterior" },
  { valor: "3meses", texto: "Últimos 3 meses" },
  { valor: "ano", texto: "Este ano" },
  { valor: "personalizado", texto: "Período personalizado" },
];

export interface Intervalo {
  de: string;
  ate: string;
}

/** Último dia do mês de `data`, no fuso local. */
function fimDoMes(data: Date): Date {
  return new Date(data.getFullYear(), data.getMonth() + 1, 0);
}

/**
 * Converte a escolha do seletor em um intervalo fechado de datas.
 *
 * "Últimos 3 meses" conta meses inteiros (o atual e os dois anteriores), não
 * 90 dias corridos: o financeiro fecha por competência mensal, e um recorte de
 * 90 dias parte o mês mais antigo no meio.
 */
export function intervaloDoPeriodo(
  periodo: PeriodoFinanceiro,
  personalizado?: Partial<Intervalo>,
  hoje = new Date()
): Intervalo {
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  switch (periodo) {
    case "mes":
      return { de: paraISO(new Date(ano, mes, 1)), ate: paraISO(fimDoMes(hoje)) };
    case "mes_anterior": {
      const anterior = new Date(ano, mes - 1, 1);
      return { de: paraISO(anterior), ate: paraISO(fimDoMes(anterior)) };
    }
    case "3meses":
      return { de: paraISO(new Date(ano, mes - 2, 1)), ate: paraISO(fimDoMes(hoje)) };
    case "ano":
      return { de: paraISO(new Date(ano, 0, 1)), ate: paraISO(new Date(ano, 11, 31)) };
    case "personalizado":
    default: {
      const de = personalizado?.de || paraISO(new Date(ano, mes, 1));
      const ate = personalizado?.ate || paraISO(fimDoMes(hoje));
      // Datas invertidas devolveriam lista vazia sem explicação nenhuma.
      return de <= ate ? { de, ate } : { de: ate, ate: de };
    }
  }
}

/* ------------------------------------------------------------- Validação */

export interface DadosGasto {
  descricao: string;
  categoriaId?: string | null;
  dataGasto: string;
  valor: number;
  responsavelId?: string | null;
  observacao?: string | null;
  comprovanteUrl?: string | null;
  comprovanteCaminho?: string | null;
  reembolsoNecessario: boolean;
  reembolsoStatus: StatusReembolso;
  reembolsoData?: string | null;
  reembolsoObservacao?: string | null;
}

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Aplica a coerência entre "precisa de reembolso?" e o status.
 *
 * Não é uma checagem, é uma correção: o formulário pode ter deixado o status
 * antigo para trás quando o usuário desmarcou o reembolso, e o par
 * (necessario=false, status=pendente) contaria como pendência para sempre no
 * dashboard. A mesma constraint existe no banco — aqui evitamos o erro 400
 * bruto do Postgres, lá garantimos que nada entre torto por outro caminho.
 */
export function normalizarReembolso(dados: DadosGasto): DadosGasto {
  if (!dados.reembolsoNecessario) {
    return {
      ...dados,
      reembolsoStatus: "nao_se_aplica",
      reembolsoData: null,
      reembolsoObservacao: null,
    };
  }

  const status: StatusReembolso =
    dados.reembolsoStatus === "reembolsado" ? "reembolsado" : "pendente";

  return {
    ...dados,
    reembolsoStatus: status,
    // Data de reembolso em gasto pendente é informação que contradiz o status.
    reembolsoData: status === "reembolsado" ? dados.reembolsoData ?? null : null,
  };
}

/** Devolve a primeira mensagem de erro, ou `null` quando o lançamento está válido. */
export function validarGasto(dados: DadosGasto): string | null {
  if (!dados.descricao || !dados.descricao.trim()) {
    return "Informe a descrição do gasto.";
  }
  if (dados.descricao.trim().length > 200) {
    return "A descrição deve ter no máximo 200 caracteres.";
  }
  if (!dados.dataGasto || !FORMATO_DATA.test(dados.dataGasto)) {
    return "Informe a data do gasto.";
  }
  if (!Number.isFinite(dados.valor) || dados.valor <= 0) {
    return "O valor deve ser maior que zero.";
  }
  if (dados.valor > 9_999_999_999) {
    return "O valor informado é alto demais. Confira se não há um dígito a mais.";
  }
  if (dados.reembolsoStatus === "reembolsado") {
    if (!dados.reembolsoData || !FORMATO_DATA.test(dados.reembolsoData)) {
      return "Informe a data do reembolso.";
    }
    if (dados.reembolsoData < dados.dataGasto) {
      return "A data do reembolso não pode ser anterior à data do gasto.";
    }
  }
  return null;
}

/* ------------------------------------------------------------- Indicadores */

export interface ResumoFinanceiro {
  total: number;
  totalMes: number;
  pendente: number;
  reembolsado: number;
  quantidade: number;
  quantidadePendente: number;
}

/**
 * Indicadores do topo da página, calculados sobre a lista já filtrada — o que
 * o cartão mostra é sempre o que a tabela abaixo lista.
 *
 * `totalMes` é a exceção: recorta o mês corrente de dentro do período, para
 * responder "quanto já gastamos neste mês" mesmo com o filtro em 3 meses ou no
 * ano inteiro.
 */
export function resumirGastos(gastos: Gasto[], hoje = new Date()): ResumoFinanceiro {
  const prefixoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

  return gastos.reduce<ResumoFinanceiro>(
    (resumo, gasto) => {
      resumo.total += gasto.valor;
      resumo.quantidade += 1;
      if (gasto.dataGasto.startsWith(prefixoMes)) resumo.totalMes += gasto.valor;
      if (gasto.reembolsoStatus === "pendente") {
        resumo.pendente += gasto.valor;
        resumo.quantidadePendente += 1;
      }
      if (gasto.reembolsoStatus === "reembolsado") resumo.reembolsado += gasto.valor;
      return resumo;
    },
    { total: 0, totalMes: 0, pendente: 0, reembolsado: 0, quantidade: 0, quantidadePendente: 0 }
  );
}

/* ------------------------------------------------------------ Cliente de API */

export type Resultado<T> = { ok: true; dados: T } | { ok: false; erro: string; duplicado?: boolean };

async function chamar<T>(url: string, init?: RequestInit): Promise<Resultado<T>> {
  try {
    const resposta = await fetch(url, {
      cache: "no-store",
      ...init,
      headers: init?.body ? { "Content-Type": "application/json", ...init.headers } : init?.headers,
    });
    const corpo = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      return {
        ok: false,
        erro: corpo.error ?? "Não foi possível concluir a operação.",
        duplicado: corpo.duplicado === true,
      };
    }

    return { ok: true, dados: corpo.data as T };
  } catch {
    return { ok: false, erro: "Falha de conexão. Tente novamente." };
  }
}

export interface FiltrosGastos {
  de: string;
  ate: string;
  /** Sem sessão privilegiada o servidor ignora este campo e devolve só os seus. */
  responsavelId?: string;
  categoriaId?: string;
  reembolso?: StatusReembolso | "todos" | "necessario";
}

export async function listarGastos(filtros: FiltrosGastos): Promise<Resultado<Gasto[]>> {
  const parametros = new URLSearchParams({ de: filtros.de, ate: filtros.ate });
  if (filtros.responsavelId && filtros.responsavelId !== "todos") {
    parametros.set("responsavel", filtros.responsavelId);
  }
  if (filtros.categoriaId && filtros.categoriaId !== "todas") {
    parametros.set("categoria", filtros.categoriaId);
  }
  if (filtros.reembolso && filtros.reembolso !== "todos") {
    parametros.set("reembolso", filtros.reembolso);
  }

  const resultado = await chamar<DbGasto[]>(`/api/financeiro/gastos?${parametros}`);
  return resultado.ok ? { ok: true, dados: (resultado.dados ?? []).map(converterDbGasto) } : resultado;
}

export async function criarGasto(
  dados: DadosGasto,
  confirmarDuplicado = false
): Promise<Resultado<Gasto>> {
  const resultado = await chamar<DbGasto>("/api/financeiro/gastos", {
    method: "POST",
    body: JSON.stringify({ ...dados, confirmarDuplicado }),
  });
  return resultado.ok ? { ok: true, dados: converterDbGasto(resultado.dados) } : resultado;
}

export async function atualizarGasto(id: string, dados: DadosGasto): Promise<Resultado<Gasto>> {
  const resultado = await chamar<DbGasto>("/api/financeiro/gastos", {
    method: "PATCH",
    body: JSON.stringify({ id, ...dados }),
  });
  return resultado.ok ? { ok: true, dados: converterDbGasto(resultado.dados) } : resultado;
}

export async function excluirGasto(id: string): Promise<Resultado<null>> {
  return chamar<null>(`/api/financeiro/gastos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
}

export async function marcarGastoReembolsado(
  id: string,
  observacao?: string
): Promise<Resultado<Gasto>> {
  const resultado = await chamar<DbGasto>(
    `/api/financeiro/gastos/${encodeURIComponent(id)}/reembolso`,
    { method: "POST", body: JSON.stringify({ observacao: observacao ?? null }) }
  );
  return resultado.ok ? { ok: true, dados: converterDbGasto(resultado.dados) } : resultado;
}

export async function listarCategorias(): Promise<Resultado<CategoriaGasto[]>> {
  const resultado = await chamar<DbCategoriaGasto[]>("/api/financeiro/categorias");
  return resultado.ok
    ? { ok: true, dados: (resultado.dados ?? []).map(converterDbCategoria) }
    : resultado;
}

export async function criarCategoria(nome: string): Promise<Resultado<CategoriaGasto>> {
  const resultado = await chamar<DbCategoriaGasto>("/api/financeiro/categorias", {
    method: "POST",
    body: JSON.stringify({ nome }),
  });
  return resultado.ok ? { ok: true, dados: converterDbCategoria(resultado.dados) } : resultado;
}

export async function atualizarCategoria(
  id: string,
  alteracoes: { nome?: string; ativa?: boolean }
): Promise<Resultado<CategoriaGasto>> {
  const resultado = await chamar<DbCategoriaGasto>("/api/financeiro/categorias", {
    method: "PATCH",
    body: JSON.stringify({ id, ...alteracoes }),
  });
  return resultado.ok ? { ok: true, dados: converterDbCategoria(resultado.dados) } : resultado;
}
