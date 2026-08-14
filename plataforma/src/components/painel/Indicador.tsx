"use client";

import Link from "next/link";
import { classes } from "@/lib/format";

export function Indicador({
  rotulo,
  valor,
  nota,
  tom = "neutro",
  href,
}: {
  rotulo: string;
  valor: string | number;
  nota?: string;
  tom?: "neutro" | "positivo" | "alerta";
  href?: string;
}) {
  const cores = {
    neutro: "text-grafite-400",
    positivo: "text-sucesso",
    alerta: "text-erro",
  };

  const conteudo = (
    <>
      <p className="text-xs font-bold text-grafite-500">{rotulo}</p>
      <p className="mt-2 font-display text-3xl text-verde-900">{valor}</p>
      {nota && <p className={classes("mt-1.5 text-[0.6875rem] font-bold", cores[tom])}>{nota}</p>}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-sm border border-linha bg-white p-5 transition-colors hover:border-dourado-400"
      >
        {conteudo}
      </Link>
    );
  }

  return <div className="rounded-sm border border-linha bg-white p-5">{conteudo}</div>;
}
