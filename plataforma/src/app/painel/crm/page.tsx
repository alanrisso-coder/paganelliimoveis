"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, Campo, CampoSelecao, CampoTexto, EstadoVazio, Modal, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import {
  classes,
  etapasFunil,
  formatarMoedaCurta,
  formatarTelefone,
  rotuloEtapaFunil,
} from "@/lib/format";
import type { EtapaFunil, TipoCliente } from "@/lib/types";

const tiposCliente: { valor: TipoCliente; texto: string }[] = [
  { valor: "comprador", texto: "Comprador" },
  { valor: "locatario", texto: "Locatário" },
  { valor: "proprietario", texto: "Proprietário" },
  { valor: "investidor", texto: "Investidor" },
];

const coresEtapa: Record<EtapaFunil, "neutro" | "verde" | "dourado" | "alerta" | "erro"> = {
  novo: "dourado",
  contato: "neutro",
  qualificado: "neutro",
  visita: "alerta",
  proposta: "alerta",
  negociacao: "verde",
  fechado: "verde",
  perdido: "erro",
};

export default function PaginaCRM() {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();

  const [visao, setVisao] = useState<"kanban" | "lista">("kanban");
  const [termo, setTermo] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("todos");
  const [corretorFiltro, setCorretorFiltro] = useState("todos");
  const [modalNovo, setModalNovo] = useState(false);

  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  const clientes = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return dados.clientes.filter((c) => {
      if (t && !`${c.nome} ${c.email} ${c.telefone} ${c.documento}`.toLowerCase().includes(t)) {
        return false;
      }
      if (tipoFiltro !== "todos" && c.tipo !== tipoFiltro) return false;
      if (corretorFiltro !== "todos" && c.corretorId !== corretorFiltro) return false;
      return true;
    });
  }, [dados.clientes, termo, tipoFiltro, corretorFiltro]);

  const colunas = etapasFunil.map((etapa) => ({
    etapa,
    itens: clientes.filter((c) => c.etapa === etapa),
  }));

  const seletor = "rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700";

  return (
    <>
      <CabecalhoPagina
        titulo="CRM de Clientes"
        descricao="Organize relacionamentos e oportunidades em todas as etapas do funil."
        acoes={
          pode("editar_cliente") && (
            <Botao onClick={() => setModalNovo(true)}>+ Novo cliente</Botao>
          )
        }
      />

      {/* ------------------------------------------------------------ Filtros */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <label htmlFor="crm-busca" className="sr-only">
            Buscar cliente
          </label>
          <input
            id="crm-busca"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou documento"
            className="w-full rounded-sm border border-linha bg-white px-3 py-2.5 text-sm placeholder:text-grafite-400"
          />
        </div>

        <select
          value={tipoFiltro}
          onChange={(e) => setTipoFiltro(e.target.value)}
          aria-label="Filtrar por tipo de cliente"
          className={seletor}
        >
          <option value="todos">Todos os tipos</option>
          {tiposCliente.map((t) => (
            <option key={t.valor} value={t.valor}>
              {t.texto}
            </option>
          ))}
        </select>

        <select
          value={corretorFiltro}
          onChange={(e) => setCorretorFiltro(e.target.value)}
          aria-label="Filtrar por corretor"
          className={seletor}
        >
          <option value="todos">Todos os corretores</option>
          {corretores.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>

        <div role="group" aria-label="Modo de visualização" className="flex rounded-sm border border-linha bg-white p-0.5">
          {(["kanban", "lista"] as const).map((v) => (
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
              {v}
            </button>
          ))}
        </div>
      </div>

      {clientes.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum cliente encontrado"
          descricao="Ajuste os filtros ou cadastre um novo contato para começar um atendimento."
          acao={
            pode("editar_cliente") && <Botao onClick={() => setModalNovo(true)}>Cadastrar cliente</Botao>
          }
        />
      ) : visao === "kanban" ? (
        /* ------------------------------------------------------------ Kanban */
        <div className="scroll-fino -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
          {colunas.map((coluna) => (
            <section
              key={coluna.etapa}
              aria-label={rotuloEtapaFunil[coluna.etapa]}
              className="flex w-64 shrink-0 flex-col rounded-sm bg-areia-200/70 p-2.5"
            >
              <header className="mb-2.5 flex items-center justify-between px-1">
                <h2 className="font-mono text-[0.625rem] font-bold uppercase tracking-[0.1em] text-grafite-500">
                  {rotuloEtapaFunil[coluna.etapa]}
                </h2>
                <span className="font-mono text-[0.6875rem] font-bold text-grafite-400">
                  {coluna.itens.length}
                </span>
              </header>

              <div className="space-y-2">
                {coluna.itens.map((cliente) => {
                  const corretor = dados.usuarioPorId(cliente.corretorId);
                  return (
                    <article
                      key={cliente.id}
                      className="rounded-sm border-l-2 border-dourado-500 bg-white p-3 shadow-suave"
                    >
                      <Link
                        href={`/painel/crm/${cliente.id}`}
                        className="block text-sm font-bold text-verde-900 hover:text-dourado-600"
                      >
                        {cliente.nome}
                      </Link>
                      <p className="mt-1 text-[0.6875rem] capitalize text-grafite-400">
                        {cliente.tipo} · {corretor?.avatarIniciais}
                      </p>
                      {cliente.orcamentoMax && (
                        <p className="mt-1.5 text-xs font-bold text-verde-800">
                          até {formatarMoedaCurta(cliente.orcamentoMax)}
                        </p>
                      )}
                      {cliente.preferencias.regioes.length > 0 && (
                        <p className="mt-1 truncate text-[0.6875rem] text-grafite-400">
                          {cliente.preferencias.regioes.join(", ")}
                        </p>
                      )}

                      {pode("editar_cliente") && (
                        <>
                          <label htmlFor={`etapa-${cliente.id}`} className="sr-only">
                            Mover {cliente.nome} de etapa
                          </label>
                          <select
                            id={`etapa-${cliente.id}`}
                            value={cliente.etapa}
                            onChange={(e) => {
                              dados.moverEtapaCliente(cliente.id, e.target.value as EtapaFunil);
                              avisar(
                                `${cliente.nome} movido para ${rotuloEtapaFunil[e.target.value as EtapaFunil]}.`,
                              );
                            }}
                            className="mt-2.5 w-full rounded-sm border border-linha bg-areia-50 px-2 py-1.5 text-[0.6875rem] text-grafite-700"
                          >
                            {etapasFunil.map((e) => (
                              <option key={e} value={e}>
                                {rotuloEtapaFunil[e]}
                              </option>
                            ))}
                          </select>
                        </>
                      )}
                    </article>
                  );
                })}

                {coluna.itens.length === 0 && (
                  <p className="px-1 py-4 text-center text-[0.6875rem] text-grafite-400">
                    Sem clientes nesta etapa
                  </p>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* ------------------------------------------------------------- Lista */
        <div className="overflow-x-auto rounded-sm border border-linha bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Lista de clientes do CRM</caption>
            <thead>
              <tr className="bg-areia-50">
                {["Cliente", "Tipo", "Etapa", "Orçamento", "Corretor", "Contato"].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-4 py-3 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => {
                const corretor = dados.usuarioPorId(c.corretorId);
                return (
                  <tr key={c.id} className="border-t border-linha hover:bg-areia-50">
                    <td className="px-4 py-3.5">
                      <Link href={`/painel/crm/${c.id}`} className="font-bold text-verde-900 hover:text-dourado-600">
                        {c.nome}
                      </Link>
                      <p className="text-xs text-grafite-400">{c.email}</p>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-grafite-700">{c.tipo}</td>
                    <td className="px-4 py-3.5">
                      <Selo tom={coresEtapa[c.etapa]}>{rotuloEtapaFunil[c.etapa]}</Selo>
                    </td>
                    <td className="px-4 py-3.5 text-grafite-700">
                      {c.orcamentoMax ? formatarMoedaCurta(c.orcamentoMax) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-grafite-700">{corretor?.nome}</td>
                    <td className="px-4 py-3.5 font-mono text-xs text-grafite-500">
                      {c.telefone ? formatarTelefone(c.telefone) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalNovoCliente
        aberto={modalNovo}
        aoFechar={() => setModalNovo(false)}
        corretorPadrao={usuario?.id ?? ""}
      />
    </>
  );
}

/* ------------------------------------------------------- Cadastro de cliente */

function ModalNovoCliente({
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
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    documento: "",
    tipo: "comprador" as TipoCliente,
    origem: "presencial",
    corretorId: corretorPadrao,
    orcamentoMax: "",
    regioes: "",
    observacoes: "",
  });

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    dados.criarCliente(
      {
        nome: form.nome,
        email: form.email,
        telefone: form.telefone,
        whatsapp: form.telefone,
        documento: form.documento,
        tipo: form.tipo,
        origem: form.origem as never,
        corretorId: form.corretorId,
        orcamentoMax: form.orcamentoMax ? Number(form.orcamentoMax) : undefined,
        preferencias: {
          tipos: [],
          regioes: form.regioes ? form.regioes.split(",").map((r) => r.trim()).filter(Boolean) : [],
          caracteristicas: [],
        },
        observacoes: form.observacoes,
      },
      corretorPadrao,
    );
    avisar(`${form.nome} cadastrado no CRM.`);
    setForm({ ...form, nome: "", email: "", telefone: "", documento: "", orcamentoMax: "", regioes: "", observacoes: "" });
    aoFechar();
  }

  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo cliente"
      descricao="Cadastre um contato para iniciar um atendimento no funil."
      largura="lg"
    >
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Nome completo"
            required
            className="sm:col-span-2"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
          />
          <Campo
            rotulo="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Campo
            rotulo="Telefone / WhatsApp"
            type="tel"
            required
            placeholder="(48) 99999-0000"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
          />
          <Campo
            rotulo="CPF / CNPJ"
            value={form.documento}
            onChange={(e) => setForm({ ...form, documento: e.target.value })}
          />
          <CampoSelecao
            rotulo="Tipo de cliente"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoCliente })}
            opcoes={tiposCliente.map((t) => ({ valor: t.valor, texto: t.texto }))}
          />
          <CampoSelecao
            rotulo="Origem do lead"
            value={form.origem}
            onChange={(e) => setForm({ ...form, origem: e.target.value })}
            opcoes={[
              { valor: "presencial", texto: "Presencial" },
              { valor: "site", texto: "Site" },
              { valor: "indicacao", texto: "Indicação" },
              { valor: "portal", texto: "Portal parceiro" },
              { valor: "whatsapp", texto: "WhatsApp" },
              { valor: "instagram", texto: "Instagram" },
              { valor: "placa", texto: "Placa" },
            ]}
          />
          <CampoSelecao
            rotulo="Corretor responsável"
            value={form.corretorId}
            onChange={(e) => setForm({ ...form, corretorId: e.target.value })}
            opcoes={corretores.map((c) => ({ valor: c.id, texto: c.nome }))}
          />
          <Campo
            rotulo="Orçamento máximo (R$)"
            type="number"
            min={0}
            step={10000}
            value={form.orcamentoMax}
            onChange={(e) => setForm({ ...form, orcamentoMax: e.target.value })}
          />
          <Campo
            rotulo="Regiões de interesse"
            placeholder="Pedra Branca, Pagani"
            dica="Separe por vírgula."
            value={form.regioes}
            onChange={(e) => setForm({ ...form, regioes: e.target.value })}
          />
        </div>

        <CampoTexto
          rotulo="Observações"
          rows={3}
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Cadastrar cliente</Botao>
        </div>
      </form>
    </Modal>
  );
}
