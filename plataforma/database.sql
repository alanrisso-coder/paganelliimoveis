-- ============================================================================
-- SCHEMA PAGANELLI - Supabase PostgreSQL
-- ============================================================================
-- Executar este script no Supabase SQL Editor para criar as tabelas

-- ============================================================================
-- USUÁRIOS
-- ============================================================================
CREATE TABLE public.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  perfil TEXT NOT NULL CHECK (perfil IN ('administrador', 'corretor', 'assistente')),
  creci TEXT,
  avatar_iniciais TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CLIENTES
-- ============================================================================
CREATE TABLE public.clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  documento TEXT UNIQUE,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('comprador', 'locatario', 'proprietario', 'investidor')),
  origem TEXT NOT NULL CHECK (origem IN ('site', 'indicacao', 'portal', 'whatsapp', 'instagram', 'placa', 'presencial')),
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  orcamento_min NUMERIC,
  orcamento_max NUMERIC,
  interesses TEXT[], -- array de strings: 'compra', 'venda', 'aluguel', 'investimento'
  preferencias JSONB, -- armazena tipos, regiões, dormitorios_min, etc
  etapa TEXT DEFAULT 'novo' CHECK (etapa IN ('novo', 'contato', 'qualificado', 'visita', 'proposta', 'negociacao', 'fechado', 'perdido')),
  timeline JSONB DEFAULT '[]', -- array de interações
  favoritos TEXT[] DEFAULT '{}', -- IDs de imóveis
  recomendados TEXT[] DEFAULT '{}',
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clientes_corretor ON public.clientes(corretor_id);
CREATE INDEX idx_clientes_email ON public.clientes(email);

-- ============================================================================
-- IMÓVEIS
-- ============================================================================
CREATE TABLE public.imoveis (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('casa', 'apartamento', 'terreno', 'comercial', 'fazenda', 'cobertura')),
  finalidade TEXT NOT NULL CHECK (finalidade IN ('venda', 'aluguel', 'ambos')),
  status TEXT DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'reservado', 'vendido', 'alugado', 'inativo')),

  -- Endereço
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT,
  cep TEXT,
  latitude NUMERIC,
  longitude NUMERIC,

  -- Valores
  valor_venda NUMERIC,
  valor_aluguel NUMERIC,
  valor_condominio NUMERIC,
  valor_iptu NUMERIC,
  valor_outras_taxas NUMERIC,

  -- Metragens
  area_total NUMERIC NOT NULL,
  area_construida NUMERIC,
  dormitorios INTEGER NOT NULL DEFAULT 0,
  suites INTEGER NOT NULL DEFAULT 0,
  banheiros INTEGER NOT NULL DEFAULT 0,
  vagas INTEGER NOT NULL DEFAULT 0,
  andar INTEGER,

  -- Descrições
  caracteristicas TEXT[] DEFAULT '{}',
  diferenciais TEXT[] DEFAULT '{}',
  descricao_curta TEXT,
  descricao_completa TEXT,

  -- Mídias
  fotos TEXT[] DEFAULT '{}', -- URLs do Supabase Storage
  video_url TEXT,
  tour_virtual_url TEXT,
  plantas TEXT[] DEFAULT '{}',
  documentos JSONB DEFAULT '[]', -- array de {id, nome, tipo, tamanho_kb, enviado_em}

  -- Relacionamentos
  proprietario_id TEXT NOT NULL REFERENCES public.clientes(id),
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  exclusivo BOOLEAN DEFAULT false,
  exclusividade_ate TIMESTAMPTZ,

  -- SEO
  seo_titulo TEXT,
  seo_descricao TEXT,

  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_imoveis_slug ON public.imoveis(slug);
CREATE INDEX idx_imoveis_corretor ON public.imoveis(corretor_id);
CREATE INDEX idx_imoveis_proprietario ON public.imoveis(proprietario_id);
CREATE INDEX idx_imoveis_cidade ON public.imoveis(cidade);
CREATE INDEX idx_imoveis_tipo ON public.imoveis(tipo);
CREATE INDEX idx_imoveis_status ON public.imoveis(status);

-- ============================================================================
-- ANÚNCIOS
-- ============================================================================
CREATE TABLE public.anuncios (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  imovel_id TEXT NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descricao_comercial TEXT,

  status TEXT DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'agendado', 'publicado', 'pausado', 'expirado')),
  visibilidade TEXT DEFAULT 'privado' CHECK (visibilidade IN ('publico', 'link', 'privado')),

  publicar_em TIMESTAMPTZ,
  expirar_em TIMESTAMPTZ,

  destaque_home BOOLEAN DEFAULT false,
  capa_indice INTEGER DEFAULT 0,
  ordem_galeria INTEGER[] DEFAULT '{}',
  selos JSONB DEFAULT '[]', -- array de {tipo, label}

  metricas JSONB DEFAULT '{"visualizacoes": 0, "interesse": 0, "contatos": 0}',

  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_anuncios_imovel ON public.anuncios(imovel_id);
