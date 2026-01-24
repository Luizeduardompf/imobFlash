// Página de Configurações

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../index.html';
}

// Supabase Client
let supabaseClient = null;
let conversations = [];
let messages = [];

// Estado para origens
let leadSources = [];

// Navegação entre seções de configurações
function showSettingsSection(sectionName) {
    // Esconde todas as seções
    document.querySelectorAll('.settings-section-content').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });
    
    // Mostra a seção selecionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
    
    // Atualiza submenu ativo
    document.querySelectorAll('.subnav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    }
    
    // Se for a seção de origens, carrega as origens
    if (sectionName === 'settings-origins') {
        fetchLeadSources();
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('⚙️ Página de Configurações carregada');
    
    // Aguarda SDK do Supabase carregar
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        try {
            supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase SDK inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase:', error);
            supabaseClient = null;
        }
    } else {
        console.warn('⚠️ Supabase SDK não disponível');
        supabaseClient = null;
    }
    
    // Carrega dados iniciais
    await Promise.all([fetchConversations(), fetchMessages()]);
    updateConversationSelect();
    updateStats();
    updateSystemInfo();
    updateConnectionStatus(true);
    
    // Mostra a seção de base de dados por padrão
    showSettingsSection('settings-database');
});

// Busca conversas do Supabase
async function fetchConversations() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/conversations?select=*&order=timestamp.desc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            conversations = await response.json();
            console.log(`✅ ${conversations.length} conversas carregadas`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar conversas:', response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        return false;
    }
}

