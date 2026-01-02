-- Adiciona campo para controlar refresh após processar conversa
ALTER TABLE general_settings
ADD COLUMN IF NOT EXISTS refresh_after_conversation BOOLEAN DEFAULT false;

-- Atualiza configuração padrão se não existir
UPDATE general_settings
SET refresh_after_conversation = false
WHERE refresh_after_conversation IS NULL;

