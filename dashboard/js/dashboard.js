// Dashboard principal com Supabase Realtime

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = 'index.html';
}

// Garante que showSection esteja acessível globalmente
window.showSection = function(sectionName) {
    console.log('Navegando para seção:', sectionName);
    
    // Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Mostra a seção selecionada
    const targetSection = document.getElementById(`section-${sectionName}`);
    if (targetSection) {
        targetSection.style.display = 'block';
        console.log('✅ Seção exibida:', sectionName);
        
        // Força o scroll para o topo
        window.scrollTo(0, 0);
    } else {
        console.error('❌ Seção não encontrada:', sectionName);
        showError('Erro: Seção não encontrada. Verifique o console.');
    }
    
    // Atualiza menu ativo
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    const activeItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeItem) {
        activeItem.classList.add('active');
    } else {
        console.warn('⚠️ Item de menu não encontrado:', sectionName);
    }
    
    // Se for configurações, atualiza o select de conversas
    if (sectionName === 'settings') {
        console.log('📋 Atualizando select de conversas...');
        setTimeout(() => {
            updateConversationSelect();
        }, 100);
    }
};

// Supabase Client (será inicializado no DOMContentLoaded)
let supabaseClient = null;

// Estado global
let conversations = [];
let messages = [];
let realtimeSubscriptions = [];

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

// Formata data
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}min atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Cache de origens de leads
let leadSourcesCache = {};

// Busca origens de leads do Supabase
async function fetchLeadSources() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?select=*`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const sources = await response.json();
            leadSourcesCache = {};
            sources.forEach(source => {
                leadSourcesCache[source.id] = source.source;
            });
            console.log('✅ Origens de leads carregadas:', leadSourcesCache);
            return true;
        } else {
            console.warn('⚠️ Erro ao buscar origens de leads, usando cache padrão');
            leadSourcesCache = { 1: 'Idealista', 2: 'Outro' };
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao buscar origens de leads, usando cache padrão:', error);
        leadSourcesCache = { 1: 'Idealista', 2: 'Outro' };
        return false;
    }
}

// Busca conversas do Supabase
async function fetchConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return false;
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/conversations?select=*,param_lead_sources(source)&order=timestamp.desc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            conversations = await response.json();
            // Processa as conversas para ter o source diretamente
            conversations = conversations.map(conv => {
                if (conv.param_lead_sources && conv.param_lead_sources.length > 0) {
                    conv.lead_source = conv.param_lead_sources[0].source;
                } else if (conv.lead_source_id) {
                    conv.lead_source = leadSourcesCache[conv.lead_source_id] || 'Outro';
                } else {
                    conv.lead_source = 'Outro';
                }
                return conv;
            });
            renderConversations();
            updateStats();
            updateConversationFilter();
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar conversas:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar conversas</p>
                    <p style="font-size: 12px; margin-top: 8px;">Status: ${response.status}</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar conversas:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
                <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
            </div>
        `;
        return false;
    }
}

