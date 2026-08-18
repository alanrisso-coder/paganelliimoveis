"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessao } from "@/lib/auth";
import { Botao, Campo } from "@/components/ui";

export default function PaginaEntrar() {
  const router = useRouter();
  const { usuario, carregado, enviarCredenciais, confirmarCodigo } = useSessao();
  const [etapa, setEtapa] = useState<"credenciais" | "codigo">("credenciais");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (carregado && usuario) router.replace("/painel");
  }, [carregado, usuario, router]);

  async function submeterCredenciais(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const resultado = await enviarCredenciais(email, senha);
    setEnviando(false);
    if (resultado.ok) {
      setEtapa("codigo");
    } else {
      setErro(resultado.erro ?? "Não foi possível entrar.");
    }
  }

  async function submeterCodigo(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    const resultado = await confirmarCodigo(codigo);
    setEnviando(false);
    if (resultado.ok) {
      router.push("/painel");
    } else {
      setErro(resultado.erro ?? "Não foi possível confirmar o código.");
    }
  }

  function voltarParaCredenciais() {
    setEtapa("credenciais");
    setCodigo("");
    setErro("");
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
            {etapa === "credenciais"
              ? "Entre para gerenciar clientes, imóveis, anúncios, visitas e contratos."
              : "Confirme seu código de verificação para concluir o acesso."}
          </p>

          {etapa === "credenciais" ? (
            <form onSubmit={submeterCredenciais} className="mt-8 space-y-4">
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
                <p role="alert" className="rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro">
                  {erro}
                </p>
              )}

              <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full">
                {enviando ? "Verificando…" : "Continuar"}
              </Botao>
            </form>
          ) : (
            <form onSubmit={submeterCodigo} className="mt-8 space-y-4">
              <Campo
                rotulo="Código de verificação"
                type="text"
                inputMode="numeric"
                required
                autoFocus
                placeholder="0000000"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
              />

              {erro && (
                <p role="alert" className="rounded-sm border border-erro/30 bg-[#f7e6e4] px-3 py-2.5 text-sm text-erro">
                  {erro}
                </p>
              )}

              <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full">
                {enviando ? "Entrando…" : "Entrar no painel"}
              </Botao>

              <button
                type="button"
                onClick={voltarParaCredenciais}
                className="w-full text-center text-sm font-bold text-grafite-500 hover:text-verde-800"
              >
                ← Usar outro e-mail
              </button>
            </form>
          )}

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
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-verde-950/60 to-verde-950/20" aria-hidden="true" />
      </aside>
    </div>
  );
}
