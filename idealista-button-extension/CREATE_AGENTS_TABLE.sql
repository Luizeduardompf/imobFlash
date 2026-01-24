-- Tabela para armazenar agentes imobiliários
-- NOTA: Execute primeiro CREATE_COUNTRIES_AND_CITIES_TABLES.sql
CREATE TABLE IF NOT EXISTS agents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    full_name TEXT NOT NULL,
    commercial_name TEXT NOT NULL,
    nif TEXT UNIQUE,
    phone TEXT,
    whatsapp TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Ativo', 'Inativo', 'Pendente')),
    email TEXT NOT NULL UNIQUE,
    password TEXT, -- Hash da senha (bcrypt recomendado)
    avatar_url TEXT, -- URL da foto/avatar do agente
    city_id UUID REFERENCES cities(id) ON DELETE SET NULL,
    country_id UUID REFERENCES countries(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
CREATE INDEX IF NOT EXISTS idx_agents_nif ON agents(nif);
CREATE INDEX IF NOT EXISTS idx_agents_created_at ON agents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_city_id ON agents(city_id);
CREATE INDEX IF NOT EXISTS idx_agents_country_id ON agents(country_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agents_updated_at 
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agents_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Policy para permitir leitura e escrita para todos
CREATE POLICY "Users can read agents"
    ON agents
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert agents"
    ON agents
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update agents"
    ON agents
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete agents"
    ON agents
    FOR DELETE
    USING (true);

