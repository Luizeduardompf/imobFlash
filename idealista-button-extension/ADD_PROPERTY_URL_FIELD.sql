-- Adiciona campo property_url na tabela conversations
-- Este campo armazena o link do anúncio do imóvel quando o cliente toma a iniciativa

-- Adiciona a coluna property_url (TEXT) na tabela conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS property_url TEXT;

-- Cria índice para melhor performance ao buscar por URL do imóvel
CREATE INDEX IF NOT EXISTS idx_conversations_property_url ON conversations(property_url);

-- Comentário na coluna
COMMENT ON COLUMN conversations.property_url IS 'URL do anúncio do imóvel extraída da primeira mensagem do cliente';

