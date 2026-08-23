"use client";

import { useState } from "react";
import { Botao, Campo, CampoSelecao, Modal } from "@/components/ui";
import { IndicadorForcaSenha } from "@/components/acesso/ForcaSenha";
import { descricaoPerfil, PERFIS, rotuloPerfil } from "@/lib/permissoes";
import { avaliarSenha } from "@/lib/senha-regras";
import type { PerfilAcesso, Usuario } from "@/lib/types";

/**
 * Formulário de criação e edição de usuário.
 *
 * Na criação há duas saídas possíveis, e a preferida é o convite: o
 * administrador gera um link e o novo usuário escolhe a própria senha, de modo
 * que ninguém além do dono jamais conhece a credencial. A senha temporária
 * existe como alternativa para quando não dá para esperar — e, quando usada,
 * o sistema obriga a troca no primeiro acesso.
 *
 * Na edição não há campo de senha nenhum: trocar a senha de outra pessoa só
 * acontece por link de redefinição.
 */

export interface DadosUsuarioFormulario {
  nome: string;
  email: string;
  telefone: string;
  creci: string;
  perfil: PerfilAcesso;
  ativo: boolean;
  senhaTemporaria?: string;
}

export function ModalUsuario({
  aberto,
  aoFechar,
  aoSalvar,
  usuario,
  podeConcederAdministrador,
}: {
  aberto: boolean;
  aoFechar: () => void;
  aoSalvar: (dados: DadosUsuarioFormulario) => Promise<string | null>;
  /** Ausente = criação. */
  usuario?: Usuario | null;
  podeConcederAdministrador: boolean;
}) {
  const editando = Boolean(usuario);

  // O estado nasce do usuário recebido. Quem abre o modal passa uma `key`
  // diferente por alvo, então trocar de usuário remonta o componente e os
  // campos voltam ao valor certo — sem efeito de sincronização, e sem risco de
  // exibir o que foi digitado na edição anterior.
  const [nome, setNome] = useState(usuario?.nome ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [creci, setCreci] = useState(usuario?.creci ?? "");
  const [perfil, setPerfil] = useState<PerfilAcesso>(usuario?.perfil ?? "corretor");
  const [ativo, setAtivo] = useState(usuario?.ativo ?? true);
  const [usarSenhaTemporaria, setUsarSenhaTemporaria] = useState(false);
  const [senhaTemporaria, setSenhaTemporaria] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const perfisDisponiveis = PERFIS.filter(
    (p) => p !== "administrador" || podeConcederAdministrador
  );

  const senhaTemporariaValida = !usarSenhaTemporaria || avaliarSenha(senhaTemporaria).valida;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setSalvando(true);

    const mensagem = await aoSalvar({
      nome,
      email,
      telefone,
      creci,
      perfil,
      ativo,
      senhaTemporaria: usarSenhaTemporaria ? senhaTemporaria : undefined,
    });

    setSalvando(false);
    if (mensagem) setErro(mensagem);
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={editando ? "Editar usuário" : "Novo usuário"}
      descricao={
        editando
          ? "Altere os dados de cadastro e o perfil de acesso."
          : "O novo usuário recebe um link para definir a própria senha."
      }
      largura="lg"
    >
      <form onSubmit={submeter} className="space-y-4">
        <Campo
          rotulo="Nome completo"
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
        />

        <Campo
          rotulo="E-mail"
          type="email"
          required
          value={email}
          disabled={editando}
          dica={editando ? "O e-mail é a credencial de login e não pode ser alterado." : undefined}
          onChange={(e) => setEmail(e.target.value)}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
          />
          <Campo rotulo="CRECI" value={creci} onChange={(e) => setCreci(e.target.value)} />
        </div>

        <CampoSelecao
          rotulo="Perfil de acesso"
          value={perfil}
          onChange={(e) => setPerfil(e.target.value as PerfilAcesso)}
          opcoes={perfisDisponiveis.map((p) => ({ valor: p, texto: rotuloPerfil[p] }))}
        />
        <p className="-mt-2 text-xs leading-relaxed text-grafite-500">{descricaoPerfil[perfil]}</p>

        <label className="flex items-center gap-2 text-sm text-grafite-700">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 accent-verde-800"
          />
          Conta ativa (pode fazer login)
        </label>

        {!editando && (
          <div className="rounded-sm border border-linha bg-areia-50 p-4">
            <label className="flex items-start gap-2 text-sm text-grafite-700">
              <input
                type="checkbox"
                checked={usarSenhaTemporaria}
                onChange={(e) => setUsarSenhaTemporaria(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-verde-800"
              />
              <span>
                Definir uma senha temporária
                <span className="mt-0.5 block text-xs leading-relaxed text-grafite-500">
                  Sem marcar, o sistema gera um link de convite para você entregar ao usuário — ele
                  escolhe a própria senha e você nunca a conhece. Com senha temporária, a troca é
                  exigida no primeiro acesso.
                </span>
              </span>
            </label>

            {usarSenhaTemporaria && (
              <div className="mt-3 space-y-3">
                <Campo
                  rotulo="Senha temporária"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={senhaTemporaria}
                  onChange={(e) => setSenhaTemporaria(e.target.value)}
                />
                <IndicadorForcaSenha senha={senhaTemporaria} />
              </div>
            )}
          </div>
        )}

        {erro && (
          <p
            role="alert"
            className="rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
          >
            {erro}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-linha pt-4">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={salvando || !senhaTemporariaValida}>
            {salvando ? "Salvando…" : editando ? "Salvar alterações" : "Criar usuário"}
          </Botao>
        </div>
      </form>
    </Modal>
  );
}
