// Configurações do WhatsApp

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../../index.html';
}

// Supabase Client
let supabaseClient = null;

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('💬 Página de Configurações do WhatsApp carregada');
    
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
 * Carrega configurações do WhatsApp
 */
async function loadSettings() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/whatsapp_settings?select=*&limit=1`;
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
                document.getElementById('urlApi').value = settings.url_api || '';
                document.getElementById('instanciaID').value = settings.instancia_id || '';
                document.getElementById('instanciaToken').value = settings.instancia_token || '';
                document.getElementById('clientToken').value = settings.client_token || '';
                console.log('✅ Configurações do WhatsApp carregadas');
            }
        }
    } catch (error) {
        console.error('❌ Erro ao carregar configurações do WhatsApp:', error);
    }
}

/**
 * Salva configurações do WhatsApp
 */
async function saveSettings() {
    const urlApi = document.getElementById('urlApi').value.trim();
    const instanciaID = document.getElementById('instanciaID').value.trim();
    const instanciaToken = document.getElementById('instanciaToken').value.trim();
    const clientToken = document.getElementById('clientToken').value.trim();
    
    if (!urlApi) {
        showError('Por favor, informe a URL da API');
        return;
    }
    
    if (!instanciaID) {
        showError('Por favor, informe o ID da Instância');
        return;
    }
    
    if (!instanciaToken) {
        showError('Por favor, informe o Token da Instância');
        return;
    }
    
    if (!clientToken) {
        showError('Por favor, informe o Token do Cliente');
        return;
    }
    
    try {
        showInfo('Salvando configurações...');
        
        // Verifica se já existe
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/whatsapp_settings?select=id&limit=1`;
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
                url_api: urlApi,
                instancia_id: instanciaID,
                instancia_token: instanciaToken,
                client_token: clientToken,
                updated_at: new Date().toISOString()
            };
            
            if (existing && existing.length > 0) {
                // Atualiza existente
                const updateUrl = `${SUPABASE_CONFIG.url}/rest/v1/whatsapp_settings?id=eq.${existing[0].id}`;
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
                const insertUrl = `${SUPABASE_CONFIG.url}/rest/v1/whatsapp_settings`;
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
            showSuccess('Configurações do WhatsApp salvas com sucesso!');
        } else {
            showError('Erro ao salvar configurações');
        }
    } catch (error) {
        console.error('❌ Erro ao salvar configurações do WhatsApp:', error);
        showError('Erro ao salvar: ' + error.message);
    }
}
