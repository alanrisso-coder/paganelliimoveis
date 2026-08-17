"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDados } from "@/lib/store";
import { useAviso } from "@/components/ui/Toast";
import { GaleriaImovel } from "./GaleriaImovel";
import { FormularioLead } from "./FormularioLead";
import { BotaoWhatsapp } from "./BotaoWhatsapp";
import { CardImovelCompacto } from "./CardImovel";
import { AgendarVisita } from "./AgendarVisita";
import { Botao, EstadoVazio, Modal, Selo } from "@/components/ui";
import {
  enderecoCompleto,
  enderecoResumido,
  formatarArea,
  formatarIdadeImovel,
  formatarMoeda,
  formatarMoedaCurta,
  precoFormatado,
  rotuloFinalidade,
  rotuloPerfilImovel,
  rotuloPosicaoSolar,
  rotuloSituacaoImovel,
  rotuloTerreno,
  rotuloTipoImovel,
  simNao,
} from "@/lib/format";

export function DetalheImovel({ slug }: { slug: string }) {
  const {
    imovelPorSlug,
    anuncioDoImovel,
    usuarioPorId,
    imoveisPublicos,
    anunciosPublicos,
    registrarVisualizacaoAnuncio,
    favoritosVisitante,
    alternarFavoritoVisitante,
    carregado,
  } = useDados();
  const { avisar } = useAviso();

  const [modalInteresse, setModalInteresse] = useState(false);
  const [modalVisita, setModalVisita] = useState(false);

  const imovel = imovelPorSlug(slug);
  const anuncio = imovel ? anuncioDoImovel(imovel.id) : undefined;

  // Uma visualização por sessão de página, não por re-render.
  const jaContou = useRef(false);
  useEffect(() => {
    if (anuncio && anuncio.status === "publicado" && !jaContou.current) {
      jaContou.current = true;
      registrarVisualizacaoAnuncio(anuncio.id);
    }
  }, [anuncio, registrarVisualizacaoAnuncio]);

  if (!carregado) {
    return (
      <div className="container-paganelli py-24 text-center text-sm text-grafite-400">
        Carregando imóvel…
      </div>
    );
  }

  const publicado =
    anuncio && anuncio.status === "publicado" && anuncio.visibilidade === "publico";

  if (!imovel || !publicado) {
    return (
      <div className="container-paganelli py-24">
        <EstadoVazio
          icone="casa"
          titulo="Imóvel não disponível"
          descricao="Este imóvel não está publicado no momento — pode ter sido vendido, alugado ou retirado da vitrine. Veja outras opções ou fale com a nossa equipe."
          acao={
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/imoveis/venda"
                className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50"
              >
                Ver imóveis à venda
              </Link>
              <Link
                href="/contato"
                className="rounded-sm border border-verde-800/25 px-5 py-3 text-sm font-extrabold text-verde-800"
              >
                Falar com um corretor
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const corretor = usuarioPorId(imovel.corretorId);
  const favoritado = favoritosVisitante.includes(imovel.id);
  const fotos = anuncio.ordemGaleria.length
    ? anuncio.ordemGaleria.map((i) => imovel.fotos[i]).filter(Boolean)
    : imovel.fotos;

  const { metragens: m, valores: v } = imovel;

  const semelhantes = imoveisPublicos
    .filter(
      (i) =>
        i.id !== imovel.id &&
        (i.tipo === imovel.tipo || i.endereco.bairro === imovel.endereco.bairro) &&
        anunciosPublicos.some((a) => a.imovelId === i.id),
    )
    .slice(0, 4);

  const custos = [
    { rotulo: "Condomínio", valor: v.condominio },
    { rotulo: "IPTU (mensal)", valor: v.iptu ? Math.round(v.iptu / 12) : undefined },
    { rotulo: "Outras taxas", valor: v.outrasTaxas },
  ].filter((c) => c.valor);

  const totalMensal =
    (v.aluguel ?? 0) + (v.condominio ?? 0) + (v.iptu ? Math.round(v.iptu / 12) : 0);

  const bbox = [
    imovel.endereco.longitude - 0.008,
    imovel.endereco.latitude - 0.005,
    imovel.endereco.longitude + 0.008,
    imovel.endereco.latitude + 0.005,
  ].join(",");

  const fichas: { rotulo: string; valor: string }[] = [
    { rotulo: "Código", valor: imovel.codigo },
    { rotulo: "Tipo", valor: rotuloTipoImovel[imovel.tipo] },
    { rotulo: "Finalidade", valor: rotuloFinalidade[imovel.finalidade] },
    { rotulo: "Área total", valor: formatarArea(m.areaTotal) },
    ...(m.areaConstruida ? [{ rotulo: "Área construída", valor: formatarArea(m.areaConstruida) }] : []),
    ...(m.dormitorios ? [{ rotulo: "Dormitórios", valor: String(m.dormitorios) }] : []),
    ...(m.suites ? [{ rotulo: "Suítes", valor: String(m.suites) }] : []),
    ...(m.banheiros ? [{ rotulo: "Banheiros", valor: String(m.banheiros) }] : []),
    ...(m.vagas ? [{ rotulo: "Vagas", valor: String(m.vagas) }] : []),
    ...(m.andar ? [{ rotulo: "Andar", valor: `${m.andar}º` }] : []),
    ...(imovel.perfil ? [{ rotulo: "Perfil", valor: rotuloPerfilImovel[imovel.perfil] }] : []),
    ...(imovel.situacao ? [{ rotulo: "Situação", valor: rotuloSituacaoImovel[imovel.situacao] }] : []),
    ...(imovel.idadeAnos !== undefined
      ? [{ rotulo: "Idade do imóvel", valor: formatarIdadeImovel(imovel.idadeAnos) }]
      : []),
    ...(imovel.posicaoSolar ? [{ rotulo: "Posição solar", valor: rotuloPosicaoSolar[imovel.posicaoSolar] }] : []),
    ...(imovel.terreno ? [{ rotulo: "Terreno", valor: rotuloTerreno[imovel.terreno] }] : []),
    ...(imovel.aceitaPermuta !== undefined
      ? [{ rotulo: "Aceita permuta?", valor: simNao(imovel.aceitaPermuta) }]
      : []),
    ...(imovel.aceitaFinanciamento !== undefined
      ? [{ rotulo: "Aceita financiamento", valor: simNao(imovel.aceitaFinanciamento) }]
      : []),
    ...(imovel.escriturado !== undefined ? [{ rotulo: "Escriturado", valor: simNao(imovel.escriturado) }] : []),
    ...(imovel.averbado !== undefined ? [{ rotulo: "Averbado", valor: simNao(imovel.averbado) }] : []),
  ];

  return (
    <>
      <nav aria-label="Trilha de navegação" className="border-b border-linha bg-areia-50">
        <div className="container-paganelli flex flex-wrap items-center gap-2 py-4 text-xs text-grafite-400">
          <Link href="/" className="hover:text-verde-800">
            Início
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href={v.venda ? "/imoveis/venda" : "/imoveis/aluguel"}
            className="hover:text-verde-800"
          >
            {v.venda ? "Imóveis à venda" : "Imóveis para alugar"}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-grafite-700">{imovel.titulo}</span>
        </div>
      </nav>

      <div className="container-paganelli grid gap-12 py-10 lg:grid-cols-[1.65fr_1fr] lg:py-14">
        {/* ------------------------------------------------------ Principal */}
        <div>
          <GaleriaImovel fotos={fotos} titulo={imovel.titulo} />

          <div className="mt-9">
            <div className="flex flex-wrap items-center gap-2">
              {imovel.exclusivo && <Selo tom="escuro">Exclusivo Paganelli</Selo>}
              {anuncio.selos
                .filter((s) => s !== "exclusivo")
                .map((s) => (
                  <Selo key={s} tom="dourado">
                    {s}
                  </Selo>
                ))}
              <Selo tom="neutro">{rotuloTipoImovel[imovel.tipo]}</Selo>
            </div>

            <h1 className="mt-4 font-display text-3xl leading-tight text-verde-900 lg:text-[2.75rem]">
              {imovel.titulo}
            </h1>
            <p className="mt-2 text-sm text-grafite-500">{enderecoResumido(imovel)}</p>

            {anuncio.subtitulo && (
              <p className="mt-5 border-l-2 border-dourado-400 pl-4 text-base leading-relaxed text-grafite-700">
                {anuncio.subtitulo}
              </p>
            )}
          </div>

          <section className="mt-10" aria-labelledby="ficha">
            <h2 id="ficha" className="font-display text-2xl text-verde-900">
              Ficha do imóvel
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-linha bg-linha sm:grid-cols-3 lg:grid-cols-4">
              {fichas.map((f) => (
                <div key={f.rotulo} className="bg-white px-4 py-3.5">
                  <dt className="text-[0.6875rem] font-bold uppercase tracking-wide text-grafite-400">
                    {f.rotulo}
                  </dt>
                  <dd className="mt-1 text-sm font-extrabold text-verde-900">{f.valor}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="mt-12" aria-labelledby="descricao">
            <h2 id="descricao" className="font-display text-2xl text-verde-900">
              Sobre o imóvel
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-[1.85] text-grafite-700">
              {imovel.descricaoCompleta}
            </p>
          </section>

          {imovel.diferenciais.length > 0 && (
            <section className="mt-10" aria-labelledby="diferenciais">
              <h2 id="diferenciais" className="font-display text-2xl text-verde-900">
                Diferenciais
              </h2>
              <ul className="mt-4 space-y-2.5">
                {imovel.diferenciais.map((d) => (
                  <li key={d} className="flex items-start gap-3 text-sm text-grafite-700">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-dourado-600" aria-hidden="true">
                      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {imovel.caracteristicas.length > 0 && (
            <section className="mt-10" aria-labelledby="caracteristicas">
              <h2 id="caracteristicas" className="font-display text-2xl text-verde-900">
                Características e comodidades
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {imovel.caracteristicas.map((c) => (
                  <li
                    key={c}
                    className="rounded-sm border border-linha bg-white px-3 py-2 text-xs text-grafite-700"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-12" aria-labelledby="localizacao">
            <h2 id="localizacao" className="font-display text-2xl text-verde-900">
              Localização
            </h2>
            <p className="mt-3 text-sm text-grafite-500">{enderecoCompleto(imovel)}</p>
            <div className="mt-5 overflow-hidden rounded-sm border border-linha">
              <iframe
                title={`Mapa da localização de ${imovel.titulo}`}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${imovel.endereco.latitude},${imovel.endereco.longitude}`}
                className="h-[340px] w-full border-0"
                loading="lazy"
              />
            </div>
            <p className="mt-2 text-xs text-grafite-400">
              Localização aproximada, exibida por região. O endereço exato é informado no
              agendamento da visita.
            </p>
          </section>

          {(imovel.tourVirtualUrl || imovel.videoUrl || imovel.plantas.length > 0) && (
            <section className="mt-10" aria-labelledby="midias">
              <h2 id="midias" className="font-display text-2xl text-verde-900">
                Mídias do imóvel
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {imovel.tourVirtualUrl && (
                  <Botao variante="contorno" onClick={() => avisar("Tour virtual disponível na versão com backend integrado.", "info")}>
                    Abrir tour virtual
                  </Botao>
                )}
                {imovel.videoUrl && (
                  <Botao variante="contorno" onClick={() => avisar("Vídeo demonstrativo — integração de mídia pendente.", "info")}>
                    Assistir ao vídeo
                  </Botao>
                )}
                {imovel.plantas.length > 0 && (
                  <Botao variante="contorno" onClick={() => avisar("Planta enviada por e-mail após o contato.", "info")}>
                    Ver planta ({imovel.plantas.length})
                  </Botao>
                )}
              </div>
            </section>
          )}
        </div>

        {/* -------------------------------------------------------- Lateral */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-sm border border-linha bg-white p-6">
            <p className="eyebrow text-dourado-600">
              {v.venda ? "Valor de venda" : "Valor da locação"}
            </p>
            <p className="mt-2 font-display text-3xl text-verde-900">{precoFormatado(imovel)}</p>

            {custos.length > 0 && (
              <dl className="mt-5 space-y-2 border-t border-linha pt-5 text-sm">
                {custos.map((c) => (
                  <div key={c.rotulo} className="flex justify-between gap-3">
                    <dt className="text-grafite-500">{c.rotulo}</dt>
                    <dd className="font-bold text-grafite-700">{formatarMoedaCurta(c.valor)}</dd>
                  </div>
                ))}
                {v.aluguel && (
                  <div className="flex justify-between gap-3 border-t border-linha pt-2">
                    <dt className="font-bold text-verde-900">Total mensal estimado</dt>
                    <dd className="font-extrabold text-verde-900">{formatarMoedaCurta(totalMensal)}</dd>
                  </div>
                )}
                {v.venda && v.iptu && (
                  <p className="pt-1 text-xs text-grafite-400">
                    IPTU anual de {formatarMoeda(v.iptu)}.
                  </p>
                )}
              </dl>
            )}

            <div className="mt-6 space-y-2.5">
              <Botao tamanho="lg" className="w-full" onClick={() => setModalInteresse(true)}>
                Tenho interesse
              </Botao>
              <Botao variante="contorno" tamanho="lg" className="w-full" onClick={() => setModalVisita(true)}>
                Agendar visita
              </Botao>
              <BotaoWhatsapp
                className="w-full"
                mensagem={`Olá! Tenho interesse no imóvel ${imovel.codigo} — ${imovel.titulo}.`}
              />
              <button
                type="button"
                onClick={() => {
                  alternarFavoritoVisitante(imovel.id);
                  avisar(favoritado ? "Removido dos favoritos." : "Imóvel salvo nos favoritos.");
                }}
                aria-pressed={favoritado}
                className="w-full rounded-sm px-4 py-2.5 text-sm font-bold text-grafite-500 transition-colors hover:text-verde-800"
              >
                {favoritado ? "★ Salvo nos favoritos" : "☆ Salvar nos favoritos"}
              </button>
            </div>
          </div>

          {corretor && (
            <div className="mt-4 rounded-sm border border-linha bg-white p-6">
              <p className="eyebrow text-dourado-600">Corretor responsável</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-verde-800 text-sm font-extrabold text-areia-50">
                  {corretor.avatarIniciais}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-verde-900">{corretor.nome}</p>
                  <p className="text-xs text-grafite-400">{corretor.creci ?? "Equipe Paganelli"}</p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-relaxed text-grafite-500">
                Acompanha este imóvel desde a captação e conduz a negociação do início ao fim.
              </p>
            </div>
          )}

          {imovel.exclusivo && (
            <div className="mt-4 rounded-sm border border-dourado-300 bg-dourado-100/50 p-5">
              <p className="text-sm font-extrabold text-dourado-700">Imóvel exclusivo Paganelli</p>
              <p className="mt-1.5 text-xs leading-relaxed text-grafite-600">
                Comercializado com exclusividade pela nossa equipe — book, documentação e
                negociação centralizados em um único interlocutor.
              </p>
            </div>
          )}
        </aside>
      </div>

      {semelhantes.length > 0 && (
        <section className="border-t border-linha bg-areia-50 py-16" aria-labelledby="semelhantes">
          <div className="container-paganelli">
            <h2 id="semelhantes" className="font-display text-2xl text-verde-900">
              Imóveis semelhantes
            </h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {semelhantes.map((i) => (
                <CardImovelCompacto key={i.id} imovel={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      <Modal
        aberto={modalInteresse}
        aoFechar={() => setModalInteresse(false)}
        titulo={`Tenho interesse em ${imovel.titulo}`}
        descricao="Seu contato vai direto para o corretor responsável e fica registrado no nosso atendimento."
      >
        <FormularioLead
          canal="formulario_imovel"
          imovelId={imovel.id}
          anuncioId={anuncio.id}
          mensagemInicial={`Tenho interesse no imóvel ${imovel.codigo} — ${imovel.titulo}.`}
          compacto
          rotuloEnvio="Enviar interesse"
        />
      </Modal>

      <Modal
        aberto={modalVisita}
        aoFechar={() => setModalVisita(false)}
        titulo="Agendar visita"
        descricao={`${imovel.titulo} — ${enderecoResumido(imovel)}`}
      >
        <AgendarVisita
          imovel={imovel}
          anuncioId={anuncio.id}
          aoConcluir={() => setModalVisita(false)}
        />
      </Modal>
    </>
  );
}
