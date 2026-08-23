-- Log de mensagens do WhatsApp Business API disparadas na conversão de
-- Lead em Cliente (ver src/lib/whatsapp-conversao.ts).
--
-- Uma linha por tentativa de envio. A constraint única em (lead_id,
-- tipo_mensagem) serve de trava de idempotência: o disparo faz um INSERT
-- com ON CONFLICT DO NOTHING antes de chamar a Meta, então mesmo que o
-- PATCH de conversão do lead seja repetido (retry do cliente, nova edição
-- de um lead já convertido), a mensagem é enviada no máximo uma vez.

CREATE TABLE IF NOT EXISTS public.whatsapp_mensagens (
  id TEXT PRIMARY KEY,
  lead_id TEXT REFERENCES public.leads(id),
  cliente_id TEXT REFERENCES public.clientes(id),
  telefone TEXT NOT NULL,
  tipo_mensagem TEXT NOT NULL DEFAULT 'lead_conversion_confirmation',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviado', 'erro')),
  whatsapp_message_id TEXT,
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lead_id, tipo_mensagem)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_cliente ON public.whatsapp_mensagens(cliente_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_mensagens_lead ON public.whatsapp_mensagens(lead_id);

-- RLS ligado e sem policy: só a service role key (usada nas rotas do
-- servidor) consegue ler/escrever, igual às demais tabelas do projeto.
ALTER TABLE public.whatsapp_mensagens ENABLE ROW LEVEL SECURITY;
