"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { classes } from "@/lib/format";
import { useDados } from "@/lib/store";

const navegacao = [
  { href: "/imoveis/venda", texto: "Comprar" },
  { href: "/sobre", texto: "A imobiliária" },
  { href: "/servicos", texto: "Serviços" },
  { href: "/contato", texto: "Contato" },
];

export function Cabecalho() {
  const caminho = usePathname();
  const [aberto, setAberto] = useState(false);
  const { favoritosVisitante } = useDados();

  const fechar = () => setAberto(false);

  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-areia-50/92 backdrop-blur-lg">
      <div className="container-paganelli flex h-20 items-center justify-between gap-6 lg:h-24">
        <Link href="/" className="shrink-0" aria-label="Paganelli Imóveis — página inicial">
          {/* Largura mínima de 140px em telas, conforme o brand book. */}
          <Image
            src="/logo-paganelli.png"
            alt="Paganelli Imóveis"
            width={620}
            height={295}
            priority
            className="h-auto w-[140px] lg:w-[168px]"
          />
        </Link>

        <nav aria-label="Navegação principal" className="hidden items-center gap-8 lg:flex">
          {navegacao.map((item) => {
            const ativo = caminho.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={classes(
                  "relative text-[0.8125rem] font-bold transition-colors",
                  ativo ? "text-verde-800" : "text-grafite-700 hover:text-verde-800",
                )}
              >
                {item.texto}
                {ativo && (
                  <span className="absolute -bottom-1.5 left-0 h-px w-full bg-dourado-500" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/favoritos"
            className="relative hidden rounded-sm p-2.5 text-grafite-700 transition-colors hover:bg-areia-200 hover:text-verde-800 sm:block"
            aria-label={`Imóveis favoritos (${favoritosVisitante.length})`}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 000-7.8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {favoritosVisitante.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-dourado-500 px-1 font-mono text-[0.5625rem] font-bold text-verde-950">
                {favoritosVisitante.length}
              </span>
            )}
          </Link>

          <Link
            href="/anuncie"
            className="hidden rounded-sm bg-verde-800 px-4 py-2.5 text-xs font-extrabold text-areia-50 transition-colors hover:bg-verde-700 md:inline-block"
          >
            Anuncie seu imóvel
          </Link>

          <button
            type="button"
            onClick={() => setAberto((a) => !a)}
            aria-expanded={aberto}
            aria-controls="menu-movel"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            className="rounded-sm p-2.5 text-verde-800 transition-colors hover:bg-areia-200 lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              {aberto ? (
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              ) : (
                <path d="M2.5 5.5h15M2.5 10h15M2.5 14.5h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {aberto && (
        <nav
          id="menu-movel"
          aria-label="Navegação principal"
          className="animar-entrada border-t border-linha bg-areia-50 lg:hidden"
        >
          <div className="container-paganelli flex flex-col py-2">
            {navegacao.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={fechar}
                className="border-b border-linha/70 py-3.5 text-sm font-bold text-grafite-700"
              >
                {item.texto}
              </Link>
            ))}
            <Link
              href="/favoritos"
              onClick={fechar}
              className="border-b border-linha/70 py-3.5 text-sm font-bold text-grafite-700"
            >
              Favoritos ({favoritosVisitante.length})
            </Link>
            <Link
              href="/anuncie"
              onClick={fechar}
              className="my-4 rounded-sm bg-verde-800 px-4 py-3 text-center text-xs font-extrabold text-areia-50"
            >
              Anuncie seu imóvel
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
