"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessao } from "@/lib/auth";
import { Botao, Campo } from "@/components/ui";

/**
 * Login da equipe: e-mail + senha.
 *
 * A etapa de "código de verificação" saiu — eram os 7 primeiros dígitos do
 * telefone do próprio usuário, visíveis na ficha dele dentro do painel, então
 * não constituíam um segundo fator de verdade.
 */
export default function PaginaEntrar() {
  const router = useRouter();
  const { usuario, carregado, entrar } = useSessao();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (carregado && usuario) router.replace("/painel");
  }, [carregado, usuario, router]);

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const resultado = await entrar(email, senha);
    setEnviando(false);

    if (resultado.ok) router.push("/painel");
    else setErro(resultado.erro ?? "Não foi possível entrar.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* ------------------------------------------------------ Formulário */}
      <div className="flex flex-col justify-center bg-areia-100 px-6 py-14 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-paganelli.png"
              alt="Paganelli Imóveis"
              width={620}
              height={295}
              priority
              className="h-auto w-[176px]"
            />
          </Link>

          <h1 className="mt-10 font-display text-3xl text-verde-900">Acesso da equipe</h1>
          <p className="mt-2 text-sm leading-relaxed text-grafite-500">
            Entre para gerenciar clientes, imóveis, anúncios, visitas e contratos.
          </p>

          <form onSubmit={submeter} className="mt-8 space-y-4">
            <Campo
              rotulo="E-mail corporativo"
              type="email"
              required
              autoComplete="username"
              placeholder="nome@paganelliimoveis.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Campo
              rotulo="Senha"
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />

            {erro && (
              <p
                role="alert"
                className="rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro"
              >
                {erro}
              </p>
            )}

            <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full">
              {enviando ? "Entrando…" : "Entrar no painel"}
            </Botao>

            <Link
              href="/recuperar-senha"
              className="block w-full text-center text-sm font-bold text-grafite-500 hover:text-verde-800"
            >
              Esqueci minha senha
            </Link>
          </form>

          <Link
            href="/"
            className="mt-8 inline-block text-sm font-bold text-grafite-500 hover:text-verde-800"
          >
            ← Voltar ao site
          </Link>
        </div>
      </div>

      {/* ------------------------------------------------- Imagem de destaque */}
      <aside className="relative isolate hidden overflow-hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=75"
          alt="Imóvel de luxo"
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-verde-950/60 to-verde-950/20"
          aria-hidden="true"
        />
      </aside>
    </div>
  );
}
