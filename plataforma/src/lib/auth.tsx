"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Usuario } from "./types";
import { podeFazer, type Permissao } from "./permissoes";
import { converterDbUsuarioParaUsuario } from "./supabase-sync-store";

/**
 * Sessão do painel.
 *
 * O estado aqui é *espelho* da sessão de servidor, não a fonte dela. Quem
 * autentica é o cookie httpOnly gravado por /api/auth/login — inacessível ao
 * JavaScript da página, e portanto imune a XSS. Ao montar, o provider pergunta
 * ao servidor quem está logado (`GET /api/auth/sessao`) em vez de acreditar em
 * algo guardado no navegador.
 *
 * Antes o usuário logado vivia no localStorage: bastava editar aquela chave
 * para "virar" administrador. Como as rotas de API também não conferiam nada,
 * a promoção era real. Hoje adulterar este estado só bagunça a própria tela —
 * cada rota decide com base no cookie.
 */

interface ContextoSessao {
  usuario: Usuario | null;
  carregado: boolean;
  entrar: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>;
  sair: () => Promise<void>;
  pode: (permissao: Permissao) => boolean;
  /** Reaplica o que veio do servidor (após trocar senha, editar perfil…). */
  recarregar: () => Promise<void>;
  /** Aplica alterações locais de perfil (ex.: avatarUrl) sem ida ao servidor. */
  atualizarUsuarioSessao: (patch: Partial<Usuario>) => void;
}

const Contexto = createContext<ContextoSessao | null>(null);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregado, setCarregado] = useState(false);

  const buscarSessao = useCallback(async () => {
    try {
      const resposta = await fetch("/api/auth/sessao", { cache: "no-store" });
      const corpo = await resposta.json();
      setUsuario(corpo.data ? converterDbUsuarioParaUsuario(corpo.data) : null);
    } catch {
      // Sem rede: trata como deslogado. O guard do painel redireciona.
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca da sessão no servidor ao montar
    void buscarSessao().finally(() => setCarregado(true));
  }, [buscarSessao]);

  const entrar = useCallback(async (email: string, senha: string) => {
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

      setUsuario(converterDbUsuarioParaUsuario(corpo.data));
      return { ok: true };
    } catch {
      return { ok: false, erro: "Falha de conexão. Tente novamente." };
    }
  }, []);

  const sair = useCallback(async () => {
    // O estado local some primeiro para a interface responder na hora; a
    // revogação no servidor é o que de fato encerra a sessão.
    setUsuario(null);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignorado: sem rede o cookie continua, mas a próxima chamada falha.
    }
  }, []);

  const atualizarUsuarioSessao = useCallback((patch: Partial<Usuario>) => {
    setUsuario((atual) => (atual ? { ...atual, ...patch } : atual));
  }, []);

  const pode = useCallback(
    (permissao: Permissao) => (usuario ? podeFazer(usuario.perfil, permissao) : false),
    [usuario]
  );

  return (
    <Contexto.Provider
      value={{
        usuario,
        carregado,
        entrar,
        sair,
        pode,
        recarregar: buscarSessao,
        atualizarUsuarioSessao,
      }}
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
