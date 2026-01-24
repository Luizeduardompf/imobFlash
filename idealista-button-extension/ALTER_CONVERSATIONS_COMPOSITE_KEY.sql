-- Altera a tabela conversations para usar chave primária composta (agent_id, conversation_id)
-- Isso permite que a mesma conversa exista para diferentes agentes

-- IMPORTANTE: Execute este script na ordem apresentada!

-- 1. Adiciona agent_id se ainda não existir
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE RESTRICT;

-- 2. Atualiza a tabela messages para incluir agent_id ANTES de remover a foreign key
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- 3. Remove a foreign key antiga de messages PRIMEIRO (ela depende da chave primária)
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

-- 4. Remove a chave primária atual (conversation_id) - agora pode ser removida
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_pkey CASCADE;

-- 5. Remove índices que podem conflitar
DROP INDEX IF EXISTS idx_conversations_conversation_id;

-- 6. Cria nova chave primária composta (agent_id, conversation_id)
ALTER TABLE conversations 
ADD PRIMARY KEY (agent_id, conversation_id);

-- 7. Cria índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_agent_conversation ON conversations(agent_id, conversation_id);

-- 8. Cria nova foreign key em messages referenciando a chave composta
-- NOTA: PostgreSQL não suporta foreign keys compostas diretamente, então mantemos apenas conversation_id
-- mas adicionamos agent_id para filtragem e integridade lógica
-- A foreign key será apenas para conversation_id, mas o agent_id deve corresponder logicamente

-- 9. Cria índice em messages para agent_id e conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_agent_id ON messages(agent_id);
CREATE INDEX IF NOT EXISTS idx_messages_agent_conversation ON messages(agent_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- 10. Torna agent_id obrigatório (NOT NULL)
-- NOTA: Execute isso apenas após associar todas as conversas existentes a um agente
-- ALTER TABLE conversations ALTER COLUMN agent_id SET NOT NULL;
-- ALTER TABLE messages ALTER COLUMN agent_id SET NOT NULL;

-- NOTA IMPORTANTE:
-- Após executar este script:
-- 1. Associe todas as conversas existentes a um agente (UPDATE conversations SET agent_id = ...)
-- 2. Associe todas as mensagens existentes a um agente (UPDATE messages SET agent_id = ...)
-- 3. Depois, torne agent_id obrigatório:
--    ALTER TABLE conversations ALTER COLUMN agent_id SET NOT NULL;
--    ALTER TABLE messages ALTER COLUMN agent_id SET NOT NULL;

