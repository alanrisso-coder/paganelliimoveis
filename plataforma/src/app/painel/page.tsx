"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Indicador } from "@/components/painel/Indicador";
import { FunilComercial } from "@/components/painel/Graficos";
import { Painel, Selo } from "@/components/ui";
import {
  diasAte,
  etapasFunil,
  formatarData,
  formatarTempoRelativo,
  rotuloEtapaFunil,
  rotuloStatusVisita,
} from "@/lib/format";

type Periodo = "7" | "30" | "90" | "365";

const periodos: { valor: Periodo; texto: string }[] = [
  { valor: "7", texto: "Últimos 7 dias" },
  { valor: "30", texto: "Últimos 30 dias" },
  { valor: "90", texto: "Últimos 90 dias" },
  { valor: "365", texto: "Últimos 12 meses" },
];

export default function PaginaDashboard() {
  const dados = useDados();
  const { usuario } = useSessao();
  const [periodo, setPeriodo] = useState<Periodo>("30");
  const [corretorFiltro, setCorretorFiltro] = useState("todos");
  const [negocioFiltro, setNegocioFiltro] = useState<"todos" | "venda" | "aluguel">("todos");

  const { imoveis, clientes, anuncios, visitas, contratos, leads, tarefas, logs, usuarios } = dados;

  const corretores = usuarios.filter((u) => u.perfil !== "assistente");

  /** Filtro comum a todas as métricas: período, corretor e tipo de negócio. */
  const filtrado = useMemo(() => {
    const limite = Number(periodo);
    const dentroDoPeriodo = (iso: string) => -diasAte(iso.slice(0, 10)) <= limite;
    const doCorretor = (id: string) => corretorFiltro === "todos" || id === corretorFiltro;

    const imoveisF = imoveis.filter((i) => {
      if (!doCorretor(i.corretorId)) return false;
      if (negocioFiltro === "venda") return i.finalidade !== "aluguel";
      if (negocioFiltro === "aluguel") return i.finalidade !== "venda";
      return true;
    });
    const idsImoveis = new Set(imoveisF.map((i) => i.id));

    return {
      imoveis: imoveisF,
      clientes: clientes.filter((c) => doCorretor(c.corretorId) && c.tipo !== "proprietario"),
      anuncios: anuncios.filter((a) => doCorretor(a.corretorId) && idsImoveis.has(a.imovelId)),
      visitas: visitas.filter((v) => doCorretor(v.corretorId) && idsImoveis.has(v.imovelId)),
      contratos: contratos.filter((c) => doCorretor(c.corretorId) && idsImoveis.has(c.imovelId)),
      leads: leads.filter((l) => dentroDoPeriodo(l.criadoEm)),
    };
  }, [imoveis, clientes, anuncios, visitas, contratos, leads, periodo, corretorFiltro, negocioFiltro]);

  const contar = <T,>(lista: T[], p: (x: T) => boolean) => lista.filter(p).length;

  const imoveisAtivos = contar(filtrado.imoveis, (i) => i.status === "disponivel");
  const imoveisVendidos = contar(filtrado.imoveis, (i) => i.status === "vendido");
  const imoveisAlugados = contar(filtrado.imoveis, (i) => i.status === "alugado");
  const imoveisCaptacao = contar(filtrado.imoveis, (i) => i.status === "reservado");

  const leadsNovos = contar(filtrado.leads, (l) => l.status === "novo");
  const leadsAtendimento = contar(filtrado.leads, (l) =>
    ["atribuido", "em_atendimento"].includes(l.status),
  );

  const visitasHoje = filtrado.visitas.filter(
    (v) => diasAte(v.data) === 0 && !["cancelada"].includes(v.status),
  );
  const visitasSemana = filtrado.visitas.filter(
    (v) => diasAte(v.data) >= 0 && diasAte(v.data) <= 6 && v.status !== "cancelada",
  );

  const contratosVencendo = filtrado.contratos.filter(
    (c) => ["ativo", "vencendo"].includes(c.status) && diasAte(c.dataTermino) <= 30 && diasAte(c.dataTermino) >= 0,
  );

  const anunciosPublicados = contar(filtrado.anuncios, (a) => a.status === "publicado");
  const anunciosRascunho = contar(filtrado.anuncios, (a) => a.status === "rascunho");
  const anunciosRevisao = contar(filtrado.anuncios, (a) => a.status === "revisao");

  // Conversões: leads → visita e visita → proposta, sobre a base de clientes ativos.
  const totalClientes = filtrado.clientes.length;
  const comVisita = contar(filtrado.clientes, (c) =>
    ["visita", "proposta", "negociacao", "fechado"].includes(c.etapa),
  );
  const comProposta = contar(filtrado.clientes, (c) =>
    ["proposta", "negociacao", "fechado"].includes(c.etapa),
  );
  const taxa = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

  const funil = etapasFunil
    .filter((e) => e !== "perdido")
    .map((etapa) => ({
      rotulo: rotuloEtapaFunil[etapa].replace(" realizado", "").replace(" agendada", "").replace("Novo ", ""),
      valor: contar(filtrado.clientes, (c) => c.etapa === etapa),
    }));

  const minhasTarefas = tarefas
    .filter((t) => !t.concluida && (corretorFiltro === "todos" || t.responsavelId === corretorFiltro))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 6);

  const primeiroNome = usuario?.nome.split(" ")[0] ?? "";

  const seletor =
    "rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700";

  return (
    <>
      <CabecalhoPagina
        titulo={`Bom dia, ${primeiroNome}`}
        descricao="Visão geral da operação da Paganelli Imóveis."
        acoes={
          <>
            <label className="sr-only" htmlFor="f-periodo">
              Período
            </label>
            <select
              id="f-periodo"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as Periodo)}
              className={seletor}
            >
              {periodos.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.texto}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="f-corretor">
              Corretor
            </label>
            <select
              id="f-corretor"
              value={corretorFiltro}
              onChange={(e) => setCorretorFiltro(e.target.value)}
              className={seletor}
            >
              <option value="todos">Todos os corretores</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <label className="sr-only" htmlFor="f-negocio">
              Tipo de negócio
            </label>
            <select
              id="f-negocio"
              value={negocioFiltro}
              onChange={(e) => setNegocioFiltro(e.target.value as typeof negocioFiltro)}
              className={seletor}
            >
              <option value="todos">Venda e locação</option>
              <option value="venda">Somente venda</option>
              <option value="aluguel">Somente locação</option>
            </select>
          </>
        }
      />

      {/* -------------------------------------------------------- Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo="Imóveis ativos"
          valor={imoveisAtivos}
          nota={`${imoveisCaptacao} em captação · ${filtrado.imoveis.length} no total`}
          href="/painel/imoveis"
        />
        <Indicador
          rotulo="Leads em atendimento"
          valor={leadsAtendimento}
          nota={leadsNovos > 0 ? `${leadsNovos} novos aguardando` : "Nenhum lead sem resposta"}
          tom={leadsNovos > 0 ? "alerta" : "positivo"}
          href="/painel/leads"
        />
        <Indicador
          rotulo="Visitas na semana"
          valor={visitasSemana.length}
          nota={`${visitasHoje.length} hoje · ${contar(visitasSemana, (v) => v.status === "confirmada")} confirmadas`}
          href="/painel/visitas"
        />
        <Indicador
          rotulo="Contratos a vencer"
          valor={contratosVencendo.length}
          nota={contratosVencendo.length > 0 ? "Requer atenção em até 30 dias" : "Nenhum vencimento próximo"}
          tom={contratosVencendo.length > 0 ? "alerta" : "positivo"}
          href="/painel/contratos"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Vendidos no período" valor={imoveisVendidos} nota="Status vendido" tom="positivo" />
        <Indicador rotulo="Alugados no período" valor={imoveisAlugados} nota="Status alugado" tom="positivo" />
        <Indicador
          rotulo="Conversão lead → visita"
          valor={`${taxa(comVisita, totalClientes)}%`}
          nota={`${comVisita} de ${totalClientes} clientes`}
        />
        <Indicador
          rotulo="Conversão visita → proposta"
          valor={`${taxa(comProposta, comVisita)}%`}
          nota={`${comProposta} propostas registradas`}
        />
      </div>

      {/* ------------------------------------------------------------ Painéis */}
      <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Painel
          titulo="Conversão do funil comercial"
          acao={
            <Link href="/painel/crm" className="text-xs font-bold text-dourado-600 underline underline-offset-2">
              Abrir CRM
            </Link>
          }
        >
          <FunilComercial etapas={funil} />
        </Painel>

        <Painel
          titulo="Próximas atividades"
          acao={<span className="font-mono text-[0.625rem] text-grafite-400">{minhasTarefas.length} pendentes</span>}
        >
          {minhasTarefas.length === 0 ? (
            <p className="py-6 text-center text-sm text-grafite-400">Nenhuma tarefa pendente.</p>
          ) : (
            <ul>
              {minhasTarefas.map((t) => {
                const dias = diasAte(t.vencimento);
                return (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-3 border-b border-linha py-3 last:border-0"
                  >
                    <div className="flex items-start gap-2.5">
                      <button
                        type="button"
                        onClick={() => dados.alternarTarefa(t.id)}
                        aria-label={`Concluir tarefa: ${t.titulo}`}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-grafite-400 transition-colors hover:border-verde-700 hover:bg-verde-100"
                      />
                      <span className="text-xs leading-relaxed text-grafite-700">{t.titulo}</span>
                    </div>
                    <span
                      className={`shrink-0 font-mono text-[0.625rem] ${dias < 0 ? "text-erro" : dias === 0 ? "text-alerta" : "text-grafite-400"}`}
                    >
                      {dias < 0 ? `${Math.abs(dias)}d atrás` : dias === 0 ? "Hoje" : `em ${dias}d`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Painel titulo="Agenda de hoje">
          {visitasHoje.length === 0 ? (
            <p className="py-6 text-center text-sm text-grafite-400">Nenhuma visita hoje.</p>
          ) : (
            <ul className="space-y-3">
              {visitasHoje.map((v) => {
                const cliente = dados.clientePorId(v.clienteId);
                const imovel = dados.imovelPorId(v.imovelId);
                return (
                  <li key={v.id} className="rounded-sm border border-linha p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-verde-800">
                        {v.horaInicio}–{v.horaFim}
                      </span>
                      <Selo tom={v.status === "confirmada" ? "verde" : "alerta"}>
                        {rotuloStatusVisita[v.status]}
                      </Selo>
                    </div>
                    <p className="mt-2 text-sm font-bold text-verde-900">{cliente?.nome}</p>
                    <p className="text-xs text-grafite-400">{imovel?.titulo}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Painel>

        <Painel titulo="Anúncios por status">
          <ul className="space-y-2.5">
            {[
              { rotulo: "Publicados", valor: anunciosPublicados, tom: "verde" as const },
              { rotulo: "Em revisão", valor: anunciosRevisao, tom: "alerta" as const },
              { rotulo: "Rascunhos", valor: anunciosRascunho, tom: "neutro" as const },
            ].map((linha) => (
              <li key={linha.rotulo} className="flex items-center justify-between border-b border-linha pb-2.5 last:border-0">
                <span className="text-sm text-grafite-700">{linha.rotulo}</span>
                <Selo tom={linha.tom}>{linha.valor}</Selo>
              </li>
            ))}
          </ul>
          <Link
            href="/painel/anuncios"
            className="mt-4 block text-xs font-bold text-dourado-600 underline underline-offset-2"
          >
            Gerenciar anúncios
          </Link>
        </Painel>

        <Painel titulo="Atividade recente">
          <ul className="space-y-3">
            {logs.slice(0, 5).map((log) => {
              const autor = dados.usuarioPorId(log.usuarioId);
              return (
                <li key={log.id} className="border-b border-linha pb-3 last:border-0 last:pb-0">
                  <p className="text-xs leading-relaxed text-grafite-700">
                    <strong className="font-bold text-verde-900">{autor?.nome ?? "Sistema"}</strong>{" "}
                    {log.acao.toLowerCase()} <span className="font-mono text-[0.6875rem]">{log.entidade}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-[0.625rem] text-grafite-400">
                    {formatarTempoRelativo(log.data)}
                  </p>
                </li>
              );
            })}
          </ul>
        </Painel>
      </div>

      {contratosVencendo.length > 0 && (
        <Painel titulo="Contratos que exigem atenção" className="mt-5">
          <ul className="space-y-2">
            {contratosVencendo.map((c) => {
              const imovel = dados.imovelPorId(c.imovelId);
              const proprietario = dados.clientePorId(c.proprietarioId);
              const dias = diasAte(c.dataTermino);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-linha px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-verde-900">
                      {c.numero} · {imovel?.titulo}
                    </p>
                    <p className="text-xs text-grafite-400">
                      {proprietario?.nome} — vence em {formatarData(c.dataTermino)}
                    </p>
                  </div>
                  <Selo tom={dias <= 7 ? "erro" : "alerta"}>
                    {dias === 0 ? "vence hoje" : `${dias} dias`}
                  </Selo>
                </li>
              );
            })}
          </ul>
        </Painel>
      )}
    </>
  );
}
