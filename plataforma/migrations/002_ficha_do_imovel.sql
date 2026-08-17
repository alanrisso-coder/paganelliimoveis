-- Novas colunas da "Ficha do imóvel" (características complementares
-- exibidas no anúncio público e usadas no cadastro do painel)
ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS aceita_permuta boolean,
  ADD COLUMN IF NOT EXISTS idade_anos integer,
  ADD COLUMN IF NOT EXISTS perfil text,
  ADD COLUMN IF NOT EXISTS posicao_solar text,
  ADD COLUMN IF NOT EXISTS situacao text,
  ADD COLUMN IF NOT EXISTS escriturado boolean,
  ADD COLUMN IF NOT EXISTS averbado boolean,
  ADD COLUMN IF NOT EXISTS terreno text,
  ADD COLUMN IF NOT EXISTS aceita_financiamento boolean;
