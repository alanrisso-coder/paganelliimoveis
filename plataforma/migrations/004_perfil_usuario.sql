-- Suporte a senha própria e foto de perfil por usuário.
--
-- Até aqui o login usava o e-mail como senha (ver histórico de
-- src/app/api/auth/login/route.ts) — não existia coluna de senha no banco.
-- Este script adiciona `senha_hash` (formato "salt:hash", gerado por
-- src/lib/senha.ts) e `avatar_url`. Usuários que ainda não trocaram a senha
-- continuam entrando com e-mail como senha (senha_hash nulo) até definirem
-- a própria senha pelo painel.

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS senha_hash TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;
