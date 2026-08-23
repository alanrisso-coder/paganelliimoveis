"use client";

import Link from "next/link";
import { useState } from "react";
import { Botao, Campo } from "@/components/ui";
import { MolduraAcesso } from "@/components/acesso/Moldura";

/**
 * "Esqueci minha senha".
 *
 * A confirmação é sempre a mesma, tenha ou não o e-mail conta no sistema — o
 * servidor responde igual nos dois casos. Distinguir revelaria quem tem acesso
 * ao painel a qualquer um disposto a testar endereços.
 */
export default function PaginaRecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);

    try {
      await fetch("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {
      // Falha de rede não muda o que é exibido: a tela de confirmação é
      // idêntica em qualquer desfecho, por design.
    }

    setEnviando(false);
    setEnviado(true);
  }

  if (enviado) {
    return (
      <MolduraAcesso
        titulo="Verifique seu e-mail"
        descricao="Se existir uma conta associada a este e-mail, enviaremos instruções para redefinir sua senha."
      >
        <div className="mt-8 rounded-sm border border-linha bg-white p-5">
          <p className="text-sm leading-relaxed text-grafite-700">
            O link de redefinição vale por <strong>60 minutos</strong> e só pode ser usado uma vez.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-grafite-500">
            Não recebeu? Fale com o administrador do painel — ele consegue gerar um link de acesso
            para você em Administração → Usuários.
          </p>
        </div>

        <Link
          href="/entrar"
          className="mt-8 inline-block text-sm font-bold text-grafite-500 hover:text-verde-800"
        >
          ← Voltar ao login
        </Link>
      </MolduraAcesso>
    );
  }

  return (
    <MolduraAcesso
      titulo="Recuperar senha"
      descricao="Informe seu e-mail e enviaremos um link para você definir uma nova senha."
    >
      <form onSubmit={submeter} className="mt-8 space-y-4">
        <Campo
          rotulo="Digite seu e-mail"
          type="email"
          required
          autoFocus
          autoComplete="username"
          placeholder="nome@paganelliimoveis.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full">
          {enviando ? "Enviando…" : "Enviar link de recuperação"}
        </Botao>
      </form>

      <Link
        href="/entrar"
        className="mt-8 inline-block text-sm font-bold text-grafite-500 hover:text-verde-800"
      >
        ← Voltar ao login
      </Link>
    </MolduraAcesso>
  );
}
