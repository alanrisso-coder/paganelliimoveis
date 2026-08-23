-- Publicação seletiva de anúncios no Instagram (Meta Graph API).
--
-- Regra de produto: cadastrar anúncio NÃO significa publicar no Instagram.
-- Por isso `instagram_status` nasce em 'NOT_REQUESTED' e `instagram_enabled`
-- em false — nenhum anúncio existente ou novo entra na fila de publicação
-- sem alguém marcar explicitamente.

-- ============================================================================
-- ANÚNCIOS — controle de publicação
-- ============================================================================
ALTER TABLE public.anuncios
  ADD COLUMN IF NOT EXISTS instagram_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_status TEXT NOT NULL DEFAULT 'NOT_REQUESTED',
  ADD COLUMN IF NOT EXISTS instagram_caption TEXT,
  ADD COLUMN IF NOT EXISTS instagram_published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS instagram_post_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_post_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_error TEXT;

ALTER TABLE public.anuncios
  DROP CONSTRAINT IF EXISTS anuncios_instagram_status_check;
ALTER TABLE public.anuncios
  ADD CONSTRAINT anuncios_instagram_status_check
  CHECK (instagram_status IN ('NOT_REQUESTED', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED'));

-- Filtro "Não publicados | Publicados | Com erro" do gerenciador de anúncios.
CREATE INDEX IF NOT EXISTS idx_anuncios_instagram_status
  ON public.anuncios(instagram_status);

-- ============================================================================
-- LOG DE PUBLICAÇÕES
-- ============================================================================
-- Append-only: uma linha por tentativa de publicação, incluindo as que
-- falharam e as republicações. Serve de trilha de auditoria (quem publicou o
-- quê, quando) e guarda o erro técnico da Meta para diagnóstico, enquanto
-- `anuncios.instagram_error` guarda só a mensagem amigável mostrada no painel.
--
-- A trava contra publicação duplicada NÃO vive aqui: ela é o UPDATE
-- condicional em `anuncios.instagram_status` (ver src/lib/instagram-publicacao.ts),
-- que é atômico no Postgres e, ao contrário de uma constraint única, permite
-- a republicação explícita.
CREATE TABLE IF NOT EXISTS public.instagram_publicacoes (
  id TEXT PRIMARY KEY,
  anuncio_id TEXT NOT NULL REFERENCES public.anuncios(id) ON DELETE CASCADE,
  usuario_id TEXT REFERENCES public.usuarios(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'publicado', 'erro')),
  republicacao BOOLEAN NOT NULL DEFAULT false,
  legenda TEXT,
  quantidade_imagens INTEGER,
  instagram_post_id TEXT,
  instagram_post_url TEXT,
  erro TEXT,
  publicado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_instagram_publicacoes_anuncio
  ON public.instagram_publicacoes(anuncio_id);

-- RLS ligado e sem policy: só a service role key (usada nas rotas do
-- servidor) consegue ler/escrever, igual às demais tabelas do projeto.
ALTER TABLE public.instagram_publicacoes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CORREÇÃO — default de `metricas`
-- ============================================================================
-- O default trazia "interesse", campo que o app nunca usou: MetricasAnuncio
-- (src/lib/types.ts) define visualizacoes/contatos/conversoes. Anúncios
-- criados sem `metricas` explícito ficavam com `conversoes` indefinido, que
-- o painel renderizava vazio.
ALTER TABLE public.anuncios
  ALTER COLUMN metricas SET DEFAULT '{"visualizacoes": 0, "contatos": 0, "conversoes": 0}';

UPDATE public.anuncios
SET metricas = jsonb_build_object(
      'visualizacoes', COALESCE((metricas->>'visualizacoes')::int, 0),
      'contatos',      COALESCE((metricas->>'contatos')::int, 0),
      'conversoes',    COALESCE((metricas->>'conversoes')::int, 0)
    )
WHERE metricas ? 'interesse' OR NOT (metricas ? 'conversoes');
