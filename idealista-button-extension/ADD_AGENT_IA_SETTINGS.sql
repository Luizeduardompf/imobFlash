-- Tabela para configurações do Agente IA
CREATE TABLE IF NOT EXISTS agent_ia_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    openai_key TEXT NOT NULL,
    phone_prompt TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice único para garantir apenas uma configuração
CREATE UNIQUE INDEX IF NOT EXISTS idx_agent_ia_settings_single 
    ON agent_ia_settings((1));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_agent_ia_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_ia_settings_updated_at 
    BEFORE UPDATE ON agent_ia_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_ia_settings_updated_at();

-- RLS Policies
ALTER TABLE agent_ia_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read agent_ia_settings"
    ON agent_ia_settings
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert agent_ia_settings"
    ON agent_ia_settings
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update agent_ia_settings"
    ON agent_ia_settings
    FOR UPDATE
    USING (true);

