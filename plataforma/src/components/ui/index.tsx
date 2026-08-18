"use client";

import { useEffect, useId, useRef } from "react";
import { classes } from "@/lib/format";

/* ------------------------------------------------------------------ Botão */

type VarianteBotao = "primario" | "dourado" | "contorno" | "fantasma" | "perigo";
type TamanhoBotao = "sm" | "md" | "lg";

const variantesBotao: Record<VarianteBotao, string> = {
  primario: "bg-verde-800 text-areia-50 hover:bg-verde-700",
  dourado: "bg-dourado-500 text-verde-950 hover:bg-dourado-400",
  contorno: "border border-verde-800/25 text-verde-800 hover:bg-verde-800/6",
  fantasma: "text-verde-800 hover:bg-verde-800/8",
  perigo: "border border-erro/30 text-erro hover:bg-erro/8",
};

const tamanhosBotao: Record<TamanhoBotao, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

export function Botao({
  variante = "primario",
  tamanho = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: VarianteBotao;
  tamanho?: TamanhoBotao;
}) {
  return (
    <button
      className={classes(
        "inline-flex items-center justify-center gap-2 rounded-sm font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        variantesBotao[variante],
        tamanhosBotao[tamanho],
        className,
      )}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------- Selo */

type TomSelo = "neutro" | "verde" | "dourado" | "alerta" | "erro" | "escuro";

const tonsSelo: Record<TomSelo, string> = {
  neutro: "bg-areia-200 text-grafite-700",
  verde: "bg-verde-100 text-verde-700",
  dourado: "bg-dourado-100 text-dourado-700",
  alerta: "bg-[#f7edd9] text-alerta",
  erro: "bg-[#f7e6e4] text-erro",
  escuro: "bg-verde-800 text-areia-50",
};

export function Selo({
  tom = "neutro",
  children,
  className,
}: {
  tom?: TomSelo;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={classes(
        "inline-flex items-center rounded-sm px-2 py-1 font-mono text-[0.625rem] uppercase tracking-[0.12em]",
        tonsSelo[tom],
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ Campos */

export const baseCampo =
  "w-full rounded-sm border border-linha bg-white px-3 py-2.5 text-sm text-grafite-900 " +
  "placeholder:text-grafite-400 transition-colors focus:border-dourado-500";

export function Campo({
  rotulo,
  dica,
  erro,
  className,
  id: idProp,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  rotulo: string;
  dica?: string;
  erro?: string;
}) {
  const gerado = useId();
  const id = idProp ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-grafite-700">
        {rotulo}
        {props.required && <span className="ml-0.5 text-erro">*</span>}
      </label>
      <input
        id={id}
        aria-describedby={dica || erro ? `${id}-desc` : undefined}
        aria-invalid={erro ? true : undefined}
        className={classes(baseCampo, erro && "border-erro")}
        {...props}
      />
      {(dica || erro) && (
        <p id={`${id}-desc`} className={classes("mt-1 text-xs", erro ? "text-erro" : "text-grafite-400")}>
          {erro ?? dica}
        </p>
      )}
    </div>
  );
}

export function CampoSelecao({
  rotulo,
  opcoes,
  className,
  id: idProp,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  rotulo: string;
  opcoes: { valor: string; texto: string }[];
}) {
  const gerado = useId();
  const id = idProp ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-grafite-700">
        {rotulo}
      </label>
      <select id={id} className={classes(baseCampo, "appearance-none bg-white pr-8")} {...props}>
        {opcoes.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CampoTexto({
  rotulo,
  className,
  id: idProp,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { rotulo: string }) {
  const gerado = useId();
  const id = idProp ?? gerado;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-grafite-700">
        {rotulo}
      </label>
      <textarea id={id} rows={4} className={classes(baseCampo, "resize-y")} {...props} />
    </div>
  );
}

/* ------------------------------------------------------- Texto formatado */

const MARCADORES_FORMATACAO = /\*\*(.+?)\*\*|\*(.+?)\*/g;

/**
 * Converte negrito/itálico em formato Markdown leve (**negrito**, *itálico*)
 * em nós React — nunca em HTML bruto, então não existe risco de injeção.
 * Cobre só esses dois marcadores de propósito: é o suficiente para dar
 * ênfase num texto de descrição, sem precisar de um editor rich-text.
 */
export function analisarTextoFormatado(texto: string): React.ReactNode[] {
  const partes: React.ReactNode[] = [];
  let ultimoIndice = 0;
  let contador = 0;
  const regex = new RegExp(MARCADORES_FORMATACAO);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(texto))) {
    if (match.index > ultimoIndice) {
      partes.push(texto.slice(ultimoIndice, match.index));
    }
    if (match[1] !== undefined) {
      partes.push(<strong key={`n${contador++}`}>{match[1]}</strong>);
    } else if (match[2] !== undefined) {
      partes.push(<em key={`i${contador++}`}>{match[2]}</em>);
    }
    ultimoIndice = regex.lastIndex;
  }
  if (ultimoIndice < texto.length) {
    partes.push(texto.slice(ultimoIndice));
  }
  return partes;
}

export function TextoFormatado({ texto, className }: { texto: string; className?: string }) {
  return <p className={classes("whitespace-pre-line", className)}>{analisarTextoFormatado(texto)}</p>;
}

/** Insere (ou remove, se a seleção já estiver envolvida) um marcador ao redor do texto selecionado. */
function alternarMarcador(textarea: HTMLTextAreaElement, valor: string, marcador: string): string {
  const inicio = textarea.selectionStart;
  const fim = textarea.selectionEnd;
  const selecionado = valor.slice(inicio, fim);
  const antes = valor.slice(Math.max(0, inicio - marcador.length), inicio);
  const depois = valor.slice(fim, fim + marcador.length);

  if (selecionado && antes === marcador && depois === marcador) {
    const novo =
      valor.slice(0, inicio - marcador.length) + selecionado + valor.slice(fim + marcador.length);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(inicio - marcador.length, fim - marcador.length);
    });
    return novo;
  }

  const novo = valor.slice(0, inicio) + marcador + selecionado + marcador + valor.slice(fim);
  requestAnimationFrame(() => {
    textarea.focus();
    const cursor = selecionado
      ? inicio + marcador.length * 2 + selecionado.length
      : inicio + marcador.length;
    textarea.setSelectionRange(cursor, cursor);
  });
  return novo;
}

/**
 * Como CampoTexto, mas com botões de negrito/itálico (Markdown leve:
 * **negrito**, *itálico*) e uma pré-visualização de como o texto vai
 * aparecer formatado no anúncio.
 */
export function CampoTextoFormatado({
  rotulo,
  value,
  onChange,
  className,
  rows = 6,
  dica,
}: {
  rotulo: string;
  value: string;
  onChange: (valor: string) => void;
  className?: string;
  rows?: number;
  dica?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);

  function aplicar(marcador: string) {
    const textarea = ref.current;
    if (!textarea) return;
    onChange(alternarMarcador(textarea, value, marcador));
  }

  return (
    <div className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-xs font-bold text-grafite-700">
          {rotulo}
        </label>
        <div className="flex gap-1" role="group" aria-label="Formatação de texto">
          <button
            type="button"
            onClick={() => aplicar("**")}
            title="Negrito"
            aria-label="Aplicar negrito à seleção"
            className="rounded-sm border border-linha px-2.5 py-1 text-xs font-extrabold text-grafite-700 hover:border-verde-800/40 hover:bg-verde-800/6"
          >
            N
          </button>
          <button
            type="button"
            onClick={() => aplicar("*")}
            title="Itálico"
            aria-label="Aplicar itálico à seleção"
            className="rounded-sm border border-linha px-2.5 py-1 text-xs italic text-grafite-700 hover:border-verde-800/40 hover:bg-verde-800/6"
          >
            I
          </button>
        </div>
      </div>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={classes(baseCampo, "resize-y")}
      />
      <p className="mt-1 text-[0.6875rem] text-grafite-400">
        {dica ?? "Selecione um trecho e clique em N ou I para negrito/itálico."}
      </p>
      {value.trim() && (
        <div className="mt-2 rounded-sm border border-linha bg-areia-50 px-3.5 py-3">
          <p className="mb-1.5 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
            Pré-visualização
          </p>
          <TextoFormatado texto={value} className="text-sm leading-relaxed text-grafite-700" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */

export function Modal({
  aberto,
  aoFechar,
  titulo,
  descricao,
  children,
  largura = "md",
}: {
  aberto: boolean;
  aoFechar: () => void;
  titulo: string;
  descricao?: string;
  children: React.ReactNode;
  largura?: "md" | "lg" | "xl";
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tituloId = useId();

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar();
    };
    document.addEventListener("keydown", aoTeclar);
    // Impede o fundo de rolar enquanto o diálogo está aberto.
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    caixa.current?.focus();
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  const larguras = { md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-verde-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) aoFechar();
      }}
    >
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className={classes(
          "animar-entrada scroll-fino max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-areia-50 p-6 shadow-cartao outline-none sm:rounded-sm sm:p-8",
          larguras[largura],
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id={tituloId} className="font-display text-2xl text-verde-900">
              {titulo}
            </h2>
            {descricao && <p className="mt-1.5 text-sm leading-relaxed text-grafite-500">{descricao}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-1 -mt-1 rounded-sm p-2 text-grafite-400 transition-colors hover:bg-areia-200 hover:text-grafite-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ Estado vazio */

export function EstadoVazio({
  titulo,
  descricao,
  acao,
  icone = "busca",
}: {
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
  icone?: "busca" | "casa" | "agenda";
}) {
  const desenhos = {
    busca: "M9 17A8 8 0 109 1a8 8 0 000 16zM19 19l-4.35-4.35",
    casa: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5",
    agenda: "M3 6h18v15H3zM3 10h18M8 3v4M16 3v4",
  };
  return (
    <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-linha bg-areia-50 px-6 py-16 text-center">
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        className="mb-4 text-dourado-400"
        aria-hidden="true"
      >
        <path d={desenhos[icone]} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h3 className="font-display text-xl text-verde-900">{titulo}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-grafite-500">{descricao}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}

/* -------------------------------------------------------------- Carregando */

export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      className={classes("animate-pulse rounded-sm bg-areia-200", className)}
      aria-hidden="true"
    />
  );
}

export function CarregandoCards({ quantidade = 6 }: { quantidade?: number }) {
  return (
    <div
      role="status"
      aria-label="Carregando imóveis"
      className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: quantidade }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-sm bg-white">
          <Esqueleto className="h-56 w-full rounded-none" />
          <div className="space-y-3 p-5">
            <Esqueleto className="h-3 w-24" />
            <Esqueleto className="h-5 w-3/4" />
            <Esqueleto className="h-3 w-1/2" />
            <Esqueleto className="h-6 w-32" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Painel */

export function Painel({
  titulo,
  acao,
  children,
  className,
}: {
  titulo?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={classes("rounded-sm border border-linha bg-white p-5", className)}>
      {(titulo || acao) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-sm font-extrabold text-verde-900">{titulo}</h2>}
          {acao}
        </header>
      )}
      {children}
    </section>
  );
}
