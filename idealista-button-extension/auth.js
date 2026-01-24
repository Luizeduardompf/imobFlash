// Módulo de Autenticação para ImobFlash Agent Extension

// Configuração do Supabase (mesma do database.js)
const SUPABASE_CONFIG = {
    url: 'https://bhguniomuytyzrfcpbeo.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3VuaW9tdXl0eXpyZmNwYmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDAxNTQsImV4cCI6MjA4MjU3NjE1NH0.cLEcnoEXy4dANZya-pr3PYIYrgwE8eDFbULl8r0-ybM'
};

/**
 * Verifica se o usuário está logado
 * @returns {Promise<Object|null>} Dados do agente logado ou null
 */
async function checkLogin() {
    return new Promise((resolve) => {
        chrome.storage.local.get(['agent_login'], (result) => {
            if (result.agent_login) {
                resolve(result.agent_login);
            } else {
                resolve(null);
            }
        });
    });
}

/**
 * Faz login do agente
 * @param {string} email - Email do agente
 * @param {string} password - Senha do agente
 * @returns {Promise<Object>} { success: boolean, agent: Object|null, error: string|null }
 */
async function loginAgent(email, password) {
    try {
        // Busca agente por email
        const url = `${SUPABASE_CONFIG.url}/rest/v1/agents?email=eq.${encodeURIComponent(email)}&select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            return { success: false, agent: null, error: 'Erro ao conectar com o servidor' };
        }

        const agents = await response.json();
        
        if (!agents || agents.length === 0) {
            return { success: false, agent: null, error: 'Email ou senha incorretos' };
        }

        const agent = agents[0];

        // Verifica senha (em produção, usar bcrypt para comparar hash)
        // Por enquanto, compara texto plano (NÃO RECOMENDADO PARA PRODUÇÃO)
        if (!agent.password || agent.password !== password) {
            return { success: false, agent: null, error: 'Email ou senha incorretos' };
        }

        // Verifica se o agente está ativo
        if (agent.status !== 'Ativo') {
            return { success: false, agent: null, error: 'Agente não está ativo. Entre em contato com o administrador.' };
        }

        // Remove a senha dos dados salvos (não armazenar senha no storage)
        const agentData = { ...agent };
        delete agentData.password;

        // Salva login no storage (nunca expira até logout)
        chrome.storage.local.set({ agent_login: agentData }, () => {
            return { success: true, agent: agentData, error: null };
        });

        return { success: true, agent: agentData, error: null };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, agent: null, error: 'Erro ao conectar com o servidor: ' + error.message };
    }
}

/**
 * Faz logout do agente
 * @returns {Promise<void>}
 */
async function logoutAgent() {
    return new Promise((resolve) => {
        chrome.storage.local.remove(['agent_login'], () => {
            resolve();
        });
    });
}

/**
 * Fecha todas as abas abertas pela extensão
 * Usa o background script para fechar apenas as abas rastreadas
 * @returns {Promise<void>}
 */
async function closeExtensionTabs() {
    try {
        // Chama o background script para fechar apenas as abas rastreadas
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({ action: 'closeExtensionTabs' }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Erro ao fechar abas via background script:', chrome.runtime.lastError);
                    // Fallback: tenta fechar localmente (mas não fecha todas as abas do Idealista)
                    return;
                }
                if (response && response.success) {
                    console.log(`✅ ${response.closed || 0} aba(s) fechada(s) pelo logout`);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao fechar abas:', error);
    }
}

