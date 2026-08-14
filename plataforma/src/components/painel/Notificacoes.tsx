"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDados } from "@/lib/store";
import { formatarTempoRelativo } from "@/lib/format";

const coresPorTipo: Record<string, string> = {
  lead: "bg-dourado-500",
  visita: "bg-verde-500",
  contrato: "bg-erro",
  anuncio: "bg-grafite-400",
};

export function Notificacoes() {
  const { notificacoes, marcarNotificacaoLida, marcarTodasNotificacoesLidas } = useDados();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  const naoLidas = notificacoes.filter((n) => !n.lida).length;

  useEffect(() => {
    const aoClicar = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  return (
    <div ref={caixa} className="relative">
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-label={`Notificações${naoLidas > 0 ? ` (${naoLidas} não lidas)` : ""}`}
        className="relative rounded-sm border border-linha bg-white p-2.5 text-grafite-700 transition-colors hover:bg-areia-100"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.7 21a2 2 0 01-3.4 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {naoLidas > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-erro px-1 font-mono text-[0.5625rem] font-bold text-white">
            {naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-1 w-[min(23rem,calc(100vw-2rem))] rounded-sm border border-linha bg-white shadow-cartao">
          <div className="flex items-center justify-between border-b border-linha px-4 py-3">
            <p className="text-sm font-extrabold text-verde-900">Notificações</p>
            {naoLidas > 0 && (
              <button
                type="button"
                onClick={marcarTodasNotificacoesLidas}
                className="text-xs font-bold text-dourado-600 underline underline-offset-2"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="scroll-fino max-h-96 overflow-y-auto">
            {notificacoes.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-grafite-400">
                Nenhuma notificação por enquanto.
              </p>
            ) : (
              notificacoes.slice(0, 12).map((n) => (
                <Link
                  key={n.id}
                  href={n.href ?? "/painel"}
                  onClick={() => {
                    marcarNotificacaoLida(n.id);
                    setAberto(false);
                  }}
                  className={`flex gap-3 border-b border-linha px-4 py-3.5 last:border-0 hover:bg-areia-100 ${n.lida ? "opacity-55" : ""}`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${coresPorTipo[n.tipo] ?? "bg-grafite-400"}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-verde-900">{n.titulo}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-grafite-500">
                      {n.descricao}
                    </span>
                    <span className="mt-1 block font-mono text-[0.625rem] text-grafite-400">
                      {formatarTempoRelativo(n.data)}
                    </span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
