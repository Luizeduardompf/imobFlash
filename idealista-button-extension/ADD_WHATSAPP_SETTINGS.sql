-- Tabela para configurações do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url_api TEXT NOT NULL,
    instancia_id TEXT NOT NULL,
    instancia_token TEXT NOT NULL,
    client_token TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para garantir apenas uma configuração
CREATE UNIQUE INDEX IF NOT EXISTS idx_whatsapp_settings_single 
    ON whatsapp_settings((1));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_whatsapp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_settings_updated_at 
    BEFORE UPDATE ON whatsapp_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_whatsapp_settings_updated_at();

-- RLS Policies
ALTER TABLE whatsapp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read whatsapp_settings"
    ON whatsapp_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert whatsapp_settings"
    ON whatsapp_settings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update whatsapp_settings"
    ON whatsapp_settings
    FOR UPDATE
    USING (true);