CREATE INDEX idx_anuncios_status ON public.anuncios(status);
CREATE INDEX idx_anuncios_visibilidade ON public.anuncios(visibilidade);
CREATE INDEX idx_anuncios_corretor ON public.anuncios(corretor_id);

-- ============================================================================
-- VISITAS
-- ============================================================================
CREATE TABLE public.visitas (
  id TEXT PRIMARY KEY,
  imovel_id TEXT NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  cliente_id TEXT NOT NULL REFERENCES public.clientes(id),
  data TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'agendada' CHECK (status IN ('agendada', 'confirmada', 'realizada', 'cancelada', 'nao_compareceu')),
  notas TEXT,
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visitas_imovel ON public.visitas(imovel_id);
CREATE INDEX idx_visitas_cliente ON public.visitas(cliente_id);
CREATE INDEX idx_visitas_data ON public.visitas(data);

-- ============================================================================
-- CONTRATOS (Exclusividade)
-- ============================================================================
CREATE TABLE public.contratos (
  id TEXT PRIMARY KEY,
  numero TEXT UNIQUE NOT NULL,
  proprietario_id TEXT NOT NULL REFERENCES public.clientes(id),
  imovel_id TEXT NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),

  data_inicio TIMESTAMPTZ NOT NULL,
  data_termino TIMESTAMPTZ NOT NULL,
  prazo_meses INTEGER NOT NULL,

  valor_anuncio NUMERIC,
  comissao_percentual NUMERIC DEFAULT 6,

  status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'vencido', 'cancelado', 'renovado')),

  documentos JSONB DEFAULT '[]',
  clausulas_especiais TEXT,
  observacoes TEXT,
  renovacoes JSONB DEFAULT '[]',

  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contratos_imovel ON public.contratos(imovel_id);
CREATE INDEX idx_contratos_proprietario ON public.contratos(proprietario_id);

-- ============================================================================
-- LEADS
-- ============================================================================
CREATE TABLE public.leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  telefone_formatado TEXT,
  origem TEXT CHECK (origem IN ('site', 'whatsapp', 'email', 'presencial')),
  interesse TEXT CHECK (interesse IN ('compra', 'aluguel', 'ambos')),
  faixa_preco TEXT,
  imovel_id TEXT REFERENCES public.imoveis(id),
  etapa TEXT DEFAULT 'novo',
  notas TEXT,
  atribuido_para TEXT REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_etapa ON public.leads(etapa);

-- ============================================================================
-- TAREFAS
-- ============================================================================
CREATE TABLE public.tarefas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  vencimento TIMESTAMPTZ NOT NULL,
  concluida BOOLEAN DEFAULT false,
  responsavel_id TEXT NOT NULL REFERENCES public.usuarios(id),
  cliente_id TEXT REFERENCES public.clientes(id),
  imovel_id TEXT REFERENCES public.imoveis(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tarefas_responsavel ON public.tarefas(responsavel_id);
CREATE INDEX idx_tarefas_vencimento ON public.tarefas(vencimento);

-- ============================================================================
-- NOTIFICAÇÕES
-- ============================================================================
CREATE TABLE public.notificacoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link TEXT,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_usuario ON public.notificacoes(usuario_id);

-- ============================================================================
-- LOG DE AÇÕES
-- ============================================================================
CREATE TABLE public.logs_acoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id),
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_logs_usuario ON public.logs_acoes(usuario_id);
CREATE INDEX idx_logs_data ON public.logs_acoes(criado_em);

-- ============================================================================
-- CONFIGURAÇÕES
-- ============================================================================
CREATE TABLE public.configuracoes (
  chave TEXT PRIMARY KEY,
  valor JSONB,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PERMISSÕES E RLS (Row Level Security)
-- ============================================================================

-- Habilitar RLS nas tabelas públicas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acoes ENABLE ROW LEVEL SECURITY;

-- Política: Administradores veem tudo
CREATE POLICY "admin_all" ON public.imoveis
  USING (true)
  WITH CHECK (true);

-- Política: Corretores veem seus imóveis
CREATE POLICY "corretor_own" ON public.imoveis
  USING (corretor_id = auth.uid())
  WITH CHECK (corretor_id = auth.uid());

-- Política: Anúncios públicos são visíveis para todos
CREATE POLICY "anuncios_publicos" ON public.anuncios
  FOR SELECT
  USING (visibilidade = 'publico' OR corretor_id = auth.uid());

-- ============================================================================
-- TRIGGER PARA ATUALIZAR atualizado_em
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_imoveis_timestamp BEFORE UPDATE ON public.imoveis
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_clientes_timestamp BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_anuncios_timestamp BEFORE UPDATE ON public.anuncios
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- FIM
-- ============================================================================
