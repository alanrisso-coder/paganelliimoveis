import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase com a service role key — ignora RLS e enxerga tudo.
 *
 * Só pode ser importado por código de servidor (rotas de API). A chave nunca
 * chega ao navegador: `SUPABASE_SERVICE_ROLE_KEY` não tem o prefixo
 * NEXT_PUBLIC_, então o bundler não a inclui no bundle do cliente.
 *
 * Como este cliente passa por cima de qualquer política do banco, toda rota
 * que o utiliza precisa fazer a autorização por conta própria — ver
 * `autenticar`/`exigirPermissao` em src/lib/sessao-servidor.ts.
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !chave) {
    throw new Error(
      "Supabase não configurado: defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Colunas públicas de usuário. Mantém `senha_hash` fora de qualquer resposta. */
export const COLUNAS_USUARIO =
  "id, nome, email, telefone, perfil, creci, avatar_iniciais, avatar_url, ativo, criado_em, atualizado_em, ultimo_acesso_em, precisa_trocar_senha";
