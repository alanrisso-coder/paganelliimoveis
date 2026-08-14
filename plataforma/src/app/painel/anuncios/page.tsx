"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, CampoSelecao, EstadoVazio, Modal, Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import {
  classes,
  enderecoResumido,
  formatarData,
  formatarNumero,
  precoFormatado,
  rotuloStatusAnuncio,
  rotuloTipoImovel,
} from "@/lib/format";
import type { Anuncio, StatusAnuncio, VisibilidadeAnuncio } from "@/lib/types";

const tomStatus: Record<StatusAnuncio, "verde" | "alerta" | "neutro" | "erro"> = {
  publicado: "verde",
  revisao: "alerta",
  rascunho: "neutro",
  pausado: "neutro",
  expirado: "erro",
  arquivado: "neutro",
};

const rotuloVisibilidade: Record<VisibilidadeAnuncio, string> = {
  publico: "Público",
  link: "Somente link",
  privado: "Privado",
};

export default function PaginaAnuncios() {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();

  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState("todos");
  const [corretor, setCorretor] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [previa, setPrevia] = useState<Anuncio | null>(null);

  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  const lista = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return dados.anuncios.filter((a) => {
      const imovel = dados.imovelPorId(a.imovelId);
      if (t && !`${a.codigo} ${a.titulo} ${imovel?.codigo ?? ""}`.toLowerCase().includes(t)) return false;
      if (status !== "todos" && a.status !== status) return false;
      if (corretor !== "todos" && a.corretorId !== corretor) return false;
      if (tipo !== "todos" && imovel?.tipo !== tipo) return false;
      return true;
    });
  }, [dados, termo, status, corretor, tipo]);

  const publicados = dados.anuncios.filter((a) => a.status === "publicado").length;
  const totalViews = dados.anuncios.reduce((s, a) => s + a.metricas.visualizacoes, 0);
  const totalContatos = dados.anuncios.reduce((s, a) => s + a.metricas.contatos, 0);

  const seletor = "rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700";

  function alternarPublicacao(anuncio: Anuncio) {
    const novoStatus: StatusAnuncio = anuncio.status === "publicado" ? "pausado" : "publicado";
    dados.alterarStatusAnuncio(anuncio.id, novoStatus, usuario?.id ?? "");

    // Publicar exige visibilidade pública, senão o anúncio não entra na vitrine.
    if (novoStatus === "publicado" && anuncio.visibilidade !== "publico") {
      dados.atualizarAnuncio(anuncio.id, { visibilidade: "publico" }, usuario?.id ?? "");
    }
    avisar(
      novoStatus === "publicado"
        ? "Anúncio publicado — já está visível no site institucional."
        : "Anúncio pausado e removido da vitrine pública.",
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Gerenciador de anúncios"
        descricao="Controle o que está visível no site institucional. Só anúncios publicados e públicos aparecem na vitrine."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-sm border border-linha bg-white p-4">
          <p className="text-xs font-bold text-grafite-500">Publicados no site</p>
          <p className="mt-1.5 font-display text-2xl text-verde-900">{publicados}</p>
        </div>
        <div className="rounded-sm border border-linha bg-white p-4">
          <p className="text-xs font-bold text-grafite-500">Total de anúncios</p>
          <p className="mt-1.5 font-display text-2xl text-verde-900">{dados.anuncios.length}</p>
        </div>
        <div className="rounded-sm border border-linha bg-white p-4">
          <p className="text-xs font-bold text-grafite-500">Visualizações</p>
          <p className="mt-1.5 font-display text-2xl text-verde-900">{formatarNumero(totalViews)}</p>
        </div>
        <div className="rounded-sm border border-linha bg-white p-4">
          <p className="text-xs font-bold text-grafite-500">Contatos gerados</p>
          <p className="mt-1.5 font-display text-2xl text-verde-900">{formatarNumero(totalContatos)}</p>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="min-w-52 flex-1">
          <label htmlFor="an-busca" className="sr-only">
            Buscar anúncio
          </label>
          <input
            id="an-busca"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por código ou título do anúncio"
            className="w-full rounded-sm border border-linha bg-white px-3 py-2.5 text-sm placeholder:text-grafite-400"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status" className={seletor}>
          <option value="todos">Todos os status</option>
          {(Object.keys(rotuloStatusAnuncio) as StatusAnuncio[]).map((s) => (
            <option key={s} value={s}>
              {rotuloStatusAnuncio[s]}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo de imóvel" className={seletor}>
          <option value="todos">Todos os tipos</option>
          {(Object.keys(rotuloTipoImovel) as (keyof typeof rotuloTipoImovel)[]).map((t) => (
            <option key={t} value={t}>
              {rotuloTipoImovel[t]}
            </option>
          ))}
        </select>
        <select value={corretor} onChange={(e) => setCorretor(e.target.value)} aria-label="Filtrar por corretor" className={seletor}>
          <option value="todos">Todos os corretores</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum anúncio encontrado"
          descricao="Ajuste os filtros ou crie um anúncio a partir de um imóvel do catálogo."
          acao={
            <Link href="/painel/imoveis" className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50">
              Ir para o catálogo
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {lista.map((anuncio) => {
            const imovel = dados.imovelPorId(anuncio.imovelId);
            if (!imovel) return null;
            const capa = imovel.fotos[anuncio.capaIndice] ?? imovel.fotos[0];
            const noSite = anuncio.status === "publicado" && anuncio.visibilidade === "publico";

            return (
              <article key={anuncio.id} className="rounded-sm border border-linha bg-white p-4">
                <div className="flex flex-col gap-4 lg:flex-row">
                  <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-sm bg-areia-200 lg:h-24 lg:w-36">
                    {capa && <Image src={capa} alt="" fill sizes="144px" className="object-cover" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-verde-800">{anuncio.codigo}</span>
                      <Selo tom={tomStatus[anuncio.status]}>{rotuloStatusAnuncio[anuncio.status]}</Selo>
                      <Selo tom={anuncio.visibilidade === "publico" ? "neutro" : "erro"}>
                        {rotuloVisibilidade[anuncio.visibilidade]}
                      </Selo>
                      {anuncio.destaqueHome && <Selo tom="dourado">Destaque na home</Selo>}
                      {anuncio.selos.map((s) => (
                        <Selo key={s} tom="dourado">
                          {s}
                        </Selo>
                      ))}
                    </div>

                    <h2 className="mt-2 text-sm font-bold text-verde-900">{anuncio.titulo}</h2>
                    <p className="mt-0.5 text-xs text-grafite-500">{anuncio.subtitulo}</p>
                    <p className="mt-1.5 text-xs text-grafite-400">
                      <Link href={`/painel/imoveis/${imovel.id}`} className="hover:text-dourado-600">
                        {imovel.codigo} · {imovel.titulo}
                      </Link>{" "}
                      — {enderecoResumido(imovel)} · {precoFormatado(imovel)}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.625rem] text-grafite-400">
                      <span>{formatarNumero(anuncio.metricas.visualizacoes)} visualizações</span>
                      <span>{anuncio.metricas.contatos} contatos</span>
                      <span>{anuncio.metricas.conversoes} conversões</span>
                      {anuncio.publicarEm && <span>publicado em {formatarData(anuncio.publicarEm)}</span>}
                      {anuncio.expirarEm && <span>expira em {formatarData(anuncio.expirarEm)}</span>}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    <Botao variante="contorno" tamanho="sm" onClick={() => setPrevia(anuncio)}>
                      Pré-visualizar
                    </Botao>
                    {noSite && (
                      <Link
                        href={`/imoveis/${imovel.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-sm border border-verde-800/25 px-3 py-1.5 text-xs font-semibold text-verde-800 hover:bg-verde-800/6"
                      >
                        Abrir no site ↗
                      </Link>
                    )}
                    {pode("publicar_anuncio") && (
                      <Botao
                        variante={anuncio.status === "publicado" ? "perigo" : "primario"}
                        tamanho="sm"
                        onClick={() => alternarPublicacao(anuncio)}
                      >
                        {anuncio.status === "publicado" ? "Despublicar" : "Publicar"}
                      </Botao>
                    )}
                  </div>
                </div>

                {pode("publicar_anuncio") && (
                  <div className="mt-4 grid gap-3 border-t border-linha pt-4 sm:grid-cols-3">
                    <CampoSelecao
                      rotulo="Status"
                      value={anuncio.status}
                      onChange={(e) => {
                        dados.alterarStatusAnuncio(anuncio.id, e.target.value as StatusAnuncio, usuario?.id ?? "");
                        avisar(`Status do ${anuncio.codigo} alterado.`);
                      }}
                      opcoes={(Object.keys(rotuloStatusAnuncio) as StatusAnuncio[]).map((s) => ({
                        valor: s,
                        texto: rotuloStatusAnuncio[s],
                      }))}
                    />
                    <CampoSelecao
                      rotulo="Visibilidade"
                      value={anuncio.visibilidade}
                      onChange={(e) => {
                        dados.atualizarAnuncio(
                          anuncio.id,
                          { visibilidade: e.target.value as VisibilidadeAnuncio },
                          usuario?.id ?? "",
                        );
                        avisar("Visibilidade atualizada.");
                      }}
                      opcoes={(Object.keys(rotuloVisibilidade) as VisibilidadeAnuncio[]).map((v) => ({
                        valor: v,
                        texto: rotuloVisibilidade[v],
                      }))}
                    />
                    <div className="flex items-end">
                      <label className="flex items-center gap-2.5 pb-2.5 text-sm text-grafite-700">
                        <input
                          type="checkbox"
                          checked={anuncio.destaqueHome}
                          onChange={(e) => {
                            dados.atualizarAnuncio(anuncio.id, { destaqueHome: e.target.checked }, usuario?.id ?? "");
                            avisar(e.target.checked ? "Anúncio destacado na home." : "Destaque removido.");
                          }}
                          className="h-4 w-4 accent-verde-700"
                        />
                        Destacar na home
                      </label>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ModalPrevia anuncio={previa} aoFechar={() => setPrevia(null)} />
    </>
  );
}

/* ------------------------------------------------ Pré-visualização do anúncio */

function ModalPrevia({ anuncio, aoFechar }: { anuncio: Anuncio | null; aoFechar: () => void }) {
  const dados = useDados();
  const [dispositivo, setDispositivo] = useState<"desktop" | "mobile">("desktop");

  if (!anuncio) return null;
  const imovel = dados.imovelPorId(anuncio.imovelId);
  if (!imovel) return null;

  const capa = imovel.fotos[anuncio.capaIndice] ?? imovel.fotos[0];

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Pré-visualização do anúncio"
      descricao="Assim o anúncio aparece na vitrine do site institucional."
      largura="xl"
    >
      <div role="group" aria-label="Dispositivo" className="mb-5 flex gap-1 rounded-sm bg-areia-200 p-1">
        {(["desktop", "mobile"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDispositivo(d)}
            aria-pressed={dispositivo === d}
            className={classes(
              "flex-1 rounded-sm px-4 py-2 text-xs font-extrabold capitalize transition-colors",
              dispositivo === d ? "bg-verde-800 text-areia-50" : "text-grafite-500",
            )}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="rounded-sm bg-areia-100 p-6">
        <div className={classes("mx-auto", dispositivo === "mobile" ? "max-w-[20rem]" : "max-w-md")}>
          <article className="overflow-hidden rounded-sm bg-white shadow-cartao">
            <div className="relative aspect-[4/3] bg-areia-200">
              {capa && <Image src={capa} alt="" fill sizes="400px" className="object-cover" />}
              {anuncio.selos[0] && (
                <span className="absolute left-4 top-4 rounded-sm bg-verde-900/92 px-2.5 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-areia-50">
                  {anuncio.selos[0]}
                </span>
              )}
            </div>
            <div className="p-5">
              <p className="eyebrow text-dourado-600">
                {rotuloTipoImovel[imovel.tipo]} · {imovel.valores.venda ? "Venda" : "Locação"}
              </p>
              <h3 className="mt-2 font-display text-lg leading-snug text-verde-900">{imovel.titulo}</h3>
              <p className="mt-1 text-[0.8125rem] text-grafite-500">{enderecoResumido(imovel)}</p>
              <p className="mt-4 text-lg font-extrabold text-verde-800">{precoFormatado(imovel)}</p>
              <div className="mt-4 flex gap-4 border-t border-linha pt-4 text-xs text-grafite-500">
                {imovel.metragens.dormitorios > 0 && <span>{imovel.metragens.dormitorios} dorm.</span>}
                {imovel.metragens.vagas > 0 && <span>{imovel.metragens.vagas} vagas</span>}
                <span>{imovel.metragens.areaConstruida ?? imovel.metragens.areaTotal} m²</span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <Painel titulo="Conteúdo comercial" className="mt-5">
        <p className="text-sm font-bold text-verde-900">{anuncio.titulo}</p>
        <p className="mt-1 text-sm text-grafite-500">{anuncio.subtitulo}</p>
        <p className="mt-3 text-sm leading-relaxed text-grafite-700">{anuncio.descricaoComercial}</p>
        {anuncio.destaques.length > 0 && (
          <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
            {anuncio.destaques.map((d) => (
              <li key={d} className="text-xs text-grafite-700">
                · {d}
              </li>
            ))}
          </ul>
        )}
      </Painel>
    </Modal>
  );
}
