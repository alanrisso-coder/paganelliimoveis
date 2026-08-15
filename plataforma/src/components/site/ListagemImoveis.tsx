"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { CardImovel } from "./CardImovel";
import { Botao, CarregandoCards, EstadoVazio, Selo } from "@/components/ui";
import {
  classes,
  formatarMoedaCurta,
  precoPrincipal,
  rotuloTipoImovel,
} from "@/lib/format";
import type { Imovel, OrdenacaoBusca, TipoImovel } from "@/lib/types";

const POR_PAGINA = 9;

const tiposDisponiveis: TipoImovel[] = [
  "casa",
  "apartamento",
  "cobertura",
  "terreno",
  "comercial",
  "fazenda",
];

const caracteristicasFiltro = [
  "Piscina",
  "Espaço gourmet",
  "Varanda",
  "Armários planejados",
  "Sauna",
  "Lareira",
  "Academia no condomínio",
  "Automação residencial",
];

const ordenacoes: { valor: OrdenacaoBusca; texto: string }[] = [
  { valor: "relevancia", texto: "Mais relevantes" },
  { valor: "recentes", texto: "Mais recentes" },
  { valor: "menor_preco", texto: "Menor preço" },
  { valor: "maior_preco", texto: "Maior preço" },
  { valor: "maior_area", texto: "Maior área" },
];

interface Filtros {
  termo: string;
  regiao: string;
  tipo: string;
  precoMin: string;
  precoMax: string;
  dormitorios: string;
  vagas: string;
  caracteristicas: string[];
  ordenacao: OrdenacaoBusca;
}

/**
 * Listagem pública com filtros avançados.
 *
 * `finalidade` decide qual valor do imóvel entra na comparação de preço: um
 * imóvel com finalidade "ambos" aparece nas duas listas, mas ordenado e
 * filtrado pelo preço correspondente.
 */
