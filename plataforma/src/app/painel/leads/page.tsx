"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, EstadoVazio, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { classes, formatarTelefone, formatarTempoRelativo } from "@/lib/format";
import type { CanalLead, StatusLead } from "@/lib/types";

const rotuloCanal: Record<CanalLead, string> = {
  formulario_imovel: "Formulário do imóvel",
  formulario_contato: "Formulário de contato",
  anuncie: "Anuncie seu imóvel",
  whatsapp: "WhatsApp",
  agendamento: "Pedido de visita",
};

const rotuloStatus: Record<StatusLead, string> = {
  novo: "Novo",
  atribuido: "Atribuído",
  em_atendimento: "Em atendimento",
  convertido: "Convertido",
  descartado: "Descartado",
};

const tomStatus: Record<StatusLead, "dourado" | "alerta" | "verde" | "neutro"> = {
  novo: "dourado",
  atribuido: "alerta",
  em_atendimento: "alerta",
  convertido: "verde",
  descartado: "neutro",
};

export default function PaginaLeads() {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();
  const [filtro, setFiltro] = useState<StatusLead | "todos">("todos");

  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  const lista = useMemo(
    () =>
      [...dados.leads]
        .filter((l) => filtro === "todos" || l.status === filtro)
        .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [dados.leads, filtro],
  );

  const contagem = (s: StatusLead) => dados.leads.filter((l) => l.status === s).length;

  /**
   * Atribuição automática: escolhe o corretor com menos leads ativos na fila.
   * Um round-robin ponderado, simples o bastante para ser previsível.
   */
  function atribuirAutomaticamente(leadId: string) {
    const carga = corretores.map((c) => ({
      id: c.id,
      nome: c.nome,
      total: dados.leads.filter(
        (l) => l.corretorId === c.id && ["atribuido", "em_atendimento"].includes(l.status),
      ).length,
    }));
    const escolhido = carga.sort((a, b) => a.total - b.total)[0];
    if (!escolhido) return;
    dados.atribuirLead(leadId, escolhido.id);
    avisar(`Lead atribuído automaticamente a ${escolhido.nome} (menor fila).`);
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Leads"
        descricao="Contatos recebidos pelo site institucional, antes de entrarem no funil do CRM."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {(["todos", "novo", "atribuido", "em_atendimento", "convertido", "descartado"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            aria-pressed={filtro === f}
            className={classes(
              "rounded-sm border px-3.5 py-2 text-xs font-bold transition-colors",
              filtro === f
                ? "border-verde-800 bg-verde-800 text-areia-50"
                : "border-linha bg-white text-grafite-600 hover:border-dourado-400",
            )}
          >
            {f === "todos" ? "Todos" : rotuloStatus[f]}
            <span className="ml-1.5 font-mono opacity-65">
              {f === "todos" ? dados.leads.length : contagem(f)}
            </span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum lead nesta situação"
          descricao="Assim que um visitante enviar um formulário no site, o contato aparece aqui automaticamente."
          acao={
            <Link href="/" target="_blank" className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50">
              Abrir o site em nova aba
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {lista.map((lead) => {
            const imovel = lead.imovelId ? dados.imovelPorId(lead.imovelId) : undefined;
            const corretor = lead.corretorId ? dados.usuarioPorId(lead.corretorId) : undefined;

            return (
              <article key={lead.id} className="rounded-sm border border-linha bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-sm font-bold text-verde-900">{lead.nome}</h2>
                      <Selo tom={tomStatus[lead.status]}>{rotuloStatus[lead.status]}</Selo>
                      <Selo tom="neutro">{rotuloCanal[lead.canal]}</Selo>
                    </div>

                    <p className="mt-1.5 font-mono text-xs text-grafite-500">
                      {formatarTelefone(lead.telefone)} · {lead.email}
                    </p>

                    <p className="mt-2.5 max-w-2xl text-sm leading-relaxed text-grafite-700">
                      “{lead.mensagem}”
                    </p>

                    <p className="mt-2 text-xs text-grafite-400">
                      {formatarTempoRelativo(lead.criadoEm)}
                      {imovel && (
                        <>
                          {" · "}
                          <Link href={`/painel/imoveis/${imovel.id}`} className="hover:text-dourado-600">
                            {imovel.codigo} · {imovel.titulo}
                          </Link>
                        </>
                      )}
                      {corretor && ` · atribuído a ${corretor.nome}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-stretch gap-2">
                    {lead.status === "convertido" && lead.clienteId ? (
                      <Link
                        href={`/painel/crm/${lead.clienteId}`}
                        className="rounded-sm border border-verde-800/25 px-4 py-2 text-center text-xs font-extrabold text-verde-800 hover:bg-verde-800/6"
                      >
                        Abrir no CRM
                      </Link>
                    ) : lead.status !== "descartado" ? (
                      <>
                        {pode("atribuir_lead") && !lead.corretorId && (
                          <Botao tamanho="sm" variante="contorno" onClick={() => atribuirAutomaticamente(lead.id)}>
                            Atribuir automaticamente
                          </Botao>
                        )}
                        {pode("atribuir_lead") && (
                          <>
                            <label htmlFor={`corretor-${lead.id}`} className="sr-only">
                              Atribuir {lead.nome} a um corretor
                            </label>
                            <select
                              id={`corretor-${lead.id}`}
                              value={lead.corretorId ?? ""}
                              onChange={(e) => {
                                dados.atribuirLead(lead.id, e.target.value);
                                avisar("Lead atribuído.");
                              }}
                              className="rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700"
                            >
                              <option value="">Atribuir a…</option>
                              {corretores.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.nome}
                                </option>
                              ))}
                            </select>
                          </>
                        )}
                        <Botao
                          tamanho="sm"
                          onClick={() => {
                            const cliente = dados.converterLeadEmCliente(lead.id, usuario?.id ?? "");
                            avisar(
                              cliente
                                ? `${cliente.nome} agora é um cliente do CRM, na etapa "Contato realizado".`
                                : "Não foi possível converter este lead.",
                              cliente ? "sucesso" : "erro",
                            );
                          }}
                        >
                          Converter em cliente
                        </Botao>
                        <Botao
                          tamanho="sm"
                          variante="perigo"
                          onClick={() => {
                            dados.descartarLead(lead.id);
                            avisar("Lead descartado.");
                          }}
                        >
                          Descartar
                        </Botao>
                      </>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
