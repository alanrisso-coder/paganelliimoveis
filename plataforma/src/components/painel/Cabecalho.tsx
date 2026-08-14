"use client";

import { BuscaGlobal } from "./BuscaGlobal";
import { Notificacoes } from "./Notificacoes";

/** Cabeçalho de cada página do painel: título, descrição e ações à direita. */
export function CabecalhoPagina({
  titulo,
  descricao,
  acoes,
}: {
  titulo: string;
  descricao: string;
  acoes?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl text-verde-900">{titulo}</h1>
        <p className="mt-1.5 text-sm text-grafite-500">{descricao}</p>
      </div>
      {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
    </header>
  );
}

/** Barra fixa do topo, comum a todas as páginas do painel. */
export function BarraTopo({ aoAbrirMenu }: { aoAbrirMenu: () => void }) {
  return (
    <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-linha bg-areia-100/92 px-5 py-3 backdrop-blur-lg lg:px-8">
      <button
        type="button"
        onClick={aoAbrirMenu}
        aria-label="Abrir menu"
        className="rounded-sm border border-linha bg-white p-2.5 text-verde-800 lg:hidden"
      >
        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M2.5 5.5h15M2.5 10h15M2.5 14.5h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      </button>

      <BuscaGlobal />

      <div className="ml-auto flex items-center gap-2">
        <Notificacoes />
      </div>
    </div>
  );
}
