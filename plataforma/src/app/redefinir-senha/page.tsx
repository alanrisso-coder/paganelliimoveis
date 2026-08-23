"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Botao, Campo } from "@/components/ui";
import { MolduraAcesso } from "@/components/acesso/Moldura";
import { IndicadorForcaSenha } from "@/components/acesso/ForcaSenha";
import { avaliarSenha } from "@/lib/senha-regras";

/**
 * Definição da nova senha a partir do link de convite ou recuperação.
 *
 * O token é conferido antes de o formulário aparecer: não faz sentido a pessoa
 * escolher uma senha para só então descobrir que o link venceu.
 */
function Formulario() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";

  // Link sem token nem chega a consultar o servidor: o estado já nasce
  // resolvido, evitando um passo de "verificando" que nunca terminaria.
  const [verificando, setVerificando] = useState(Boolean(token));
  const [tokenValido, setTokenValido] = useState(false);
  const [erro, setErro] = useState(token ? "" : "Link inválido. Solicite um novo.");

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [concluido, setConcluido] = useState(false);

  useEffect(() => {
    if (!token) return;

    let cancelado = false;

    (async () => {
      try {
        const resposta = await fetch(`/api/auth/redefinir?token=${encodeURIComponent(token)}`);
        const corpo = await resposta.json();
        if (cancelado) return;

        setTokenValido(Boolean(corpo.valido));
        if (!corpo.valido) setErro(corpo.error ?? "Link inválido. Solicite um novo.");
      } catch {
        if (!cancelado) setErro("Não foi possível validar o link. Tente novamente.");
      } finally {
        if (!cancelado) setVerificando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [token]);

  const senhaForte = avaliarSenha(senha).valida;
  const confere = senha.length > 0 && senha === confirmacao;

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!confere) {
      setErro("A confirmação não confere com a nova senha.");
      return;
    }

    setEnviando(true);

    try {
      const resposta = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha: senha, confirmacao }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        setErro(corpo.error ?? "Não foi possível definir a senha.");
        setEnviando(false);
        return;
      }

      setConcluido(true);
      // Pausa curta para a confirmação ser lida antes do redirecionamento.
      setTimeout(() => router.push("/entrar"), 2500);
    } catch {
      setErro("Falha de conexão. Tente novamente.");
      setEnviando(false);
    }
  }

  if (verificando) {
    return (
      <MolduraAcesso titulo="Criar nova senha" descricao="Verificando o link…">
        <p className="mt-8 text-sm text-grafite-400">Um instante.</p>
      </MolduraAcesso>
    );
  }

  if (concluido) {
    return (
      <MolduraAcesso
        titulo="Senha alterada"
        descricao="Sua senha foi alterada com sucesso. Faça login com sua nova senha."
      >
        <div className="mt-8 rounded-sm border border-sucesso/30 bg-[#e8f2ea] p-5">
          <p className="text-sm leading-relaxed text-verde-900">
            Por segurança, todas as sessões abertas nesta conta foram encerradas.
          </p>
        </div>
        <Link
          href="/entrar"
          className="mt-8 inline-block text-sm font-bold text-verde-800 hover:underline"
        >
          Ir para o login →
        </Link>
      </MolduraAcesso>
    );
  }

  if (!tokenValido) {
    return (
      <MolduraAcesso
        titulo="Link indisponível"
        descricao="Este link de redefinição não pode mais ser usado."
      >
        <p
          role="alert"
          className="mt-8 rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
        >
          {erro}
        </p>
        <Link
          href="/recuperar-senha"
          className="mt-6 inline-block text-sm font-bold text-verde-800 hover:underline"
        >
          Solicitar um novo link →
        </Link>
        <Link
          href="/entrar"
          className="mt-8 block text-sm font-bold text-grafite-500 hover:text-verde-800"
        >
          ← Voltar ao login
        </Link>
      </MolduraAcesso>
    );
  }

  return (
    <MolduraAcesso
      titulo="Criar nova senha"
      descricao="Escolha uma senha que você não use em outros serviços."
    >
      <form onSubmit={submeter} className="mt-8 space-y-4">
        <Campo
          rotulo="Nova senha"
          type="password"
          required
          autoFocus
          autoComplete="new-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />

        <IndicadorForcaSenha senha={senha} />

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
          disabled={enviando || !senhaForte || !confere}
          className="w-full"
        >
          {enviando ? "Salvando…" : "Definir nova senha"}
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

export default function PaginaRedefinirSenha() {
  // useSearchParams exige fronteira de Suspense para o Next poder pré-renderizar
  // o restante da página sem esperar pela URL.
  return (
    <Suspense
      fallback={
        <MolduraAcesso titulo="Criar nova senha" descricao="Carregando…">
          <p className="mt-8 text-sm text-grafite-400">Um instante.</p>
        </MolduraAcesso>
      }
    >
      <Formulario />
    </Suspense>
  );
}