export function ListagemImoveis({
  finalidade,
  titulo,
  descricao,
}: {
  finalidade: "venda" | "aluguel";
  titulo: string;
  descricao: string;
}) {
  const parametros = useSearchParams();
  const router = useRouter();
  const { imoveisPublicos, anuncioDoImovel, carregado } = useDados();

  const [filtros, setFiltros] = useState<Filtros>({
    termo: parametros.get("termo") ?? "",
    regiao: parametros.get("regiao") ?? "",
    tipo: parametros.get("tipo") ?? "todos",
    precoMin: parametros.get("precoMin") ?? "",
    precoMax: parametros.get("precoMax") ?? "",
    dormitorios: parametros.get("dormitorios") ?? "",
    vagas: parametros.get("vagas") ?? "",
    caracteristicas: [],
    ordenacao: "relevancia",
  });
  const [visiveis, setVisiveis] = useState(POR_PAGINA);
  const [painelAberto, setPainelAberto] = useState(false);

  /** Preço relevante para esta listagem — nunca o do outro tipo de negócio. */
  const precoDaFinalidade = (i: Imovel) =>
    finalidade === "venda" ? (i.valores.venda ?? 0) : (i.valores.aluguel ?? 0);

  const regioesDisponiveis = useMemo(
    () => [...new Set(imoveisPublicos.map((i) => i.endereco.bairro))].sort(),
    [imoveisPublicos],
  );

  const resultados = useMemo(() => {
    const termo = filtros.termo.trim().toLowerCase();

    const lista = imoveisPublicos.filter((i) => {
      if (i.finalidade !== finalidade && i.finalidade !== "ambos") return false;
      if (precoDaFinalidade(i) <= 0) return false;
      if (["vendido", "alugado", "inativo"].includes(i.status)) return false;

      if (termo) {
        const alvo = `${i.titulo} ${i.endereco.bairro} ${i.endereco.cidade} ${i.codigo} ${i.descricaoCurta}`.toLowerCase();
        if (!alvo.includes(termo)) return false;
      }
      if (filtros.regiao && i.endereco.bairro !== filtros.regiao) return false;
      if (filtros.tipo !== "todos" && i.tipo !== filtros.tipo) return false;

      const preco = precoDaFinalidade(i);
      if (filtros.precoMin && preco < Number(filtros.precoMin)) return false;
      if (filtros.precoMax && preco > Number(filtros.precoMax)) return false;

      if (filtros.dormitorios && i.metragens.dormitorios < Number(filtros.dormitorios)) return false;
      if (filtros.vagas && i.metragens.vagas < Number(filtros.vagas)) return false;

      if (filtros.caracteristicas.length > 0) {
        const todas = [...i.caracteristicas, ...i.diferenciais].join(" ").toLowerCase();
        if (!filtros.caracteristicas.every((c) => todas.includes(c.toLowerCase()))) return false;
      }
      return true;
    });

    const ordenada = [...lista];
    switch (filtros.ordenacao) {
      case "menor_preco":
        ordenada.sort((a, b) => precoDaFinalidade(a) - precoDaFinalidade(b));
        break;
      case "maior_preco":
        ordenada.sort((a, b) => precoDaFinalidade(b) - precoDaFinalidade(a));
        break;
      case "maior_area":
        ordenada.sort(
          (a, b) =>
            (b.metragens.areaConstruida ?? b.metragens.areaTotal) -
            (a.metragens.areaConstruida ?? a.metragens.areaTotal),
        );
        break;
      case "recentes":
        ordenada.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
        break;
      default:
        // Relevância: exclusivos e destaques da home primeiro, depois por preço.
        ordenada.sort((a, b) => {
          const pesoA = (a.exclusivo ? 2 : 0) + (anuncioDoImovel(a.id)?.destaqueHome ? 1 : 0);
          const pesoB = (b.exclusivo ? 2 : 0) + (anuncioDoImovel(b.id)?.destaqueHome ? 1 : 0);
          if (pesoA !== pesoB) return pesoB - pesoA;
          return precoPrincipal(b) - precoPrincipal(a);
        });
    }
    return ordenada;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imoveisPublicos, filtros, finalidade, anuncioDoImovel]);

  const filtrosAtivos =
    (filtros.termo ? 1 : 0) +
    (filtros.regiao ? 1 : 0) +
    (filtros.tipo !== "todos" ? 1 : 0) +
    (filtros.precoMin ? 1 : 0) +
    (filtros.precoMax ? 1 : 0) +
    (filtros.dormitorios ? 1 : 0) +
    (filtros.vagas ? 1 : 0) +
    filtros.caracteristicas.length;

  function limpar() {
    setFiltros({
      termo: "",
      regiao: "",
      tipo: "todos",
      precoMin: "",
      precoMax: "",
      dormitorios: "",
      vagas: "",
      caracteristicas: [],
      ordenacao: "relevancia",
    });
    setVisiveis(POR_PAGINA);
  }

  function alterar<K extends keyof Filtros>(chave: K, valor: Filtros[K]) {
    setFiltros((f) => ({ ...f, [chave]: valor }));
    setVisiveis(POR_PAGINA);
  }

  const campo =
    "w-full rounded-sm border border-linha bg-white px-3 py-2.5 text-sm text-grafite-900 placeholder:text-grafite-400";
  const rotulo = "mb-1.5 block text-xs font-bold text-grafite-700";

  return (
    <>
      <section className="relative isolate flex items-end overflow-hidden bg-verde-900 py-14 lg:py-20">
        <Image
          src="/reserva-pedra-2.jpg"
          alt="Imóveis à venda"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-verde-950/88 via-verde-950/62 to-verde-950/20"
          aria-hidden="true"
        />

        <header className="container-paganelli w-full text-areia-100">
          <p className="eyebrow text-dourado-400">
            {finalidade === "venda" ? "Comprar" : "Alugar"}
          </p>
          <h1 className="mt-3 font-display text-4xl text-areia-50 lg:text-5xl">{titulo}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-areia-100/75">{descricao}</p>
        </header>
      </section>

      <div className="container-paganelli grid gap-10 py-12 lg:grid-cols-[17.5rem_1fr] lg:py-16">
        {/* -------------------------------------------------------- Filtros */}
        <div>
          <button
            type="button"
            onClick={() => setPainelAberto((a) => !a)}
            aria-expanded={painelAberto}
            aria-controls="painel-filtros"
            className="flex w-full items-center justify-between rounded-sm border border-linha bg-white px-4 py-3 text-sm font-extrabold text-verde-800 lg:hidden"
          >
            Filtros
            {filtrosAtivos > 0 && <Selo tom="dourado">{filtrosAtivos} ativos</Selo>}
          </button>

          <aside
            id="painel-filtros"
            aria-label="Filtros de busca"
            className={classes(
              "mt-3 space-y-5 rounded-sm border border-linha bg-white p-5 lg:mt-0 lg:sticky lg:top-28 lg:block",
              painelAberto ? "block" : "hidden",
            )}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-verde-900">Refine sua busca</h2>
              {filtrosAtivos > 0 && (
                <button
                  type="button"
                  onClick={limpar}
                  className="text-xs font-bold text-dourado-600 underline underline-offset-2"
                >
                  Limpar
                </button>
              )}
            </div>

            <div>
              <label htmlFor="f-termo" className={rotulo}>
                Buscar
              </label>
              <input
                id="f-termo"
                type="search"
                value={filtros.termo}
                onChange={(e) => alterar("termo", e.target.value)}
                placeholder="Bairro, código ou nome"
                className={campo}
              />
            </div>

            <div>
              <label htmlFor="f-regiao" className={rotulo}>
                Região
              </label>
              <select
                id="f-regiao"
                value={filtros.regiao}
                onChange={(e) => alterar("regiao", e.target.value)}
                className={campo}
              >
                <option value="">Todas as regiões</option>
                {regioesDisponiveis.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="f-tipo" className={rotulo}>
                Tipo de imóvel
              </label>
              <select
                id="f-tipo"
                value={filtros.tipo}
                onChange={(e) => alterar("tipo", e.target.value)}
                className={campo}
              >
                <option value="todos">Todos os tipos</option>
                {tiposDisponiveis.map((t) => (
                  <option key={t} value={t}>
                    {rotuloTipoImovel[t]}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className={rotulo}>Faixa de preço</legend>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={0}
                  step={finalidade === "venda" ? 50000 : 500}
                  value={filtros.precoMin}
                  onChange={(e) => alterar("precoMin", e.target.value)}
                  placeholder="Mínimo"
                  aria-label="Preço mínimo"
                  className={campo}
                />
                <input
                  type="number"
                  min={0}
                  step={finalidade === "venda" ? 50000 : 500}
                  value={filtros.precoMax}
                  onChange={(e) => alterar("precoMax", e.target.value)}
                  placeholder="Máximo"
                  aria-label="Preço máximo"
                  className={campo}
                />
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="f-dorm" className={rotulo}>
                  Dormitórios
                </label>
                <select
                  id="f-dorm"
                  value={filtros.dormitorios}
                  onChange={(e) => alterar("dormitorios", e.target.value)}
                  className={campo}
                >
                  <option value="">Qualquer</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="f-vagas" className={rotulo}>
                  Vagas
                </label>
                <select
                  id="f-vagas"
                  value={filtros.vagas}
                  onChange={(e) => alterar("vagas", e.target.value)}
                  className={campo}
                >
                  <option value="">Qualquer</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <fieldset>
              <legend className={rotulo}>Características</legend>
              <div className="space-y-2">
                {caracteristicasFiltro.map((c) => (
                  <label key={c} className="flex cursor-pointer items-center gap-2.5 text-sm text-grafite-700">
                    <input
                      type="checkbox"
                      checked={filtros.caracteristicas.includes(c)}
                      onChange={(e) =>
                        alterar(
                          "caracteristicas",
                          e.target.checked
                            ? [...filtros.caracteristicas, c]
                            : filtros.caracteristicas.filter((x) => x !== c),
                        )
                      }
                      className="h-4 w-4 accent-verde-700"
                    />
                    {c}
                  </label>
                ))}
              </div>
            </fieldset>
          </aside>
        </div>

        {/* ----------------------------------------------------- Resultados */}
        <div>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-grafite-500" role="status" aria-live="polite">
              {!carregado ? (
                "Carregando imóveis…"
              ) : (
                <>
                  <strong className="font-extrabold text-verde-900">{resultados.length}</strong>{" "}
                  {resultados.length === 1 ? "imóvel encontrado" : "imóveis encontrados"}
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="ordenar" className="text-xs font-bold text-grafite-500">
                Ordenar por
              </label>
              <select
                id="ordenar"
                value={filtros.ordenacao}
                onChange={(e) => alterar("ordenacao", e.target.value as OrdenacaoBusca)}
                className="rounded-sm border border-linha bg-white px-3 py-2 text-sm"
              >
                {ordenacoes.map((o) => (
                  <option key={o.valor} value={o.valor}>
                    {o.texto}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!carregado ? (
            <CarregandoCards quantidade={6} />
          ) : resultados.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum imóvel corresponde a esses filtros"
              descricao={
                filtrosAtivos > 0
                  ? "Tente ampliar a faixa de preço ou remover alguma característica. Se preferir, conte o que procura e buscamos para você — inclusive fora da vitrine."
                  : "Ainda não há imóveis publicados nesta modalidade. Deixe seu contato e avisamos assim que houver novidade."
              }
              acao={
                <div className="flex flex-wrap justify-center gap-3">
                  {filtrosAtivos > 0 && (
                    <Botao variante="contorno" onClick={limpar}>
                      Limpar filtros
                    </Botao>
                  )}
                  <Botao onClick={() => router.push("/contato")}>Falar com um corretor</Botao>
                </div>
              }
            />
          ) : (
            <>
              {(filtros.precoMin || filtros.precoMax) && (
                <p className="mb-5 text-xs text-grafite-400">
                  Faixa aplicada: {filtros.precoMin ? formatarMoedaCurta(Number(filtros.precoMin)) : "sem mínimo"}{" "}
                  até {filtros.precoMax ? formatarMoedaCurta(Number(filtros.precoMax)) : "sem máximo"}
                </p>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {resultados.slice(0, visiveis).map((imovel, indice) => (
                  <CardImovel
                    key={imovel.id}
                    imovel={imovel}
                    anuncio={anuncioDoImovel(imovel.id)}
                    prioridade={indice < 3}
                  />
                ))}
              </div>

              {visiveis < resultados.length && (
                <div className="mt-10 text-center">
                  <Botao
                    variante="contorno"
                    tamanho="lg"
                    onClick={() => setVisiveis((v) => v + POR_PAGINA)}
                  >
                    Carregar mais imóveis ({resultados.length - visiveis} restantes)
                  </Botao>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
