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
let agents = [];
let selectedAgentId = null; // Agente selecionado no filtro

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
    await fetchAgents(); // Carrega agentes
    await fetchConversations();
    setupRealtime();
    updateConnectionStatus(true);
});

// Cache de origens de leads
let leadSourcesCache = {};

// Busca agentes do Supabase
async function fetchAgents() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/agents?select=id,commercial_name,full_name,status&order=commercial_name.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            agents = await response.json();
            populateAgentFilter();
            console.log(`✅ ${agents.length} agentes carregados`);
            return true;
        } else {
            console.warn('⚠️ Erro ao buscar agentes');
            return false;
        }
    } catch (error) {
        console.warn('⚠️ Erro ao buscar agentes:', error);
        return false;
    }
}

// Preenche o select de agentes
function populateAgentFilter() {
    const select = document.getElementById('agentFilter');
    if (!select) return;
    
    // Mantém a opção "Todos os agentes"
    const currentValue = select.value;
    select.innerHTML = '<option value="">Todos os agentes</option>';
    
    // Adiciona apenas agentes ativos
    agents.filter(agent => agent.status === 'Ativo').forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.id;
        option.textContent = agent.commercial_name || agent.full_name;
        select.appendChild(option);
    });
    
    // Restaura seleção anterior se ainda existir
    if (currentValue) {
        select.value = currentValue;
    }
}

// Handler para mudança de filtro de agente
function onAgentFilterChange() {
    const select = document.getElementById('agentFilter');
    if (!select) return;
    
    selectedAgentId = select.value || null;
    
    // Recarrega conversas do servidor com o novo filtro
    fetchConversations();
    
    // Limpa seleção de conversa quando muda o filtro
    selectedConversationId = null;
    document.getElementById('messagesContent').innerHTML = `
        <div class="empty-messages">
            <div class="empty-state-icon">💬</div>
            <p>Nenhuma conversa selecionada</p>
            <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Selecione uma conversa da lista ao lado para ver as mensagens</p>
        </div>
    `;
    
    console.log(`🔍 Filtro de agente alterado: ${selectedAgentId ? 'Agente específico' : 'Todos os agentes'}`);
}

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
        // Monta URL com filtro de agente se selecionado
        let url = `${SUPABASE_CONFIG.url}/rest/v1/conversations?select=*,param_lead_sources(source)`;
        
        // Adiciona filtro de agente se houver um selecionado
        if (selectedAgentId) {
            url += `&agent_id=eq.${selectedAgentId}`;
        }
        
        url += `&order=last_message_date.desc,timestamp.desc`;
        
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
            console.log(`✅ ${conversations.length} conversas carregadas${selectedAgentId ? ' (filtradas por agente)' : ''}`);
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
        
        // Mostra botões de análise
        const analysisButtons = document.getElementById('analysisButtons');
        if (analysisButtons) {
            analysisButtons.style.display = 'flex';
        }
        
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

// ========== FUNÇÕES DE ANÁLISE ==========

/**
 * Busca mensagens de uma conversa para análise
 */
async function fetchMessagesForAnalysis(conversationId) {
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
            const messagesData = await response.json();
            // Converte para formato esperado pela API
            return messagesData.map(msg => {
                // Garante que timestamp está no formato ISO string
                let timestamp = msg.timestamp || new Date().toISOString();
                // Se já é string, usa; se é objeto Date, converte
                if (timestamp instanceof Date) {
                    timestamp = timestamp.toISOString();
                } else if (typeof timestamp === 'string') {
                    // Garante formato ISO válido
                    timestamp = new Date(timestamp).toISOString();
                }
                
                return {
                    message_id: String(msg.message_id || msg.id || ''),
                    conversation_id: String(msg.conversation_id || conversationId),
                    content: String(msg.content || ''),
                    timestamp: timestamp,
                    sender: msg.sender === 'agent' ? 'agent' : 'client',
                    time: msg.time ? parseFloat(msg.time) : null,
                    order: msg.order ? parseInt(msg.order) : null
                };
            });
        } else {
            throw new Error('Erro ao buscar mensagens');
        }
    } catch (error) {
        console.error('Erro ao buscar mensagens para análise:', error);
        throw error;
    }
}

/**
 * Analisa mensagens de uma conversa
 */
