// Configurações do Agente IA

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../../index.html';
}

// Supabase Client
let supabaseClient = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🤖 Página de Configurações do Agente IA carregada');
    
    // Inicializa Supabase
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        try {
            supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase SDK inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
        }
    }
    
    // Carrega configurações salvas
    await loadSettings();
});

/**
 * Carrega configurações do Agente IA
 */
async function loadSettings() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/agent_ia_settings?select=*&limit=1`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data && data.length > 0) {
                const settings = data[0];
                document.getElementById('openaiKey').value = settings.openai_key || '';
                document.getElementById('phonePrompt').value = settings.phone_prompt || '';
                document.getElementById('enableAgent').checked = settings.enabled !== false;
                console.log('✅ Configurações carregadas');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configurações:', error);
    }
}

/**
 * Salva configurações do Agente IA
 */
async function saveSettings() {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    const phonePrompt = document.getElementById('phonePrompt').value.trim();
    const enabled = document.getElementById('enableAgent').checked;
    
    if (!openaiKey) {
        showError('Por favor, informe a chave da OpenAI');
        return;
    }
    
    if (!phonePrompt) {
        showError('Por favor, informe o prompt para solicitar telefone');
        return;
    }
    
    try {
        showInfo('Salvando configurações...');
        
        // Verifica se já existe
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/agent_ia_settings?select=id&limit=1`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        let saved = false;
        if (checkResponse.ok) {
            const existing = await checkResponse.json();
            
            const settingsData = {
                openai_key: openaiKey,
                phone_prompt: phonePrompt,
                enabled: enabled,
                updated_at: new Date().toISOString()
            };
            
            if (existing && existing.length > 0) {
                // Atualiza existente
                const updateUrl = `${SUPABASE_CONFIG.url}/rest/v1/agent_ia_settings?id=eq.${existing[0].id}`;
                const updateResponse = await fetch(updateUrl, {
                    method: 'PATCH',
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify(settingsData)
                });
                
                saved = updateResponse.ok;
            } else {
                // Cria novo
                const insertUrl = `${SUPABASE_CONFIG.url}/rest/v1/agent_ia_settings`;
                const insertResponse = await fetch(insertUrl, {
                    method: 'POST',
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        ...settingsData,
                        created_at: new Date().toISOString()
                    })
                });
                
                saved = insertResponse.ok;
            }
        }
        
        if (saved) {
            showSuccess('Configurações salvas com sucesso!');
        } else {
            showError('Erro ao salvar configurações');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar configurações:', error);
        showError('Erro ao salvar: ' + error.message);
    }
}

/**
 * Testa conexão com OpenAI
 */
async function testConnection() {
    const openaiKey = document.getElementById('openaiKey').value.trim();
    
    if (!openaiKey) {
        showError('Por favor, informe a chave da OpenAI primeiro');
        return;
    }
    
    try {
        showInfo('Testando conexão com OpenAI...');
        
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${openaiKey}`
            }
        });
        
        if (response.ok) {
            showSuccess('✅ Conexão com OpenAI bem-sucedida!');
        } else {
            const error = await response.json().catch(() => ({ error: { message: 'Erro desconhecido' } }));
            showError(`Erro na conexão: ${error.error?.message || 'Chave inválida'}`);
        }
    } catch (error) {
        console.error('❌ Erro ao testar conexão:', error);
        showError('Erro ao testar conexão: ' + error.message);
    }
}

/**
 * Logout
 */
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = '../../index.html';
}

