"use client";

import Link from "next/link";
import { useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "./Cabecalho";
import { Botao, CampoSelecao, CampoTexto, EstadoVazio, Modal, Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { CardImovelCompacto } from "@/components/site/CardImovel";
import { WhatsAppStatus } from "./WhatsAppStatus";
import {
  etapasFunil,
  formatarData,
  formatarDataHora,
  formatarDocumento,
  formatarMoedaCurta,
  formatarTelefone,
  rotuloEtapaFunil,
  rotuloStatusVisita,
} from "@/lib/format";
import type { EtapaFunil, TipoInteracao } from "@/lib/types";

const iconesInteracao: Record<TipoInteracao, string> = {
  ligacao: "☎",
  mensagem: "💬",
  email: "✉",
  visita: "🏠",
  documento: "📄",
  observacao: "✎",
  proposta: "★",
};

const rotulosInteracao: Record<TipoInteracao, string> = {
  ligacao: "Ligação",
  mensagem: "Mensagem",
  email: "E-mail",
  visita: "Visita",
  documento: "Documento",
  observacao: "Observação",
  proposta: "Proposta",
};

export function FichaCliente({ clienteId }: { clienteId: string }) {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();
  const [modalInteracao, setModalInteracao] = useState(false);

  const cliente = dados.clientePorId(clienteId);

  if (!dados.carregado) {
    return <p className="py-16 text-center text-sm text-grafite-400">Carregando ficha…</p>;
  }

  if (!cliente) {
    return (
      <EstadoVazio
        titulo="Cliente não encontrado"
        descricao="Este registro pode ter sido removido ou o endereço está incorreto."
        acao={
          <Link href="/painel/crm" className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50">
            Voltar ao CRM
          </Link>
        }
      />
    );
  }

  const corretor = dados.usuarioPorId(cliente.corretorId);
  const visitas = dados.visitasDoCliente(cliente.id);
  const favoritos = cliente.favoritos
    .map((id) => dados.imovelPorId(id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));
  const recomendados = cliente.recomendados
    .map((id) => dados.imovelPorId(id))
    .filter((i): i is NonNullable<typeof i> => Boolean(i));
  const tarefas = dados.tarefas.filter((t) => t.clienteId === cliente.id);

  const timeline = [...cliente.timeline].sort((a, b) => b.data.localeCompare(a.data));

  return (
    <>
      <Link
        href="/painel/crm"
        className="mb-4 inline-block text-xs font-bold text-grafite-500 hover:text-verde-800"
      >
        ← Voltar ao CRM
      </Link>

      <CabecalhoPagina
        titulo={cliente.nome}
        descricao={`${cliente.tipo.charAt(0).toUpperCase() + cliente.tipo.slice(1)} · origem ${cliente.origem} · cadastrado em ${formatarData(cliente.criadoEm)}`}
        acoes={
          pode("editar_cliente") && (
            <>
              <label htmlFor="mover-etapa" className="sr-only">
                Etapa do funil
              </label>
              <select
                id="mover-etapa"
                value={cliente.etapa}
                onChange={(e) => {
                  dados.moverEtapaCliente(cliente.id, e.target.value as EtapaFunil);
                  avisar(`Etapa alterada para ${rotuloEtapaFunil[e.target.value as EtapaFunil]}.`);
                }}
                className="rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700"
              >
                {etapasFunil.map((e) => (
                  <option key={e} value={e}>
                    {rotuloEtapaFunil[e]}
                  </option>
                ))}
              </select>
              <Botao onClick={() => setModalInteracao(true)}>+ Registrar interação</Botao>
            </>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        {/* --------------------------------------------------------- Coluna 1 */}
        <div className="space-y-5">
          <Painel titulo="Dados de contato">
            <dl className="space-y-3 text-sm">
              {[
                { rotulo: "Telefone", valor: cliente.telefone ? formatarTelefone(cliente.telefone) : "—" },
                { rotulo: "WhatsApp", valor: cliente.whatsapp ? formatarTelefone(cliente.whatsapp) : "—" },
                { rotulo: "E-mail", valor: cliente.email || "—" },
                { rotulo: "CPF / CNPJ", valor: cliente.documento ? formatarDocumento(cliente.documento) : "—" },
                { rotulo: "Endereço", valor: cliente.endereco ?? "—" },
                { rotulo: "Corretor responsável", valor: corretor?.nome ?? "—" },
              ].map((linha) => (
                <div key={linha.rotulo} className="border-b border-linha pb-2.5 last:border-0 last:pb-0">
                  <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    {linha.rotulo}
                  </dt>
                  <dd className="mt-0.5 text-grafite-900">{linha.valor}</dd>
                </div>
              ))}
              <WhatsAppStatus clienteId={cliente.id} />
            </dl>
          </Painel>

          <Painel titulo="Perfil de busca">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                  Faixa de orçamento
                </dt>
                <dd className="mt-0.5 font-bold text-verde-800">
                  {cliente.orcamentoMin || cliente.orcamentoMax
                    ? `${cliente.orcamentoMin ? formatarMoedaCurta(cliente.orcamentoMin) : "sem mínimo"} a ${cliente.orcamentoMax ? formatarMoedaCurta(cliente.orcamentoMax) : "sem máximo"}`
                    : "Não informada"}
                </dd>
              </div>
              <div>
                <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                  Interesse
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {cliente.interesses.map((i) => (
                    <Selo key={i} tom="verde">
                      {i}
                    </Selo>
                  ))}
                </dd>
              </div>
              {cliente.preferencias.regioes.length > 0 && (
                <div>
                  <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    Regiões
                  </dt>
                  <dd className="mt-0.5 text-grafite-900">{cliente.preferencias.regioes.join(" · ")}</dd>
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 border-t border-linha pt-3">
                {[
                  { r: "Dorm.", v: cliente.preferencias.dormitoriosMin },
                  { r: "Vagas", v: cliente.preferencias.vagasMin },
                  { r: "Área mín.", v: cliente.preferencias.areaMinima },
                ].map((x) => (
                  <div key={x.r}>
                    <dt className="text-[0.625rem] text-grafite-400">{x.r}</dt>
                    <dd className="font-bold text-grafite-900">{x.v ? `${x.v}+` : "—"}</dd>
                  </div>
                ))}
              </div>
              {cliente.preferencias.caracteristicas.length > 0 && (
                <div className="border-t border-linha pt-3">
                  <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    Características desejadas
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {cliente.preferencias.caracteristicas.map((c) => (
                      <span key={c} className="rounded-sm bg-areia-200 px-2 py-1 text-xs text-grafite-700">
                        {c}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </Painel>

          {cliente.observacoes && (
            <Painel titulo="Observações">
              <p className="text-sm leading-relaxed text-grafite-700">{cliente.observacoes}</p>
            </Painel>
          )}

          <Painel titulo={`Documentos (${cliente.documentos.length})`}>
            {cliente.documentos.length === 0 ? (
              <p className="py-4 text-center text-sm text-grafite-400">Nenhum documento anexado.</p>
            ) : (
              <ul className="space-y-2">
                {cliente.documentos.map((d) => (
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
        </div>

        {/* --------------------------------------------------------- Coluna 2 */}
        <div className="space-y-5">
          <Painel titulo={`Timeline de relacionamento (${timeline.length})`}>
            <ol className="relative space-y-0 border-l border-linha pl-6">
              {timeline.map((item) => {
                const autor = dados.usuarioPorId(item.autorId);
                return (
                  <li key={item.id} className="relative pb-6 last:pb-0">
                    <span
                      className="absolute -left-[1.9375rem] top-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-linha bg-white text-[0.6875rem]"
                      aria-hidden="true"
                    >
                      {iconesInteracao[item.tipo]}
                    </span>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className="text-sm font-bold text-verde-900">{item.titulo}</p>
                      <Selo tom="neutro">{rotulosInteracao[item.tipo]}</Selo>
                    </div>
                    {item.detalhe && (
                      <p className="mt-1.5 text-sm leading-relaxed text-grafite-700">{item.detalhe}</p>
                    )}
                    <p className="mt-1.5 font-mono text-[0.625rem] text-grafite-400">
                      {formatarDataHora(item.data)} · {autor?.nome ?? "Sistema"}
                    </p>
                  </li>
                );
              })}
            </ol>
          </Painel>

          <Painel
            titulo={`Histórico de visitas (${visitas.length})`}
            acao={
              <Link href="/painel/visitas" className="text-xs font-bold text-dourado-600 underline underline-offset-2">
                Agenda completa
              </Link>
            }
          >
            {visitas.length === 0 ? (
              <p className="py-5 text-center text-sm text-grafite-400">
                Nenhuma visita registrada para este cliente.
              </p>
            ) : (
              <ul className="space-y-2">
                {visitas.map((v) => {
                  const imovel = dados.imovelPorId(v.imovelId);
                  return (
                    <li key={v.id} className="rounded-sm border border-linha p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-verde-900">{imovel?.titulo}</p>
                        <Selo
                          tom={
                            v.status === "realizada"
                              ? "verde"
                              : v.status === "cancelada" || v.status === "nao_compareceu"
                                ? "erro"
                                : "alerta"
                          }
                        >
                          {rotuloStatusVisita[v.status]}
                        </Selo>
                      </div>
                      <p className="mt-1 font-mono text-[0.6875rem] text-grafite-400">
                        {formatarData(v.data)} · {v.horaInicio}–{v.horaFim} · {v.modalidade}
                      </p>
                      {v.feedbackCliente && (
                        <p className="mt-2 border-l-2 border-dourado-400 pl-3 text-xs italic leading-relaxed text-grafite-700">
                          “{v.feedbackCliente}”
                        </p>
                      )}
                      {v.proximaAcao && (
                        <p className="mt-2 text-xs text-grafite-500">
                          <strong className="font-bold">Próxima ação:</strong> {v.proximaAcao}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Painel>

          <div className="grid gap-5 sm:grid-cols-2">
            <Painel titulo={`Favoritos (${favoritos.length})`}>
              {favoritos.length === 0 ? (
                <p className="py-4 text-center text-sm text-grafite-400">Nenhum favorito.</p>
              ) : (
                <div className="space-y-2">
                  {favoritos.map((i) => (
                    <CardImovelCompacto key={i.id} imovel={i} />
                  ))}
                </div>
              )}
            </Painel>

            <Painel titulo={`Recomendados (${recomendados.length})`}>
              {recomendados.length === 0 ? (
                <p className="py-4 text-center text-sm text-grafite-400">Nenhuma recomendação.</p>
              ) : (
                <div className="space-y-2">
                  {recomendados.map((i) => (
                    <CardImovelCompacto key={i.id} imovel={i} />
                  ))}
                </div>
              )}
            </Painel>
          </div>

          <Painel titulo={`Tarefas e lembretes (${tarefas.length})`}>
            {tarefas.length === 0 ? (
              <p className="py-4 text-center text-sm text-grafite-400">Nenhuma tarefa vinculada.</p>
            ) : (
              <ul className="space-y-2">
                {tarefas.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 border-b border-linha pb-2.5 last:border-0">
                    <label className="flex items-center gap-2.5 text-sm text-grafite-700">
                      <input
                        type="checkbox"
                        checked={t.concluida}
                        onChange={() => dados.alternarTarefa(t.id)}
                        className="h-4 w-4 accent-verde-700"
                      />
                      <span className={t.concluida ? "line-through opacity-55" : ""}>{t.titulo}</span>
                    </label>
                    <span className="shrink-0 font-mono text-[0.625rem] text-grafite-400">
                      {formatarData(t.vencimento)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Painel>
        </div>
      </div>

      <ModalInteracao
        aberto={modalInteracao}
        aoFechar={() => setModalInteracao(false)}
        clienteId={cliente.id}
        autorId={usuario?.id ?? ""}
      />
    </>
  );
}

function ModalInteracao({
  aberto,
  aoFechar,
  clienteId,
  autorId,
}: {
  aberto: boolean;
  aoFechar: () => void;
  clienteId: string;
  autorId: string;
}) {
  const { registrarInteracao } = useDados();
  const { avisar } = useAviso();
  const [tipo, setTipo] = useState<TipoInteracao>("ligacao");
  const [titulo, setTitulo] = useState("");
  const [detalhe, setDetalhe] = useState("");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    registrarInteracao(clienteId, {
      tipo,
      titulo: titulo || rotulosInteracao[tipo],
      detalhe,
      data: new Date().toISOString(),
      autorId,
    });
    avisar("Interação registrada na timeline.");
    setTitulo("");
    setDetalhe("");
    aoFechar();
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Registrar interação"
      descricao="O registro entra na timeline do cliente e fica visível para toda a equipe."
    >
      <form onSubmit={salvar} className="space-y-4">
        <CampoSelecao
          rotulo="Tipo de interação"
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoInteracao)}
          opcoes={(Object.keys(rotulosInteracao) as TipoInteracao[]).map((t) => ({
            valor: t,
            texto: rotulosInteracao[t],
          }))}
        />
        <CampoTexto
          rotulo="Resumo"
          rows={2}
          required
          placeholder="Ex.: Ligação de qualificação — 14 min"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
        <CampoTexto
          rotulo="Detalhes"
          rows={4}
          placeholder="O que foi conversado, próximos passos, objeções…"
          value={detalhe}
          onChange={(e) => setDetalhe(e.target.value)}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Registrar</Botao>
        </div>
      </form>
    </Modal>
  );
}
