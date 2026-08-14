"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { classes } from "@/lib/format";

/** Galeria com destaque, miniaturas e visualização em tela cheia. */
export function GaleriaImovel({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [atual, setAtual] = useState(0);
  const [ampliada, setAmpliada] = useState(false);

  const anterior = useCallback(
    () => setAtual((i) => (i - 1 + fotos.length) % fotos.length),
    [fotos.length],
  );
  const proxima = useCallback(() => setAtual((i) => (i + 1) % fotos.length), [fotos.length]);

  useEffect(() => {
    if (!ampliada) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAmpliada(false);
      if (e.key === "ArrowLeft") anterior();
      if (e.key === "ArrowRight") proxima();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [ampliada, anterior, proxima]);

  if (fotos.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-sm bg-areia-200 text-sm text-grafite-400">
        Sem fotos disponíveis
      </div>
    );
  }

  const setas = (
    <>
      <button
        type="button"
        onClick={anterior}
        aria-label="Foto anterior"
        className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-sm bg-areia-50/90 p-2.5 text-verde-800 backdrop-blur transition-colors hover:bg-areia-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={proxima}
        aria-label="Próxima foto"
        className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-sm bg-areia-50/90 p-2.5 text-verde-800 backdrop-blur transition-colors hover:bg-areia-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </>
  );

  return (
    <>
      <div className="relative aspect-[16/10] overflow-hidden rounded-sm bg-areia-200">
        <Image
          src={fotos[atual]}
          alt={`${titulo} — foto ${atual + 1} de ${fotos.length}`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 66vw"
          className="object-cover"
        />
        {fotos.length > 1 && setas}
        <button
          type="button"
          onClick={() => setAmpliada(true)}
          className="absolute bottom-3 right-3 z-10 rounded-sm bg-verde-900/85 px-3 py-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-areia-50 backdrop-blur transition-colors hover:bg-verde-900"
        >
          Ampliar · {atual + 1}/{fotos.length}
        </button>
      </div>

      {fotos.length > 1 && (
        <div className="scroll-fino mt-3 flex gap-2 overflow-x-auto pb-1">
          {fotos.map((foto, i) => (
            <button
              key={foto + i}
              type="button"
              onClick={() => setAtual(i)}
              aria-label={`Ver foto ${i + 1}`}
              aria-current={i === atual}
              className={classes(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-sm transition-opacity",
                i === atual ? "ring-2 ring-dourado-500" : "opacity-65 hover:opacity-100",
              )}
            >
              <Image src={foto} alt="" fill sizes="96px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      {ampliada && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-verde-950/96 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Galeria ampliada de ${titulo}`}
          onClick={() => setAmpliada(false)}
        >
          <div className="relative h-full w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={fotos[atual]}
              alt={`${titulo} — foto ${atual + 1} de ${fotos.length}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {fotos.length > 1 && setas}
          </div>
          <button
            type="button"
            onClick={() => setAmpliada(false)}
            aria-label="Fechar galeria"
            className="absolute right-5 top-5 rounded-sm bg-areia-50/12 p-3 text-areia-50 transition-colors hover:bg-areia-50/22"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
