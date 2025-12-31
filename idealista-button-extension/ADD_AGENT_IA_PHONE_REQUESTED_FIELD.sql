-- Adiciona campo para identificar se o Agente IA já solicitou o telefone
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS agent_ia_phone_requested BOOLEAN DEFAULT false;

-- Adiciona índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_conversations_agent_ia_phone_requested 
    ON conversations(agent_ia_phone_requested) 
    WHERE agent_ia_phone_requested = true;

-- Comentário explicativo
COMMENT ON COLUMN conversations.agent_ia_phone_requested IS 'Indica se o Agente IA já solicitou o telefone do cliente uma vez';

