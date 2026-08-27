-- Módulo de Controle Financeiro — gastos mensais da imobiliária.
--
-- Duas tabelas novas, nenhuma existente é tocada:
--
--   gastos_categorias  catálogo editável (Marketing, Tráfego pago, Combustível…)
--   gastos             o lançamento em si, com o ciclo de reembolso e auditoria
--
-- Convenções seguidas do schema atual (ver 005/006/007):
--   - nomes de tabela e coluna em português, snake_case;
--   - id TEXT, gerado pelo banco com gen_random_uuid()::text nas tabelas novas
--     (as rotas inserem sem informar id);
--   - criado_em/atualizado_em TIMESTAMPTZ, com a trigger update_timestamp();
--   - RLS ligado e sem policy: todo acesso passa pelas rotas de API com a
--     service role key, que faz a autorização por conta própria.
--
-- Correspondência com os nomes pedidos na especificação:
--   description → descricao            | reimbursement_required   → reembolso_necessario
--   category_id → categoria_id         | reimbursement_status     → reembolso_status
--   expense_date → data_gasto          | reimbursement_date       → reembolso_data
--   amount → valor                     | reimbursement_notes      → reembolso_observacao
--   responsible_user_id → responsavel_id | reimbursement_processed_by → reembolso_por
--   notes → observacao                 | deleted_at               → excluido_em
--
-- O script é idempotente: pode ser executado de novo sem efeito colateral.

/* ------------------------------------------------------- 1. Categorias */

CREATE TABLE IF NOT EXISTS public.gastos_categorias (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nome TEXT NOT NULL,
  -- Categoria desativada some dos formulários mas continua nos lançamentos
  -- antigos: apagar quebraria o histórico e os relatórios.
  ativa BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duas categorias com o mesmo nome (ou diferindo só por acentuação de caixa)
-- deixariam o relatório por categoria com duas fatias para a mesma coisa.
CREATE UNIQUE INDEX IF NOT EXISTS gastos_categorias_nome_unico
  ON public.gastos_categorias (LOWER(nome));

/* ---------------------------------------------------------- 2. Gastos */

CREATE TABLE IF NOT EXISTS public.gastos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,

  descricao TEXT NOT NULL CHECK (LENGTH(TRIM(descricao)) > 0),
  -- RESTRICT: categoria em uso não pode ser apagada por baixo do lançamento.
  -- Para tirar de circulação existe `ativa = false`.
  categoria_id TEXT REFERENCES public.gastos_categorias(id) ON DELETE RESTRICT,
  data_gasto DATE NOT NULL,
  -- NUMERIC(12,2): dinheiro em ponto flutuante acumula erro de arredondamento
  -- na soma — e a soma é justamente o que o dashboard mostra.
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  responsavel_id TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacao TEXT,

  -- Comprovante: a URL assinada é o que a interface exibe; o caminho é o que
  -- permite reemitir a URL quando ela expirar (ver /api/storage/upload).
  comprovante_url TEXT,
  comprovante_caminho TEXT,

  reembolso_necessario BOOLEAN NOT NULL DEFAULT FALSE,
  reembolso_status TEXT NOT NULL DEFAULT 'nao_se_aplica'
    CHECK (reembolso_status IN ('nao_se_aplica', 'pendente', 'reembolsado')),
  reembolso_data DATE,
  reembolso_observacao TEXT,
  reembolso_por TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  reembolso_em TIMESTAMPTZ,

  criado_por TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_por TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Soft delete: o lançamento sai das listas e dos totais, mas a trilha de
  -- auditoria continua apontando para um registro que existe.
  excluido_em TIMESTAMPTZ,
  excluido_por TEXT REFERENCES public.usuarios(id) ON DELETE SET NULL,

  -- O status precisa concordar com "precisa de reembolso?", senão o indicador
  -- de pendências passa a contar gasto que nunca foi para reembolso.
  CONSTRAINT gastos_reembolso_coerente CHECK (
    (reembolso_necessario = FALSE AND reembolso_status = 'nao_se_aplica')
    OR (reembolso_necessario = TRUE AND reembolso_status IN ('pendente', 'reembolsado'))
  ),
  -- Reembolsado sem data seria um valor que saiu do "pendente" sem registro de
  -- quando — o suficiente para o fechamento do mês não fechar.
  CONSTRAINT gastos_reembolso_data_obrigatoria CHECK (
    reembolso_status <> 'reembolsado' OR reembolso_data IS NOT NULL
  )
);

/* --------------------------------------------------------- 3. Índices */

-- A listagem padrão é "período + não excluídos, mais recente primeiro"; os
-- índices parciais mantêm fora as linhas que nenhuma consulta do módulo lê.
CREATE INDEX IF NOT EXISTS gastos_data_idx
  ON public.gastos (data_gasto DESC) WHERE excluido_em IS NULL;

CREATE INDEX IF NOT EXISTS gastos_categoria_idx
  ON public.gastos (categoria_id) WHERE excluido_em IS NULL;

CREATE INDEX IF NOT EXISTS gastos_responsavel_idx
  ON public.gastos (responsavel_id) WHERE excluido_em IS NULL;

-- Sustenta o recorte "só os meus" de quem não tem ver_todos_gastos.
CREATE INDEX IF NOT EXISTS gastos_criado_por_idx
  ON public.gastos (criado_por) WHERE excluido_em IS NULL;

CREATE INDEX IF NOT EXISTS gastos_reembolso_idx
  ON public.gastos (reembolso_status) WHERE excluido_em IS NULL;

/* -------------------------------------------------------- 4. Triggers */

-- Reaproveita a função já criada no schema base (database.sql).
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gastos_timestamp ON public.gastos;
CREATE TRIGGER trigger_gastos_timestamp BEFORE UPDATE ON public.gastos
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trigger_gastos_categorias_timestamp ON public.gastos_categorias;
CREATE TRIGGER trigger_gastos_categorias_timestamp BEFORE UPDATE ON public.gastos_categorias
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

/* ------------------------------------------------------------- 5. RLS */

-- Ligado e sem policy, como nas demais tabelas: a chave anônima pública do
-- navegador não alcança nada: valores, comprovantes e reembolsos só saem
-- pelas rotas em /api/financeiro, que autorizam pelo cookie de sessão.
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_categorias ENABLE ROW LEVEL SECURITY;

/* ------------------------------------------- 6. Categorias iniciais */

-- WHERE NOT EXISTS em vez de ON CONFLICT: reexecutar a migration não pode
-- reativar uma categoria que a imobiliária tenha desativado de propósito.
INSERT INTO public.gastos_categorias (nome)
SELECT nome
FROM (VALUES
  ('Marketing'),
  ('Publicidade'),
  ('Tráfego pago'),
  ('Tecnologia / Software'),
  ('Telefonia / Internet'),
  ('Combustível'),
  ('Deslocamento'),
  ('Material de escritório'),
  ('Fotografia / Vídeo'),
  ('Manutenção'),
  ('Serviços terceirizados'),
  ('Comissões'),
  ('Outros')
) AS padrao(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM public.gastos_categorias c WHERE LOWER(c.nome) = LOWER(padrao.nome)
);
