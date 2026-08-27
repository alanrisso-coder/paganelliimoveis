"use client";

import { useState } from "react";
import {
  Botao,
  Campo,
  CampoMoeda,
  CampoSelecao,
  CampoTexto,
  Modal,
} from "@/components/ui";
import { lerValorMoeda, paraISO, valorParaCampo } from "@/lib/format";
import { validarGasto, type DadosGasto } from "@/lib/financeiro";
import type { CategoriaGasto, Gasto, StatusReembolso, Usuario } from "@/lib/types";
import { UploadComprovante } from "./UploadComprovante";

/**
 * Formulário de lançamento de gasto.
 *
 * O objetivo é lançar em uma tela só: descrição, categoria, data e valor ficam
 * acima da dobra do modal, e o bloco de reembolso só se abre quando marcado —
 * quem lança um gasto da empresa (a maioria) não vê campo nenhum de reembolso.
 *
 * As regras de validação vêm de `lib/financeiro`, as mesmas que a rota aplica.
 * Aqui elas servem para responder na hora; a fronteira continua sendo o
 * servidor.
 */

export interface ResultadoSalvar {
  erro?: string;
  /** O servidor achou um lançamento igual e quer confirmação. */
  duplicado?: boolean;
}

export function ModalGasto({
  aberto,
  aoFechar,
  aoSalvar,
  gasto,
  categorias,
  usuarios,
  usuarioAtualId,
  podeEscolherResponsavel,
  podeMarcarReembolso,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: DadosGasto, confirmarDuplicado: boolean) => Promise<ResultadoSalvar>;
  /** Ausente = novo lançamento. */
  gasto?: Gasto | null;
  categorias: CategoriaGasto[];
  usuarios: Usuario[];
  usuarioAtualId: string;
  podeEscolherResponsavel: boolean;
  podeMarcarReembolso: boolean;
}) {
  const editando = Boolean(gasto);

  // Como no ModalUsuario, o estado nasce do registro recebido e quem abre o
  // modal passa uma `key` por alvo — trocar de lançamento remonta o formulário.
  const [descricao, setDescricao] = useState(gasto?.descricao ?? "");
  const [categoriaId, setCategoriaId] = useState(gasto?.categoriaId ?? "");
  const [dataGasto, setDataGasto] = useState(gasto?.dataGasto ?? paraISO(new Date()));
  const [valorTexto, setValorTexto] = useState(valorParaCampo(gasto?.valor));
  const [responsavelId, setResponsavelId] = useState(gasto?.responsavelId ?? usuarioAtualId);
  const [observacao, setObservacao] = useState(gasto?.observacao ?? "");
  const [comprovanteUrl, setComprovanteUrl] = useState(gasto?.comprovanteUrl ?? "");
  const [comprovanteCaminho, setComprovanteCaminho] = useState(gasto?.comprovanteCaminho ?? "");

  const [reembolsoNecessario, setReembolsoNecessario] = useState(
    gasto?.reembolsoNecessario ?? false,
  );
  const [reembolsoStatus, setReembolsoStatus] = useState<StatusReembolso>(
    gasto?.reembolsoStatus === "reembolsado" ? "reembolsado" : "pendente",
  );
  const [reembolsoData, setReembolsoData] = useState(gasto?.reembolsoData ?? paraISO(new Date()));
  const [reembolsoObservacao, setReembolsoObservacao] = useState(gasto?.reembolsoObservacao ?? "");

  const [erro, setErro] = useState("");
  const [confirmandoDuplicado, setConfirmandoDuplicado] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Categoria desativada some da lista, exceto quando é a do próprio
  // lançamento em edição: escondê-la trocaria a categoria sem o usuário pedir.
  const categoriasVisiveis = categorias.filter(
    (c) => c.ativa || c.id === gasto?.categoriaId,
  );

  function montarDados(): DadosGasto {
    const valor = lerValorMoeda(valorTexto);
    return {
      descricao,
      categoriaId: categoriaId || null,
      dataGasto,
      valor: valor ?? 0,
      responsavelId: podeEscolherResponsavel ? responsavelId : usuarioAtualId,
      observacao: observacao.trim() || null,
      comprovanteUrl: comprovanteUrl || null,
      comprovanteCaminho: comprovanteCaminho || null,
      reembolsoNecessario,
      reembolsoStatus: reembolsoNecessario ? reembolsoStatus : "nao_se_aplica",
      reembolsoData:
        reembolsoNecessario && reembolsoStatus === "reembolsado" ? reembolsoData : null,
      reembolsoObservacao: reembolsoNecessario ? reembolsoObservacao.trim() || null : null,
    };
  }

  async function enviar(confirmarDuplicado: boolean) {
    const dados = montarDados();

    const problema = validarGasto(dados);
    if (problema) {
      setErro(problema);
      setConfirmandoDuplicado(false);
      return;
    }

    setErro("");
    setSalvando(true);
    const resultado = await aoSalvar(dados, confirmarDuplicado);
    setSalvando(false);

    if (resultado.erro) {
      setErro(resultado.erro);
      setConfirmandoDuplicado(Boolean(resultado.duplicado));
    }
  }

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    void enviar(false);
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={editando ? "Editar gasto" : "Novo gasto"}
      descricao={
        editando
          ? "Altere os dados do lançamento."
          : "Registre a despesa. Os campos com * são obrigatórios."
      }
      largura="lg"
    >
      <form onSubmit={submeter} className="space-y-4">
        <Campo
          rotulo="Descrição do gasto"
          required
          maxLength={200}
          placeholder="Ex.: Impulsionamento de anúncio no Instagram"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoSelecao
            rotulo="Categoria"
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            opcoes={[
              { valor: "", texto: "Sem categoria" },
              ...categoriasVisiveis.map((c) => ({
                valor: c.id,
                texto: c.ativa ? c.nome : `${c.nome} (desativada)`,
              })),
            ]}
          />
          <Campo
            rotulo="Data do gasto"
            type="date"
            required
            value={dataGasto}
            onChange={(e) => setDataGasto(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <CampoMoeda
            rotulo="Valor"
            required
            valor={valorTexto}
            aoAlterar={setValorTexto}
            dica="Use vírgula para os centavos: 1.250,00"
          />
          <CampoSelecao
            rotulo="Responsável"
            value={podeEscolherResponsavel ? responsavelId : usuarioAtualId}
            disabled={!podeEscolherResponsavel}
            onChange={(e) => setResponsavelId(e.target.value)}
            opcoes={
              podeEscolherResponsavel
                ? usuarios.map((u) => ({ valor: u.id, texto: u.nome }))
                : usuarios
                    .filter((u) => u.id === usuarioAtualId)
                    .map((u) => ({ valor: u.id, texto: u.nome }))
            }
          />
        </div>

        <CampoTexto
          rotulo="Observação"
          rows={3}
          placeholder="Informações adicionais (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
        />

        <UploadComprovante
          url={comprovanteUrl}
          aoEnviar={(url, caminho) => {
            setComprovanteUrl(url);
            setComprovanteCaminho(caminho);
          }}
          aoRemover={() => {
            setComprovanteUrl("");
            setComprovanteCaminho("");
          }}
        />

        {/* Bloco de reembolso: fechado por padrão, porque a maioria dos gastos
            é da empresa e nunca vira reembolso de ninguém. */}
        <div className="rounded-sm border border-linha bg-areia-50 p-4">
          <label className="flex items-start gap-2 text-sm text-grafite-700">
            <input
              type="checkbox"
              checked={reembolsoNecessario}
              onChange={(e) => setReembolsoNecessario(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-verde-800"
            />
            <span>
              Este gasto precisa de reembolso
              <span className="mt-0.5 block text-xs leading-relaxed text-grafite-500">
                Marque quando alguém pagou do próprio bolso e a imobiliária vai devolver.
              </span>
            </span>
          </label>

          {reembolsoNecessario && (
            <div className="mt-4 space-y-4 border-t border-linha pt-4">
              <CampoSelecao
                rotulo="Status do reembolso"
                value={reembolsoStatus}
                onChange={(e) => setReembolsoStatus(e.target.value as StatusReembolso)}
                disabled={!podeMarcarReembolso}
                opcoes={[
                  { valor: "pendente", texto: "Pendente" },
                  { valor: "reembolsado", texto: "Reembolsado" },
                ]}
              />

              {!podeMarcarReembolso && (
                <p className="-mt-2 text-xs text-grafite-500">
                  Dar baixa no reembolso é atribuição do gestor. O lançamento entra como
                  pendente e aparece nos indicadores até ser quitado.
                </p>
              )}

              {podeMarcarReembolso && reembolsoStatus === "reembolsado" && (
                <Campo
                  rotulo="Data do reembolso"
                  type="date"
                  required
                  min={dataGasto}
                  value={reembolsoData}
                  onChange={(e) => setReembolsoData(e.target.value)}
                />
              )}

              <CampoTexto
                rotulo="Observação do reembolso"
                rows={2}
                placeholder="Opcional — forma de devolução, referência do pagamento…"
                value={reembolsoObservacao}
                onChange={(e) => setReembolsoObservacao(e.target.value)}
              />
            </div>
          )}
        </div>

        {erro && (
          <div
            role="alert"
            className="rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
          >
            <p>{erro}</p>
            {confirmandoDuplicado && (
              <Botao
                type="button"
                variante="contorno"
                tamanho="sm"
                className="mt-2"
                disabled={salvando}
                onClick={() => void enviar(true)}
              >
                Lançar mesmo assim
              </Botao>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-linha pt-4">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando}>
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Lançar gasto"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
