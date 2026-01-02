-- Tabela para armazenar configurações gerais do sistema
CREATE TABLE IF NOT EXISTS general_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auto_reload_enabled BOOLEAN DEFAULT true,
    auto_reload_min_minutes INTEGER DEFAULT 3,
    auto_reload_max_minutes INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insere configuração padrão se não existir
INSERT INTO general_settings (id, auto_reload_enabled, auto_reload_min_minutes, auto_reload_max_minutes)
SELECT gen_random_uuid(), true, 3, 10
WHERE NOT EXISTS (SELECT 1 FROM general_settings LIMIT 1);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_general_settings_created_at 
    ON general_settings(created_at DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column_general_settings()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_general_settings_updated_at 
    BEFORE UPDATE ON general_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column_general_settings();

-- RLS (Row Level Security) Policies
ALTER TABLE general_settings ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura e escrita para todos
CREATE POLICY "Users can read general_settings"
    ON general_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert general_settings"
    ON general_settings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update general_settings"
    ON general_settings
    FOR UPDATE
    USING (true);

