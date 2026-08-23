"use client";

import { useState } from "react";
import { useSessao } from "@/lib/auth";
import { Botao, Campo } from "@/components/ui";
import { IndicadorForcaSenha } from "@/components/acesso/ForcaSenha";
import { avaliarSenha } from "@/lib/senha-regras";

/**
 * Barreira de troca de senha obrigatória.
 *
 * Aparece sobre o painel quando a conta está marcada com
 * `precisa_trocar_senha` — o que acontece em dois casos: o administrador criou
 * o acesso com senha temporária, ou a pessoa entrou com a credencial legada
 * (o próprio e-mail como senha, herdado do login antigo).
 *
 * Não há como fechar nem contornar: enquanto a senha provisória valer, ela é
 * conhecida por quem a criou — ou, no caso legado, dedutível por qualquer um
 * que saiba o e-mail. O painel só libera depois da troca.
 */
export function TrocaSenhaObrigatoria() {
  const { usuario, recarregar } = useSessao();

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  if (!usuario) return null;

  const senhaValida = avaliarSenha(novaSenha).valida;
  const confere = novaSenha.length > 0 && novaSenha === confirmacao;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!confere) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmacao }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErro(corpo.error ?? "Não foi possível alterar a senha.");
        setSalvando(false);
        return;
      }

      // Recarrega a sessão: com `precisa_trocar_senha` zerado, a barreira sai.
      await recarregar();
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setSalvando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-verde-950/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-troca-senha"
    >
      <div className="w-full max-w-md rounded-sm border border-linha bg-white p-6">
        <h2 id="titulo-troca-senha" className="font-display text-2xl text-verde-900">
          Defina sua senha
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-grafite-500">
          Sua senha atual é provisória. Escolha uma senha pessoal para continuar usando o painel.
        </p>

        <form onSubmit={submeter} className="mt-6 space-y-4">
          <Campo
            rotulo="Senha atual"
            type="password"
            required
            autoFocus
            autoComplete="current-password"
            dica="A senha provisória que você usou para entrar."
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
          />

          <Campo
            rotulo="Nova senha"
            type="password"
            required
            autoComplete="new-password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
          />

          <IndicadorForcaSenha senha={novaSenha} />

          <Campo
            rotulo="Confirmar nova senha"
            type="password"
            required
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />

          {confirmacao.length > 0 && !confere && (
            <p className="text-xs text-erro">As senhas não coincidem.</p>
          )}

          {erro && (
            <p
              role="alert"
              className="rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
            >
              {erro}
            </p>
          )}

          <Botao
            type="submit"
            tamanho="lg"
            disabled={salvando || !senhaValida || !confere}
            className="w-full"
          >
            {salvando ? "Salvando…" : "Definir senha e continuar"}
          </Botao>
        </form>
      </div>
    </div>
  );
}
