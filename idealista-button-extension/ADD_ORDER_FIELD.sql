-- Adiciona campo de ordem (order) na tabela messages
-- A ordem representa a posição de exibição das mensagens na página do Idealista

-- Adiciona a coluna order (INTEGER) na tabela messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Cria índice para melhor performance ao ordenar mensagens
CREATE INDEX IF NOT EXISTS idx_messages_order ON messages(conversation_id, "order" ASC);

-- Comentário na coluna
COMMENT ON COLUMN messages."order" IS 'Ordem de exibição da mensagem na página do Idealista (baseada na posição visual)';

