"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, Campo, CampoSelecao, EstadoVazio, Modal, Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { ModalUsuario, type DadosUsuarioFormulario } from "@/components/painel/ModalUsuario";
import { ModalLinkSenha } from "@/components/painel/ModalLinkSenha";
import { PERFIS, rotuloPerfil } from "@/lib/permissoes";
import { formatarData, formatarDataHora, formatarTelefone } from "@/lib/format";
import { converterDbUsuarioParaUsuario } from "@/lib/supabase-sync-store";
import type { PerfilAcesso, Usuario } from "@/lib/types";

/**
 * Administração → Usuários.
 *
 * A interface se adapta ao perfil (gestor enxerga a lista, só administrador
 * vê as ações de escrita), mas isso é conveniência: quem autoriza de verdade
 * são as rotas em /api/admin/usuarios. Esconder um botão não protege nada.
 */

type Ordenacao = "nome" | "recentes" | "ultimo-acesso";

const opcoesOrdenacao: { valor: Ordenacao; texto: string }[] = [
  { valor: "nome", texto: "Nome (A–Z)" },
  { valor: "recentes", texto: "Mais recentes" },
  { valor: "ultimo-acesso", texto: "Último acesso" },
];

interface LinkGerado {
  link: string;
  nome: string;
  tipo: "convite" | "redefinicao";
}

