// Página de Conversas (Estilo Outlook)

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../index.html';
}

// Supabase Client
let supabaseClient = null;
let conversations = [];
let messages = [];
let selectedConversationId = null;
let realtimeSubscriptions = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('💬 Página de Conversas carregada');
    
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
    await fetchLeadSources(); // Carrega origens primeiro
    await fetchConversations();
    setupRealtime();
    updateConnectionStatus(true);
});

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
            // Cache padrão caso não consiga buscar
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
        const url = `${SUPABASE_CONFIG.url}/rest/v1/conversations?select=*,param_lead_sources(source)&order=last_message_date.desc,timestamp.desc`;
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
            console.log(`✅ ${conversations.length} conversas carregadas`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar conversas:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar conversas</p>
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
            </div>
        `;
        return false;
    }
}

// Busca mensagens de uma conversa
async function fetchMessages(conversationId) {
    const container = document.getElementById('messagesContent');
    if (!container) return false;
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/messages?select=*&conversation_id=eq.${encodeURIComponent(conversationId)}&order=timestamp.asc`;
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

// Renderiza lista de conversas
function renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
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
    
    container.innerHTML = filtered.map(conv => {
        const isActive = conv.conversation_id === selectedConversationId;
        return `
            <div class="conversation-item ${isActive ? 'active' : ''}" onclick="selectConversation('${conv.conversation_id}')">
                <div class="conversation-item-avatar">💬</div>
                <div class="conversation-item-content">
                    <div class="conversation-item-header">
                        <span class="conversation-item-name">${conv.user_name || 'Sem nome'}</span>
                        <span class="conversation-item-time">${formatDate(conv.last_message_date || conv.timestamp)}</span>
                    </div>
                    <div class="conversation-item-preview">
                        ${conv.phone_number ? formatPhone(conv.phone_number) : 'Sem Telefone'}
                        ${conv.lead_source ? ` • 🏠 ${conv.lead_source}` : ' • 🏠 Outro'}
                    </div>
                    <div class="conversation-item-meta">
                        ${conv.has_unread ? `<span class="conversation-item-badge badge-unread">${conv.unread_count || 0} não lidas</span>` : '<span class="conversation-item-badge badge-read">Lida</span>'}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Renderiza mensagens
function renderMessages() {
    const container = document.getElementById('messagesContent');
    if (!container) return;
    
    const searchInput = document.getElementById('searchMessages');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    
    let filtered = messages || [];
    if (searchTerm) {
        filtered = filtered.filter(msg => 
            (msg.content || '').toLowerCase().includes(searchTerm) ||
            (msg.sender || '').toLowerCase().includes(searchTerm)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-messages">
                <div class="empty-state-icon">📨</div>
                <p>${searchTerm ? 'Nenhuma mensagem encontrada' : 'Nenhuma mensagem nesta conversa'}</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filtered.map(msg => `
        <div class="message-item">
            <div class="message-header">
                <div class="message-sender-info">
                    <span class="message-sender ${msg.sender === 'client' ? 'sender-client' : 'sender-agent'}">
                        ${msg.sender === 'client' ? '👤 Cliente' : '🤖 Agente'}
                    </span>
                </div>
                <span class="message-time">${formatDate(msg.timestamp)}</span>
            </div>
            <div class="message-content">${escapeHtml(msg.content || '')}</div>
        </div>
    `).join('');
    
    // Scroll para o final
    container.scrollTop = container.scrollHeight;
}

// Seleciona uma conversa
async function selectConversation(conversationId) {
    selectedConversationId = conversationId;
    const conversation = conversations.find(c => c.conversation_id === conversationId);
    
    if (conversation) {
        // Atualiza header
        document.getElementById('conversationTitle').textContent = conversation.user_name || 'Sem nome';
        const phoneText = conversation.phone_number 
            ? `📞 ${formatPhone(conversation.phone_number)}`
            : 'Sem Telefone';
        const leadSource = conversation.lead_source || 'Outro';
        const subtitle = `${phoneText} • 🏠 ${leadSource}`;
        document.getElementById('conversationSubtitle').textContent = subtitle;
        
        // Carrega mensagens
        await fetchMessages(conversationId);
        
        // Atualiza lista de conversas (destaca a selecionada)
        renderConversations();
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

// Formata data
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 7) return `${days}d atrás`;
    
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Filtra conversas
function filterConversations() {
    renderConversations();
}

// Filtra mensagens
function filterMessages() {
    renderMessages();
}

// Atualiza conversas
function refreshConversations() {
    fetchConversations();
}

// Configura Supabase Realtime
function setupRealtime() {
    if (!supabaseClient) {
        console.log('📡 Usando polling (Supabase SDK não disponível)');
        setInterval(() => {
            fetchConversations();
            if (selectedConversationId) {
                fetchMessages(selectedConversationId);
            }
        }, 5000);
        return;
    }
    
    try {
        // Remove canais antigos se existirem
        realtimeSubscriptions.forEach(sub => {
            try {
                supabaseClient.removeChannel(sub);
            } catch (e) {
                console.warn('Aviso ao remover canal:', e);
            }
        });
        realtimeSubscriptions = [];
        
        // Canal para conversas
        const conversationsChannel = supabaseClient
            .channel('conversations-changes-' + Date.now())
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'conversations' 
                }, 
                (payload) => {
                    console.log('🔄 Mudança detectada em conversas:', payload.eventType, payload);
                    fetchConversations().then(() => {
                        // Se a conversa selecionada foi atualizada, recarrega mensagens
                        if (selectedConversationId && payload.new && payload.new.conversation_id === selectedConversationId) {
                            fetchMessages(selectedConversationId);
                        }
                    });
                }
            )
            .subscribe((status) => {
                console.log('📡 Status do canal de conversas:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Canal de conversas inscrito com sucesso');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Erro no canal de conversas');
                }
            });
        
        realtimeSubscriptions.push(conversationsChannel);
        
        // Canal para mensagens
        const messagesChannel = supabaseClient
            .channel('messages-changes-' + Date.now())
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'messages' 
                }, 
                (payload) => {
                    console.log('🔄 Mudança detectada em mensagens:', payload.eventType, payload);
                    if (selectedConversationId) {
                        const msgConversationId = payload.new?.conversation_id || payload.old?.conversation_id;
                        if (msgConversationId === selectedConversationId) {
                            fetchMessages(selectedConversationId);
                        }
                    }
                    // Sempre atualiza a lista de conversas para atualizar última mensagem
                    fetchConversations();
                }
            )
            .subscribe((status) => {
                console.log('📡 Status do canal de mensagens:', status);
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Canal de mensagens inscrito com sucesso');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Erro no canal de mensagens');
                }
            });
        
        realtimeSubscriptions.push(messagesChannel);
        
        console.log('✅ Realtime configurado');
    } catch (error) {
        console.error('❌ Erro ao configurar Realtime:', error);
        // Fallback para polling em caso de erro
        console.log('📡 Usando polling como fallback');
        setInterval(() => {
            fetchConversations();
            if (selectedConversationId) {
                fetchMessages(selectedConversationId);
            }
        }, 5000);
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

// Logout
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = '../index.html';
}