// Busca mensagens do Supabase
async function fetchMessages() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/messages?select=*&order=timestamp.asc&limit=1000`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            messages = await response.json();
            console.log(`✅ ${messages.length} mensagens carregadas`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar mensagens:', response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        return false;
    }
}

// Atualiza o select de conversas
function updateConversationSelect() {
    const select = document.getElementById('conversationSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma conversa...</option>';
    
    if (conversations && conversations.length > 0) {
        conversations.forEach(conv => {
            const option = document.createElement('option');
            option.value = conv.conversation_id;
            const name = conv.user_name || 'Sem nome';
            const phone = conv.phone_number ? ` - ${formatPhone(conv.phone_number)}` : '';
            option.textContent = `${name} (${conv.conversation_id})${phone}`;
            select.appendChild(option);
        });
        console.log(`✅ Select atualizado com ${conversations.length} conversas`);
    } else {
        select.innerHTML = '<option value="">Nenhuma conversa encontrada</option>';
    }
}

// Formata telefone
function formatPhone(phone) {
    if (!phone) return 'Sem telefone';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return phone;
}

// Atualiza estatísticas
function updateStats() {
    const totalConversations = conversations ? conversations.length : 0;
    const totalMessages = messages ? messages.length : 0;
    const withPhone = conversations ? conversations.filter(c => c.phone_number).length : 0;
    
    document.getElementById('settingsStatConversations').textContent = totalConversations;
    document.getElementById('settingsStatMessages').textContent = totalMessages;
    document.getElementById('settingsStatWithPhone').textContent = withPhone;
}

// Atualiza informações do sistema
function updateSystemInfo() {
    const urlEl = document.getElementById('supabaseUrl');
    if (urlEl) {
        urlEl.textContent = SUPABASE_CONFIG.url;
    }
    
    const connectionInfo = document.getElementById('connectionInfo');
    if (connectionInfo) {
        if (supabaseClient) {
            connectionInfo.innerHTML = '<span style="color: var(--success);">✅ Conectado</span>';
        } else {
            connectionInfo.innerHTML = '<span style="color: var(--danger);">❌ Desconectado</span>';
        }
    }
}

// Atualiza status de conexão
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const dotEl = statusEl ? statusEl.previousElementSibling : null;
    
    if (statusEl) {
        statusEl.textContent = connected ? 'Conectado' : 'Desconectado';
    }
    
    if (dotEl) {
        dotEl.style.background = connected ? 'var(--success)' : 'var(--danger)';
    }
}

// Atualiza estatísticas
function refreshStats() {
    console.log('🔄 Atualizando estatísticas...');
    Promise.all([fetchConversations(), fetchMessages()]).then(() => {
        updateConversationSelect();
        updateStats();
        showSuccess('Estatísticas atualizadas!');
    }).catch(error => {
        console.error('Erro ao atualizar estatísticas:', error);
        showError('Erro ao atualizar estatísticas. Verifique o console.');
    });
}

// Deleta conversa selecionada
async function deleteSelectedConversation() {
    const select = document.getElementById('conversationSelect');
    const conversationId = select ? select.value : null;
    
    if (!conversationId) {
        showWarning('Por favor, selecione uma conversa para deletar.');
        return;
    }
    
    const conversation = conversations.find(c => c.conversation_id === conversationId);
    const conversationName = conversation ? (conversation.user_name || conversationId) : conversationId;
    
    if (!confirm(`⚠️ Tem certeza que deseja deletar a conversa "${conversationName}"?\n\nEsta ação irá deletar:\n- A conversa\n- Todas as mensagens relacionadas\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    try {
        // Primeiro, deleta todas as mensagens da conversa
        const messagesUrl = `${SUPABASE_CONFIG.url}/rest/v1/messages?conversation_id=eq.${encodeURIComponent(conversationId)}`;
        const messagesResponse = await fetch(messagesUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (!messagesResponse.ok && messagesResponse.status !== 404) {
            const errorText = await messagesResponse.text();
            console.error('Erro ao deletar mensagens:', errorText);
        } else {
            console.log('✅ Mensagens deletadas');
        }
        
        // Depois, deleta a conversa
        const conversationUrl = `${SUPABASE_CONFIG.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(conversationId)}`;
        const conversationResponse = await fetch(conversationUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (conversationResponse.ok) {
            showSuccess('Conversa deletada com sucesso!');
            
            // Atualiza os dados
            await Promise.all([fetchConversations(), fetchMessages()]);
            updateConversationSelect();
            updateStats();
        } else {
            const errorText = await conversationResponse.text();
            console.error('Erro ao deletar conversa:', errorText);
            showError('Erro ao deletar conversa. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar conversa:', error);
        showError('Erro ao deletar conversa: ' + error.message);
    }
}

// Deleta todas as conversas e mensagens (mantém outras tabelas)
async function deleteAllConversationsAndMessages() {
    // Confirmação
    if (!confirm('⚠️ Tem certeza que deseja deletar TODAS as conversas e mensagens?\n\nEsta ação irá:\n- Deletar todas as conversas\n- Deletar todas as mensagens\n\nOutras tabelas (agentes, países, cidades, etc.) serão mantidas.\n\nEsta ação não pode ser desfeita!')) {
        return;
    }
    
    try {
        // Deleta todas as mensagens primeiro (usa WHERE clause para selecionar todos)
        const messagesUrl = `${SUPABASE_CONFIG.url}/rest/v1/messages?message_id=not.is.null`;
        const messagesResponse = await fetch(messagesUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (!messagesResponse.ok && messagesResponse.status !== 404) {
            const errorText = await messagesResponse.text();
            console.error('Erro ao deletar mensagens:', errorText);
            showError('Erro ao deletar mensagens. Verifique o console para mais detalhes.');
            return;
        } else {
            console.log('✅ Todas as mensagens deletadas');
        }
        
        // Deleta todas as conversas (usa WHERE clause para selecionar todos)
        const conversationsUrl = `${SUPABASE_CONFIG.url}/rest/v1/conversations?conversation_id=not.is.null`;
        const conversationsResponse = await fetch(conversationsUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (conversationsResponse.ok) {
            showSuccess('Todas as conversas e mensagens foram deletadas com sucesso!');
            
            // Atualiza os dados
            conversations = [];
            messages = [];
            await Promise.all([fetchConversations(), fetchMessages()]);
            updateConversationSelect();
            updateStats();
        } else {
            const errorText = await conversationsResponse.text();
            console.error('Erro ao deletar conversas:', errorText);
            showError('Erro ao deletar conversas. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar conversas e mensagens:', error);
        showError('Erro ao deletar conversas e mensagens: ' + error.message);
    }
}

// Deleta todo o banco de dados
async function deleteAllData() {
    // Confirmação dupla para ação mais destrutiva
    if (!confirm('⚠️⚠️ ATENÇÃO: Esta ação irá deletar TODOS os dados do sistema!\n\nIsso inclui:\n- Todas as conversas\n- Todas as mensagens\n- Todos os agentes\n- Todos os países\n- Todas as cidades\n- Todas as configurações\n\nEsta ação é COMPLETAMENTE IRREVERSÍVEL!\n\nDeseja realmente continuar?')) {
        return;
    }
    
    // Segunda confirmação
    if (!confirm('⚠️⚠️ ÚLTIMA CONFIRMAÇÃO!\n\nVocê está prestes a deletar TODOS os dados do sistema.\n\nTem CERTEZA ABSOLUTA que deseja continuar?')) {
        return;
    }
    
    try {
        // Deleta todas as mensagens primeiro
        const messagesUrl = `${SUPABASE_CONFIG.url}/rest/v1/messages?message_id=not.is.null`;
        const messagesResponse = await fetch(messagesUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (!messagesResponse.ok && messagesResponse.status !== 404) {
            const errorText = await messagesResponse.text();
            console.error('Erro ao deletar mensagens:', errorText);
        } else {
            console.log('✅ Todas as mensagens deletadas');
        }
        
        // Deleta todas as conversas
        const conversationsUrl = `${SUPABASE_CONFIG.url}/rest/v1/conversations?conversation_id=not.is.null`;
        const conversationsResponse = await fetch(conversationsUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        // Deleta todos os agentes
        const agentsUrl = `${SUPABASE_CONFIG.url}/rest/v1/agents?id=not.is.null`;
        const agentsResponse = await fetch(agentsUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        // Deleta todas as cidades
        const citiesUrl = `${SUPABASE_CONFIG.url}/rest/v1/cities?id=not.is.null`;
        const citiesResponse = await fetch(citiesUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        // Deleta todos os países
        const countriesUrl = `${SUPABASE_CONFIG.url}/rest/v1/countries?id=not.is.null`;
        const countriesResponse = await fetch(countriesUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        // Deleta todas as origens de leads
        const leadSourcesUrl = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?id=not.is.null`;
        const leadSourcesResponse = await fetch(leadSourcesUrl, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (conversationsResponse.ok) {
            showSuccess('Todos os dados foram deletados com sucesso!');
            
            // Atualiza os dados
            conversations = [];
            messages = [];
            await Promise.all([fetchConversations(), fetchMessages()]);
            updateConversationSelect();
            updateStats();
        } else {
            const errorText = await conversationsResponse.text();
            console.error('Erro ao deletar conversas:', errorText);
            showError('Erro ao deletar dados. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar dados:', error);
        showError('Erro ao deletar dados: ' + error.message);
    }
}

// ============================================================================
// CRUD de Origens de Leads
// ============================================================================

// Busca todas as origens
async function fetchLeadSources() {
    const container = document.getElementById('originsList');
    if (!container) return false;
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?select=*&order=id.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            leadSources = await response.json();
            renderLeadSources();
            console.log(`✅ ${leadSources.length} origens carregadas`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar origens:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar origens</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar origens:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
            </div>
        `;
        return false;
    }
}

// Renderiza lista de origens
function renderLeadSources() {
    const container = document.getElementById('originsList');
    if (!container) return;
    
    if (!leadSources || leadSources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏠</div>
                <p>Nenhuma origem cadastrada</p>
                <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Clique em "Adicionar Origem" para criar uma nova</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = leadSources.map(source => `
        <div class="origin-item">
            <div class="origin-info">
                <div class="origin-id">${source.id}</div>
                <div class="origin-name">${source.source}</div>
            </div>
            <div class="origin-actions">
                <button class="btn btn-primary btn-icon" onclick="editOrigin(${source.id}, '${source.source.replace(/'/g, "\\'")}')" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-danger btn-icon" onclick="deleteOrigin(${source.id}, '${source.source.replace(/'/g, "\\'")}')" title="Deletar">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// Mostra modal para adicionar origem
function showAddOriginModal() {
    document.getElementById('modalTitle').textContent = 'Adicionar Origem';
    document.getElementById('originId').value = '';
    document.getElementById('originSource').value = '';
    document.getElementById('originModal').style.display = 'flex';
    document.getElementById('originSource').focus();
}

// Mostra modal para editar origem
function editOrigin(id, source) {
    document.getElementById('modalTitle').textContent = 'Editar Origem';
    document.getElementById('originId').value = id;
    document.getElementById('originSource').value = source;
    document.getElementById('originModal').style.display = 'flex';
    document.getElementById('originSource').focus();
}

// Fecha modal
function closeOriginModal() {
    document.getElementById('originModal').style.display = 'none';
    document.getElementById('originForm').reset();
    document.getElementById('originId').value = '';
}

// Salva origem (criar ou editar)
async function saveOrigin(event) {
    event.preventDefault();
    
    const id = document.getElementById('originId').value;
    const source = document.getElementById('originSource').value.trim();
    
    if (!source) {
        showWarning('Por favor, informe o nome da origem.');
        return;
    }
    
    try {
        let response;
        
        if (id) {
            // Editar origem existente
            const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?id=eq.${id}`;
            response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ source })
            });
        } else {
            // Criar nova origem - precisa do próximo ID disponível
            const maxId = leadSources.length > 0 
                ? Math.max(...leadSources.map(s => s.id)) 
                : 0;
            const newId = maxId + 1;
            
            const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ id: newId, source })
            });
        }
        
        if (response.ok) {
            showSuccess(`Origem ${id ? 'atualizada' : 'criada'} com sucesso!`);
            closeOriginModal();
            await fetchLeadSources();
        } else {
            const errorText = await response.text();
            console.error('Erro ao salvar origem:', errorText);
            showError('Erro ao salvar origem. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao salvar origem:', error);
        showError('Erro ao salvar origem: ' + error.message);
    }
}

// Deleta origem
async function deleteOrigin(id, source) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar a origem "${source}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    // Verifica se há conversas usando esta origem
    try {
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/conversations?lead_source_id=eq.${id}&select=conversation_id&limit=1`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            const conversations = await checkResponse.json();
            if (conversations && conversations.length > 0) {
                showError(`Não é possível deletar esta origem pois existem ${conversations.length} conversa(s) associada(s). Primeiro, atualize as conversas para usar outra origem.`);
                return;
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar conversas:', error);
    }
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?id=eq.${id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (response.ok) {
            showSuccess('Origem deletada com sucesso!');
            await fetchLeadSources();
        } else {
            const errorText = await response.text();
            console.error('Erro ao deletar origem:', errorText);
            showError('Erro ao deletar origem. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar origem:', error);
        showError('Erro ao deletar origem: ' + error.message);
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = '../index.html';
}

