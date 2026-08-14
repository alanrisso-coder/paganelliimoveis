"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDados } from "@/lib/store";
import { enderecoResumido, precoFormatado, rotuloEtapaFunil } from "@/lib/format";

interface Resultado {
  tipo: string;
  titulo: string;
  detalhe: string;
  href: string;
}

/** Busca rápida do painel — atalho "/" foca o campo, Esc fecha. */
export function BuscaGlobal() {
  const { imoveis, clientes, anuncios, contratos } = useDados();
  const [termo, setTermo] = useState("");
  const [aberto, setAberto] = useState(false);
  const campo = useRef<HTMLInputElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement;
      const digitando = ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName);
      if (e.key === "/" && !digitando) {
        e.preventDefault();
        campo.current?.focus();
      }
      if (e.key === "Escape") setAberto(false);
    };
    const aoClicar = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("keydown", aoTeclar);
    document.addEventListener("mousedown", aoClicar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.removeEventListener("mousedown", aoClicar);
    };
  }, []);

  const resultados = useMemo<Resultado[]>(() => {
    const t = termo.trim().toLowerCase();
    if (t.length < 2) return [];

    const achados: Resultado[] = [];

    for (const i of imoveis) {
      if (`${i.titulo} ${i.codigo} ${i.endereco.bairro} ${i.endereco.cidade}`.toLowerCase().includes(t)) {
        achados.push({
          tipo: "Imóvel",
          titulo: `${i.codigo} · ${i.titulo}`,
          detalhe: `${enderecoResumido(i)} — ${precoFormatado(i)}`,
          href: `/painel/imoveis/${i.id}`,
        });
      }
    }
    for (const c of clientes) {
      if (`${c.nome} ${c.email} ${c.telefone}`.toLowerCase().includes(t)) {
        achados.push({
          tipo: "Cliente",
          titulo: c.nome,
          detalhe: `${rotuloEtapaFunil[c.etapa]} — ${c.email || c.telefone}`,
          href: `/painel/crm/${c.id}`,
        });
      }
    }
    for (const a of anuncios) {
      if (`${a.codigo} ${a.titulo}`.toLowerCase().includes(t)) {
        achados.push({
          tipo: "Anúncio",
          titulo: `${a.codigo} · ${a.titulo}`,
          detalhe: a.status,
          href: "/painel/anuncios",
        });
      }
    }
    for (const ct of contratos) {
      if (ct.numero.toLowerCase().includes(t)) {
        achados.push({
          tipo: "Contrato",
          titulo: ct.numero,
          detalhe: ct.status,
          href: "/painel/contratos",
        });
      }
    }
    return achados.slice(0, 8);
  }, [termo, imoveis, clientes, anuncios, contratos]);

  return (
    <div ref={caixa} className="relative w-full max-w-md">
      <label htmlFor="busca-global" className="sr-only">
        Buscar no painel
      </label>
      <svg
        width="15"
        height="15"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-grafite-400"
      >
        <path d="M9 15A6 6 0 109 3a6 6 0 000 12zM17 17l-3.8-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        ref={campo}
        id="busca-global"
        type="search"
        value={termo}
        onChange={(e) => {
          setTermo(e.target.value);
          setAberto(true);
        }}
        onFocus={() => setAberto(true)}
        placeholder="Buscar imóvel, cliente, anúncio ou contrato…"
        role="combobox"
        aria-expanded={aberto && resultados.length > 0}
        aria-controls="resultados-busca"
        className="w-full rounded-sm border border-linha bg-white py-2.5 pl-9 pr-12 text-sm placeholder:text-grafite-400"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-linha bg-areia-100 px-1.5 py-0.5 font-mono text-[0.625rem] text-grafite-400 sm:block">
        /
      </kbd>

      {aberto && termo.trim().length >= 2 && (
        <div
          id="resultados-busca"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-sm border border-linha bg-white shadow-cartao"
        >
          {resultados.length === 0 ? (
            <p className="px-4 py-5 text-center text-sm text-grafite-400">
              Nada encontrado para “{termo}”.
            </p>
          ) : (
            resultados.map((r) => (
              <Link
                key={r.href + r.titulo}
                href={r.href}
                role="option"
                aria-selected="false"
                onClick={() => {
                  setAberto(false);
                  setTermo("");
                }}
                className="flex items-start gap-3 border-b border-linha px-4 py-3 last:border-0 hover:bg-areia-100"
              >
                <span className="mt-0.5 shrink-0 rounded-sm bg-areia-200 px-1.5 py-0.5 font-mono text-[0.5625rem] uppercase tracking-wide text-grafite-500">
                  {r.tipo}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-verde-900">{r.titulo}</span>
                  <span className="block truncate text-xs text-grafite-400">{r.detalhe}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
