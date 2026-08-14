"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Usuario } from "./types";
import { usuarios } from "./seed/usuarios";
import { podeFazer, type Permissao } from "./permissoes";

/**
 * Sessão do painel.
 *
 * ATENÇÃO — esta é uma autenticação DEMONSTRATIVA. A sessão vive no
 * localStorage e a senha é fixa, apenas para permitir navegar pelos perfis.
 * Em produção, substitua por Supabase Auth (ou equivalente): sessão em cookie
 * httpOnly, verificação no servidor e RLS por `perfil` no banco. A função
 * `pode()` continua válida como camada de interface sobre essa base.
 */

const CHAVE_SESSAO = "paganelli:sessao:v1";

/** Senha única dos perfis de demonstração, exibida na própria tela de acesso. */
export const SENHA_DEMONSTRACAO = "paganelli2026";

interface ContextoSessao {
  usuario: Usuario | null;
  carregado: boolean;
  entrar: (email: string, senha: string) => { ok: boolean; erro?: string };
  entrarComoDemonstracao: (usuarioId: string) => void;
  sair: () => void;
  pode: (permissao: Permissao) => boolean;
}

const Contexto = createContext<ContextoSessao | null>(null);

export function SessaoProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregado, setCarregado] = useState(false);

  // A sessão só pode ser lida depois da montagem: o HTML do servidor não tem
  // acesso ao localStorage e precisa renderizar deslogado para hidratar igual.
  // Roda uma única vez, então o render em cascata é intencional e limitado.
  useEffect(() => {
    try {
      const idSalvo = window.localStorage.getItem(CHAVE_SESSAO);
      if (idSalvo) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação
        setUsuario(usuarios.find((u) => u.id === idSalvo) ?? null);
      }
    } catch {
      // Sem armazenamento: começa deslogado.
    }
    setCarregado(true);
  }, []);

  const persistir = useCallback((u: Usuario | null) => {
    setUsuario(u);
    try {
      if (u) window.localStorage.setItem(CHAVE_SESSAO, u.id);
      else window.localStorage.removeItem(CHAVE_SESSAO);
    } catch {
      // Ignorado: a sessão continua válida em memória.
    }
  }, []);

  const entrar = useCallback(
    (email: string, senha: string) => {
      const encontrado = usuarios.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!encontrado) {
        return { ok: false, erro: "Não encontramos um acesso com esse e-mail." };
      }
      if (!encontrado.ativo) {
        return { ok: false, erro: "Este acesso está desativado. Fale com o administrador." };
      }
      if (senha !== SENHA_DEMONSTRACAO) {
        return { ok: false, erro: "Senha incorreta." };
      }
      persistir(encontrado);
      return { ok: true };
    },
    [persistir],
  );

  const entrarComoDemonstracao = useCallback(
    (usuarioId: string) => {
      const encontrado = usuarios.find((u) => u.id === usuarioId);
      if (encontrado) persistir(encontrado);
    },
    [persistir],
  );

  const sair = useCallback(() => persistir(null), [persistir]);

  const pode = useCallback(
    (permissao: Permissao) => (usuario ? podeFazer(usuario.perfil, permissao) : false),
    [usuario],
  );

  return (
    <Contexto.Provider value={{ usuario, carregado, entrar, entrarComoDemonstracao, sair, pode }}>
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
