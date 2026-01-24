-- Adiciona campos password e avatar na tabela agents
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Índice para busca por email (já existe, mas garantindo)
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);

-- NOTA: A senha deve ser armazenada com hash (bcrypt recomendado)
-- Este campo armazena o hash da senha, não a senha em texto plano

