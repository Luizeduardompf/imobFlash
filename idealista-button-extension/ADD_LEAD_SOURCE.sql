-- Cria tabela de origens de leads
CREATE TABLE IF NOT EXISTS param_lead_sources (
    id INTEGER PRIMARY KEY,
    source TEXT NOT NULL UNIQUE
);

-- Insere origens padrão
INSERT INTO param_lead_sources (id, source) VALUES (1, 'Idealista')
ON CONFLICT (id) DO NOTHING;

INSERT INTO param_lead_sources (id, source) VALUES (2, 'Outro')
ON CONFLICT (id) DO NOTHING;

-- Adiciona campo lead_source_id na tabela conversations (foreign key)
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS lead_source_id INTEGER REFERENCES param_lead_sources(id);

-- Atualiza conversas existentes baseado na URL
-- Se a URL contém "idealista", define como 1 (Idealista), senão 2 (Outro)
UPDATE conversations 
SET lead_source_id = CASE 
    WHEN url ILIKE '%idealista%' THEN 1
    ELSE 2
END
WHERE lead_source_id IS NULL;

-- Remove a coluna antiga se existir (caso tenha sido criada antes)
ALTER TABLE conversations 
DROP COLUMN IF EXISTS lead_source;

-- Cria índice para melhor performance em buscas por origem
CREATE INDEX IF NOT EXISTS idx_conversations_lead_source_id ON conversations(lead_source_id);

-- Verifica se funcionou
SELECT 
    ls.source,
    COUNT(*) as total
FROM conversations c
LEFT JOIN param_lead_sources ls ON c.lead_source_id = ls.id
GROUP BY ls.source
ORDER BY total DESC;
