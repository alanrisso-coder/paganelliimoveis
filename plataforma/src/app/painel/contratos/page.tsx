"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, Campo, CampoSelecao, CampoTexto, EstadoVazio, Modal, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import {
  adicionarMeses,
  diasAte,
  formatarData,
  formatarMoedaCurta,
  formatarPercentual,
  rotuloStatusContrato,
} from "@/lib/format";
import type { Contrato, StatusContrato } from "@/lib/types";

const tomStatus: Record<StatusContrato, "verde" | "alerta" | "neutro" | "erro"> = {
  ativo: "verde",
  vencendo: "alerta",
  aguardando_assinatura: "alerta",
  rascunho: "neutro",
  encerrado: "neutro",
  vencido: "erro",
  cancelado: "erro",
};

/** Faixas de alerta previstas no produto: 30, 15 e 7 dias antes do vencimento. */
function alertaVencimento(dias: number): { texto: string; tom: "erro" | "alerta" } | null {
  if (dias < 0) return { texto: `vencido há ${Math.abs(dias)} dias`, tom: "erro" };
  if (dias === 0) return { texto: "vence hoje", tom: "erro" };
  if (dias <= 7) return { texto: `vence em ${dias} dias`, tom: "erro" };
  if (dias <= 15) return { texto: `vence em ${dias} dias`, tom: "alerta" };
  if (dias <= 30) return { texto: `vence em ${dias} dias`, tom: "alerta" };
  return null;
}

