-- Adiciona campo para identificar se o cliente prefere ligação ao invés de WhatsApp
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS prefers_phone_call BOOLEAN DEFAULT false;

-- Adiciona índice para melhor performance nas consultas
CREATE INDEX IF NOT EXISTS idx_conversations_prefers_phone_call 
    ON conversations(prefers_phone_call) 
    WHERE prefers_phone_call = true;

-- Comentário explicativo
COMMENT ON COLUMN conversations.prefers_phone_call IS 'Indica se o cliente prefere receber ligação ao invés de usar WhatsApp (false = WhatsApp, true = ligação)';

