-- Módulo de Gestão de Usuários e Autenticação (RBAC + recuperação de senha).
--
-- Três mudanças estruturais:
--
-- 1. `usuarios` ganha os campos que faltavam para administrar contas de
--    verdade (último acesso, senha temporária, quem criou).
-- 2. Sessões deixam de existir só no localStorage do navegador e passam a ter
--    registro no banco — é o que permite invalidar o acesso de alguém que foi
--    desativado, e o que dá ao backend um jeito de saber QUEM está chamando a
--    API. Até aqui nenhuma rota autenticava nada.
-- 3. Tokens de recuperação/convite e trilha de auditoria persistente.
--
-- Nenhuma tabela existente é recriada: só recebe colunas novas.
--
-- Convenção de ids: TEXT, como no resto do schema (ver 005/006). As tabelas
-- novas geram o id sozinhas com gen_random_uuid()::text, porque as rotas
-- inserem sem informar id.
--
-- O script é idempotente: pode ser executado de novo sem efeito colateral.

/* ------------------------------------------------------------- 1. usuarios */

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS senha_hash TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS ultimo_acesso_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS senha_definida_em TIMESTAMPTZ,
  -- Marca contas criadas com senha temporária pelo administrador: o login
  -- funciona, mas o painel obriga a troca antes de liberar o resto.
  ADD COLUMN IF NOT EXISTS precisa_trocar_senha BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS criado_por TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL;

-- Os perfis novos (gestor, usuario) convivem com os três que já estavam em
-- uso. O nome da constraint de perfil não é conhecido (o schema base foi
-- criado pelo painel do Supabase, não por migration), então ela é descoberta
-- e removida antes de recriar com a lista completa.
DO $$
DECLARE
  nome_constraint TEXT;
BEGIN
  FOR nome_constraint IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'usuarios'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%perfil%'
  LOOP
    EXECUTE format('ALTER TABLE public.usuarios DROP CONSTRAINT %I', nome_constraint);
  END LOOP;
END $$;

ALTER TABLE public.usuarios
  ADD CONSTRAINT usuarios_perfil_check
  CHECK (perfil IN ('administrador', 'gestor', 'corretor', 'assistente', 'usuario'));

-- E-mail é a credencial de login: não pode repetir, nem diferindo só por
-- maiúsculas (as rotas buscam com ILIKE).
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_email_unico
  ON public.usuarios (LOWER(email));

/* ------------------------------------------------------------- 2. sessoes */

-- Uma linha por login ativo. O cookie do navegador carrega o token em texto
-- puro; aqui fica só o SHA-256 dele, de modo que vazar esta tabela não
-- permite assumir nenhuma sessão.
CREATE TABLE IF NOT EXISTS public.sessoes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expira_em TIMESTAMPTZ NOT NULL,
  revogada_em TIMESTAMPTZ,
  -- Contexto para a trilha de auditoria; nunca usado para autorizar.
  user_agent TEXT,
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ultimo_uso_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessoes_usuario_idx ON public.sessoes (usuario_id);
CREATE INDEX IF NOT EXISTS sessoes_token_idx ON public.sessoes (token_hash);

/* ------------------------------------------------- 3. tokens de senha */

-- Convite (primeira senha) e recuperação usam o mesmo mecanismo: token de uso
-- único, com validade curta, guardado só como hash.
CREATE TABLE IF NOT EXISTS public.usuario_tokens (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK (tipo IN ('convite', 'recuperacao')),
  expira_em TIMESTAMPTZ NOT NULL,
  usado_em TIMESTAMPTZ,
  -- Quem pediu: o próprio usuário (NULL) ou o administrador que gerou o link.
  criado_por TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usuario_tokens_usuario_idx ON public.usuario_tokens (usuario_id);
CREATE INDEX IF NOT EXISTS usuario_tokens_token_idx ON public.usuario_tokens (token_hash);

/* --------------------------------------------------- 4. logs de auditoria */

-- Trilha das operações sensíveis. Até aqui os logs viviam só no store do
-- navegador (seed de demonstração) e sumiam ao limpar o localStorage.
CREATE TABLE IF NOT EXISTS public.logs_auditoria (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- Autor: NULL quando a ação é anônima (ex.: tentativa de login que falhou).
  usuario_id TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL DEFAULT 'usuario',
  entidade_id TEXT,
  -- Usuário afetado, quando diferente do autor (ex.: ADMIN desativa fulano).
  usuario_afetado_id TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  detalhe TEXT,
  resultado TEXT NOT NULL DEFAULT 'sucesso' CHECK (resultado IN ('sucesso', 'negado', 'erro')),
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS logs_auditoria_criado_idx ON public.logs_auditoria (criado_em DESC);
CREATE INDEX IF NOT EXISTS logs_auditoria_usuario_idx ON public.logs_auditoria (usuario_id);

/* ---------------------------------------------------------------- 5. RLS */

-- Todo acesso a estas tabelas passa pelas rotas de API usando a service role
-- key, que ignora RLS. Ligar RLS sem policy é justamente o que garante que
-- ninguém alcance senha_hash, sessões ou tokens usando a chave anônima
-- pública do navegador.
ALTER TABLE public.sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_auditoria ENABLE ROW LEVEL SECURITY;

/* ------------------------------------------------- 6. limpeza programada */

-- Sessões e tokens vencidos não têm valor depois de expirados; a função pode
-- ser chamada por um cron do Supabase (pg_cron) ou manualmente.
CREATE OR REPLACE FUNCTION public.limpar_credenciais_expiradas()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.sessoes WHERE expira_em < NOW() - INTERVAL '7 days';
  DELETE FROM public.usuario_tokens WHERE expira_em < NOW() - INTERVAL '7 days';
$$;
