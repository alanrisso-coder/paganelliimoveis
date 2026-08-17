-- Permitir proprietario_id NULL
ALTER TABLE public.imoveis
ALTER COLUMN proprietario_id DROP NOT NULL;
