"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Indicador } from "@/components/painel/Indicador";
import { BarrasHorizontais, MiniSerie } from "@/components/painel/Graficos";
import { ModalGasto } from "@/components/painel/ModalGasto";
import { ModalCategoriasGasto } from "@/components/painel/ModalCategoriasGasto";
import { DetalheGasto } from "@/components/painel/DetalheGasto";
import { Botao, Campo, CampoSelecao, EstadoVazio, Modal, Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import {
  atualizarGasto,
  criarGasto,
  excluirGasto,
  intervaloDoPeriodo,
  listarCategorias,
  listarGastos,
  marcarGastoReembolsado,
  periodosFinanceiros,
  resumirGastos,
  rotuloStatusReembolso,
  tomStatusReembolso,
  type DadosGasto,
  type PeriodoFinanceiro,
} from "@/lib/financeiro";
import {
  classes,
  formatarData,
  formatarMoeda,
  formatarNumero,
  valorParaCampo,
} from "@/lib/format";
import { converterDbUsuarioParaUsuario } from "@/lib/supabase-sync-store";
import type { CategoriaGasto, Gasto, StatusReembolso, Usuario } from "@/lib/types";

/**
 * Financeiro → Gastos Mensais.
 *
 * A ordem da tela é a ordem da pergunta que a equipe faz: primeiro "quanto
 * gastamos e quanto falta reembolsar" (indicadores), depois "onde"
 * (filtros/relatórios), por último "quais" (lista).
 *
 * O período é o único filtro que vai ao servidor — ele define o recorte
 * carregado. Busca, categoria, responsável, status e ordenação são aplicados
 * sobre o que já está na memória, para responder no mesmo quadro.
 *
 * Quem não tem `ver_todos_gastos` recebe do servidor apenas os próprios
 * lançamentos: o recorte não depende desta tela.
 */

type Aba = "lancamentos" | "relatorios";
type Ordenacao = "data-desc" | "data-asc" | "valor-desc" | "valor-asc";

const opcoesOrdenacao: { valor: Ordenacao; texto: string }[] = [
  { valor: "data-desc", texto: "Data (mais recente)" },
  { valor: "data-asc", texto: "Data (mais antiga)" },
  { valor: "valor-desc", texto: "Valor (maior primeiro)" },
  { valor: "valor-asc", texto: "Valor (menor primeiro)" },
];

const mesesCurtos = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

const SEM_CATEGORIA = "Sem categoria";

export default function PaginaFinanceiro() {
  const router = useRouter();
  const { usuario, pode, carregado } = useSessao();
  const { avisar } = useAviso();

  const podeVerTodos = pode("ver_todos_gastos");
  const podeEditar = pode("editar_gasto");
  const podeExcluir = pode("excluir_gasto");
  const podeReembolsar = pode("marcar_reembolso");
  const podeCategorias = pode("gerenciar_categorias_gasto");

  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaGasto[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");

  const [aba, setAba] = useState<Aba>("lancamentos");
  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>("mes");
  const [intervaloManual, setIntervaloManual] = useState(() => intervaloDoPeriodo("mes"));

  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroResponsavel, setFiltroResponsavel] = useState("todos");
  const [filtroReembolso, setFiltroReembolso] = useState<"todos" | StatusReembolso>("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("data-desc");

  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Gasto | null>(null);
  const [emDetalhe, setEmDetalhe] = useState<Gasto | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Gasto | null>(null);
  const [categoriasAberto, setCategoriasAberto] = useState(false);
  const [processando, setProcessando] = useState(false);

  /** Sequência das buscas de gasto, para descartar resposta fora de ordem. */
  const ultimaRequisicao = useRef(0);

  const intervalo = useMemo(
    () => intervaloDoPeriodo(periodo, intervaloManual),
    [periodo, intervaloManual],
  );

  /* ------------------------------------------------------------- Carga */

  const carregarGastos = useCallback(async () => {
    // Trocar de período rápido dispara duas buscas; sem o contador, a resposta
    // mais antiga poderia chegar por último e sobrescrever a atual.
    const requisicao = ++ultimaRequisicao.current;
    setCarregando(true);

    const resultado = await listarGastos({ de: intervalo.de, ate: intervalo.ate });
    if (requisicao !== ultimaRequisicao.current) return;

    if (resultado.ok) {
      setGastos(resultado.dados);
      setErroCarga("");
    } else {
      setErroCarga(resultado.erro);
    }
    setCarregando(false);
  }, [intervalo.de, intervalo.ate]);

  const carregarCategorias = useCallback(async () => {
    const resultado = await listarCategorias();
    if (resultado.ok) setCategorias(resultado.dados);
  }, []);

  const carregarUsuarios = useCallback(async () => {
    try {
      const resposta = await fetch("/api/sync/usuarios", { cache: "no-store" });
      const corpo = await resposta.json();
      if (resposta.ok) setUsuarios((corpo.data ?? []).map(converterDbUsuarioParaUsuario));
    } catch {
      // Sem a equipe carregada, o seletor de responsável fica só com o próprio
      // usuário — a tela continua utilizável.
    }
  }, []);

  // Guarda de interface: quem não pode ver o módulo volta ao painel. Quem
  // autoriza de verdade são as rotas — aqui é só para não mostrar tela vazia.
  useEffect(() => {
    if (!carregado) return;
    if (!pode("ver_gastos")) {
      router.replace("/painel");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial
    void Promise.all([carregarCategorias(), carregarUsuarios()]);
  }, [carregado, pode, router, carregarCategorias, carregarUsuarios]);

  // Recarrega sempre que o período muda.
  useEffect(() => {
    if (!carregado || !pode("ver_gastos")) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca no servidor ao mudar o período
    void carregarGastos();
  }, [carregado, pode, carregarGastos]);

  /* ------------------------------------------------------------ Auxiliares */

  const nomeDe = useCallback(
    (id?: string) => {
      if (!id) return "—";
      if (id === usuario?.id) return usuario.nome;
      return usuarios.find((u) => u.id === id)?.nome ?? "Usuário removido";
    },
    [usuarios, usuario],
  );

  const nomeCategoria = useCallback(
    (id?: string) => categorias.find((c) => c.id === id)?.nome ?? SEM_CATEGORIA,
    [categorias],
  );

  /* --------------------------------------------------------------- Lista */

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrada = gastos.filter((g) => {
      if (termo && !g.descricao.toLowerCase().includes(termo)) return false;
      if (filtroCategoria !== "todas") {
        const alvo = filtroCategoria === "sem" ? undefined : filtroCategoria;
        if (g.categoriaId !== alvo) return false;
      }
      if (filtroResponsavel !== "todos" && g.responsavelId !== filtroResponsavel) return false;
      if (filtroReembolso !== "todos" && g.reembolsoStatus !== filtroReembolso) return false;
      return true;
    });

    return filtrada.sort((a, b) => {
      switch (ordenacao) {
        case "data-asc":
          return a.dataGasto.localeCompare(b.dataGasto);
        case "valor-desc":
          return b.valor - a.valor;
        case "valor-asc":
          return a.valor - b.valor;
        default:
          return b.dataGasto.localeCompare(a.dataGasto);
      }
    });
  }, [gastos, busca, filtroCategoria, filtroResponsavel, filtroReembolso, ordenacao]);

  const resumo = useMemo(() => resumirGastos(listaFiltrada), [listaFiltrada]);

  /* ---------------------------------------------------------- Relatórios */

  const porCategoria = useMemo(() => {
    const totais = new Map<string, number>();
    for (const gasto of listaFiltrada) {
      const chave = nomeCategoria(gasto.categoriaId);
      totais.set(chave, (totais.get(chave) ?? 0) + gasto.valor);
    }
    return [...totais.entries()]
      .map(([rotulo, valor]) => ({ rotulo, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [listaFiltrada, nomeCategoria]);

  const porResponsavel = useMemo(() => {
    const totais = new Map<string, number>();
    for (const gasto of listaFiltrada) {
      const chave = nomeDe(gasto.responsavelId);
      totais.set(chave, (totais.get(chave) ?? 0) + gasto.valor);
    }
    return [...totais.entries()]
      .map(([rotulo, valor]) => ({ rotulo, valor }))
      .sort((a, b) => b.valor - a.valor);
  }, [listaFiltrada, nomeDe]);

  const porMes = useMemo(() => {
    const totais = new Map<string, number>();
    for (const gasto of listaFiltrada) {
      const chave = gasto.dataGasto.slice(0, 7);
      totais.set(chave, (totais.get(chave) ?? 0) + gasto.valor);
    }
    return [...totais.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([chave, valor]) => {
        const mes = Number(chave.slice(5, 7)) - 1;
        return { mes: `${mesesCurtos[mes]}/${chave.slice(2, 4)}`, chave, valor };
      });
  }, [listaFiltrada]);

  const porStatus = useMemo(
    () =>
      (["nao_se_aplica", "pendente", "reembolsado"] as StatusReembolso[])
        .map((status) => ({
          rotulo: rotuloStatusReembolso[status],
          valor: listaFiltrada
            .filter((g) => g.reembolsoStatus === status)
            .reduce((soma, g) => soma + g.valor, 0),
          destaque: status === "pendente",
        }))
        .filter((linha) => linha.valor > 0),
    [listaFiltrada],
  );

  /* ------------------------------------------------------------ Operações */

  async function salvarGasto(dados: DadosGasto, confirmarDuplicado: boolean) {
    const resultado = emEdicao
      ? await atualizarGasto(emEdicao.id, dados)
      : await criarGasto(dados, confirmarDuplicado);

    if (!resultado.ok) return { erro: resultado.erro, duplicado: resultado.duplicado };

    await carregarGastos();
    setModalAberto(false);
    setEmEdicao(null);
    avisar(emEdicao ? "Gasto atualizado." : "Gasto lançado.");
    return {};
  }

  async function reembolsar(gasto: Gasto) {
    setProcessando(true);
    const resultado = await marcarGastoReembolsado(gasto.id);
    setProcessando(false);

    if (!resultado.ok) {
      avisar(resultado.erro, "erro");
      return;
    }

    await carregarGastos();
    setEmDetalhe(null);
    avisar(`"${gasto.descricao}" marcado como reembolsado.`);
  }

  async function excluir(gasto: Gasto) {
    setProcessando(true);
    const resultado = await excluirGasto(gasto.id);
    setProcessando(false);

    if (!resultado.ok) {
      avisar(resultado.erro, "erro");
      return;
    }

    await carregarGastos();
    setConfirmandoExclusao(null);
    setEmDetalhe(null);
    avisar("Lançamento excluído.");
  }

  function exportar() {
    const linhas = [
      [
        "Data",
        "Descrição",
        "Categoria",
        "Responsável",
        "Valor",
        "Reembolso necessário",
        "Status do reembolso",
        "Data do reembolso",
        "Observação",
      ],
      ...listaFiltrada.map((g) => [
        formatarData(g.dataGasto),
        g.descricao,
        nomeCategoria(g.categoriaId),
        nomeDe(g.responsavelId),
        // Sem o "R$" e com vírgula decimal: assim o Excel em pt-BR reconhece
        // a coluna como número e permite somar.
        valorParaCampo(g.valor),
        g.reembolsoNecessario ? "Sim" : "Não",
        rotuloStatusReembolso[g.reembolsoStatus],
        g.reembolsoData ? formatarData(g.reembolsoData) : "",
        g.observacao ?? "",
      ]),
    ];

    const csv = linhas.map((l) => l.map((c) => `"${c.replaceAll('"', '""')}"`).join(";")).join("\n");
    // O BOM é o que faz o Excel abrir o arquivo em UTF-8; sem ele, "Combustível"
    // chega como "CombustÃ­vel".
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `paganelli-gastos-${intervalo.de}-a-${intervalo.ate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    avisar("Relatório de gastos exportado em CSV.");
  }

  /* ------------------------------------------------------------ Interface */

  if (!carregado) {
    return (
      <>
        <CabecalhoPagina titulo="Gastos mensais" descricao="Controle financeiro da imobiliária." />
        <p className="text-sm text-grafite-400">Verificando acesso…</p>
      </>
    );
  }

  const seletorCompacto =
    "rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700";

  return (
    <>
      <CabecalhoPagina
        titulo="Gastos mensais"
        descricao={
          podeVerTodos
            ? "Despesas da imobiliária, com controle de reembolso."
            : "Seus lançamentos e o status dos seus reembolsos."
        }
        acoes={
          <>
            <label htmlFor="fin-periodo" className="sr-only">
              Período
            </label>
            <select
              id="fin-periodo"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value as PeriodoFinanceiro)}
              className={seletorCompacto}
            >
              {periodosFinanceiros.map((p) => (
                <option key={p.valor} value={p.valor}>
                  {p.texto}
                </option>
              ))}
            </select>

            {podeCategorias && (
              <Botao variante="contorno" tamanho="sm" onClick={() => setCategoriasAberto(true)}>
                Categorias
              </Botao>
            )}

            <Botao
              variante="contorno"
              tamanho="sm"
              disabled={listaFiltrada.length === 0}
              onClick={exportar}
            >
              Exportar CSV
            </Botao>

            {podeEditar && (
              <Botao
                onClick={() => {
                  setEmEdicao(null);
                  setModalAberto(true);
                }}
              >
                + Novo gasto
              </Botao>
            )}
          </>
        }
      />

      {periodo === "personalizado" && (
        <Painel className="mb-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:max-w-md">
            <Campo
              rotulo="De"
              type="date"
              value={intervaloManual.de}
              onChange={(e) => setIntervaloManual((i) => ({ ...i, de: e.target.value }))}
            />
            <Campo
              rotulo="Até"
              type="date"
              value={intervaloManual.ate}
              onChange={(e) => setIntervaloManual((i) => ({ ...i, ate: e.target.value }))}
            />
          </div>
        </Painel>
      )}

      {erroCarga && (
        <p
          role="alert"
          className="mb-5 rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
        >
          {erroCarga}
        </p>
      )}

      {/* 1. Indicadores */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Indicador
          rotulo="Total de gastos"
          valor={formatarMoeda(resumo.total)}
          nota={`${formatarData(intervalo.de)} a ${formatarData(intervalo.ate)}`}
        />
        <Indicador rotulo="Gastos do mês" valor={formatarMoeda(resumo.totalMes)} />
        <Indicador
          rotulo="Pendente de reembolso"
          valor={formatarMoeda(resumo.pendente)}
          nota={resumo.pendente > 0 ? "A devolver" : "Nada em aberto"}
          tom={resumo.pendente > 0 ? "alerta" : "neutro"}
        />
        <Indicador
          rotulo="Já reembolsado"
          valor={formatarMoeda(resumo.reembolsado)}
          tom="positivo"
        />
        <Indicador rotulo="Quantidade de gastos" valor={formatarNumero(resumo.quantidade)} />
        <Indicador
          rotulo="Reembolsos pendentes"
          valor={formatarNumero(resumo.quantidadePendente)}
          tom={resumo.quantidadePendente > 0 ? "alerta" : "neutro"}
        />
      </div>

      {/* 2. Filtros */}
      <Painel className="mt-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Campo
            rotulo="Buscar"
            placeholder="Descrição do gasto"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <CampoSelecao
            rotulo="Categoria"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            opcoes={[
              { valor: "todas", texto: "Todas as categorias" },
              ...categorias.map((c) => ({ valor: c.id, texto: c.nome })),
              { valor: "sem", texto: SEM_CATEGORIA },
            ]}
          />
          {/* Filtrar por responsável só faz sentido para quem enxerga a equipe
              inteira; para os demais a lista já é só a deles. */}
          {podeVerTodos && (
            <CampoSelecao
              rotulo="Responsável"
              value={filtroResponsavel}
              onChange={(e) => setFiltroResponsavel(e.target.value)}
              opcoes={[
                { valor: "todos", texto: "Todos os responsáveis" },
                ...usuarios.map((u) => ({ valor: u.id, texto: u.nome })),
              ]}
            />
          )}
          <CampoSelecao
            rotulo="Status do reembolso"
            value={filtroReembolso}
            onChange={(e) => setFiltroReembolso(e.target.value as "todos" | StatusReembolso)}
            opcoes={[
              { valor: "todos", texto: "Todos os status" },
              { valor: "pendente", texto: "Pendente" },
              { valor: "reembolsado", texto: "Reembolsado" },
              { valor: "nao_se_aplica", texto: "Não se aplica" },
            ]}
          />
          <CampoSelecao
            rotulo="Ordenar por"
            value={ordenacao}
            onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
            opcoes={opcoesOrdenacao.map((o) => ({ valor: o.valor, texto: o.texto }))}
          />
        </div>
      </Painel>

      {/* Abas */}
      <div className="mt-5 flex gap-1 border-b border-linha" role="tablist" aria-label="Visões do módulo financeiro">
        {(
          [
            { valor: "lancamentos", texto: "Lançamentos" },
            { valor: "relatorios", texto: "Relatórios" },
          ] as { valor: Aba; texto: string }[]
        ).map((item) => (
          <button
            key={item.valor}
            type="button"
            role="tab"
            aria-selected={aba === item.valor}
            onClick={() => setAba(item.valor)}
            className={classes(
              "-mb-px border-b-2 px-4 py-2.5 text-sm font-bold transition-colors",
              aba === item.valor
                ? "border-dourado-500 text-verde-900"
                : "border-transparent text-grafite-400 hover:text-grafite-700",
            )}
          >
            {item.texto}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="mt-6 text-sm text-grafite-400">Carregando lançamentos…</p>
      ) : aba === "relatorios" ? (
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <Painel titulo="Gastos por mês">
            {porMes.length === 0 ? (
              <p className="py-6 text-center text-sm text-grafite-400">Nada no período.</p>
            ) : (
              <>
                <MiniSerie
                  pontos={porMes.map((m) => ({ mes: m.mes, valor: m.valor }))}
                  rotulo="Gastos por mês"
                />
                <ul className="mt-4 space-y-1.5 border-t border-linha pt-3 text-xs">
                  {porMes.map((m) => (
                    <li key={m.chave} className="flex justify-between gap-3">
                      <span className="text-grafite-500">{m.mes}</span>
                      <span className="font-mono font-bold text-verde-900">
                        {formatarMoeda(m.valor)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Painel>

          <Painel titulo="Gastos por categoria">
            {porCategoria.length === 0 ? (
              <p className="py-6 text-center text-sm text-grafite-400">Nada no período.</p>
            ) : (
              <BarrasHorizontais dados={porCategoria} formatar={formatarMoeda} />
            )}
          </Painel>

          <Painel titulo="Gastos por responsável">
            {porResponsavel.length === 0 ? (
              <p className="py-6 text-center text-sm text-grafite-400">Nada no período.</p>
            ) : (
              <BarrasHorizontais dados={porResponsavel} formatar={formatarMoeda} />
            )}
          </Painel>

          <Painel titulo="Reembolsos pendentes × reembolsados">
            {porStatus.length === 0 ? (
              <p className="py-6 text-center text-sm text-grafite-400">Nada no período.</p>
            ) : (
              <BarrasHorizontais dados={porStatus} formatar={formatarMoeda} />
            )}
          </Painel>
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="mt-5">
          <EstadoVazio
            titulo={gastos.length === 0 ? "Nenhum gasto no período" : "Nenhum gasto encontrado"}
            descricao={
              gastos.length === 0
                ? "Escolha outro período ou registre o primeiro lançamento."
                : "Ajuste a busca ou os filtros para ver outros lançamentos."
            }
            acao={
              podeEditar && gastos.length === 0 ? (
                <Botao
                  onClick={() => {
                    setEmEdicao(null);
                    setModalAberto(true);
                  }}
                >
                  + Novo gasto
                </Botao>
              ) : undefined
            }
          />
        </div>
      ) : (
        /* 3. Lista */
        <Painel
          titulo={`${listaFiltrada.length} lançamento(s) · ${formatarMoeda(resumo.total)}`}
          className="mt-5"
        >
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Lançamentos de gasto do período</caption>
              <thead>
                <tr>
                  <ColunaOrdenavel
                    texto="Data"
                    ativa={ordenacao.startsWith("data")}
                    ascendente={ordenacao === "data-asc"}
                    aoAlternar={() =>
                      setOrdenacao((o) => (o === "data-desc" ? "data-asc" : "data-desc"))
                    }
                  />
                  {["Descrição", "Categoria", "Responsável"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400"
                    >
                      {h}
                    </th>
                  ))}
                  <ColunaOrdenavel
                    texto="Valor"
                    alinharDireita
                    ativa={ordenacao.startsWith("valor")}
                    ascendente={ordenacao === "valor-asc"}
                    aoAlternar={() =>
                      setOrdenacao((o) => (o === "valor-desc" ? "valor-asc" : "valor-desc"))
                    }
                  />
                  {["Reembolso", "Ações"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((gasto) => (
                  <tr key={gasto.id} className="border-t border-linha align-top">
                    <td className="py-3 pr-3 text-xs text-grafite-500">
                      {formatarData(gasto.dataGasto)}
                    </td>
                    <td className="py-3 pr-3">
                      <button
                        type="button"
                        onClick={() => setEmDetalhe(gasto)}
                        className="text-left text-sm font-bold text-verde-900 hover:text-verde-700 hover:underline"
                      >
                        {gasto.descricao}
                      </button>
                      {gasto.comprovanteUrl && (
                        <span className="mt-0.5 block text-[0.625rem] text-grafite-400">
                          com comprovante
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs text-grafite-500">
                      {nomeCategoria(gasto.categoriaId)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-grafite-500">
                      {nomeDe(gasto.responsavelId)}
                    </td>
                    <td className="py-3 pr-3 text-right font-mono text-sm font-bold text-verde-800">
                      {formatarMoeda(gasto.valor)}
                    </td>
                    <td className="py-3 pr-3">
                      <Selo tom={tomStatusReembolso[gasto.reembolsoStatus]}>
                        {rotuloStatusReembolso[gasto.reembolsoStatus]}
                      </Selo>
                      {gasto.reembolsoData && (
                        <span className="mt-1 block text-[0.625rem] text-grafite-400">
                          em {formatarData(gasto.reembolsoData)}
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      <AcoesGasto
                        gasto={gasto}
                        podeEditar={podeEditar}
                        podeExcluir={podeExcluir}
                        podeReembolsar={podeReembolsar}
                        processando={processando}
                        aoDetalhar={() => setEmDetalhe(gasto)}
                        aoEditar={() => {
                          setEmEdicao(gasto);
                          setModalAberto(true);
                        }}
                        aoReembolsar={() => void reembolsar(gasto)}
                        aoExcluir={() => setConfirmandoExclusao(gasto)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* No celular a tabela vira cartão: sete colunas em tela estreita só
              rendem rolagem horizontal ilegível. */}
          <ul className="space-y-3 lg:hidden">
            {listaFiltrada.map((gasto) => (
              <li key={gasto.id} className="rounded-sm border border-linha p-4">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setEmDetalhe(gasto)}
                    className="text-left text-sm font-bold text-verde-900"
                  >
                    {gasto.descricao}
                  </button>
                  <span className="shrink-0 font-mono text-sm font-bold text-verde-800">
                    {formatarMoeda(gasto.valor)}
                  </span>
                </div>

                <p className="mt-1 text-xs text-grafite-500">
                  {formatarData(gasto.dataGasto)} · {nomeCategoria(gasto.categoriaId)}
                </p>
                <p className="text-xs text-grafite-500">{nomeDe(gasto.responsavelId)}</p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Selo tom={tomStatusReembolso[gasto.reembolsoStatus]}>
                    {rotuloStatusReembolso[gasto.reembolsoStatus]}
                  </Selo>
                  {gasto.reembolsoData && (
                    <span className="text-[0.625rem] text-grafite-400">
                      em {formatarData(gasto.reembolsoData)}
                    </span>
                  )}
                </div>

                <div className="mt-3 border-t border-linha pt-3">
                  <AcoesGasto
                    gasto={gasto}
                    podeEditar={podeEditar}
                    podeExcluir={podeExcluir}
                    podeReembolsar={podeReembolsar}
                    processando={processando}
                    aoDetalhar={() => setEmDetalhe(gasto)}
                    aoEditar={() => {
                      setEmEdicao(gasto);
                      setModalAberto(true);
                    }}
                    aoReembolsar={() => void reembolsar(gasto)}
                    aoExcluir={() => setConfirmandoExclusao(gasto)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </Painel>
      )}

      {/* A key remonta o formulário ao trocar de alvo, zerando os campos. */}
      {modalAberto && usuario && (
        <ModalGasto
          key={emEdicao?.id ?? "novo"}
          aberto
          aoFechar={() => {
            setModalAberto(false);
            setEmEdicao(null);
          }}
          aoSalvar={salvarGasto}
          gasto={emEdicao}
          categorias={categorias}
          usuarios={usuarios.length > 0 ? usuarios : [usuario]}
          usuarioAtualId={usuario.id}
          podeEscolherResponsavel={podeVerTodos}
          podeMarcarReembolso={podeReembolsar}
        />
      )}

      <DetalheGasto
        gasto={emDetalhe}
        aoFechar={() => setEmDetalhe(null)}
        nomeDe={nomeDe}
        nomeCategoria={nomeCategoria}
        acoes={
          emDetalhe && podeReembolsar && emDetalhe.reembolsoStatus === "pendente" ? (
            <Botao
              variante="dourado"
              disabled={processando}
              onClick={() => void reembolsar(emDetalhe)}
            >
              Marcar como reembolsado
            </Botao>
          ) : undefined
        }
      />

      {podeCategorias && (
        <ModalCategoriasGasto
          aberto={categoriasAberto}
          aoFechar={() => setCategoriasAberto(false)}
          categorias={categorias}
          aoMudar={carregarCategorias}
        />
      )}

      <Modal
        aberto={Boolean(confirmandoExclusao)}
        aoFechar={() => setConfirmandoExclusao(null)}
        titulo="Excluir lançamento"
        descricao="O gasto sai das listas, dos totais e dos relatórios."
      >
        {confirmandoExclusao && (
          <div className="space-y-4">
            <div className="rounded-sm border border-erro/30 bg-[#f7e6e4] p-4">
              <p className="text-sm font-bold text-erro">
                {confirmandoExclusao.descricao} — {formatarMoeda(confirmandoExclusao.valor)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-grafite-700">
                Lançado em {formatarData(confirmandoExclusao.dataGasto)} por{" "}
                {nomeDe(confirmandoExclusao.criadoPor)}. O registro é preservado no banco para
                auditoria, mas não volta a aparecer no painel.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-linha pt-4">
              <Botao variante="fantasma" onClick={() => setConfirmandoExclusao(null)}>
                Cancelar
              </Botao>
              <Botao
                variante="perigo"
                disabled={processando}
                onClick={() => void excluir(confirmandoExclusao)}
              >
                {processando ? "Excluindo…" : "Excluir lançamento"}
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Cabeçalho de coluna que alterna a ordenação, com o estado anunciado a leitores de tela. */
function ColunaOrdenavel({
  texto,
  ativa,
  ascendente,
  aoAlternar,
  alinharDireita = false,
}: {
  texto: string;
  ativa: boolean;
  ascendente: boolean;
  aoAlternar: () => void;
  alinharDireita?: boolean;
}) {
  return (
    <th
      scope="col"
      aria-sort={ativa ? (ascendente ? "ascending" : "descending") : "none"}
      className={classes(
        "pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400",
        alinharDireita && "text-right",
      )}
    >
      <button
        type="button"
        onClick={aoAlternar}
        className={classes(
          "inline-flex items-center gap-1 uppercase tracking-wide hover:text-grafite-700",
          ativa && "text-verde-800",
        )}
      >
        {texto}
        <span aria-hidden="true">{ativa ? (ascendente ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>
  );
}

/** Ações de uma linha. Extraído para servir tabela e cartões. */
function AcoesGasto({
  gasto,
  podeEditar,
  podeExcluir,
  podeReembolsar,
  processando,
  aoDetalhar,
  aoEditar,
  aoReembolsar,
  aoExcluir,
}: {
  gasto: Gasto;
  podeEditar: boolean;
  podeExcluir: boolean;
  podeReembolsar: boolean;
  processando: boolean;
  aoDetalhar: () => void;
  aoEditar: () => void;
  aoReembolsar: () => void;
  aoExcluir: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Botao variante="fantasma" tamanho="sm" onClick={aoDetalhar}>
        Detalhes
      </Botao>

      {podeEditar && (
        <Botao variante="fantasma" tamanho="sm" onClick={aoEditar}>
          Editar
        </Botao>
      )}

      {/* Só aparece quando há reembolso pendente: oferecer o botão em gasto
          que não é reembolsável seria uma ação que sempre falharia. */}
      {podeReembolsar && gasto.reembolsoStatus === "pendente" && (
        <Botao variante="contorno" tamanho="sm" disabled={processando} onClick={aoReembolsar}>
          Marcar reembolsado
        </Botao>
      )}

      {podeExcluir && (
        <Botao variante="perigo" tamanho="sm" disabled={processando} onClick={aoExcluir}>
          Excluir
        </Botao>
      )}
    </div>
  );
}
