"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, Campo, CampoSelecao, CampoTexto, EstadoVazio, Modal, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { classes, diasAte, formatarData, paraISO, rotuloStatusVisita } from "@/lib/format";
import type { StatusVisita, Visita } from "@/lib/types";

const tomStatus: Record<StatusVisita, "verde" | "alerta" | "neutro" | "erro"> = {
  confirmada: "verde",
  realizada: "verde",
  agendada: "alerta",
  cancelada: "erro",
  nao_compareceu: "erro",
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function PaginaVisitas() {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();

  const [visao, setVisao] = useState<"calendario" | "lista">("calendario");
  const [status, setStatus] = useState("todos");
  const [corretor, setCorretor] = useState("todos");
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [modalNova, setModalNova] = useState(false);
  const [visitaFeedback, setVisitaFeedback] = useState<Visita | null>(null);

  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  const visitas = useMemo(
    () =>
      dados.visitas.filter((v) => {
        if (status !== "todos" && v.status !== status) return false;
        if (corretor !== "todos" && v.corretorId !== corretor) return false;
        return true;
      }),
    [dados.visitas, status, corretor],
  );

  /** Grade do mês: dias vazios até o primeiro dia da semana + dias do mês. */
  const grade = useMemo(() => {
    const ano = mesReferencia.getFullYear();
    const mes = mesReferencia.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();

    const celulas: { iso: string | null; numero: number | null }[] = [];
    for (let i = 0; i < primeiroDiaSemana; i++) celulas.push({ iso: null, numero: null });
    for (let d = 1; d <= totalDias; d++) {
      celulas.push({ iso: paraISO(new Date(ano, mes, d)), numero: d });
    }
    return celulas;
  }, [mesReferencia]);

  const hoje = paraISO(new Date());
  const seletor = "rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700";

  function mudarMes(delta: number) {
    setMesReferencia((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Agenda de visitas"
        descricao="Acompanhe confirmações, atendimentos e o retorno de cada visita."
        acoes={
          pode("agendar_visita") && <Botao onClick={() => setModalNova(true)}>+ Agendar visita</Botao>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status" className={seletor}>
          <option value="todos">Todos os status</option>
          {(Object.keys(rotuloStatusVisita) as StatusVisita[]).map((s) => (
            <option key={s} value={s}>
              {rotuloStatusVisita[s]}
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

        <div role="group" aria-label="Modo de visualização" className="ml-auto flex rounded-sm border border-linha bg-white p-0.5">
          {(["calendario", "lista"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisao(v)}
              aria-pressed={visao === v}
              className={classes(
                "rounded-sm px-3 py-1.5 text-xs font-bold capitalize transition-colors",
                visao === v ? "bg-verde-800 text-areia-50" : "text-grafite-500 hover:text-verde-800",
              )}
            >
              {v === "calendario" ? "Calendário" : "Lista"}
            </button>
          ))}
        </div>
      </div>

      {visao === "calendario" ? (
        <section className="rounded-sm border border-linha bg-white p-4" aria-label="Calendário de visitas">
          <header className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => mudarMes(-1)}
              aria-label="Mês anterior"
              className="rounded-sm border border-linha px-3 py-1.5 text-xs font-bold text-grafite-700 hover:bg-areia-100"
            >
              ←
            </button>
            {/* first-letter, não capitalize: senão vira "Agosto De 2026". */}
            <h2 className="font-display text-xl text-verde-900 first-letter:uppercase">
              {mesReferencia.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </h2>
            <button
              type="button"
              onClick={() => mudarMes(1)}
              aria-label="Próximo mês"
              className="rounded-sm border border-linha px-3 py-1.5 text-xs font-bold text-grafite-700 hover:bg-areia-100"
            >
              →
            </button>
          </header>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-sm border border-linha bg-linha">
            {diasSemana.map((d) => (
              <div key={d} className="bg-areia-50 px-2 py-2 text-center text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                {d}
              </div>
            ))}

            {grade.map((celula, i) => {
              const doDia = celula.iso ? visitas.filter((v) => v.data === celula.iso) : [];
              const ehHoje = celula.iso === hoje;
              return (
                <div
                  key={i}
                  className={classes(
                    "min-h-24 bg-white p-1.5",
                    !celula.iso && "bg-areia-50/60",
                    ehHoje && "bg-verde-50",
                  )}
                >
                  {celula.numero && (
                    <p className={classes("mb-1 text-xs font-bold", ehHoje ? "text-verde-800" : "text-grafite-500")}>
                      {celula.numero}
                    </p>
                  )}
                  <div className="space-y-1">
                    {doDia.map((v) => {
                      const cliente = dados.clientePorId(v.clienteId);
                      const imovel = dados.imovelPorId(v.imovelId);
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => setVisitaFeedback(v)}
                          className={classes(
                            "block w-full rounded-sm border-l-2 px-1.5 py-1 text-left text-[0.625rem] leading-tight transition-colors hover:brightness-95",
                            v.status === "cancelada" || v.status === "nao_compareceu"
                              ? "border-l-erro bg-[#f7e6e4] text-erro"
                              : v.status === "confirmada" || v.status === "realizada"
                                ? "border-l-verde-500 bg-verde-50 text-verde-700"
                                : "border-l-dourado-500 bg-dourado-100/60 text-dourado-700",
                          )}
                        >
                          <span className="block font-bold">{v.horaInicio}</span>
                          <span className="block truncate">{cliente?.nome}</span>
                          <span className="block truncate opacity-75">{imovel?.titulo}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : visitas.length === 0 ? (
        <EstadoVazio
          icone="agenda"
          titulo="Nenhuma visita encontrada"
          descricao="Ajuste os filtros ou agende uma nova visita para um cliente."
        />
      ) : (
        <div className="space-y-3">
          {[...visitas]
            .sort((a, b) => b.data.localeCompare(a.data))
            .map((v) => {
              const cliente = dados.clientePorId(v.clienteId);
              const imovel = dados.imovelPorId(v.imovelId);
              const responsavel = dados.usuarioPorId(v.corretorId);
              const dias = diasAte(v.data);

              return (
                <article key={v.id} className="rounded-sm border border-linha bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-verde-800">{v.codigo}</span>
                        <Selo tom={tomStatus[v.status]}>{rotuloStatusVisita[v.status]}</Selo>
                        <Selo tom="neutro">{v.modalidade}</Selo>
                        {!v.confirmadaPeloCliente && v.status === "agendada" && (
                          <Selo tom="alerta">Aguardando confirmação</Selo>
                        )}
                      </div>

                      <p className="mt-2 text-sm font-bold text-verde-900">
                        {cliente ? (
                          <Link href={`/painel/crm/${cliente.id}`} className="hover:text-dourado-600">
                            {cliente.nome}
                          </Link>
                        ) : (
                          "Cliente removido"
                        )}
                      </p>
                      <p className="text-xs text-grafite-500">
                        {imovel ? (
                          <Link href={`/painel/imoveis/${imovel.id}`} className="hover:text-dourado-600">
                            {imovel.codigo} · {imovel.titulo}
                          </Link>
                        ) : (
                          "Imóvel removido"
                        )}
                      </p>
                      <p className="mt-1.5 font-mono text-[0.6875rem] text-grafite-400">
                        {formatarData(v.data)} · {v.horaInicio}–{v.horaFim} · {responsavel?.nome}
                        {dias === 0 && <span className="ml-2 font-bold text-verde-700">hoje</span>}
                      </p>
                      <p className="mt-1 text-xs text-grafite-400">{v.pontoEncontro}</p>

                      {v.feedbackCliente && (
                        <p className="mt-3 border-l-2 border-dourado-400 pl-3 text-xs italic leading-relaxed text-grafite-700">
                          “{v.feedbackCliente}”
                        </p>
                      )}
                      {v.observacoesCorretor && (
                        <p className="mt-2 text-xs leading-relaxed text-grafite-500">
                          <strong className="font-bold">Corretor:</strong> {v.observacoesCorretor}
                        </p>
                      )}
                      {v.proximaAcao && (
                        <p className="mt-1 text-xs text-grafite-500">
                          <strong className="font-bold">Próxima ação:</strong> {v.proximaAcao}
                        </p>
                      )}
                    </div>

                    {pode("agendar_visita") && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {v.status === "agendada" && (
                          <Botao
                            tamanho="sm"
                            onClick={() => {
                              dados.alterarStatusVisita(v.id, "confirmada");
                              avisar("Visita confirmada com o cliente.");
                            }}
                          >
                            Confirmar
                          </Botao>
                        )}
                        {!v.lembreteEnviado && v.status !== "cancelada" && v.status !== "realizada" && (
                          <Botao
                            variante="contorno"
                            tamanho="sm"
                            onClick={() => {
                              dados.enviarLembreteVisita(v.id);
                              avisar("Lembrete enviado por WhatsApp e e-mail (simulado).");
                            }}
                          >
                            Enviar lembrete
                          </Botao>
                        )}
                        {["agendada", "confirmada"].includes(v.status) && (
                          <>
                            <Botao variante="contorno" tamanho="sm" onClick={() => setVisitaFeedback(v)}>
                              Registrar retorno
                            </Botao>
                            <Botao
                              variante="perigo"
                              tamanho="sm"
                              onClick={() => {
                                dados.alterarStatusVisita(v.id, "cancelada");
                                avisar("Visita cancelada.");
                              }}
                            >
                              Cancelar
                            </Botao>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
        </div>
      )}

      <ModalNovaVisita
        aberto={modalNova}
        aoFechar={() => setModalNova(false)}
        corretorPadrao={usuario?.id ?? ""}
      />
      <ModalFeedback visita={visitaFeedback} aoFechar={() => setVisitaFeedback(null)} />
    </>
  );
}

/* ------------------------------------------------------------ Nova visita */

function ModalNovaVisita({
  aberto,
  aoFechar,
  corretorPadrao,
}: {
  aberto: boolean;
  aoFechar: () => void;
  corretorPadrao: string;
}) {
  const dados = useDados();
  const { avisar } = useAviso();

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  const [form, setForm] = useState({
    clienteId: "",
    imovelId: "",
    corretorId: corretorPadrao,
    data: paraISO(amanha),
    horaInicio: "10:00",
    horaFim: "11:00",
    modalidade: "presencial" as "presencial" | "virtual",
    pontoEncontro: "",
  });

  const clientes = dados.clientes.filter((c) => c.tipo !== "proprietario");
  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const imovel = dados.imovelPorId(form.imovelId);
    dados.criarVisita({
      ...form,
      pontoEncontro:
        form.pontoEncontro ||
        (imovel
          ? `${imovel.endereco.logradouro}, ${imovel.endereco.numero} — ${imovel.endereco.bairro}`
          : "A definir"),
    });
    const cliente = dados.clientePorId(form.clienteId);
    if (cliente) {
      dados.registrarInteracao(cliente.id, {
        tipo: "visita",
        titulo: `Visita agendada — ${imovel?.titulo ?? "imóvel"}`,
        detalhe: `${formatarData(form.data)} às ${form.horaInicio}, modalidade ${form.modalidade}.`,
        data: new Date().toISOString(),
        autorId: form.corretorId,
      });
    }
    avisar("Visita agendada e registrada na ficha do cliente.");
    aoFechar();
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Agendar visita"
      descricao="A visita será vinculada ao cliente e ao imóvel selecionados, e aparece na timeline do CRM."
      largura="lg"
    >
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelecao
            rotulo="Cliente"
            required
            value={form.clienteId}
            onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
            opcoes={[
              { valor: "", texto: "Selecione um cliente" },
              ...clientes.map((c) => ({ valor: c.id, texto: c.nome })),
            ]}
          />
          <CampoSelecao
            rotulo="Imóvel"
            required
            value={form.imovelId}
            onChange={(e) => setForm({ ...form, imovelId: e.target.value })}
            opcoes={[
              { valor: "", texto: "Selecione um imóvel" },
              ...dados.imoveis.map((i) => ({ valor: i.id, texto: `${i.codigo} · ${i.titulo}` })),
            ]}
          />
          <CampoSelecao
            rotulo="Corretor responsável"
            value={form.corretorId}
            onChange={(e) => setForm({ ...form, corretorId: e.target.value })}
            opcoes={corretores.map((c) => ({ valor: c.id, texto: c.nome }))}
          />
          <CampoSelecao
            rotulo="Modalidade"
            value={form.modalidade}
            onChange={(e) => setForm({ ...form, modalidade: e.target.value as "presencial" | "virtual" })}
            opcoes={[
              { valor: "presencial", texto: "Presencial" },
              { valor: "virtual", texto: "Virtual" },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            rotulo="Data"
            type="date"
            required
            value={form.data}
            onChange={(e) => setForm({ ...form, data: e.target.value })}
          />
          <Campo
            rotulo="Início"
            type="time"
            required
            value={form.horaInicio}
            onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
          />
          <Campo
            rotulo="Término"
            type="time"
            required
            value={form.horaFim}
            onChange={(e) => setForm({ ...form, horaFim: e.target.value })}
          />
        </div>

        <Campo
          rotulo="Ponto de encontro"
          dica="Deixe em branco para usar o endereço do imóvel."
          value={form.pontoEncontro}
          onChange={(e) => setForm({ ...form, pontoEncontro: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Agendar visita</Botao>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------ Retorno pós-visita */

function ModalFeedback({ visita, aoFechar }: { visita: Visita | null; aoFechar: () => void }) {
  const dados = useDados();
  const { avisar } = useAviso();
  const [feedback, setFeedback] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [proximaAcao, setProximaAcao] = useState("");

  if (!visita) return null;
  const cliente = dados.clientePorId(visita.clienteId);
  const imovel = dados.imovelPorId(visita.imovelId);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!visita) return;
    dados.registrarFeedbackVisita(visita.id, feedback, observacoes, proximaAcao);
    if (cliente) {
      dados.registrarInteracao(cliente.id, {
        tipo: "visita",
        titulo: `Visita realizada — ${imovel?.titulo ?? "imóvel"}`,
        detalhe: feedback || observacoes,
        data: new Date().toISOString(),
        autorId: visita.corretorId,
      });
    }
    avisar("Retorno registrado. Visita marcada como realizada.");
    setFeedback("");
    setObservacoes("");
    setProximaAcao("");
    aoFechar();
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Registrar retorno da visita"
      descricao={`${cliente?.nome ?? "Cliente"} — ${imovel?.titulo ?? "imóvel"} · ${formatarData(visita.data)}`}
    >
      {visita.status === "realizada" ? (
        <div className="space-y-4">
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
              Feedback do cliente
            </p>
            <p className="mt-1 text-sm leading-relaxed text-grafite-700">
              {visita.feedbackCliente || "Não registrado."}
            </p>
          </div>
          <div>
            <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
              Observações do corretor
            </p>
            <p className="mt-1 text-sm leading-relaxed text-grafite-700">
              {visita.observacoesCorretor || "Não registradas."}
            </p>
          </div>
          {visita.proximaAcao && (
            <div>
              <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                Próxima ação
              </p>
              <p className="mt-1 text-sm text-grafite-700">{visita.proximaAcao}</p>
            </div>
          )}
          <div className="flex justify-end">
            <Botao variante="fantasma" onClick={aoFechar}>
              Fechar
            </Botao>
          </div>
        </div>
      ) : (
        <form onSubmit={salvar} className="space-y-4">
          <CampoTexto
            rotulo="Feedback do cliente"
            rows={3}
            placeholder="O que o cliente falou sobre o imóvel"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
          />
          <CampoTexto
            rotulo="Observações do corretor"
            rows={3}
            placeholder="Sua leitura do atendimento, objeções, sinais de interesse"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
          <Campo
            rotulo="Próxima ação"
            placeholder="Ex.: enviar simulação de financiamento até sexta"
            value={proximaAcao}
            onChange={(e) => setProximaAcao(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-1">
            <Botao type="button" variante="fantasma" onClick={aoFechar}>
              Cancelar
            </Botao>
            <Botao type="submit">Marcar como realizada</Botao>
          </div>
        </form>
      )}
    </Modal>
  );
}
