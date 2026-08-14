import type {
  EtapaFunil,
  FinalidadeImovel,
  Imovel,
  StatusAnuncio,
  StatusContrato,
  StatusImovel,
  StatusVisita,
  TipoImovel,
} from "./types";

/* ------------------------------------------------------------- Formatação */

const moeda = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
});

const moedaCompacta = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const numero = new Intl.NumberFormat("pt-BR");

export function formatarMoeda(valor?: number | null): string {
  if (valor === undefined || valor === null) return "Sob consulta";
  return moeda.format(valor);
}

/** R$ 1.250.000 — usado em cards e tabelas, onde os centavos poluem. */
export function formatarMoedaCurta(valor?: number | null): string {
  if (valor === undefined || valor === null) return "Sob consulta";
  return moedaCompacta.format(valor);
}

export function formatarNumero(valor: number): string {
  return numero.format(valor);
}

export function formatarArea(m2?: number): string {
  if (!m2) return "—";
  return `${numero.format(m2)} m²`;
}

/** Converte "2026-08-13" (ou ISO completo) em "13/08/2026" sem deslocar fuso. */
export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataExtenso(iso: string): string {
  const data = criarDataLocal(iso);
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return formatarData(iso);
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "há 12 minutos", "há 3 dias" — usado nas listas de atividade. */
export function formatarTempoRelativo(iso: string, agora = new Date()): string {
  const data = new Date(iso);
  const diffMs = agora.getTime() - data.getTime();
  const minutos = Math.round(diffMs / 60000);

  if (minutos < 1) return "agora mesmo";
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.round(horas / 24);
  if (dias < 30) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;

  const meses = Math.round(dias / 30);
  return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

export function formatarTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "");
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  }
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return valor;
}

export function formatarDocumento(valor: string): string {
  const d = valor.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return valor;
}

export function formatarCep(valor: string): string {
  const d = valor.replace(/\D/g, "");
  if (d.length === 8) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return valor;
}

export function formatarPercentual(valor: number): string {
  return `${numero.format(valor)}%`;
}

/* ------------------------------------------------------------------ Datas */

/** Cria Date no fuso local a partir de "YYYY-MM-DD", evitando o off-by-one do UTC. */
export function criarDataLocal(iso: string): Date {
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

export function paraISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function diasAte(iso: string, referencia = new Date()): number {
  const alvo = criarDataLocal(iso);
  const base = new Date(referencia.getFullYear(), referencia.getMonth(), referencia.getDate());
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
}

export function adicionarMeses(iso: string, meses: number): string {
  const data = criarDataLocal(iso);
  data.setMonth(data.getMonth() + meses);
  return paraISO(data);
}

export function mesmaSemana(iso: string, referencia = new Date()): boolean {
  const dias = diasAte(iso, referencia);
  return dias >= 0 && dias <= 6;
}

/* ------------------------------------------------------------- Rótulos PT */

export const rotuloTipoImovel: Record<TipoImovel, string> = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
  comercial: "Comercial",
  fazenda: "Fazenda",
  cobertura: "Cobertura",
};

export const rotuloFinalidade: Record<FinalidadeImovel, string> = {
  venda: "Venda",
  aluguel: "Locação",
  ambos: "Venda e locação",
};

export const rotuloStatusImovel: Record<StatusImovel, string> = {
  disponivel: "Disponível",
  reservado: "Reservado",
  vendido: "Vendido",
  alugado: "Alugado",
  inativo: "Inativo",
};

export const rotuloStatusAnuncio: Record<StatusAnuncio, string> = {
  rascunho: "Rascunho",
  revisao: "Em revisão",
  publicado: "Publicado",
  pausado: "Pausado",
  expirado: "Expirado",
  arquivado: "Arquivado",
};

export const rotuloStatusVisita: Record<StatusVisita, string> = {
  agendada: "Agendada",
  confirmada: "Confirmada",
  realizada: "Realizada",
  cancelada: "Cancelada",
  nao_compareceu: "Não compareceu",
};

export const rotuloStatusContrato: Record<StatusContrato, string> = {
  rascunho: "Rascunho",
  aguardando_assinatura: "Aguardando assinatura",
  ativo: "Ativo",
  vencendo: "Próximo do vencimento",
  vencido: "Vencido",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

export const rotuloEtapaFunil: Record<EtapaFunil, string> = {
  novo: "Novo lead",
  contato: "Contato realizado",
  qualificado: "Qualificado",
  visita: "Visita agendada",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
};

export const etapasFunil: EtapaFunil[] = [
  "novo",
  "contato",
  "qualificado",
  "visita",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
];

/* --------------------------------------------------- Derivações de imóvel */

/** Preço que representa o imóvel na vitrine: venda quando houver, senão aluguel. */
export function precoPrincipal(imovel: Imovel): number {
  return imovel.valores.venda ?? imovel.valores.aluguel ?? 0;
}

export function precoFormatado(imovel: Imovel): string {
  if (imovel.valores.venda) return formatarMoedaCurta(imovel.valores.venda);
  if (imovel.valores.aluguel) return `${formatarMoedaCurta(imovel.valores.aluguel)}/mês`;
  return "Sob consulta";
}

export function enderecoResumido(imovel: Imovel): string {
  return `${imovel.endereco.bairro}, ${imovel.endereco.cidade}`;
}

export function enderecoCompleto(imovel: Imovel): string {
  const { logradouro, numero: num, complemento, bairro, cidade, estado, cep } = imovel.endereco;
  const compl = complemento ? `, ${complemento}` : "";
  return `${logradouro}, ${num}${compl} — ${bairro}, ${cidade}/${estado} · CEP ${formatarCep(cep)}`;
}

/* ------------------------------------------------------------ Utilitários */

export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primeira + ultima).toUpperCase();
}

export function classes(...valores: (string | false | null | undefined)[]): string {
  return valores.filter(Boolean).join(" ");
}
