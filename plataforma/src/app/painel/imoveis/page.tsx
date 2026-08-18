"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, EstadoVazio, Modal, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { FormularioImovel, formVazioImovel } from "@/components/painel/FormularioImovel";
import {
  enderecoResumido,
  formatarArea,
  precoFormatado,
  rotuloFinalidade,
  rotuloStatusImovel,
  rotuloTipoImovel,
} from "@/lib/format";
import type { Imovel, StatusImovel, TipoImovel } from "@/lib/types";

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
                {["Código", "Imóvel", "Tipo", "Finalidade", "Valor", "Métricas", "No site", "Status", "Corretor", ...(pode("deletar_imovel") ? ["Ações"] : [])].map((h) => (
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
                      <StatusAnuncioImovel imovel={i} />
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

/**
 * Indicador de "isso vai aparecer em Anúncios?" para cada linha da tabela.
 *
 * A publicação do anúncio acontece em segundo plano (o cadastro do imóvel
 * não espera o Supabase confirmar), então sem isso o usuário só descobria
 * se funcionou indo conferir a tela de Anúncios manualmente — e, como o
 * bug relatado mostrou, às vezes nem lá aparecia por falha silenciosa.
 * Aqui o status muda ao vivo assim que a publicação é confirmada.
 */
function StatusAnuncioImovel({ imovel }: { imovel: Imovel }) {
  const dados = useDados();
  const { usuario } = useSessao();
  const [publicando, setPublicando] = useState(false);

  const anuncio = dados.anuncioDoImovel(imovel.id);
  const status = dados.statusPublicacaoAnuncio[imovel.id];

  async function tentarPublicar() {
    setPublicando(true);
    await dados.publicarAnuncioImovel(imovel.id, usuario?.id ?? "");
    setPublicando(false);
  }

  if (anuncio) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Selo tom="verde">No site ✓</Selo>
        <Link href="/painel/anuncios" className="text-[0.625rem] font-bold text-verde-800 hover:text-dourado-600">
          Ver em Anúncios →
        </Link>
      </div>
    );
  }

  if (publicando || status === "publicando") {
    return (
      <Selo tom="alerta" className="gap-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-alerta" aria-hidden="true" />
        Publicando…
      </Selo>
    );
  }

  if (status === "erro") {
    return (
      <div className="flex flex-col items-start gap-1">
        <Selo tom="erro">Falha ao publicar</Selo>
        <button
          type="button"
          onClick={tentarPublicar}
          className="text-[0.625rem] font-bold text-verde-800 hover:text-dourado-600"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Selo tom="neutro">Sem anúncio</Selo>
      <button
        type="button"
        onClick={tentarPublicar}
        className="text-[0.625rem] font-bold text-verde-800 hover:text-dourado-600"
      >
        Publicar agora
      </button>
    </div>
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

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Novo imóvel"
      descricao="Cadastro inicial de captação. Fotos, documentos e SEO podem ser completados depois na ficha."
      largura="xl"
    >
      <FormularioImovel
        valorInicial={formVazioImovel(autorId)}
        textoSubmit="Cadastrar imóvel"
        aoCancelar={aoFechar}
        aoSalvar={(payload) => {
          const novo = dados.criarImovel(payload, autorId);
          avisar(
            `Imóvel ${novo.codigo} cadastrado. O anúncio está sendo publicado — acompanhe na coluna "No site".`,
          );
          aoFechar();
        }}
      />
    </Modal>
  );
}
