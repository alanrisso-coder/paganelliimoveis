"use client";

import Link from "next/link";
import { useDados } from "@/lib/store";
import { CardImovel } from "@/components/site/CardImovel";
import { CarregandoCards, EstadoVazio } from "@/components/ui";

export default function PaginaFavoritos() {
  const { favoritosVisitante, imoveisPublicos, anuncioDoImovel, carregado } = useDados();

  const salvos = imoveisPublicos.filter((i) => favoritosVisitante.includes(i.id));

  return (
    <>
      <header className="border-b border-linha bg-verde-900 py-14 text-areia-100 lg:py-18">
        <div className="container-paganelli">
          <p className="eyebrow text-dourado-400">Sua seleção</p>
          <h1 className="mt-3 font-display text-4xl text-areia-50 lg:text-5xl">Imóveis favoritos</h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-areia-100/75">
            Os imóveis que você salvou ficam guardados neste navegador. Envie a lista para um
            corretor e organizamos as visitas em sequência, no mesmo dia.
          </p>
        </div>
      </header>

      <div className="container-paganelli py-14 lg:py-20">
        {!carregado ? (
          <CarregandoCards quantidade={3} />
        ) : salvos.length === 0 ? (
          <EstadoVazio
            icone="casa"
            titulo="Você ainda não salvou nenhum imóvel"
            descricao="Use o ícone de coração nos cards para montar sua seleção. Ela fica salva neste navegador e você pode compartilhá-la com um corretor quando quiser."
            acao={
              <Link
                href="/imoveis/venda"
                className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50"
              >
                Explorar imóveis
              </Link>
            }
          />
        ) : (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-grafite-500">
                <strong className="font-extrabold text-verde-900">{salvos.length}</strong>{" "}
                {salvos.length === 1 ? "imóvel salvo" : "imóveis salvos"}
              </p>
              <Link
                href="/contato"
                className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50 transition-colors hover:bg-verde-700"
              >
                Enviar seleção para um corretor
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {salvos.map((imovel, i) => (
                <CardImovel
                  key={imovel.id}
                  imovel={imovel}
                  anuncio={anuncioDoImovel(imovel.id)}
                  prioridade={i < 3}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
