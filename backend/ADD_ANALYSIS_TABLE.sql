-- Tabela para armazenar análises de mensagens
CREATE TABLE IF NOT EXISTS message_analyses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    analysis_type TEXT NOT NULL CHECK (analysis_type IN ('summary', 'sentiment', 'intent', 'lead_quality')),
    result JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, analysis_type)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_message_analyses_conversation_id 
    ON message_analyses(conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_analyses_type 
    ON message_analyses(analysis_type);

CREATE INDEX IF NOT EXISTS idx_message_analyses_created_at 
    ON message_analyses(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_message_analyses_updated_at 
    BEFORE UPDATE ON message_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) Policies
ALTER TABLE message_analyses ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura e escrita para usuários autenticados
-- Ajuste conforme sua política de segurança
CREATE POLICY "Users can read message_analyses"
    ON message_analyses
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert message_analyses"
    ON message_analyses
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update message_analyses"
    ON message_analyses
    FOR UPDATE
    USING (true);

