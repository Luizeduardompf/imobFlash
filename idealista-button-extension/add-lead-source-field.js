/**
 * Script para adicionar o campo lead_source na tabela conversations
 * Usa a Service Role Key do Supabase para executar SQL diretamente
 * 
 * Instalação:
 *   npm install @supabase/supabase-js
 * 
 * Execute:
 *   node add-lead-source-field.js
 */

const { createClient } = require('@supabase/supabase-js');

// CONFIGURAÇÃO - Substitua pelos seus valores
const SUPABASE_URL = 'https://bhguniomuytyzrfcpbeo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'SUA_SERVICE_ROLE_KEY_AQUI'; // Substitua pela sua Service Role Key

async function addLeadSourceField() {
    if (SUPABASE_SERVICE_ROLE_KEY.includes('SUA_SERVICE_ROLE_KEY')) {
        console.error('❌ Configure a SUPABASE_SERVICE_ROLE_KEY no arquivo!');
        console.log('\n📝 Como obter a Service Role Key:');
        console.log('1. Acesse https://supabase.com/dashboard');
        console.log('2. Selecione seu projeto');
        console.log('3. Vá em Settings > API');
        console.log('4. Copie a "service_role" key (secret)');
        console.log('5. Cole no arquivo add-lead-source-field.js');
        process.exit(1);
    }

    try {
        console.log('🔄 Conectando ao Supabase...');
        
        // Cria cliente com Service Role (tem permissões administrativas)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });

        // SQL para criar tabela de origens e adicionar foreign key
        const sql = `
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
            UPDATE conversations 
            SET lead_source_id = CASE 
                WHEN url ILIKE '%idealista%' THEN 1
                ELSE 2
            END
            WHERE lead_source_id IS NULL;

            -- Remove a coluna antiga se existir
            ALTER TABLE conversations 
            DROP COLUMN IF EXISTS lead_source;

            -- Cria índice para melhor performance
            CREATE INDEX IF NOT EXISTS idx_conversations_lead_source_id ON conversations(lead_source_id);
        `;

        console.log('🔄 Executando SQL...');
        
        // Executa via RPC (requer função criada no Supabase)
        // Alternativa: usar a API REST diretamente
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
        
        if (error) {
            // Se RPC não existir, mostra instruções
            if (error.code === 'P0001' || error.message.includes('function') || error.message.includes('does not exist')) {
                console.log('⚠️ Função RPC não disponível.');
                console.log('\n📝 Execute o SQL manualmente no SQL Editor do Supabase:');
                console.log('\n' + '='.repeat(60));
                console.log(sql);
                console.log('='.repeat(60) + '\n');
                console.log('💡 Ou use o arquivo ADD_LEAD_SOURCE.sql no SQL Editor');
                return;
            }
            throw error;
        }

        console.log('✅ Campo lead_source adicionado com sucesso!');
        console.log('Resultado:', data);
        
        // Verifica resultado
        const { data: stats, error: statsError } = await supabase
            .from('conversations')
            .select('lead_source_id, param_lead_sources(source)')
            .limit(1000);
        
        if (!statsError && stats) {
            const counts = {};
            stats.forEach(row => {
                const source = row.lead_source || 'NULL';
                counts[source] = (counts[source] || 0) + 1;
            });
            console.log('\n📊 Estatísticas:');
            Object.entries(counts).forEach(([source, count]) => {
                console.log(`   ${source}: ${count}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Erro ao adicionar campo:', error);
        console.log('\n💡 Execute o SQL manualmente no SQL Editor do Supabase:');
        console.log('Arquivo: ADD_LEAD_SOURCE.sql');
    }
}

// Executa se for chamado diretamente
if (require.main === module) {
    addLeadSourceField();
}

module.exports = { addLeadSourceField };