async function analyzeMessages(conversationId, analysisType) {
    if (!conversationId) {
        showError('Selecione uma conversa primeiro');
        return;
    }
    
    try {
        // Mostra loading
        showInfo('Analisando mensagens...', 5000);
        
        // Busca mensagens
        const messages = await fetchMessagesForAnalysis(conversationId);
        
        if (!messages || messages.length === 0) {
            showError('Nenhuma mensagem encontrada nesta conversa');
            return;
        }
        
        // Chama API de análise
        console.log('🔗 Chamando API:', `${ANALYSIS_API_URL}/api/analysis/analyze`);
        console.log('📦 Dados:', { conversation_id: conversationId, messages_count: messages.length, analysis_type: analysisType });
        
        const response = await fetch(`${ANALYSIS_API_URL}/api/analysis/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                conversation_id: conversationId,
                messages: messages,
                analysis_type: analysisType
            })
        }).catch(error => {
            console.error('❌ Erro de rede:', error);
            throw new Error(`Erro ao conectar com a API: ${error.message}. Verifique se o servidor está rodando em ${ANALYSIS_API_URL}`);
        });
        
        if (!response.ok) {
            let errorMessage = `Erro ${response.status}`;
            try {
                const errorData = await response.json();
                console.error('❌ Erro da API:', errorData);
                // Pydantic retorna erros de validação em formato específico
                if (errorData.detail) {
                    if (Array.isArray(errorData.detail)) {
                        // Erros de validação do Pydantic
                        errorMessage = errorData.detail.map(err => {
                            return `${err.loc?.join('.')}: ${err.msg}`;
                        }).join(', ');
                    } else {
                        errorMessage = errorData.detail;
                    }
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
            } catch (e) {
                const text = await response.text().catch(() => '');
                console.error('❌ Erro ao processar resposta:', text);
            }
            throw new Error(errorMessage);
        }
        
        const result = await response.json();
        
        if (result.success) {
            displayAnalysisResult(result.result, analysisType);
            showSuccess('Análise concluída com sucesso!');
        } else {
            showError(result.error || 'Erro ao realizar análise');
        }
        
    } catch (error) {
        console.error('Erro ao analisar mensagens:', error);
        showError(`Erro ao analisar: ${error.message}`);
    }
}

/**
 * Retorna nome amigável do tipo de análise
 */
function getAnalysisTypeName(type) {
    const names = {
        'summary': 'Resumo da Conversa',
        'sentiment': 'Análise de Sentimento',
        'intent': 'Intenção de Compra',
        'lead_quality': 'Qualidade do Lead'
    };
    return names[type] || type;
}

/**
 * Formata resultado da análise para exibição
 */
function formatAnalysisResult(result, type) {
    if (!result) return '<p>Nenhum resultado disponível</p>';
    
    switch (type) {
        case 'summary':
            return formatSummaryResult(result);
        case 'sentiment':
            return formatSentimentResult(result);
        case 'intent':
            return formatIntentResult(result);
        case 'lead_quality':
            return formatLeadQualityResult(result);
        default:
            return `<pre>${JSON.stringify(result, null, 2)}</pre>`;
    }
}

/**
 * Formata resultado de resumo
 */
function formatSummaryResult(result) {
    let html = '<div class="analysis-summary">';
    
    if (result.key_info) {
        html += '<div class="analysis-section"><h4>📋 Informações Principais</h4><ul>';
        if (result.key_info.cliente) html += `<li><strong>Cliente:</strong> ${escapeHtml(result.key_info.cliente)}</li>`;
        if (result.key_info.propriedade) html += `<li><strong>Propriedade:</strong> ${escapeHtml(result.key_info.propriedade)}</li>`;
        if (result.key_info.interesse) html += `<li><strong>Interesse:</strong> ${escapeHtml(result.key_info.interesse)}</li>`;
        if (result.key_info.contato) html += `<li><strong>Contato:</strong> ${escapeHtml(result.key_info.contato)}</li>`;
        html += '</ul></div>';
    }
    
    if (result.summary) {
        html += `<div class="analysis-section"><h4>📝 Resumo</h4><p>${escapeHtml(result.summary)}</p></div>`;
    }
    
    if (result.next_steps && result.next_steps.length > 0) {
        html += '<div class="analysis-section"><h4>🎯 Próximos Passos</h4><ul>';
        result.next_steps.forEach(step => {
            html += `<li>${escapeHtml(step)}</li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
}

/**
 * Formata resultado de sentimento
 */
function formatSentimentResult(result) {
    let html = '<div class="analysis-sentiment">';
    
    const sentiment = result.sentiment || 'neutral';
    const score = result.score || 0;
    const scorePercent = Math.round((score + 1) * 50); // Converte -1 a 1 para 0 a 100
    
    html += `<div class="sentiment-score">
        <span class="sentiment-badge sentiment-${sentiment}">${sentiment.toUpperCase()}</span>
        <span class="sentiment-value">${scorePercent}%</span>
    </div>`;
    
    if (result.indicators && result.indicators.length > 0) {
        html += '<div class="analysis-section"><h4>📊 Indicadores</h4><ul>';
        result.indicators.forEach(indicator => {
            html += `<li>${escapeHtml(indicator)}</li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
}

/**
 * Formata resultado de intenção
 */
function formatIntentResult(result) {
    let html = '<div class="analysis-intent">';
    
    const intent = result.intent || 'low';
    const confidence = Math.round((result.confidence || 0) * 100);
    const urgency = result.urgency || 'low';
    
    html += `<div class="intent-metrics">
        <div class="intent-item">
            <span class="intent-label">Intenção:</span>
            <span class="intent-badge intent-${intent}">${intent.toUpperCase()}</span>
        </div>
        <div class="intent-item">
            <span class="intent-label">Confiança:</span>
            <span class="intent-value">${confidence}%</span>
        </div>
        <div class="intent-item">
            <span class="intent-label">Urgência:</span>
            <span class="intent-badge intent-${urgency}">${urgency.toUpperCase()}</span>
        </div>
    </div>`;
    
    if (result.reasons && result.reasons.length > 0) {
        html += '<div class="analysis-section"><h4>💡 Razões</h4><ul>';
        result.reasons.forEach(reason => {
            html += `<li>${escapeHtml(reason)}</li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
}

/**
 * Formata resultado de qualidade do lead
 */
function formatLeadQualityResult(result) {
    let html = '<div class="analysis-lead-quality">';
    
    const quality = result.quality || 'cold';
    const score = result.score || 0;
    
    html += `<div class="lead-quality-header">
        <span class="lead-quality-badge lead-quality-${quality}">${quality.toUpperCase()}</span>
        <span class="lead-quality-score">Score: ${score}/100</span>
    </div>`;
    
    if (result.reasons && result.reasons.length > 0) {
        html += '<div class="analysis-section"><h4>📌 Razões</h4><ul>';
        result.reasons.forEach(reason => {
            html += `<li>${escapeHtml(reason)}</li>`;
        });
        html += '</ul></div>';
    }
    
    if (result.follow_up_suggestions && result.follow_up_suggestions.length > 0) {
        html += '<div class="analysis-section"><h4>💼 Sugestões de Follow-up</h4><ul>';
        result.follow_up_suggestions.forEach(suggestion => {
            html += `<li>${escapeHtml(suggestion)}</li>`;
        });
        html += '</ul></div>';
    }
    
    html += '</div>';
    return html;
}

/**
 * Exibe resultado da análise em um modal
 */
function displayAnalysisResult(result, analysisType) {
    // Remove modal existente se houver
    const existingModal = document.getElementById('analysisModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Cria modal
    const modal = document.createElement('div');
    modal.id = 'analysisModal';
    modal.className = 'analysis-modal';
    
    const typeName = getAnalysisTypeName(analysisType);
    const formattedResult = formatAnalysisResult(result, analysisType);
    
    modal.innerHTML = `
        <div class="modal-content analysis-modal-content">
            <div class="modal-header">
                <h3>${typeName}</h3>
                <button class="modal-close" onclick="closeAnalysisModal()">×</button>
            </div>
            <div class="modal-body analysis-modal-body">
                ${formattedResult}
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Fecha ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeAnalysisModal();
        }
    });
}

/**
 * Fecha o modal de análise
 */
function closeAnalysisModal() {
    const modal = document.getElementById('analysisModal');
    if (modal) {
        modal.remove();
    }
}

