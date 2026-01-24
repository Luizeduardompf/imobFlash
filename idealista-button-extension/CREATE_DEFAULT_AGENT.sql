-- Cria usuário padrão para desenvolvimento
-- Email: eduardo@moreira.com
-- Senha: 123456
-- Status: Ativo
-- País: Portugal
-- Cidade: Lisboa

-- NOTA: Em produção, este script deve ser removido ou o usuário deve ser criado manualmente

-- Primeiro, verifica se já existe um agente com este email
-- Se existir, atualiza; se não, cria novo

INSERT INTO agents (
    id,
    full_name,
    commercial_name,
    email,
    password,
    status,
    phone,
    whatsapp,
    nif,
    country_id,
    city_id,
    created_at,
    updated_at
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, -- ID fixo para facilitar identificação
    'Eduardo Moreira',
    'Eduardo Moreira',
    'eduardo@moreira.com',
    '123456', -- Senha em texto plano (apenas para desenvolvimento)
    'Ativo',
    NULL,
    NULL,
    NULL,
    '550e8400-e29b-41d4-a716-446655440001'::uuid, -- ID de Portugal
    (SELECT id FROM cities WHERE name = 'Lisboa' AND country_id = '550e8400-e29b-41d4-a716-446655440001'::uuid LIMIT 1), -- Lisboa, Portugal
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    password = '123456',
    status = 'Ativo',
    country_id = '550e8400-e29b-41d4-a716-446655440001'::uuid,
    city_id = (SELECT id FROM cities WHERE name = 'Lisboa' AND country_id = '550e8400-e29b-41d4-a716-446655440001'::uuid LIMIT 1),
    updated_at = NOW();

-- Comentário: Este é um usuário padrão para desenvolvimento.
-- Em produção, remova este script ou altere a senha para um hash seguro.

