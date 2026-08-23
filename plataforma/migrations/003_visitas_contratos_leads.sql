-- Sincronização de visitas, contratos e leads com o Supabase.
--
-- As tabelas `visitas`, `contratos` e `leads` já existem no banco (criadas a
-- partir de database.sql), mas ficaram para trás: o schema real não
-- acompanhou os campos que o app (src/lib/types.ts) usa hoje para essas três
-- entidades, porque a sincronização nunca chegou a ser ligada. Este script
-- só adiciona o que falta — não remove nem renomeia nada existente.

-- ============================================================================
-- VISITAS
-- ============================================================================
ALTER TABLE public.visitas
  ADD COLUMN IF NOT EXISTS codigo TEXT,
  ADD COLUMN IF NOT EXISTS hora_inicio TEXT,
  ADD COLUMN IF NOT EXISTS hora_fim TEXT,
  ADD COLUMN IF NOT EXISTS modalidade TEXT,
  ADD COLUMN IF NOT EXISTS ponto_encontro TEXT,
  ADD COLUMN IF NOT EXISTS confirmada_pelo_cliente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lembrete_enviado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS feedback_cliente TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_corretor TEXT,
  ADD COLUMN IF NOT EXISTS proxima_acao TEXT;

ALTER TABLE public.visitas
  DROP CONSTRAINT IF EXISTS visitas_modalidade_check;
ALTER TABLE public.visitas
  ADD CONSTRAINT visitas_modalidade_check CHECK (modalidade IN ('presencial', 'virtual'));

-- ============================================================================
-- CONTRATOS (Exclusividade)
-- ============================================================================
-- O status do contrato no app tem mais estados do que o CHECK original
-- previa ('rascunho' e 'vencendo' entre eles), então a constraint precisa
-- ser recriada para não rejeitar essas gravações.
ALTER TABLE public.contratos
  DROP CONSTRAINT IF EXISTS contratos_status_check;
ALTER TABLE public.contratos
  ADD CONSTRAINT contratos_status_check
  CHECK (status IN ('rascunho', 'aguardando_assinatura', 'ativo', 'vencendo', 'vencido', 'encerrado', 'cancelado'));

ALTER TABLE public.contratos
  ALTER COLUMN status SET DEFAULT 'rascunho';

-- ============================================================================
-- LEADS
-- ============================================================================
-- O schema original modelava lead como um formulário de qualificação
-- (origem/interesse/faixa_preco/atribuido_para). O app modela como um
-- contato recebido pelo site que evolui em `status` até virar cliente
-- (mensagem/canal/status/corretor_id/cliente_id). As colunas antigas ficam
-- no banco sem uso — nada as referencia no código — só para não arriscar
-- uma migração destrutiva.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS mensagem TEXT,
  ADD COLUMN IF NOT EXISTS canal TEXT,
  ADD COLUMN IF NOT EXISTS anuncio_id TEXT REFERENCES public.anuncios(id),
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'novo',
  ADD COLUMN IF NOT EXISTS corretor_id TEXT REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS cliente_id TEXT REFERENCES public.clientes(id);

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_canal_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_canal_check
  CHECK (canal IN ('formulario_imovel', 'formulario_contato', 'anuncie', 'whatsapp', 'agendamento'));

ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('novo', 'atribuido', 'em_atendimento', 'convertido', 'descartado'));

-- imovel_id passa a ser opcional no app (lead pode vir sem imóvel associado,
-- ex.: formulário de contato geral) — a FK já era assim, só confirmando que
-- não há NOT NULL bloqueando isso.
