"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, Campo, CampoSelecao, CampoTexto, EstadoVazio, Modal, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import {
  enderecoResumido,
  formatarArea,
  precoFormatado,
  rotuloFinalidade,
  rotuloStatusImovel,
  rotuloTipoImovel,
} from "@/lib/format";
import type { FinalidadeImovel, StatusImovel, TipoImovel } from "@/lib/types";

const tomStatus: Record<StatusImovel, "verde" | "alerta" | "neutro" | "erro"> = {
  disponivel: "verde",
  reservado: "alerta",
  vendido: "neutro",
  alugado: "neutro",
  inativo: "erro",
};

export default function PaginaImoveis() {
  const dados = useDados();
  const { usuario, pode } = useSessao();
  const { avisar } = useAviso();
  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [modalNovo, setModalNovo] = useState(false);

  const lista = useMemo(() => {
    const t = termo.trim().toLowerCase();
    return dados.imoveis.filter((i) => {
      if (t && !`${i.codigo} ${i.titulo} ${i.endereco.bairro} ${i.endereco.cidade}`.toLowerCase().includes(t)) {
        return false;
      }
      if (status !== "todos" && i.status !== status) return false;
      if (tipo !== "todos" && i.tipo !== tipo) return false;
      return true;
    });
  }, [dados.imoveis, termo, status, tipo]);

  const seletor = "rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700";

  return (
    <>
      <CabecalhoPagina
        titulo="Imóveis"
        descricao="Catálogo e captações da operação."
        acoes={pode("editar_imovel") && <Botao onClick={() => setModalNovo(true)}>+ Novo imóvel</Botao>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
          <label htmlFor="im-busca" className="sr-only">
            Buscar imóvel
          </label>
          <input
            id="im-busca"
            type="search"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar por código, endereço, bairro ou nome"
            className="w-full rounded-sm border border-linha bg-white px-3 py-2.5 text-sm placeholder:text-grafite-400"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por status" className={seletor}>
          <option value="todos">Todos os status</option>
          {(Object.keys(rotuloStatusImovel) as StatusImovel[]).map((s) => (
            <option key={s} value={s}>
              {rotuloStatusImovel[s]}
            </option>
          ))}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Filtrar por tipo" className={seletor}>
          <option value="todos">Todos os tipos</option>
          {(Object.keys(rotuloTipoImovel) as TipoImovel[]).map((t) => (
            <option key={t} value={t}>
              {rotuloTipoImovel[t]}
            </option>
          ))}
        </select>
      </div>

      {lista.length === 0 ? (
        <EstadoVazio
          icone="casa"
          titulo="Nenhum imóvel encontrado"
          descricao="Ajuste os filtros ou cadastre um novo imóvel para começar a captação."
        />
      ) : (
        <div className="overflow-x-auto rounded-sm border border-linha bg-white">
          <table className="w-full min-w-3xl text-left text-sm">
            <caption className="sr-only">Catálogo de imóveis</caption>
            <thead>
              <tr className="bg-areia-50">
                {["Código", "Imóvel", "Tipo", "Finalidade", "Valor", "Métricas", "Status", "Corretor", ...(pode("deletar_imovel") ? ["Ações"] : [])].map((h) => (
                  <th key={h} scope="col" className="px-4 py-3 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => {
                const corretor = dados.usuarioPorId(i.corretorId);
                const anuncio = dados.anuncioDoImovel(i.id);
                return (
                  <tr key={i.id} className="border-t border-linha hover:bg-areia-50">
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-verde-800">{i.codigo}</td>
                    <td className="px-4 py-3.5">
                      <Link href={`/painel/imoveis/${i.id}`} className="font-bold text-verde-900 hover:text-dourado-600">
                        {i.titulo}
                      </Link>
                      <p className="text-xs text-grafite-400">{enderecoResumido(i)}</p>
                      {i.exclusivo && (
                        <span className="mt-1 inline-block font-mono text-[0.5625rem] uppercase tracking-wide text-dourado-600">
                          exclusivo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-grafite-700">{rotuloTipoImovel[i.tipo]}</td>
                    <td className="px-4 py-3.5 text-grafite-700">{rotuloFinalidade[i.finalidade]}</td>
                    <td className="px-4 py-3.5 font-bold text-verde-800">{precoFormatado(i)}</td>
                    <td className="px-4 py-3.5 text-xs text-grafite-500">
                      {formatarArea(i.metragens.areaConstruida ?? i.metragens.areaTotal)}
                      {i.metragens.dormitorios > 0 && ` · ${i.metragens.dormitorios} dorm.`}
                      <br />
                      <span className="font-mono text-[0.625rem] text-grafite-400">
                        {anuncio ? `${anuncio.metricas.visualizacoes} views · ${anuncio.metricas.contatos} contatos` : "sem anúncio"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Selo tom={tomStatus[i.status]}>{rotuloStatusImovel[i.status]}</Selo>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-grafite-700">{corretor?.nome}</td>
                    {pode("deletar_imovel") && (
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja deletar "${i.titulo}"? Esta ação não pode ser desfeita.`)) {
                              dados.deletarImovel(i.id, usuario?.id ?? "");
                              avisar("Imóvel deletado com sucesso.", "sucesso");
                            }
                          }}
                          title="Deletar imóvel"
                          className="text-vermelho-800 hover:text-vermelho-900 transition-colors"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ModalNovoImovel aberto={modalNovo} aoFechar={() => setModalNovo(false)} autorId={usuario?.id ?? ""} />
    </>
  );
}

function ModalNovoImovel({
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
  const [form, setForm] = useState({
    titulo: "",
    tipo: "casa" as TipoImovel,
    finalidade: "venda" as FinalidadeImovel,
    bairro: "",
    cidade: "Palhoça",
    cep: "",
    logradouro: "",
    numero: "",
    valorVenda: "",
    valorAluguel: "",
    condominio: "",
    iptu: "",
    areaTotal: "",
    areaConstruida: "",
    dormitorios: "",
    suites: "",
    banheiros: "",
    vagas: "",
    proprietarioId: "",
    corretorId: autorId,
    exclusivo: false,
    descricaoCurta: "",
    descricaoCompleta: "",
  });

  const proprietarios = dados.clientes.filter((c) => c.tipo === "proprietario");
  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");
  const num = (v: string) => (v ? Number(v) : undefined);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    const novo = dados.criarImovel(
      {
        titulo: form.titulo,
        tipo: form.tipo,
        finalidade: form.finalidade,
        endereco: {
          logradouro: form.logradouro,
          numero: form.numero,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: "SP",
          cep: form.cep,
          latitude: -23.5505,
          longitude: -46.6333,
        },
        valores: {
          venda: num(form.valorVenda),
          aluguel: num(form.valorAluguel),
          condominio: num(form.condominio),
          iptu: num(form.iptu),
        },
        metragens: {
          areaTotal: Number(form.areaTotal || 0),
          areaConstruida: num(form.areaConstruida),
          dormitorios: Number(form.dormitorios || 0),
          suites: Number(form.suites || 0),
          banheiros: Number(form.banheiros || 0),
          vagas: Number(form.vagas || 0),
        },
        proprietarioId: form.proprietarioId,
        corretorId: form.corretorId,
        exclusivo: form.exclusivo,
        descricaoCurta: form.descricaoCurta,
        descricaoCompleta: form.descricaoCompleta,
      },
      autorId,
    );
    avisar(`Imóvel ${novo.codigo} cadastrado. Adicione fotos para poder anunciá-lo.`);
    aoFechar();
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo imóvel"
      descricao="Cadastro inicial de captação. Fotos, documentos e SEO podem ser completados depois na ficha."
      largura="xl"
    >
      <form onSubmit={salvar} className="space-y-5">
        <fieldset>
          <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
            Identificação
          </legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo
              rotulo="Título do imóvel"
              required
              className="sm:col-span-3"
              placeholder="Casa Reserva do Lago"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
            <CampoSelecao
              rotulo="Tipo"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoImovel })}
              opcoes={(Object.keys(rotuloTipoImovel) as TipoImovel[]).map((t) => ({
                valor: t,
                texto: rotuloTipoImovel[t],
              }))}
            />
            <CampoSelecao
              rotulo="Finalidade"
              value={form.finalidade}
              onChange={(e) => setForm({ ...form, finalidade: e.target.value as FinalidadeImovel })}
              opcoes={[
                { valor: "venda", texto: "Venda" },
                { valor: "aluguel", texto: "Locação" },
                { valor: "ambos", texto: "Venda e locação" },
              ]}
            />
            <CampoSelecao
              rotulo="Corretor responsável"
              value={form.corretorId}
              onChange={(e) => setForm({ ...form, corretorId: e.target.value })}
              opcoes={corretores.map((c) => ({ valor: c.id, texto: c.nome }))}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
            Endereço
          </legend>
          <div className="grid gap-4 sm:grid-cols-4">
            <Campo
              rotulo="Logradouro"
              className="sm:col-span-2"
              value={form.logradouro}
              onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
            />
            <Campo rotulo="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
            <Campo rotulo="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
            <Campo
              rotulo="Bairro"
              required
              className="sm:col-span-2"
              value={form.bairro}
              onChange={(e) => setForm({ ...form, bairro: e.target.value })}
            />
            <Campo
              rotulo="Cidade"
              required
              className="sm:col-span-2"
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
            Valores
          </legend>
          <div className="grid gap-4 sm:grid-cols-4">
            <Campo
              rotulo="Venda (R$)"
              type="number"
              min={0}
              value={form.valorVenda}
              onChange={(e) => setForm({ ...form, valorVenda: e.target.value })}
            />
            <Campo
              rotulo="Aluguel (R$/mês)"
              type="number"
              min={0}
              value={form.valorAluguel}
              onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })}
            />
            <Campo
              rotulo="Condomínio (R$)"
              type="number"
              min={0}
              value={form.condominio}
              onChange={(e) => setForm({ ...form, condominio: e.target.value })}
            />
            <Campo
              rotulo="IPTU anual (R$)"
              type="number"
              min={0}
              value={form.iptu}
              onChange={(e) => setForm({ ...form, iptu: e.target.value })}
            />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
            Metragens
          </legend>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Campo rotulo="Área total (m²)" type="number" min={0} required value={form.areaTotal} onChange={(e) => setForm({ ...form, areaTotal: e.target.value })} />
            <Campo rotulo="Construída (m²)" type="number" min={0} value={form.areaConstruida} onChange={(e) => setForm({ ...form, areaConstruida: e.target.value })} />
            <Campo rotulo="Dormitórios" type="number" min={0} value={form.dormitorios} onChange={(e) => setForm({ ...form, dormitorios: e.target.value })} />
            <Campo rotulo="Suítes" type="number" min={0} value={form.suites} onChange={(e) => setForm({ ...form, suites: e.target.value })} />
            <Campo rotulo="Banheiros" type="number" min={0} value={form.banheiros} onChange={(e) => setForm({ ...form, banheiros: e.target.value })} />
            <Campo rotulo="Vagas" type="number" min={0} value={form.vagas} onChange={(e) => setForm({ ...form, vagas: e.target.value })} />
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
            Proprietário e descrição
          </legend>
          <div className="space-y-4">
            <CampoSelecao
              rotulo="Proprietário vinculado"
              value={form.proprietarioId}
              onChange={(e) => setForm({ ...form, proprietarioId: e.target.value })}
              opcoes={[
                { valor: "", texto: "Selecione um proprietário" },
                ...proprietarios.map((p) => ({ valor: p.id, texto: p.nome })),
              ]}
            />
            <CampoTexto
              rotulo="Descrição curta"
              rows={2}
              value={form.descricaoCurta}
              onChange={(e) => setForm({ ...form, descricaoCurta: e.target.value })}
            />
            <CampoTexto
              rotulo="Descrição completa"
              rows={5}
              value={form.descricaoCompleta}
              onChange={(e) => setForm({ ...form, descricaoCompleta: e.target.value })}
            />
            <label className="flex items-center gap-2.5 text-sm text-grafite-700">
              <input
                type="checkbox"
                checked={form.exclusivo}
                onChange={(e) => setForm({ ...form, exclusivo: e.target.checked })}
                className="h-4 w-4 accent-verde-700"
              />
              Captado com exclusividade
            </label>
          </div>
        </fieldset>

        <div className="flex justify-end gap-2 border-t border-linha pt-4">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit">Cadastrar imóvel</Botao>
        </div>
      </form>
    </Modal>
  );
}
