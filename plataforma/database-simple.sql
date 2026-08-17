-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS public.usuarios (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  telefone TEXT,
  perfil TEXT NOT NULL,
  creci TEXT,
  avatar_iniciais TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  documento TEXT UNIQUE,
  telefone TEXT,
  whatsapp TEXT,
  email TEXT,
  endereco TEXT,
  tipo TEXT NOT NULL,
  origem TEXT NOT NULL,
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  orcamento_min NUMERIC,
  orcamento_max NUMERIC,
  interesses TEXT[],
  preferencias JSONB,
  etapa TEXT DEFAULT 'novo',
  timeline JSONB DEFAULT '[]',
  favoritos TEXT[] DEFAULT '{}',
  recomendados TEXT[] DEFAULT '{}',
  observacoes TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Imóveis
CREATE TABLE IF NOT EXISTS public.imoveis (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  tipo TEXT NOT NULL,
  finalidade TEXT NOT NULL,
  status TEXT DEFAULT 'disponivel',
  logradouro TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT NOT NULL,
  cidade TEXT NOT NULL,
  estado TEXT,
  cep TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  valor_venda NUMERIC,
  valor_aluguel NUMERIC,
  valor_condominio NUMERIC,
  valor_iptu NUMERIC,
  valor_outras_taxas NUMERIC,
  area_total NUMERIC NOT NULL,
  area_construida NUMERIC,
  dormitorios INTEGER DEFAULT 0,
  suites INTEGER DEFAULT 0,
  banheiros INTEGER DEFAULT 0,
  vagas INTEGER DEFAULT 0,
  andar INTEGER,
  caracteristicas TEXT[] DEFAULT '{}',
  diferenciais TEXT[] DEFAULT '{}',
  descricao_curta TEXT,
  descricao_completa TEXT,
  fotos TEXT[] DEFAULT '{}',
  video_url TEXT,
  tour_virtual_url TEXT,
  plantas TEXT[] DEFAULT '{}',
  documentos JSONB DEFAULT '[]',
  proprietario_id TEXT NOT NULL REFERENCES public.clientes(id),
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  exclusivo BOOLEAN DEFAULT false,
  exclusividade_ate TIMESTAMPTZ,
  seo_titulo TEXT,
  seo_descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Anúncios
CREATE TABLE IF NOT EXISTS public.anuncios (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  imovel_id TEXT NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  subtitulo TEXT,
  descricao_comercial TEXT,
  status TEXT DEFAULT 'rascunho',
  visibilidade TEXT DEFAULT 'privado',
  publicar_em TIMESTAMPTZ,
  expirar_em TIMESTAMPTZ,
  destaque_home BOOLEAN DEFAULT false,
  capa_indice INTEGER DEFAULT 0,
  ordem_galeria INTEGER[] DEFAULT '{}',
  selos JSONB DEFAULT '[]',
  metricas JSONB DEFAULT '{"visualizacoes": 0, "interesse": 0, "contatos": 0}',
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Visitas
CREATE TABLE IF NOT EXISTS public.visitas (
  id TEXT PRIMARY KEY,
  imovel_id TEXT NOT NULL REFERENCES public.imoveis(id) ON DELETE CASCADE,
  cliente_id TEXT NOT NULL REFERENCES public.clientes(id),
  data TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'agendada',
  notas TEXT,
  corretor_id TEXT NOT NULL REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Contratos
CREATE TABLE IF NOT EXISTS public.contratos (
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
  status TEXT DEFAULT 'ativo',
  documentos JSONB DEFAULT '[]',
  clausulas_especiais TEXT,
  observacoes TEXT,
  renovacoes JSONB DEFAULT '[]',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Leads
CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  telefone_formatado TEXT,
  origem TEXT,
  interesse TEXT,
  faixa_preco TEXT,
  imovel_id TEXT REFERENCES public.imoveis(id),
  etapa TEXT DEFAULT 'novo',
  notas TEXT,
  atribuido_para TEXT REFERENCES public.usuarios(id),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Tarefas
CREATE TABLE IF NOT EXISTS public.tarefas (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  vencimento TIMESTAMPTZ NOT NULL,
  concluida BOOLEAN DEFAULT false,
  responsavel_id TEXT NOT NULL REFERENCES public.usuarios(id),
  cliente_id TEXT REFERENCES public.clientes(id),
  imovel_id TEXT REFERENCES public.imoveis(id),
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id),
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensagem TEXT,
  link TEXT,
  lida BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Logs
CREATE TABLE IF NOT EXISTS public.logs_acoes (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id),
  acao TEXT NOT NULL,
  entidade TEXT,
  entidade_id TEXT,
  detalhes JSONB,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_imoveis_slug ON public.imoveis(slug);
CREATE INDEX IF NOT EXISTS idx_imoveis_corretor ON public.imoveis(corretor_id);
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade ON public.imoveis(cidade);
CREATE INDEX IF NOT EXISTS idx_anuncios_imovel ON public.anuncios(imovel_id);
CREATE INDEX IF NOT EXISTS idx_anuncios_status ON public.anuncios(status);
CREATE INDEX IF NOT EXISTS idx_visitas_imovel ON public.visitas(imovel_id);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