// Busca mensagens do Supabase
async function fetchMessages(conversationId = null) {
    const container = document.getElementById('messagesList');
    if (!container) return false;
    
    try {
        let url = `${SUPABASE_CONFIG.url}/rest/v1/messages?select=*&order=timestamp.asc&limit=100`;
        if (conversationId) {
            url += `&conversation_id=eq.${encodeURIComponent(conversationId)}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            messages = await response.json();
            renderMessages();
            updateStats();
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar mensagens:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar mensagens</p>
                    <p style="font-size: 12px; margin-top: 8px;">Status: ${response.status}</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar mensagens:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
                <p style="font-size: 12px; margin-top: 8px;">${error.message}</p>
            </div>
        `;
        return false;
    }
}

// Renderiza conversas
function renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) {
        console.error('Container de conversas não encontrado');
        return;
    }
    
    const searchInput = document.getElementById('searchConversations');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = conversations || [];
    if (searchTerm) {
        filtered = filtered.filter(conv => 
            (conv.user_name || '').toLowerCase().includes(searchTerm) ||
            (conv.phone_number || '').includes(searchTerm) ||
            (conv.last_message || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💬</div>
                <p>Nenhuma conversa encontrada</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(conv => `
        <div class="conversation-item" onclick="selectConversation('${conv.conversation_id}')">
            <div class="conversation-header">
                <span class="conversation-name">${conv.user_name || 'Sem nome'}</span>
                <span class="conversation-badge ${conv.has_unread ? 'badge-unread' : 'badge-read'}">
                    ${conv.has_unread ? `${conv.unread_count || 0} não lidas` : 'Lida'}
                </span>
            </div>
            ${conv.phone_number ? `<div class="conversation-phone">📞 ${formatPhone(conv.phone_number)}</div>` : ''}
            <div class="conversation-message">${conv.last_message || 'Sem mensagens'}</div>
            <div class="conversation-time">${formatDate(conv.last_message_date || conv.timestamp)}</div>
        </div>
    `).join('');
}

// Renderiza mensagens
function renderMessages() {
    const container = document.getElementById('messagesList');
    if (!container) {
        console.error('Container de mensagens não encontrado');
        return;
    }
    
    const conversationFilterEl = document.getElementById('conversationFilter');
    const searchInput = document.getElementById('searchMessages');
    const conversationFilter = conversationFilterEl ? conversationFilterEl.value : '';
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = messages || [];
    if (conversationFilter) {
        filtered = filtered.filter(msg => msg.conversation_id === conversationFilter);
    }
    if (searchTerm) {
        filtered = filtered.filter(msg => 
            (msg.content || '').toLowerCase().includes(searchTerm) ||
            (msg.sender || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📨</div>
                <p>Nenhuma mensagem encontrada</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <span class="message-sender ${msg.sender === 'client' ? 'sender-client' : 'sender-agent'}">
                    ${msg.sender === 'client' ? '👤 Cliente' : '🤖 Agente'}
                </span>
                <span class="message-time">${formatDate(msg.timestamp)}</span>
            </div>
            <div class="message-content">${msg.content || ''}</div>
        </div>
    `).join('');
    
    // Scroll para o final
    container.scrollTop = container.scrollHeight;
}

// Atualiza estatísticas
function updateStats() {
    const totalConversations = conversations.length;
    const totalMessages = messages.length;
    const unreadConversations = conversations.filter(c => c.has_unread).length;
    const withPhone = conversations.filter(c => c.phone_number && c.phone_number.trim()).length;
    
    document.getElementById('statConversations').textContent = totalConversations;
    document.getElementById('statMessages').textContent = totalMessages;
    document.getElementById('statUnread').textContent = unreadConversations;
    document.getElementById('statWithPhone').textContent = withPhone;
}

// Atualiza filtro de conversas
function updateConversationFilter() {
    const select = document.getElementById('conversationFilter');
    if (!select) return;
    
    const currentValue = select.value;
    
    select.innerHTML = '<option value="">Todas as conversas</option>' +
        (conversations || []).map(conv => 
            `<option value="${conv.conversation_id}">${conv.user_name || conv.conversation_id}</option>`
        ).join('');
    
    if (currentValue) {
        select.value = currentValue;
    }
    
    // Também atualiza o select de configurações se estiver na página de configurações
    const settingsSelect = document.getElementById('conversationSelect');
    const settingsSection = document.getElementById('section-settings');
    if (settingsSelect && settingsSection && settingsSection.style.display !== 'none') {
        updateConversationSelect();
    }
}

// Filtra conversas
function filterConversations() {
    renderConversations();
}

// Filtra mensagens
function filterMessages() {
    renderMessages();
}

// Seleciona conversa
function selectConversation(conversationId) {
    document.getElementById('conversationFilter').value = conversationId;
    filterMessages();
}

// Atualiza conversas
function refreshConversations() {
    fetchConversations();
}

// Configura Supabase Realtime usando WebSocket
function setupRealtime() {
    if (!supabaseClient) {
        // Fallback: polling se Supabase SDK não estiver disponível
        console.log('📡 Usando polling (Supabase SDK não disponível)');
        setInterval(() => {
            fetchConversations();
            fetchMessages();
        }, 5000);
        return;
    }
    
    try {
        // Canal para conversas
        const conversationsChannel = supabaseClient
            .channel('conversations-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'conversations' 
                }, 
                (payload) => {
                    console.log('🔄 Mudança detectada em conversas:', payload.eventType);
                    if (payload.eventType === 'INSERT') {
                        conversations.unshift(payload.new);
                    } else if (payload.eventType === 'UPDATE') {
                        const index = conversations.findIndex(c => c.conversation_id === payload.new.conversation_id);
                        if (index !== -1) {
                            conversations[index] = payload.new;
                        } else {
                            conversations.unshift(payload.new);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        conversations = conversations.filter(c => c.conversation_id !== payload.old.conversation_id);
                    }
                    renderConversations();
                    updateStats();
                    updateConversationFilter();
                }
            )
            .subscribe((status) => {
                console.log('📡 Status do canal de conversas:', status);
                updateConnectionStatus(status === 'SUBSCRIBED');
            });

        // Canal para mensagens
        const messagesChannel = supabaseClient
            .channel('messages-changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'messages' 
                }, 
                (payload) => {
                    console.log('🔄 Mudança detectada em mensagens:', payload.eventType);
                    if (payload.eventType === 'INSERT') {
                        messages.unshift(payload.new);
                    } else if (payload.eventType === 'UPDATE') {
                        const index = messages.findIndex(m => m.message_id === payload.new.message_id);
                        if (index !== -1) {
                            messages[index] = payload.new;
                        } else {
                            messages.unshift(payload.new);
                        }
                    } else if (payload.eventType === 'DELETE') {
                        messages = messages.filter(m => m.message_id !== payload.old.message_id);
                    }
                    renderMessages();
                    updateStats();
                }
            )
            .subscribe((status) => {
                console.log('📡 Status do canal de mensagens:', status);
            });

        realtimeSubscriptions.push(conversationsChannel, messagesChannel);
        
        // Fallback: polling a cada 30 segundos se Realtime não funcionar
        setInterval(() => {
            fetchConversations();
            fetchMessages();
        }, 30000);
        
    } catch (error) {
        console.error('❌ Erro ao configurar Realtime:', error);
        // Fallback para polling mais frequente
        setInterval(() => {
            fetchConversations();
            fetchMessages();
        }, 5000);
    }
}

// Atualiza status de conexão
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    const dotEl = statusEl.previousElementSibling;
    
    if (connected) {
        statusEl.textContent = 'Conectado';
        dotEl.style.background = 'var(--success)';
    } else {
        statusEl.textContent = 'Desconectado';
        dotEl.style.background = 'var(--danger)';
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = 'index.html';
}

// Função showSection já definida acima como window.showSection

// Atualiza o select de conversas nas configurações
function updateConversationSelect() {
    const select = document.getElementById('conversationSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma conversa...</option>';
    
    if (conversations && conversations.length > 0) {
        conversations.forEach(conv => {
            const option = document.createElement('option');
            option.value = conv.conversation_id;
            option.textContent = `${conv.user_name || 'Sem nome'} (${conv.conversation_id})${conv.phone_number ? ' - ' + formatPhone(conv.phone_number) : ''}`;
            select.appendChild(option);
        });
    }
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

// Deleta todo o banco de dados
async function deleteAllData() {
    // Confirmação simples
    if (!confirm('⚠️ Tem certeza que deseja deletar TODOS os dados?\n\nEsta ação é irreversível!')) {
        return;
    }
    
    try {
        // Deleta todas as mensagens (usa WHERE clause para selecionar todos)
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
            showSuccess('Todos os dados foram deletados com sucesso!');
            
            // Atualiza os dados
            conversations = [];
            messages = [];
            await Promise.all([fetchConversations(), fetchMessages()]);
            updateConversationSelect();
            
            // Volta para o dashboard
            showSection('dashboard');
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

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
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
        console.warn('⚠️ Supabase SDK não disponível, usando API REST');
        supabaseClient = null;
    }
    
    // Carrega dados iniciais
    console.log('📊 Carregando dados iniciais...');
    await fetchLeadSources(); // Carrega origens primeiro
    const conversationsLoaded = await fetchConversations();
    const messagesLoaded = await fetchMessages();
    
    if (!conversationsLoaded || !messagesLoaded) {
        console.error('❌ Erro ao carregar dados iniciais');
    }
    
    // Configura atualização em tempo real
    setupRealtime();
    
    // Atualiza status de conexão
    updateConnectionStatus(true);
});

