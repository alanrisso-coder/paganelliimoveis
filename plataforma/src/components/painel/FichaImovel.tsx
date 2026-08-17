"use client";

import Image from "next/image";
import Link from "next/link";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "./Cabecalho";
import { Botao, EstadoVazio, Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { UploadMidias, GaleriaFotos } from "./UploadMidias";
import {
  enderecoCompleto,
  formatarArea,
  formatarData,
  formatarMoeda,
  formatarMoedaCurta,
  formatarPercentual,
  formatarTelefone,
  rotuloFinalidade,
  rotuloStatusAnuncio,
  rotuloStatusContrato,
  rotuloStatusImovel,
  rotuloStatusVisita,
  rotuloTipoImovel,
} from "@/lib/format";
import type { StatusImovel } from "@/lib/types";

export function FichaImovel({ imovelId }: { imovelId: string }) {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();

  const imovel = dados.imovelPorId(imovelId);

  if (!dados.carregado) {
    return <p className="py-16 text-center text-sm text-grafite-400">Carregando imóvel…</p>;
  }

  if (!imovel) {
    return (
      <EstadoVazio
        icone="casa"
        titulo="Imóvel não encontrado"
        descricao="Este registro pode ter sido removido ou o endereço está incorreto."
        acao={
          <Link href="/painel/imoveis" className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50">
            Voltar ao catálogo
          </Link>
        }
      />
    );
  }

  const proprietario = dados.clientePorId(imovel.proprietarioId);
  const corretor = dados.usuarioPorId(imovel.corretorId);
  const contrato = dados.contratoDoImovel(imovel.id);
  const visitas = dados.visitasDoImovel(imovel.id);
  const leads = dados.leadsDoImovel(imovel.id);
  const anunciosDoImovel = dados.anuncios.filter((a) => a.imovelId === imovel.id);
  const { metragens: m, valores: v } = imovel;

  const interessados = dados.clientes.filter(
    (c) => c.favoritos.includes(imovel.id) || c.recomendados.includes(imovel.id),
  );

  return (
    <>
      <Link
        href="/painel/imoveis"
        className="mb-4 inline-block text-xs font-bold text-grafite-500 hover:text-verde-800"
      >
        ← Voltar ao catálogo
      </Link>

      <CabecalhoPagina
        titulo={imovel.titulo}
        descricao={`${imovel.codigo} · ${rotuloTipoImovel[imovel.tipo]} · ${rotuloFinalidade[imovel.finalidade]}`}
        acoes={
          <>
            <Selo tom={imovel.status === "disponivel" ? "verde" : "alerta"}>
              {rotuloStatusImovel[imovel.status]}
            </Selo>
            {pode("editar_imovel") && (
              <>
                <label htmlFor="status-imovel" className="sr-only">
                  Alterar status
                </label>
                <select
                  id="status-imovel"
                  value={imovel.status}
                  onChange={(e) => {
                    dados.atualizarImovel(imovel.id, { status: e.target.value as StatusImovel }, usuario?.id ?? "");
                    avisar(`Status alterado para ${rotuloStatusImovel[e.target.value as StatusImovel]}.`);
                  }}
                  className="rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700"
                >
                  {(Object.keys(rotuloStatusImovel) as StatusImovel[]).map((s) => (
                    <option key={s} value={s}>
                      {rotuloStatusImovel[s]}
                    </option>
                  ))}
                </select>
              </>
            )}
            <Link
              href={`/imoveis/${imovel.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-verde-800/25 px-4 py-2 text-xs font-extrabold text-verde-800 hover:bg-verde-800/6"
            >
              Ver no site ↗
            </Link>
            {pode("deletar_imovel") && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Tem certeza que deseja deletar "${imovel.titulo}"? Esta ação não pode ser desfeita.`)) {
                    dados.deletarImovel(imovel.id, usuario?.id ?? "");
                    avisar("Imóvel deletado com sucesso.", "sucesso");
                    window.location.href = "/painel/imoveis";
                  }
                }}
                title="Deletar imóvel"
                className="rounded-sm border border-vermelho-800/25 p-2 text-vermelho-800 hover:bg-vermelho-800/6 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            )}
          </>
        }
      />

      <GaleriaFotos
        fotos={imovel.fotos}
        onDelete={(url) => {
          dados.atualizarImovel(
            imovel.id,
            { fotos: imovel.fotos.filter((f) => f !== url) },
            usuario?.id ?? ""
          );
        }}
      />

      {pode("editar_imovel") && (
        <UploadMidias
          imovelId={imovel.id}
          tipo="fotos"
          onUpload={(url) => {
            dados.atualizarImovel(
              imovel.id,
              { fotos: [...imovel.fotos, url] },
              usuario?.id ?? ""
            );
          }}
        />
      )}

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <Painel titulo="Dados principais">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { r: "Código", v: imovel.codigo },
                { r: "Tipo", v: rotuloTipoImovel[imovel.tipo] },
                { r: "Finalidade", v: rotuloFinalidade[imovel.finalidade] },
                { r: "Área total", v: formatarArea(m.areaTotal) },
                { r: "Área construída", v: m.areaConstruida ? formatarArea(m.areaConstruida) : "—" },
                { r: "Dormitórios", v: String(m.dormitorios) },
                { r: "Suítes", v: String(m.suites) },
                { r: "Banheiros", v: String(m.banheiros) },
                { r: "Vagas", v: String(m.vagas) },
                ...(m.andar ? [{ r: "Andar", v: `${m.andar}º` }] : []),
              ].map((x) => (
                <div key={x.r}>
                  <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">{x.r}</dt>
                  <dd className="mt-0.5 text-sm font-bold text-verde-900">{x.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 border-t border-linha pt-4">
              <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">Endereço</p>
              <p className="mt-1 text-sm text-grafite-700">{enderecoCompleto(imovel)}</p>
            </div>
          </Painel>

          <Painel titulo="Valores">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                { r: "Venda", v: v.venda },
                { r: "Aluguel", v: v.aluguel },
                { r: "Condomínio", v: v.condominio },
                { r: "IPTU (anual)", v: v.iptu },
                { r: "Outras taxas", v: v.outrasTaxas },
              ]
                .filter((x) => x.v !== undefined)
                .map((x) => (
                  <div key={x.r}>
                    <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">{x.r}</dt>
                    <dd className="mt-0.5 text-sm font-extrabold text-verde-800">{formatarMoeda(x.v)}</dd>
                  </div>
                ))}
            </dl>
          </Painel>

          <Painel titulo="Descrição">
            <p className="text-sm font-bold text-verde-900">{imovel.descricaoCurta}</p>
            <p className="mt-3 text-sm leading-relaxed text-grafite-700">{imovel.descricaoCompleta}</p>

            {imovel.caracteristicas.length > 0 && (
              <div className="mt-5 border-t border-linha pt-4">
                <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                  Características
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {imovel.caracteristicas.map((c) => (
                    <span key={c} className="rounded-sm bg-areia-200 px-2 py-1 text-xs text-grafite-700">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Painel>

          <Painel titulo={`Anúncios vinculados (${anunciosDoImovel.length})`}>
            {anunciosDoImovel.length === 0 ? (
              <p className="py-4 text-center text-sm text-grafite-400">
                Nenhum anúncio criado para este imóvel.
              </p>
            ) : (
              <ul className="space-y-2">
                {anunciosDoImovel.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-linha p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-verde-900">
                        {a.codigo} · {a.titulo}
                      </p>
                      <p className="font-mono text-[0.625rem] text-grafite-400">
                        {a.metricas.visualizacoes} visualizações · {a.metricas.contatos} contatos ·{" "}
                        {a.metricas.conversoes} conversões
                      </p>
                    </div>
                    <Selo tom={a.status === "publicado" ? "verde" : a.status === "revisao" ? "alerta" : "neutro"}>
                      {rotuloStatusAnuncio[a.status]}
                    </Selo>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/painel/anuncios" className="mt-3 block text-xs font-bold text-dourado-600 underline underline-offset-2">
              Gerenciar anúncios
            </Link>
          </Painel>

          <Painel titulo={`Histórico de alterações (${imovel.historico.length})`}>
            <ol className="space-y-2.5">
              {[...imovel.historico].reverse().map((h) => {
                const autor = dados.usuarioPorId(h.autorId);
                return (
                  <li key={h.id} className="border-b border-linha pb-2.5 text-xs last:border-0 last:pb-0">
                    <p className="text-grafite-700">{h.descricao}</p>
                    <p className="mt-0.5 font-mono text-[0.625rem] text-grafite-400">
                      {formatarData(h.data)} · {autor?.nome ?? "Sistema"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Painel>
        </div>

        <div className="space-y-5">
          <Painel titulo="Proprietário">
            {proprietario ? (
              <>
                <Link href={`/painel/crm/${proprietario.id}`} className="text-sm font-bold text-verde-900 hover:text-dourado-600">
                  {proprietario.nome}
                </Link>
                <p className="mt-1 font-mono text-xs text-grafite-500">
                  {proprietario.telefone ? formatarTelefone(proprietario.telefone) : "—"}
                </p>
                <p className="text-xs text-grafite-400">{proprietario.email}</p>
              </>
            ) : (
              <p className="text-sm text-grafite-400">Proprietário não vinculado.</p>
            )}

            <div className="mt-4 border-t border-linha pt-4">
              <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                Corretor responsável
              </p>
              <p className="mt-1 text-sm font-bold text-verde-900">{corretor?.nome ?? "—"}</p>
              <p className="text-xs text-grafite-400">{corretor?.creci}</p>
            </div>
          </Painel>

          <Painel titulo="Exclusividade">
            {imovel.exclusivo ? (
              <>
                <Selo tom="dourado">Exclusivo Paganelli</Selo>
                {imovel.exclusividadeAte && (
                  <p className="mt-3 text-sm text-grafite-700">
                    Vigente até <strong className="font-bold">{formatarData(imovel.exclusividadeAte)}</strong>
                  </p>
                )}
                {contrato && (
                  <div className="mt-4 rounded-sm border border-linha p-3">
                    <p className="text-sm font-bold text-verde-900">{contrato.numero}</p>
                    <p className="mt-1 text-xs text-grafite-500">
                      Comissão de {formatarPercentual(contrato.comissaoPercentual)} ·{" "}
                      {rotuloStatusContrato[contrato.status]}
                    </p>
                    <Link href="/painel/contratos" className="mt-2 inline-block text-xs font-bold text-dourado-600 underline underline-offset-2">
                      Ver contrato
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-grafite-400">Imóvel sem contrato de exclusividade.</p>
            )}
          </Painel>

          <Painel titulo={`Visitas realizadas (${visitas.length})`}>
            {visitas.length === 0 ? (
              <p className="py-4 text-center text-sm text-grafite-400">Nenhuma visita registrada.</p>
            ) : (
              <ul className="space-y-2">
                {visitas.slice(0, 6).map((vis) => {
                  const cliente = dados.clientePorId(vis.clienteId);
                  return (
                    <li key={vis.id} className="border-b border-linha pb-2.5 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-verde-900">{cliente?.nome}</p>
                        <Selo tom={vis.status === "realizada" ? "verde" : "neutro"}>
                          {rotuloStatusVisita[vis.status]}
                        </Selo>
                      </div>
                      <p className="mt-0.5 font-mono text-[0.625rem] text-grafite-400">
                        {formatarData(vis.data)} · {vis.horaInicio}
                      </p>
                      {vis.feedbackCliente && (
                        <p className="mt-1.5 text-xs italic leading-relaxed text-grafite-600">
                          “{vis.feedbackCliente}”
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Painel>

          <Painel titulo={`Leads interessados (${leads.length + interessados.length})`}>
            {leads.length === 0 && interessados.length === 0 ? (
              <p className="py-4 text-center text-sm text-grafite-400">Nenhum interessado registrado.</p>
            ) : (
              <ul className="space-y-2">
                {interessados.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 border-b border-linha pb-2 last:border-0">
                    <Link href={`/painel/crm/${c.id}`} className="text-sm text-verde-900 hover:text-dourado-600">
                      {c.nome}
                    </Link>
                    <span className="font-mono text-[0.625rem] text-grafite-400">CRM</span>
                  </li>
                ))}
                {leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-2 border-b border-linha pb-2 last:border-0">
                    <span className="text-sm text-grafite-700">{l.nome}</span>
                    <span className="font-mono text-[0.625rem] text-grafite-400">{l.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </Painel>

          <Painel titulo={`Documentos (${imovel.documentos.length})`}>
            {imovel.documentos.length === 0 ? (
              <p className="py-4 text-center text-sm text-grafite-400">Nenhum documento anexado.</p>
            ) : (
              <ul className="space-y-2">
                {imovel.documentos.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 rounded-sm border border-linha px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-grafite-900">{d.nome}</span>
                      <span className="text-[0.625rem] text-grafite-400">
                        {d.tamanhoKb} KB · {formatarData(d.enviadoEm)}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => avisar("Download disponível na versão com armazenamento integrado.", "info")}
                      className="shrink-0 text-xs font-bold text-dourado-600 underline underline-offset-2"
                    >
                      Baixar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Painel>

          <Painel titulo="SEO do anúncio">
            <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">Título</p>
            <p className="mt-0.5 text-sm text-grafite-900">{imovel.seo.titulo}</p>
            <p className="mt-3 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">Descrição</p>
            <p className="mt-0.5 text-sm text-grafite-700">{imovel.seo.descricao}</p>
            <p className="mt-3 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">URL</p>
            <p className="mt-0.5 font-mono text-xs text-verde-800">/imoveis/{imovel.slug}</p>
          </Painel>

          {v.venda && (
            <Painel titulo="Comissão estimada">
              <p className="font-display text-2xl text-verde-900">
                {formatarMoedaCurta((v.venda * (contrato?.comissaoPercentual ?? 6)) / 100)}
              </p>
              <p className="mt-1 text-xs text-grafite-400">
                {formatarPercentual(contrato?.comissaoPercentual ?? 6)} sobre o valor de venda
              </p>
            </Painel>
          )}
        </div>
      </div>

    </>
  );
}
