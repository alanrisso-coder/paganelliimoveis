"use client";

import Image from "next/image";
import Link from "next/link";
import type { Anuncio, Imovel } from "@/lib/types";
import {
  classes,
  enderecoResumido,
  formatarArea,
  precoFormatado,
  rotuloTipoImovel,
} from "@/lib/format";
import { useDados } from "@/lib/store";
import { useAviso } from "@/components/ui/Toast";

const rotuloSelo: Record<string, string> = {
  exclusivo: "Exclusivo",
  lancamento: "Lançamento",
  oportunidade: "Oportunidade",
  vendido: "Vendido",
  alugado: "Alugado",
};

export function CardImovel({
  imovel,
  anuncio,
  prioridade = false,
}: {
  imovel: Imovel;
  anuncio?: Anuncio;
  prioridade?: boolean;
}) {
  const { favoritosVisitante, alternarFavoritoVisitante } = useDados();
  const { avisar } = useAviso();
  const favoritado = favoritosVisitante.includes(imovel.id);

  const capa = imovel.fotos[anuncio?.capaIndice ?? 0] ?? imovel.fotos[0];
  const selo = anuncio?.selos[0];
  const { dormitorios, vagas, areaConstruida, areaTotal } = imovel.metragens;

  function compartilhar() {
    const url = `${window.location.origin}/imoveis/${imovel.slug}`;
    if (navigator.share) {
      navigator.share({ title: imovel.titulo, url }).catch(() => {});
      return;
    }
    navigator.clipboard
      .writeText(url)
      .then(() => avisar("Link do imóvel copiado."))
      .catch(() => avisar("Não foi possível copiar o link.", "erro"));
  }

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-sm bg-white transition-shadow duration-300 hover:shadow-cartao">
      {/* A foto não recebe link próprio: o overlay do título já cobre o card. */}
      <div className="relative aspect-[4/3] overflow-hidden bg-areia-200">
        {capa ? (
          <Image
            src={capa}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={prioridade}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-grafite-400">
            Sem foto
          </div>
        )}

        {selo && (
          <span className="absolute left-4 top-4 rounded-sm bg-verde-900/92 px-2.5 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-areia-50">
            {rotuloSelo[selo]}
          </span>
        )}

        {/* z-10 mantém os botões acima do link que cobre o card inteiro. */}
        <div className="absolute right-3 top-3 z-10 flex gap-1.5">
          <button
            type="button"
            onClick={() => {
              alternarFavoritoVisitante(imovel.id);
              avisar(favoritado ? "Removido dos favoritos." : "Imóvel salvo nos favoritos.");
            }}
            aria-pressed={favoritado}
            aria-label={favoritado ? `Remover ${imovel.titulo} dos favoritos` : `Salvar ${imovel.titulo} nos favoritos`}
            className="rounded-sm bg-areia-50/92 p-2 text-verde-800 backdrop-blur transition-colors hover:bg-areia-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill={favoritado ? "currentColor" : "none"}>
              <path
                d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 00-7.8 7.8l1.1 1L12 21.2l7.7-7.8 1.1-1a5.5 5.5 0 000-7.8z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={compartilhar}
            aria-label={`Compartilhar ${imovel.titulo}`}
            className="rounded-sm bg-areia-50/92 p-2 text-verde-800 backdrop-blur transition-colors hover:bg-areia-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7M12 15V3M8 7l4-4 4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow text-dourado-600">
          {rotuloTipoImovel[imovel.tipo]} · {imovel.valores.venda ? "Venda" : "Locação"}
        </p>
        <h3 className="mt-2 font-display text-lg leading-snug text-verde-900">
          <Link href={`/imoveis/${imovel.slug}`} className="after:absolute after:inset-0 hover:text-verde-700">
            {imovel.titulo}
          </Link>
        </h3>
        <p className="mt-1 text-[0.8125rem] text-grafite-500">{enderecoResumido(imovel)}</p>

        <p className="mt-4 text-lg font-extrabold text-verde-800">{precoFormatado(imovel)}</p>

        <dl className="mt-auto flex flex-wrap gap-x-4 gap-y-1 border-t border-linha pt-4 text-xs text-grafite-500">
          {dormitorios > 0 && (
            <div className="flex gap-1">
              <dt className="sr-only">Dormitórios</dt>
              <dd>
                <strong className="font-bold text-grafite-700">{dormitorios}</strong> dorm.
              </dd>
            </div>
          )}
          {vagas > 0 && (
            <div className="flex gap-1">
              <dt className="sr-only">Vagas</dt>
              <dd>
                <strong className="font-bold text-grafite-700">{vagas}</strong> vagas
              </dd>
            </div>
          )}
          <div className="flex gap-1">
            <dt className="sr-only">Área</dt>
            <dd className="font-bold text-grafite-700">{formatarArea(areaConstruida ?? areaTotal)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

/** Variante compacta usada em "imóveis semelhantes" e nos favoritos do CRM. */
export function CardImovelCompacto({ imovel, className }: { imovel: Imovel; className?: string }) {
  return (
    <Link
      href={`/imoveis/${imovel.slug}`}
      className={classes(
        "flex gap-3 rounded-sm border border-linha bg-white p-3 transition-colors hover:border-dourado-400",
        className,
      )}
    >
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-sm bg-areia-200">
        {imovel.fotos[0] && (
          <Image src={imovel.fotos[0]} alt="" fill sizes="80px" className="object-cover" />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-verde-900">{imovel.titulo}</p>
        <p className="truncate text-xs text-grafite-500">{enderecoResumido(imovel)}</p>
        <p className="mt-1 text-sm font-extrabold text-verde-800">{precoFormatado(imovel)}</p>
      </div>
    </Link>
  );
}
