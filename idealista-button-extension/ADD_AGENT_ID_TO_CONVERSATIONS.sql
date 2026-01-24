-- Adiciona campo agent_id na tabela conversations (obrigatório)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE RESTRICT;

-- Cria índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);

-- NOTA: Após executar este script, você precisará:
-- 1. Criar pelo menos um agente no sistema
-- 2. Atualizar todas as conversas existentes para associá-las a um agente
-- 3. Depois, tornar o campo obrigatório com:
--    ALTER TABLE conversations ALTER COLUMN agent_id SET NOT NULL;

