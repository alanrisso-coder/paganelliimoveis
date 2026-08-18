"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Usuario } from "./types";
import { podeFazer, type Permissao } from "./permissoes";
import { converterDbUsuarioParaUsuario } from "./supabase-sync-store";

/**
 * Sessão do painel.
 *
 * Login em dois fatores contra a tabela `usuarios` do Supabase:
 * 1) e-mail + senha (POST /api/auth/login);
 * 2) código de verificação (POST /api/auth/verificar-codigo), que revalida
 *    e-mail + senha junto com o código antes de autorizar de fato.
 *
 * A sessão em si continua simples (objeto do usuário em localStorage, sem
 * cookie httpOnly nem token de servidor) — adequado para o tamanho da
 * equipe hoje, mas vale trocar por algo com expiração/renovação de sessão
 * se o número de contas crescer.
 */

const CHAVE_SESSAO = "paganelli:sessao:v1";

interface ContextoSessao {
  usuario: Usuario | null;
  carregado: boolean;
  /** Primeiro fator: valida e-mail e senha. Em caso de sucesso, habilita a etapa do código. */
  enviarCredenciais: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>;
  /** Segundo fator: valida o código de verificação junto com as credenciais já enviadas. */
  confirmarCodigo: (codigo: string) => Promise<{ ok: boolean; erro?: string }>;
  sair: () => void;
  pode: (permissao: Permissao) => boolean;
}

const Contexto = createContext<ContextoSessao | null>(null);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregado, setCarregado] = useState(false);
  /** Credenciais do primeiro fator, mantidas só em memória até o código ser confirmado. */
  const credenciaisPendentes = useRef<{ email: string; senha: string } | null>(null);

  // A sessão só pode ser lida depois da montagem: o HTML do servidor não tem
  // acesso ao localStorage e precisa renderizar deslogado para hidratar igual.
  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_SESSAO);
      if (bruto) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação
        setUsuario(JSON.parse(bruto) as Usuario);
      }
    } catch {
      // Sessão inválida ou sem armazenamento: começa deslogado.
    }
    setCarregado(true);
  }, []);

  const persistir = useCallback((u: Usuario | null) => {
    setUsuario(u);
    try {
      if (u) window.localStorage.setItem(CHAVE_SESSAO, JSON.stringify(u));
      else window.localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // Ignorado: a sessão continua válida em memória.
    }
  }, []);

  const enviarCredenciais = useCallback(async (email: string, senha: string) => {
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) {
        return { ok: false, erro: corpo.error ?? "Não foi possível entrar." };
      }
      credenciaisPendentes.current = { email, senha };
      return { ok: true };
    } catch {
      return { ok: false, erro: "Falha de conexão. Tente novamente." };
    }
  }, []);

  const confirmarCodigo = useCallback(async (codigo: string) => {
    const credenciais = credenciaisPendentes.current;
    if (!credenciais) {
      return { ok: false, erro: "Informe e-mail e senha novamente." };
    }
    try {
      const resposta = await fetch("/api/auth/verificar-codigo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credenciais, codigo }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) {
        return { ok: false, erro: corpo.error ?? "Não foi possível confirmar o código." };
      }
      credenciaisPendentes.current = null;
      persistir(converterDbUsuarioParaUsuario(corpo.data));
      return { ok: true };
    } catch {
      return { ok: false, erro: "Falha de conexão. Tente novamente." };
    }
  }, [persistir]);

  const sair = useCallback(() => {
    credenciaisPendentes.current = null;
    persistir(null);
  }, [persistir]);

  const pode = useCallback(
    (permissao: Permissao) => (usuario ? podeFazer(usuario.perfil, permissao) : false),
    [usuario],
  );

  return (
    <Contexto.Provider
      value={{ usuario, carregado, enviarCredenciais, confirmarCodigo, sair, pode }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function useSessao(): ContextoSessao {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useSessao precisa estar dentro de <SessaoProvider>.");
  }
  return contexto;
}
