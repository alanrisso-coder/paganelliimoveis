"use client";

import { classes, formatarNumero } from "@/lib/format";

/** Barras horizontais — usado no funil e nas distribuições dos relatórios. */
export function BarrasHorizontais({
  dados,
  formatar = formatarNumero,
}: {
  dados: { rotulo: string; valor: number; destaque?: boolean }[];
  formatar?: (v: number) => string;
}) {
  const maximo = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <ul className="space-y-3">
      {dados.map((d) => (
        <li key={d.rotulo}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span className="text-grafite-500">{d.rotulo}</span>
            <span className="font-mono font-bold text-verde-900">{formatar(d.valor)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-areia-200">
            <div
              className={classes("h-full rounded-full", d.destaque ? "bg-verde-800" : "bg-dourado-500")}
              style={{ width: `${Math.max((d.valor / maximo) * 100, d.valor > 0 ? 3 : 0)}%` }}
              role="img"
              aria-label={`${d.rotulo}: ${formatar(d.valor)}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Funil comercial em colunas, com taxa de conversão entre a primeira e a última etapa. */
export function FunilComercial({ etapas }: { etapas: { rotulo: string; valor: number }[] }) {
  const maximo = Math.max(...etapas.map((e) => e.valor), 1);
  // A base é todo mundo que entrou no funil, não só quem está na primeira
  // etapa — senão a taxa fica 0% sempre que não há lead novo no dia.
  const total = etapas.reduce((s, e) => s + e.valor, 0);
  const fechados = etapas[etapas.length - 1]?.valor ?? 0;
  const conversao = total > 0 ? Math.round((fechados / total) * 100) : 0;

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: "10rem" }}>
        {etapas.map((etapa, i) => (
          <div key={etapa.rotulo} className="flex h-full flex-1 flex-col justify-end">
            <span className="mb-1.5 text-center font-mono text-[0.6875rem] font-bold text-verde-900">
              {etapa.valor}
            </span>
            <div
              className={classes(
                "rounded-t-sm transition-all",
                i === etapas.length - 1 ? "bg-verde-800" : "bg-dourado-400",
              )}
              style={{ height: `${Math.max((etapa.valor / maximo) * 100, etapa.valor > 0 ? 6 : 2)}%` }}
              role="img"
              aria-label={`${etapa.rotulo}: ${etapa.valor}`}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex gap-2 border-t border-linha pt-2">
        {etapas.map((etapa) => (
          <p key={etapa.rotulo} className="flex-1 text-center text-[0.625rem] leading-tight text-grafite-400">
            {etapa.rotulo}
          </p>
        ))}
      </div>

      <p className="mt-4 rounded-sm bg-areia-100 px-3 py-2.5 text-xs text-grafite-500">
        Conversão de ponta a ponta:{" "}
        <strong className="font-extrabold text-verde-900">{conversao}%</strong> — {fechados} de{" "}
        {total} {total === 1 ? "cliente" : "clientes"} no funil{" "}
        {fechados === 1 ? "chegou" : "chegaram"} ao fechamento.
      </p>
    </div>
  );
}

/** Série temporal simples em área, para volume mensal nos relatórios. */
export function MiniSerie({
  pontos,
  rotulo,
}: {
  pontos: { mes: string; valor: number }[];
  rotulo: string;
}) {
  const maximo = Math.max(...pontos.map((p) => p.valor), 1);
  const largura = 100;
  const altura = 42;

  const coordenadas = pontos.map((p, i) => {
    const x = pontos.length > 1 ? (i / (pontos.length - 1)) * largura : largura / 2;
    const y = altura - (p.valor / maximo) * (altura - 4) - 2;
    return `${x},${y}`;
  });

  return (
    <figure>
      <svg
        viewBox={`0 0 ${largura} ${altura}`}
        preserveAspectRatio="none"
        className="h-24 w-full"
        role="img"
        aria-label={`${rotulo}: ${pontos.map((p) => `${p.mes} ${p.valor}`).join(", ")}`}
      >
        <polygon
          points={`0,${altura} ${coordenadas.join(" ")} ${largura},${altura}`}
          fill="var(--color-dourado-500)"
          opacity="0.16"
        />
        <polyline
          points={coordenadas.join(" ")}
          fill="none"
          stroke="var(--color-verde-700)"
          strokeWidth="1.4"
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <figcaption className="mt-1 flex justify-between text-[0.625rem] text-grafite-400">
        {pontos.map((p) => (
          <span key={p.mes}>{p.mes}</span>
        ))}
      </figcaption>
    </figure>
  );
}
