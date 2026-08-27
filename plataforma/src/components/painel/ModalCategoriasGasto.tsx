"use client";

import { useState } from "react";
import { Botao, Campo, Modal, Selo } from "@/components/ui";
import { atualizarCategoria, criarCategoria } from "@/lib/financeiro";
import type { CategoriaGasto } from "@/lib/types";

/**
 * Administração das categorias de gasto.
 *
 * Não há exclusão: categoria usada em lançamento antigo não pode sumir sem
 * levar junto o significado do relatório daquele mês. Desativar tira do
 * formulário e mantém o histórico legível.
 */
export function ModalCategoriasGasto({
  aberto,
  aoFechar,
  categorias,
  aoMudar,
}: {
  aberto: boolean;
  aoFechar: () => void;
  categorias: CategoriaGasto[];
  /** Recarrega a lista na página que abriu o modal. */
  aoMudar: () => void | Promise<void>;
}) {
  const [novoNome, setNovoNome] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditado, setNomeEditado] = useState("");
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);

  async function adicionar(evento: React.FormEvent) {
    evento.preventDefault();
    const nome = novoNome.trim();
    if (!nome) {
      setErro("Informe o nome da categoria.");
      return;
    }

    setProcessando(true);
    const resultado = await criarCategoria(nome);
    setProcessando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    setErro("");
    setNovoNome("");
    await aoMudar();
  }

  async function salvarNome(id: string) {
    const nome = nomeEditado.trim();
    if (!nome) {
      setErro("Informe o nome da categoria.");
      return;
    }

    setProcessando(true);
    const resultado = await atualizarCategoria(id, { nome });
    setProcessando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    setErro("");
    setEditandoId(null);
    await aoMudar();
  }

  async function alternarAtiva(categoria: CategoriaGasto) {
    setProcessando(true);
    const resultado = await atualizarCategoria(categoria.id, { ativa: !categoria.ativa });
    setProcessando(false);

    if (!resultado.ok) {
      setErro(resultado.erro);
      return;
    }

    setErro("");
    await aoMudar();
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo="Categorias de gasto"
      descricao="Categoria desativada some do formulário de lançamento, mas continua nos gastos já registrados e nos relatórios."
      largura="lg"
    >
      <form onSubmit={adicionar} className="flex flex-wrap items-end gap-2">
        <Campo
          rotulo="Nova categoria"
          className="min-w-[12rem] flex-1"
          maxLength={60}
          placeholder="Ex.: Cartório"
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
        />
        <Botao type="submit" disabled={processando}>
          Adicionar
        </Botao>
      </form>

      {erro && (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
        >
          {erro}
        </p>
      )}

      <ul className="mt-5 divide-y divide-[color:var(--color-linha)] border-t border-linha">
        {categorias.map((categoria) => (
          <li key={categoria.id} className="flex flex-wrap items-center gap-2 py-3">
            {editandoId === categoria.id ? (
              <>
                <input
                  autoFocus
                  maxLength={60}
                  value={nomeEditado}
                  onChange={(e) => setNomeEditado(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void salvarNome(categoria.id);
                    }
                    if (e.key === "Escape") setEditandoId(null);
                  }}
                  aria-label={`Novo nome para ${categoria.nome}`}
                  className="min-w-[10rem] flex-1 rounded-sm border border-linha bg-white px-3 py-2 text-sm text-grafite-900 focus:border-dourado-500"
                />
                <Botao
                  type="button"
                  tamanho="sm"
                  disabled={processando}
                  onClick={() => void salvarNome(categoria.id)}
                >
                  Salvar
                </Botao>
                <Botao
                  type="button"
                  variante="fantasma"
                  tamanho="sm"
                  onClick={() => setEditandoId(null)}
                >
                  Cancelar
                </Botao>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-bold text-verde-900">{categoria.nome}</span>
                <Selo tom={categoria.ativa ? "verde" : "neutro"}>
                  {categoria.ativa ? "ativa" : "inativa"}
                </Selo>
                <Botao
                  type="button"
                  variante="fantasma"
                  tamanho="sm"
                  onClick={() => {
                    setEditandoId(categoria.id);
                    setNomeEditado(categoria.nome);
                  }}
                >
                  Renomear
                </Botao>
                <Botao
                  type="button"
                  variante="contorno"
                  tamanho="sm"
                  disabled={processando}
                  onClick={() => void alternarAtiva(categoria)}
                >
                  {categoria.ativa ? "Desativar" : "Ativar"}
                </Botao>
              </>
            )}
          </li>
        ))}
      </ul>

      {categorias.length === 0 && (
        <p className="mt-5 text-sm text-grafite-400">Nenhuma categoria cadastrada ainda.</p>
      )}

      <div className="mt-5 flex justify-end border-t border-linha pt-4">
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>
    </Modal>
  );
}
