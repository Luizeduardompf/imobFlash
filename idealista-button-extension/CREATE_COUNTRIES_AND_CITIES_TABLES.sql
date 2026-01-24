-- Tabela para armazenar países
CREATE TABLE IF NOT EXISTS countries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE, -- Código ISO (ex: PT, BR, ES)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela para armazenar cidades
CREATE TABLE IF NOT EXISTS cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    country_id UUID NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, country_id) -- Uma cidade só pode existir uma vez por país
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_cities_country_id ON cities(country_id);
CREATE INDEX IF NOT EXISTS idx_cities_name ON cities(name);
CREATE INDEX IF NOT EXISTS idx_countries_code ON countries(code);

-- Insere países padrão (usando IDs fixos para evitar duplicação)
INSERT INTO countries (id, name, code) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Portugal', 'PT'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Brasil', 'BR'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Espanha', 'ES')
ON CONFLICT (name) DO NOTHING;

-- Insere algumas cidades padrão de Portugal
INSERT INTO cities (name, country_id)
SELECT 
    city_name,
    '550e8400-e29b-41d4-a716-446655440001' -- ID de Portugal
FROM (VALUES 
    ('Lisboa'),
    ('Porto'),
    ('Braga'),
    ('Coimbra'),
    ('Aveiro'),
    ('Faro'),
    ('Setúbal'),
    ('Évora'),
    ('Leiria'),
    ('Viseu')
) AS cities_list(city_name)
WHERE NOT EXISTS (
    SELECT 1 FROM cities c
    WHERE c.name = cities_list.city_name AND c.country_id = '550e8400-e29b-41d4-a716-446655440001'
);

-- RLS (Row Level Security) Policies
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Policies para countries
CREATE POLICY "Users can read countries"
    ON countries
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert countries"
    ON countries
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update countries"
    ON countries
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete countries"
    ON countries
    FOR DELETE
    USING (true);

-- Policies para cities
CREATE POLICY "Users can read cities"
    ON cities
    FOR SELECT
    USING (true);

CREATE POLICY "Users can insert cities"
    ON cities
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Users can update cities"
    ON cities
    FOR UPDATE
    USING (true);

CREATE POLICY "Users can delete cities"
    ON cities
    FOR DELETE
    USING (true);