export default function PaginaUsuarios() {
  const router = useRouter();
  const { usuario: usuarioLogado, pode, carregado } = useSessao();
  const { avisar } = useAviso();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState("");

  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState<"todos" | PerfilAcesso>("todos");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "inativo">("todos");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");

  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<Usuario | null>(null);
  const [linkGerado, setLinkGerado] = useState<LinkGerado | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<Usuario | null>(null);
  const [processando, setProcessando] = useState(false);

  const podeGerenciar = pode("gerenciar_usuarios");

  const carregarUsuarios = useCallback(async () => {
    try {
      const resposta = await fetch("/api/admin/usuarios", { cache: "no-store" });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErroCarga(corpo.error ?? "Não foi possível carregar os usuários.");
        return;
      }

      setUsuarios((corpo.data ?? []).map(converterDbUsuarioParaUsuario));
      setErroCarga("");
    } catch {
      setErroCarga("Falha de conexão ao carregar os usuários.");
    } finally {
      setCarregando(false);
    }
  }, []);

  // Guarda de interface: quem não pode ver a área é mandado de volta ao painel.
  useEffect(() => {
    if (!carregado) return;
    if (!pode("ver_usuarios")) {
      router.replace("/painel");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial da lista
    void carregarUsuarios();
  }, [carregado, pode, router, carregarUsuarios]);

  const listaFiltrada = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    const filtrada = usuarios.filter((u) => {
      if (termo && !u.nome.toLowerCase().includes(termo) && !u.email.toLowerCase().includes(termo)) {
        return false;
      }
      if (filtroPerfil !== "todos" && u.perfil !== filtroPerfil) return false;
      if (filtroStatus === "ativo" && !u.ativo) return false;
      if (filtroStatus === "inativo" && u.ativo) return false;
      return true;
    });

    return filtrada.sort((a, b) => {
      if (ordenacao === "nome") return a.nome.localeCompare(b.nome, "pt-BR");
      if (ordenacao === "recentes") return b.criadoEm.localeCompare(a.criadoEm);
      // Nunca acessou vai para o fim da lista, não para o topo.
      return (b.ultimoAcessoEm ?? "").localeCompare(a.ultimoAcessoEm ?? "");
    });
  }, [usuarios, busca, filtroPerfil, filtroStatus, ordenacao]);

  /* ----------------------------------------------------------- Operações */

  async function salvarUsuario(dados: DadosUsuarioFormulario): Promise<string | null> {
    const editando = Boolean(emEdicao);
    const url = editando ? `/api/admin/usuarios/${emEdicao!.id}` : "/api/admin/usuarios";

    try {
      const resposta = await fetch(url, {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dados),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) return corpo.error ?? "Não foi possível salvar.";

      await carregarUsuarios();
      setModalAberto(false);
      setEmEdicao(null);

      if (corpo.linkConvite) {
        setLinkGerado({ link: corpo.linkConvite, nome: dados.nome, tipo: "convite" });
      } else {
        avisar(editando ? "Usuário atualizado." : "Usuário criado.");
      }

      return null;
    } catch {
      return "Falha de conexão. Tente novamente.";
    }
  }

  async function alternarStatus(alvo: Usuario) {
    setProcessando(true);
    try {
      const resposta = await fetch(`/api/admin/usuarios/${alvo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo: !alvo.ativo }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        avisar(corpo.error ?? "Não foi possível alterar o status.");
        return;
      }

      await carregarUsuarios();
      avisar(alvo.ativo ? `${alvo.nome} foi desativado.` : `${alvo.nome} foi reativado.`);
    } catch {
      avisar("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  async function gerarLinkSenha(alvo: Usuario) {
    setProcessando(true);
    try {
      const resposta = await fetch(`/api/admin/usuarios/${alvo.id}/link-senha`, { method: "POST" });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        avisar(corpo.error ?? "Não foi possível gerar o link.");
        return;
      }

      setLinkGerado({ link: corpo.link, nome: alvo.nome, tipo: "redefinicao" });
    } catch {
      avisar("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  async function excluirUsuario(alvo: Usuario) {
    setProcessando(true);
    try {
      const resposta = await fetch(`/api/admin/usuarios/${alvo.id}`, { method: "DELETE" });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        avisar(corpo.error ?? "Não foi possível excluir.");
        return;
      }

      await carregarUsuarios();
      avisar(`${alvo.nome} foi excluído.`);
      setConfirmandoExclusao(null);
    } catch {
      avisar("Falha de conexão. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  /* ------------------------------------------------------------ Interface */

  if (!carregado || carregando) {
    return (
      <>
        <CabecalhoPagina titulo="Usuários" descricao="Contas, perfis de acesso e status da equipe." />
        <p className="text-sm text-grafite-400">Carregando equipe…</p>
      </>
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Usuários"
        descricao="Contas, perfis de acesso e status da equipe."
        acoes={
          podeGerenciar && (
            <Botao
              onClick={() => {
                setEmEdicao(null);
                setModalAberto(true);
              }}
            >
              + Novo usuário
            </Botao>
          )
        }
      />

      {erroCarga && (
        <p
          role="alert"
          className="mb-5 rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
        >
          {erroCarga}
        </p>
      )}

      <Painel className="mb-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo
            rotulo="Buscar"
            placeholder="Nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <CampoSelecao
            rotulo="Perfil"
            value={filtroPerfil}
            onChange={(e) => setFiltroPerfil(e.target.value as "todos" | PerfilAcesso)}
            opcoes={[
              { valor: "todos", texto: "Todos os perfis" },
              ...PERFIS.map((p) => ({ valor: p, texto: rotuloPerfil[p] })),
            ]}
          />
          <CampoSelecao
            rotulo="Status"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as "todos" | "ativo" | "inativo")}
            opcoes={[
              { valor: "todos", texto: "Todos" },
              { valor: "ativo", texto: "Ativos" },
              { valor: "inativo", texto: "Inativos" },
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

      {listaFiltrada.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum usuário encontrado"
          descricao="Ajuste a busca ou os filtros para ver outras contas da equipe."
        />
      ) : (
        <Painel titulo={`${listaFiltrada.length} usuário(s)`}>
          {/* Tabela no desktop; a mesma informação vira cartões no celular,
              porque sete colunas não cabem numa tela estreita sem virar
              rolagem horizontal ilegível. */}
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Usuários da equipe</caption>
              <thead>
                <tr>
                  {["Usuário", "Perfil", "Status", "Criado em", "Último acesso", "Ações"].map((h) => (
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
                {listaFiltrada.map((u) => (
                  <tr key={u.id} className="border-t border-linha align-top">
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-verde-900">{u.nome}</p>
                        {u.id === usuarioLogado?.id && <Selo tom="verde">você</Selo>}
                      </div>
                      <p className="font-mono text-[0.6875rem] text-grafite-400">{u.email}</p>
                      {u.telefone && (
                        <p className="text-xs text-grafite-500">{formatarTelefone(u.telefone)}</p>
                      )}
                    </td>
                    <td className="py-3 pr-3">
                      <Selo tom={u.perfil === "administrador" ? "dourado" : "neutro"}>
                        {rotuloPerfil[u.perfil]}
                      </Selo>
                    </td>
                    <td className="py-3 pr-3">
                      <Selo tom={u.ativo ? "verde" : "erro"}>{u.ativo ? "ativo" : "inativo"}</Selo>
                      {u.precisaTrocarSenha && (
                        <span className="mt-1 block text-[0.625rem] text-alerta">
                          troca de senha pendente
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs text-grafite-500">
                      {formatarData(u.criadoEm)}
                    </td>
                    <td className="py-3 pr-3 text-xs text-grafite-500">
                      {u.ultimoAcessoEm ? formatarDataHora(u.ultimoAcessoEm) : "nunca acessou"}
                    </td>
                    <td className="py-3">
                      {podeGerenciar ? (
                        <AcoesUsuario
                          usuario={u}
                          ehOProprio={u.id === usuarioLogado?.id}
                          processando={processando}
                          aoEditar={() => {
                            setEmEdicao(u);
                            setModalAberto(true);
                          }}
                          aoRedefinirSenha={() => gerarLinkSenha(u)}
                          aoAlternarStatus={() => alternarStatus(u)}
                          aoExcluir={() => setConfirmandoExclusao(u)}
                        />
                      ) : (
                        <span className="text-xs text-grafite-400">somente leitura</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="space-y-3 lg:hidden">
            {listaFiltrada.map((u) => (
              <li key={u.id} className="rounded-sm border border-linha p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-bold text-verde-900">{u.nome}</p>
                  {u.id === usuarioLogado?.id && <Selo tom="verde">você</Selo>}
                  <Selo tom={u.ativo ? "verde" : "erro"}>{u.ativo ? "ativo" : "inativo"}</Selo>
                </div>
                <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-grafite-400">
                  {u.email}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Selo tom={u.perfil === "administrador" ? "dourado" : "neutro"}>
                    {rotuloPerfil[u.perfil]}
                  </Selo>
                  <span className="text-xs text-grafite-500">
                    {u.ultimoAcessoEm
                      ? `Último acesso ${formatarDataHora(u.ultimoAcessoEm)}`
                      : "Nunca acessou"}
                  </span>
                </div>

                {podeGerenciar && (
                  <div className="mt-3 border-t border-linha pt-3">
                    <AcoesUsuario
                      usuario={u}
                      ehOProprio={u.id === usuarioLogado?.id}
                      processando={processando}
                      aoEditar={() => {
                        setEmEdicao(u);
                        setModalAberto(true);
                      }}
                      aoRedefinirSenha={() => gerarLinkSenha(u)}
                      aoAlternarStatus={() => alternarStatus(u)}
                      aoExcluir={() => setConfirmandoExclusao(u)}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </Painel>
      )}

      {/* A key remonta o formulário ao trocar de alvo, zerando os campos. */}
      <ModalUsuario
        key={emEdicao?.id ?? "novo"}
        aberto={modalAberto}
        aoFechar={() => {
          setModalAberto(false);
          setEmEdicao(null);
        }}
        aoSalvar={salvarUsuario}
        usuario={emEdicao}
        podeConcederAdministrador={usuarioLogado?.perfil === "administrador"}
      />

      {linkGerado && (
        <ModalLinkSenha
          aberto
          aoFechar={() => setLinkGerado(null)}
          link={linkGerado.link}
          nomeUsuario={linkGerado.nome}
          tipo={linkGerado.tipo}
        />
      )}

      <Modal
        aberto={Boolean(confirmandoExclusao)}
        aoFechar={() => setConfirmandoExclusao(null)}
        titulo="Excluir usuário"
        descricao="Tem certeza que deseja excluir este usuário? Essa ação não poderá ser desfeita."
      >
        {confirmandoExclusao && (
          <div className="space-y-4">
            <div className="rounded-sm border border-erro/30 bg-[#f7e6e4] p-4">
              <p className="text-sm font-bold text-erro">
                {confirmandoExclusao.nome} ({confirmandoExclusao.email})
              </p>
              <p className="mt-2 text-xs leading-relaxed text-grafite-700">
                Para preservar o histórico de atendimentos e contratos, prefira{" "}
                <strong>desativar</strong> a conta: o acesso é cortado na hora e os registros
                continuam vinculados a esta pessoa.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-linha pt-4">
              <Botao variante="fantasma" onClick={() => setConfirmandoExclusao(null)}>
                Cancelar
              </Botao>
              <Botao
                variante="contorno"
                disabled={processando}
                onClick={() => {
                  void alternarStatus(confirmandoExclusao);
                  setConfirmandoExclusao(null);
                }}
              >
                Apenas desativar
              </Botao>
              <Botao
                variante="perigo"
                disabled={processando}
                onClick={() => excluirUsuario(confirmandoExclusao)}
              >
                {processando ? "Excluindo…" : "Excluir definitivamente"}
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

/** Botões de ação de uma linha. Extraído para servir tabela e cartões. */
function AcoesUsuario({
  usuario,
  ehOProprio,
  processando,
  aoEditar,
  aoRedefinirSenha,
  aoAlternarStatus,
  aoExcluir,
}: {
  usuario: Usuario;
  ehOProprio: boolean;
  processando: boolean;
  aoEditar: () => void;
  aoRedefinirSenha: () => void;
  aoAlternarStatus: () => void;
  aoExcluir: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Botao variante="fantasma" tamanho="sm" onClick={aoEditar}>
        Editar
      </Botao>

      {usuario.ativo && (
        <Botao variante="fantasma" tamanho="sm" disabled={processando} onClick={aoRedefinirSenha}>
          Redefinir senha
        </Botao>
      )}

      {/* Desativar a si mesmo é recusado pelo servidor; o botão nem aparece
          para não oferecer uma ação que sempre falharia. */}
      {!ehOProprio && (
        <>
          <Botao variante="contorno" tamanho="sm" disabled={processando} onClick={aoAlternarStatus}>
            {usuario.ativo ? "Desativar" : "Ativar"}
          </Botao>
          <Botao variante="perigo" tamanho="sm" disabled={processando} onClick={aoExcluir}>
            Excluir
          </Botao>
        </>
      )}
    </div>
  );
}
