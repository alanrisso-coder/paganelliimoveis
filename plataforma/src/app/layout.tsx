import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans } from "next/font/google";
import { DadosProvider } from "@/lib/store";
import { SessaoProvider } from "@/lib/auth";
import "./globals.css";

/** Tipografia institucional do brand book — títulos e destaques conceituais. */
const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Tipografia complementar — corpo de texto, tabelas e interface. */
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Paganelli Imóveis — Encontre o imóvel ideal para o seu próximo capítulo",
    template: "%s · Paganelli Imóveis",
  },
  description:
    "Imobiliária de alto padrão com curadoria de casas, apartamentos e terrenos para venda e locação em Palhoça e na Grande Florianópolis. Assessoria completa em compra, venda, locação e exclusividade.",
  keywords: [
    "imobiliária",
    "imóveis de alto padrão",
    "casas à venda",
    "apartamentos para alugar",
    "Paganelli Imóveis",
  ],
  openGraph: {
    title: "Paganelli Imóveis",
    description:
      "Curadoria de imóveis de alto padrão e assessoria presente em cada decisão importante.",
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // As variáveis das fontes ficam no <html>: os tokens `--font-sans` e
    // `--font-display` do @theme são resolvidos no :root e, se as variáveis
    // estivessem só no <body>, resolveriam para vazio e a marca cairia na
    // fonte do sistema.
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${cormorant.variable} ${jakarta.variable}`}
    >
      <body className="antialiased">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-verde-800 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <SessaoProvider>
          <DadosProvider>{children}</DadosProvider>
        </SessaoProvider>
      </body>
    </html>
  );
}
