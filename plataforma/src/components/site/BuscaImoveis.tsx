"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { classes } from "@/lib/format";

const regioes = [
  "Pedra Branca",
  "Pagani",
  "Passa Vinte",
  "Ponte do Imaruim",
  "Jardim Eldorado",
  "Centro",
  "Enseada de Brito",
  "Guarda do Cubatão",
  "Forquilhinhas",
  "Santo Amaro da Imperatriz",
];

const tipos = [
  { valor: "todos", texto: "Todos os tipos" },
  { valor: "casa", texto: "Casa" },
  { valor: "apartamento", texto: "Apartamento" },
  { valor: "cobertura", texto: "Cobertura" },
  { valor: "terreno", texto: "Terreno" },
  { valor: "comercial", texto: "Comercial" },
  { valor: "fazenda", texto: "Fazenda" },
];

/**
 * Busca do hero. Traduz a seleção em querystring e delega o filtro real para a
 * página de listagem, que é a fonte única da lógica de filtragem.
 */
export function BuscaImoveis({ escuro = false }: { escuro?: boolean }) {
  const router = useRouter();
  const [regiao, setRegiao] = useState("");
  const [tipo, setTipo] = useState("todos");
  const [precoMax, setPrecoMax] = useState("");

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (regiao) params.set("regiao", regiao);
    if (tipo !== "todos") params.set("tipo", tipo);
    if (precoMax) params.set("precoMax", precoMax);
    router.push(`/imoveis/venda${params.size ? `?${params}` : ""}`);
  }

  const faixas = [
    { valor: "500000", texto: "Até R$ 500.000" },
    { valor: "900000", texto: "Até R$ 900.000" },
    { valor: "1500000", texto: "Até R$ 1.500.000" },
    { valor: "3000000", texto: "Até R$ 3.000.000" },
  ];

  const rotulo = classes(
    "mb-1 block font-mono text-[0.625rem] uppercase tracking-[0.14em]",
    escuro ? "text-areia-100/60" : "text-grafite-400",
  );
  const controle = classes(
    "w-full appearance-none rounded-sm border bg-transparent px-0 py-1 text-sm outline-none",
    escuro
      ? "border-transparent text-areia-50 [&>option]:text-grafite-900"
      : "border-transparent text-grafite-900",
  );

  return (
    <form
      onSubmit={buscar}
      className={classes(
        "rounded-sm p-2 shadow-cartao",
        escuro ? "bg-verde-900/85 backdrop-blur-md" : "bg-white",
      )}
      role="search"
      aria-label="Buscar imóveis"
    >
      <div className="grid gap-px sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_auto]">
        <div className={classes("px-3 py-2", escuro ? "" : "sm:border-r sm:border-linha")}>
          <label htmlFor="busca-regiao" className={rotulo}>
            Onde você procura
          </label>
          <select
            id="busca-regiao"
            value={regiao}
            onChange={(e) => setRegiao(e.target.value)}
            className={controle}
          >
            <option value="">Todas as regiões</option>
            {regioes.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div className={classes("px-3 py-2", escuro ? "" : "lg:border-r lg:border-linha")}>
          <label htmlFor="busca-tipo" className={rotulo}>
            Tipo de imóvel
          </label>
          <select id="busca-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={controle}>
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.texto}
              </option>
            ))}
          </select>
        </div>

        <div className="px-3 py-2">
          <label htmlFor="busca-preco" className={rotulo}>
            Faixa de preço
          </label>
          <select
            id="busca-preco"
            value={precoMax}
            onChange={(e) => setPrecoMax(e.target.value)}
            className={controle}
          >
            <option value="">Qualquer valor</option>
            {faixas.map((f) => (
              <option key={f.valor} value={f.valor}>
                {f.texto}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="mt-1 rounded-sm bg-dourado-500 px-8 py-3.5 text-sm font-extrabold text-verde-950 transition-colors hover:bg-dourado-400 lg:mt-0"
        >
          Buscar imóveis
        </button>
      </div>
    </form>
  );
}