export default function PaginaContratos() {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();

  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState("todos");
  const [modalNovo, setModalNovo] = useState(false);
  const [renovar, setRenovar] = useState<Contrato | null>(null);

  const lista = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return dados.contratos.filter((c) => {
      const proprietario = dados.clientePorId(c.proprietarioId);
      const imovel = dados.imovelPorId(c.imovelId);
      if (t && !`${c.numero} ${proprietario?.nome ?? ""} ${imovel?.titulo ?? ""}`.toLowerCase().includes(t)) {
        return false;
      }
      if (status !== "todos" && c.status !== status) return false;
      return true;
    });
  }, [dados, termo, status]);

  const alertas = dados.contratos.filter((c) => {
    if (!["ativo", "vencendo"].includes(c.status)) return false;
    const d = diasAte(c.dataTermino);
    return d >= 0 && d <= 30;
  });

  return (
    <>
      <CabecalhoPagina
        titulo="Contratos de exclusividade"
        descricao="Prazos, documentos, comissões e renovações."
        acoes={pode("editar_contrato") && <Botao onClick={() => setModalNovo(true)}>+ Novo contrato</Botao>}
      />

      {alertas.length > 0 && (
        <div
          role="status"
          className="mb-5 rounded-sm border border-alerta/35 bg-[#f7edd9] p-4"
        >
          <p className="text-sm font-extrabold text-alerta">
            {alertas.length} {alertas.length === 1 ? "contrato exige" : "contratos exigem"} atenção nos
            próximos 30 dias
          </p>
          <ul className="mt-2 space-y-1">
            {alertas.map((c) => {
              const imovel = dados.imovelPorId(c.imovelId);
              const dias = diasAte(c.dataTermino);
              return (
                <li key={c.id} className="text-xs text-grafite-700">
                  <strong className="font-bold">{c.numero}</strong> — {imovel?.titulo} ·{" "}
                  {dias === 0 ? "vence hoje" : `vence em ${dias} dias`} ({formatarData(c.dataTermino)})
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="ct-busca" className="sr-only">
            Buscar contrato
          </label>
          <input
            id="ct-busca"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por número, proprietário ou imóvel"
            className="w-full rounded-sm border border-linha bg-white px-3 py-2.5 text-sm placeholder:text-grafite-400"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filtrar por status"
          className="rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700"
        >
          <option value="todos">Todos os status</option>
          {(Object.keys(rotuloStatusContrato) as StatusContrato[]).map((s) => (
            <option key={s} value={s}>
              {rotuloStatusContrato[s]}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum contrato encontrado"
          descricao="Ajuste os filtros ou cadastre um novo contrato de exclusividade."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((c) => {
            const proprietario = dados.clientePorId(c.proprietarioId);
            const imovel = dados.imovelPorId(c.imovelId);
            const corretor = dados.usuarioPorId(c.corretorId);
            const dias = diasAte(c.dataTermino);
            const alerta = ["ativo", "vencendo"].includes(c.status) ? alertaVencimento(dias) : null;

            return (
              <article key={c.id} className="rounded-sm border border-linha bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-verde-800">{c.numero}</span>
                      <Selo tom={tomStatus[c.status]}>{rotuloStatusContrato[c.status]}</Selo>
                      {alerta && <Selo tom={alerta.tom}>{alerta.texto}</Selo>}
                      {c.renovacoes.length > 0 && (
                        <Selo tom="neutro">{c.renovacoes.length}ª renovação</Selo>
                      )}
                    </div>

                    <p className="mt-2 text-sm font-bold text-verde-900">
                      {imovel ? (
                        <Link href={`/painel/imoveis/${imovel.id}`} className="hover:text-dourado-600">
                          {imovel.codigo} · {imovel.titulo}
                        </Link>
                      ) : (
                        "Imóvel removido"
                      )}
                    </p>
                    <p className="text-xs text-grafite-500">
                      Proprietário:{" "}
                      {proprietario ? (
                        <Link href={`/painel/crm/${proprietario.id}`} className="hover:text-dourado-600">
                          {proprietario.nome}
                        </Link>
                      ) : (
                        "—"
                      )}{" "}
                      · Corretor: {corretor?.nome}
                    </p>

                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
                      {[
                        { r: "Vigência", v: `${formatarData(c.dataInicio)} a ${formatarData(c.dataTermino)}` },
                        { r: "Prazo", v: `${c.prazoMeses} meses` },
                        { r: "Valor de anúncio", v: formatarMoedaCurta(c.valorAnuncio) },
                        { r: "Comissão", v: formatarPercentual(c.comissaoPercentual) },
                        {
                          r: "Comissão estimada",
                          v: formatarMoedaCurta((c.valorAnuncio * c.comissaoPercentual) / 100),
                        },
                      ].map((x) => (
                        <div key={x.r}>
                          <dt className="text-[0.625rem] uppercase tracking-wide text-grafite-400">{x.r}</dt>
                          <dd className="font-bold text-grafite-700">{x.v}</dd>
                        </div>
                      ))}
                    </dl>

                    {c.clausulasEspeciais && (
                      <p className="mt-3 border-l-2 border-dourado-400 pl-3 text-xs leading-relaxed text-grafite-600">
                        <strong className="font-bold">Cláusulas especiais:</strong> {c.clausulasEspeciais}
                      </p>
                    )}
                    {c.observacoes && (
                      <p className="mt-2 text-xs leading-relaxed text-grafite-500">{c.observacoes}</p>
                    )}

                    {c.documentos.length > 0 && (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {c.documentos.map((d) => (
                          <li
                            key={d.id}
                            className="rounded-sm border border-linha px-2.5 py-1.5 font-mono text-[0.625rem] text-grafite-500"
                          >
                            {d.nome}
                          </li>
                        ))}
                      </ul>
                    )}

                    {c.renovacoes.length > 0 && (
                      <div className="mt-3 border-t border-linha pt-3">
                        <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                          Histórico de renovações
                        </p>
                        <ul className="mt-1.5 space-y-1">
                          {c.renovacoes.map((r) => (
                            <li key={r.id} className="text-xs text-grafite-600">
                              {formatarData(r.data)} — {r.prazoMeses} meses. {r.observacao}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {pode("editar_contrato") && (
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {c.status === "aguardando_assinatura" && (
                        <Botao
                          tamanho="sm"
                          onClick={() => {
                            dados.atualizarContrato(c.id, { status: "ativo" }, usuario?.id ?? "");
                            avisar(`${c.numero} ativado após assinatura.`);
                          }}
                        >
                          Marcar como assinado
                        </Botao>
                      )}
                      {["ativo", "vencendo", "vencido"].includes(c.status) && (
                        <Botao variante="contorno" tamanho="sm" onClick={() => setRenovar(c)}>
                          Renovar
                        </Botao>
                      )}
                      <Botao
                        variante="contorno"
                        tamanho="sm"
                        onClick={() => avisar("Upload de contrato assinado pendente de integração com o storage.", "info")}
                      >
                        Anexar documento
                      </Botao>
                      {c.status !== "encerrado" && c.status !== "cancelado" && (
                        <Botao
                          variante="perigo"
                          tamanho="sm"
                          onClick={() => {
                            dados.atualizarContrato(c.id, { status: "encerrado" }, usuario?.id ?? "");
                            avisar(`${c.numero} encerrado.`);
                          }}
                        >
                          Encerrar
                        </Botao>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ModalNovoContrato aberto={modalNovo} aoFechar={() => setModalNovo(false)} autorId={usuario?.id ?? ""} />
      <ModalRenovar contrato={renovar} aoFechar={() => setRenovar(null)} autorId={usuario?.id ?? ""} />
    </>
  );
}

/* -------------------------------------------------------------- Renovação */

function ModalRenovar({
  contrato,
  aoFechar,
  autorId,
}: {
  contrato: Contrato | null;
  aoFechar: () => void;
  autorId: string;
}) {
  const dados = useDados();
  const { avisar } = useAviso();
  const [prazo, setPrazo] = useState("6");
  const [observacao, setObservacao] = useState("");

  if (!contrato) return null;
  const imovel = dados.imovelPorId(contrato.imovelId);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!contrato) return;
    dados.renovarContrato(
      contrato.id,
      Number(prazo),
      observacao || `Renovação por ${prazo} meses, mantendo as condições anteriores.`,
      autorId,
    );
    avisar(`${contrato.numero} renovado por ${prazo} meses.`);
    setObservacao("");
    aoFechar();
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo="Renovar contrato"
      descricao={`${contrato.numero} — ${imovel?.titulo ?? "imóvel"}. Os dados atuais são duplicados para o novo período.`}
    >
      <form onSubmit={salvar} className="space-y-4">
        <div className="rounded-sm bg-areia-100 p-4 text-xs text-grafite-600">
          <p>
            <strong className="font-bold">Período atual:</strong> {formatarData(contrato.dataInicio)} a{" "}
            {formatarData(contrato.dataTermino)}
          </p>
          <p className="mt-1">
            <strong className="font-bold">Novo período:</strong> {formatarData(contrato.dataTermino)} a{" "}
            {formatarData(adicionarMeses(contrato.dataTermino, Number(prazo) || 0))}
          </p>
          <p className="mt-1">
            <strong className="font-bold">Comissão mantida:</strong>{" "}
            {formatarPercentual(contrato.comissaoPercentual)}
          </p>
        </div>

        <CampoSelecao
          rotulo="Novo prazo"
          value={prazo}
          onChange={(e) => setPrazo(e.target.value)}
          opcoes={["3", "6", "9", "12", "18", "24"].map((m) => ({ valor: m, texto: `${m} meses` }))}
        />
        <CampoTexto
          rotulo="Observação da renovação"
          rows={3}
          placeholder="Ex.: renovação com ajuste de comissão de 6% para 5%"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Confirmar renovação</Botao>
        </div>
      </form>
    </Modal>
  );
}

/* ------------------------------------------------------------ Novo contrato */

function ModalNovoContrato({
  aberto,
  aoFechar,
  autorId,
}: {
  aberto: boolean;
  aoFechar: () => void;
  autorId: string;
}) {
  const dados = useDados();
  const { avisar } = useAviso();
  const hoje = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    imovelId: "",
    proprietarioId: "",
    corretorId: autorId,
    dataInicio: hoje,
    prazoMeses: "6",
    valorAnuncio: "",
    comissao: "6",
    clausulas: "",
    observacoes: "",
  });

  const proprietarios = dados.clientes.filter((c) => c.tipo === "proprietario");
  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const novo = dados.criarContrato(
      {
        imovelId: form.imovelId,
        proprietarioId: form.proprietarioId,
        corretorId: form.corretorId,
        dataInicio: form.dataInicio,
        prazoMeses: Number(form.prazoMeses),
        valorAnuncio: Number(form.valorAnuncio),
        comissaoPercentual: Number(form.comissao),
        clausulasEspeciais: form.clausulas || undefined,
        observacoes: form.observacoes || undefined,
      },
      autorId,
    );

    dados.criarTarefa({
      titulo: `Coletar assinatura do contrato ${novo.numero}`,
      vencimento: hoje,
      responsavelId: form.corretorId,
      clienteId: form.proprietarioId,
      imovelId: form.imovelId,
    });

    avisar(`Contrato ${novo.numero} criado, aguardando assinatura. Tarefa de cobrança gerada.`);
    setForm({ ...form, imovelId: "", proprietarioId: "", valorAnuncio: "", clausulas: "", observacoes: "" });
    aoFechar();
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo contrato de exclusividade"
      descricao="Cadastre os dados do imóvel, do proprietário e as condições comerciais."
      largura="lg"
    >
      <form onSubmit={salvar} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
            rotulo="Proprietário"
            required
            value={form.proprietarioId}
            onChange={(e) => setForm({ ...form, proprietarioId: e.target.value })}
            opcoes={[
              { valor: "", texto: "Selecione um proprietário" },
              ...proprietarios.map((p) => ({ valor: p.id, texto: p.nome })),
            ]}
          />
          <CampoSelecao
            rotulo="Corretor responsável"
            value={form.corretorId}
            onChange={(e) => setForm({ ...form, corretorId: e.target.value })}
            opcoes={corretores.map((c) => ({ valor: c.id, texto: c.nome }))}
          />
          <CampoSelecao
            rotulo="Prazo de exclusividade"
            value={form.prazoMeses}
            onChange={(e) => setForm({ ...form, prazoMeses: e.target.value })}
            opcoes={["3", "6", "9", "12", "18", "24"].map((m) => ({ valor: m, texto: `${m} meses` }))}
          />
          <Campo
            rotulo="Data de início"
            type="date"
            required
            value={form.dataInicio}
            onChange={(e) => setForm({ ...form, dataInicio: e.target.value })}
          />
          <Campo
            rotulo="Data de término"
            type="date"
            readOnly
            value={adicionarMeses(form.dataInicio, Number(form.prazoMeses))}
            dica="Calculada a partir do prazo."
          />
          <Campo
            rotulo="Valor de anúncio (R$)"
            type="number"
            min={0}
            required
            value={form.valorAnuncio}
            onChange={(e) => setForm({ ...form, valorAnuncio: e.target.value })}
          />
          <Campo
            rotulo="Comissão (%)"
            type="number"
            min={0}
            max={20}
            step={0.5}
            required
            value={form.comissao}
            onChange={(e) => setForm({ ...form, comissao: e.target.value })}
          />
        </div>

        <CampoTexto
          rotulo="Cláusulas especiais"
          rows={3}
          value={form.clausulas}
          onChange={(e) => setForm({ ...form, clausulas: e.target.value })}
        />
        <CampoTexto
          rotulo="Observações internas"
          rows={2}
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Criar contrato</Botao>
        </div>
      </form>
    </Modal>
  );
}
