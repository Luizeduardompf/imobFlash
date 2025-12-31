-- Adiciona campo is_lead na tabela conversations
-- Indica se a conversa é um lead (cliente iniciou) ou não-lead (agente iniciou)

-- Adiciona a coluna is_lead (BOOLEAN) na tabela conversations
-- NULL = ainda não determinado, true = lead (cliente iniciou), false = não-lead (agente iniciou)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN;

-- Cria índice para melhor performance ao filtrar por leads
CREATE INDEX IF NOT EXISTS idx_conversations_is_lead ON conversations(is_lead);

-- Comentário na coluna
COMMENT ON COLUMN conversations.is_lead IS 'Indica se a conversa é um lead (NULL = ainda não determinado, true = cliente iniciou, false = agente iniciou)';

