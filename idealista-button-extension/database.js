// ============================================================================
// MÓDULO DE BANCO DE DADOS
// ============================================================================

/**
 * Configuração do banco de dados
 * Opções:
 * 1. Supabase (via REST API) - RECOMENDADO
 * 2. API REST simples
 */
const DB_CONFIG = {
    // Para usar API REST simples, defina a URL da sua API
    apiUrl: 'https://sua-api.com/api/conversations',
    
    // Para usar Supabase, defina as credenciais
    supabase: {
        url: 'https://bhguniomuytyzrfcpbeo.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3VuaW9tdXl0eXpyZmNwYmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDAxNTQsImV4cCI6MjA4MjU3NjE1NH0.cLEcnoEXy4dANZya-pr3PYIYrgwE8eDFbULl8r0-ybM'
    },
    
    // Modo: 'rest' ou 'supabase'
    mode: 'supabase'
};

/**
 * Fetch com timeout
 * @param {string} url - URL para fazer requisição
 * @param {Object} options - Opções do fetch
 * @param {number} timeout - Timeout em milissegundos (padrão: 10000)
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout após ${timeout}ms`);
        }
        throw error;
    }
}

/**
 * Detecta o ID da origem do lead baseado na URL
 * @param {string} url - URL da página
 * @returns {number} ID da origem (1 = Idealista, 2 = Outro)
 */
function detectLeadSourceId(url) {
    if (!url) return 2; // Outro
    
    const urlLower = url.toLowerCase();
    
    // Detecta Idealista
    if (urlLower.includes('idealista')) {
        return 1; // Idealista
    }
    
    // Adicione outros sites aqui conforme necessário
    // if (urlLower.includes('outro-site')) {
    //     return 3; // Outro Site (precisa ser criado na tabela lead_sources)
    // }
    
    return 2; // Outro
}

/**
 * Estrutura de dados de uma conversa
 */
class Conversation {
    constructor(data) {
        this.conversationId = data.conversationId || '';
        this.userName = data.userName || '';
        this.phoneNumber = data.phoneNumber || '';
        this.lastMessage = data.lastMessage || '';
        this.lastMessageDate = data.lastMessageDate || '';
        this.adInfo = data.adInfo || '';
        this.adImageUrl = data.adImageUrl || '';
        this.timestamp = data.timestamp || new Date().toISOString();
        this.createdAt = data.createdAt || new Date().toISOString();
        this.url = data.url || window.location.href;
        this.isRead = data.isRead || false;
        this.unreadCount = data.unreadCount || 0;
        this.hasUnread = data.hasUnread || false;
        this.metadata = data.metadata || {};
        this.leadSourceId = data.leadSourceId || detectLeadSourceId(this.url);
        this.propertyUrl = data.propertyUrl || null; // URL do anúncio extraída da primeira mensagem
        this.isLead = data.isLead !== undefined ? data.isLead : null; // NULL até que seja possível determinar
        this.agentIaPhoneRequested = data.agentIaPhoneRequested || false; // Indica se Agente IA já solicitou telefone
        this.prefersPhoneCall = data.prefersPhoneCall || false; // Indica se cliente prefere ligação ao invés de WhatsApp
    }

    toJSON() {
        return {
            conversationId: this.conversationId,
            userName: this.userName,
            phoneNumber: this.phoneNumber,
            lastMessage: this.lastMessage,
            lastMessageDate: this.lastMessageDate,
            adInfo: this.adInfo,
            adImageUrl: this.adImageUrl,
            timestamp: this.timestamp,
            createdAt: this.createdAt,
            url: this.url,
            isRead: this.isRead,
            unreadCount: this.unreadCount,
            hasUnread: this.hasUnread,
            metadata: this.metadata,
            leadSourceId: this.leadSourceId,
            propertyUrl: this.propertyUrl,
            isLead: this.isLead,
            agentIaPhoneRequested: this.agentIaPhoneRequested,
            prefersPhoneCall: this.prefersPhoneCall
        };
    }
}

/**
 * Estrutura de dados de uma mensagem do chat
 */
class ChatMessage {
    constructor(data) {
        this.messageId = data.messageId || '';
        this.conversationId = data.conversationId || '';
        this.content = data.content || '';
        this.timestamp = data.timestamp || new Date().toISOString();
        this.sender = data.sender || 'unknown'; // 'client' ou 'agent'
        this.time = data.time || '';
        this.order = data.order !== undefined ? data.order : 0; // Ordem de exibição na página
    }

    toJSON() {
        return {
            messageId: this.messageId,
            conversationId: this.conversationId,
            content: this.content,
            timestamp: this.timestamp,
            sender: this.sender,
            time: this.time,
            order: this.order
        };
    }
}

/**
 * Salva uma conversa no banco de dados
 * @param {Conversation} conversation - Objeto Conversation
 * @returns {Promise<boolean>} Sucesso
 */
async function saveConversation(conversation) {
    try {
        const data = conversation.toJSON();
        
        if (DB_CONFIG.mode === 'rest') {
            return await saveToRESTAPI(data);
        } else if (DB_CONFIG.mode === 'supabase') {
            return await saveToSupabase(data);
        }
        
        console.error('❌ Modo de banco de dados não configurado. Configure DB_CONFIG.mode como "rest" ou "supabase"');
        return false;
    } catch (error) {
        console.error('❌ Erro ao salvar conversa:', error);
        return false;
    }
}


/**
 * Salva via API REST
 */
async function saveToRESTAPI(data) {
    if (!DB_CONFIG.apiUrl || DB_CONFIG.apiUrl.includes('sua-api.com')) {
        console.error('❌ API URL não configurada. Configure DB_CONFIG.apiUrl');
        return false;
    }

    try {
        const response = await fetch(DB_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            console.log('✅ Conversa salva na API:', data.conversationId);
            return true;
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('❌ Erro ao salvar na API:', error);
        return false;
    }
}

/**
 * Salva no Supabase via REST API
 */
async function saveToSupabase(data) {
    if (!DB_CONFIG.supabase.url || DB_CONFIG.supabase.url.includes('SEU_PROJECT_ID') || !DB_CONFIG.supabase.anonKey || DB_CONFIG.supabase.anonKey.includes('SUA_ANON_KEY')) {
        console.error('❌ Supabase não configurado. Configure DB_CONFIG.supabase.url e DB_CONFIG.supabase.anonKey');
        return false;
    }

    try {
        const url = `${DB_CONFIG.supabase.url}/rest/v1/conversations`;
        
        // VERIFICA SE A CONVERSA JÁ EXISTE ANTES DE SALVAR
        const exists = await conversationExistsInSupabase(data.conversationId);
        
        if (exists) {
            // Busca a conversa existente
            const getUrl = `${DB_CONFIG.supabase.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(data.conversationId)}&select=*&limit=1`;
            const getResponse = await fetch(getUrl, {
                method: 'GET',
                headers: {
                    'apikey': DB_CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (getResponse.ok) {
                const existingData = await getResponse.json();
                if (existingData && existingData.length > 0) {
                    const existing = existingData[0];
                    const existingPhoneNumber = existing.phone_number || '';
                    const hasExistingPhone = existingPhoneNumber && existingPhoneNumber.trim().length > 0;
                    const hasNewPhone = data.phoneNumber && data.phoneNumber.trim().length > 0;
                    
                    console.log('🔍 Verificação antes de salvar conversa existente:', {
                        conversationId: data.conversationId,
                        hasExistingPhone,
                        hasNewPhone,
                        existingPhoneNumber: existingPhoneNumber || '(vazio)',
                        newPhoneNumber: data.phoneNumber || '(vazio)'
                    });
                    
                    // PROTEÇÃO: Se já existe e tem phoneNumber, NUNCA atualiza
                    if (hasExistingPhone) {
                        console.log('🔒 Conversa já existe com phoneNumber, não será atualizada. PhoneNumber protegido:', existingPhoneNumber);
                        return true;
                    }
                    
                    // Se existe mas não tem phoneNumber e agora temos, atualiza apenas o phoneNumber
                    if (hasNewPhone && !hasExistingPhone) {
                        console.log('📞 Conversa existe mas sem phoneNumber, atualizando apenas phoneNumber:', data.conversationId);
                        return await updateConversationInSupabase(data.conversationId, { phoneNumber: data.phoneNumber });
                    }
                    
                    // Se existe mas não tem phoneNumber e o novo também está vazio, não atualiza
                    if (!hasNewPhone && !hasExistingPhone) {
                        console.log('ℹ️ Conversa já existe no Supabase sem phoneNumber, e novo também está vazio. Não será atualizada:', data.conversationId);
                        return true;
                    }
                }
            }
        }
        
        // Se não existe, cria nova conversa
        console.log('🔥 Criando nova conversa no Supabase:', {
            conversationId: data.conversationId,
            userName: data.userName,
            hasPhoneNumber: !!(data.phoneNumber && data.phoneNumber.trim())
        });
        
        // Prepara dados para Supabase (converte nomes de campos para snake_case)
        const supabaseData = {
            conversation_id: data.conversationId,
            user_name: data.userName || '',
            phone_number: data.phoneNumber && data.phoneNumber.trim() ? data.phoneNumber.trim() : null,
            last_message: data.lastMessage || '',
            last_message_date: data.lastMessageDate && data.lastMessageDate.trim() ? convertToSupabaseTimestamp(data.lastMessageDate) : null,
            ad_info: data.adInfo || '',
            ad_image_url: data.adImageUrl || '',
            timestamp: convertToSupabaseTimestamp(data.timestamp),
            created_at: convertToSupabaseTimestamp(data.createdAt),
            url: data.url || '',
            is_read: data.isRead || false,
            unread_count: data.unreadCount || 0,
            has_unread: data.hasUnread || false,
            lead_source_id: data.leadSourceId || detectLeadSourceId(data.url), // ID da origem do lead detectada automaticamente
            property_url: data.propertyUrl || null, // URL do anúncio extraída da primeira mensagem
            is_lead: data.isLead !== undefined ? data.isLead : null, // NULL até que seja possível determinar
            agent_ia_phone_requested: data.agentIaPhoneRequested || false, // Indica se Agente IA já solicitou telefone
            prefers_phone_call: data.prefersPhoneCall || false // Indica se cliente prefere ligação ao invés de WhatsApp
        };
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': DB_CONFIG.supabase.anonKey,
                'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(supabaseData)
        });

        if (response.ok) {
            // Log removido - já existe log semelhante em content.js
            return true;
        } else {
            const errorText = await response.text();
            
            try {
                const errorJson = JSON.parse(errorText);
                
                // Erro 409 = Conversa já existe (não é um erro crítico)
                if (response.status === 409) {
                    // Verifica se precisa atualizar phoneNumber
                    const hasNewPhone = data.phoneNumber && data.phoneNumber.trim().length > 0;
                    
                    if (hasNewPhone) {
                        // Busca a conversa existente para verificar se tem phoneNumber
                        const getUrl = `${DB_CONFIG.supabase.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(data.conversationId)}&select=phone_number&limit=1`;
                        const getResponse = await fetch(getUrl, {
                            method: 'GET',
                            headers: {
                                'apikey': DB_CONFIG.supabase.anonKey,
                                'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        if (getResponse.ok) {
                            const existingData = await getResponse.json();
                            if (existingData && existingData.length > 0) {
                                const existingPhone = existingData[0].phone_number || '';
                                const hasExistingPhone = existingPhone && existingPhone.trim().length > 0;
                                
                                // Só atualiza se não tiver phoneNumber existente
                                if (!hasExistingPhone) {
                                    console.log('📞 Conversa já existe sem phoneNumber, atualizando phoneNumber:', data.conversationId);
                                    return await updateConversationInSupabase(data.conversationId, { phoneNumber: data.phoneNumber });
                                } else {
                                    console.log('ℹ️ Conversa já existe no Supabase (phoneNumber protegido):', data.conversationId);
                                    return true;
                                }
                            }
                        }
                    }
                    
                    // Conversa já existe e não precisa atualizar
                    console.log('ℹ️ Conversa já existe no Supabase:', data.conversationId);
                    return true;
                }
                
                // Outros erros são críticos
                console.error('❌ Erro HTTP ao salvar no Supabase:', response.status, response.statusText);
                console.error('Resposta do servidor:', errorText);
                console.error('Erro detalhado:', errorJson);
                
                if (response.status === 403 || response.status === 401) {
                    console.error('🔒 ERRO DE PERMISSÃO: Verifique as políticas RLS (Row Level Security) do Supabase.');
                    console.error('💡 SOLUÇÃO: Configure as políticas RLS para permitir INSERT na tabela conversations');
                }
            } catch (e) {
                // Não é JSON
                console.error('❌ Erro HTTP ao salvar no Supabase:', response.status, response.statusText);
                console.error('Resposta do servidor:', errorText);
            }
            
            // Só lança erro se não for 409 (que já foi tratado)
            if (response.status !== 409) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return true; // 409 já foi tratado como sucesso
        }
    } catch (error) {
        console.error('❌ Erro ao salvar no Supabase:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
}

/**
 * Converte timestamp para formato Supabase (PostgreSQL timestamp)
 */
function convertToSupabaseTimestamp(isoString) {
    if (!isoString) {
        return new Date().toISOString();
    }
    
    // Se já é uma string ISO válida, retorna como está
    if (typeof isoString === 'string' && isoString.includes('T')) {
        try {
            const date = new Date(isoString);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
            // Continua para tentar outros formatos
        }
    }
    
    // Tenta parsear formatos brasileiros
    const brazilianDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/;
    const brazilianMatch = String(isoString).match(brazilianDatePattern);
    if (brazilianMatch) {
        try {
            const day = parseInt(brazilianMatch[1], 10);
            const month = parseInt(brazilianMatch[2], 10) - 1;
            const year = parseInt(brazilianMatch[3], 10);
            const hours = brazilianMatch[4] ? parseInt(brazilianMatch[4], 10) : 0;
            const minutes = brazilianMatch[5] ? parseInt(brazilianMatch[5], 10) : 0;
            
            const date = new Date(year, month, day, hours, minutes, 0, 0);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
            // Continua para fallback
        }
    }
    
    // Se for um objeto Date, converte para ISO
    if (isoString instanceof Date) {
        return isoString.toISOString();
    }
    
    // Fallback: retorna timestamp atual
    return new Date().toISOString();
}


/**
 * Salva mensagens do chat no Supabase
 * @param {Array<ChatMessage>} messages - Array de mensagens
 * @returns {Promise<boolean>} Sucesso
 */
async function saveMessagesToSupabase(messages) {
    if (!DB_CONFIG.supabase.url || DB_CONFIG.supabase.url.includes('SEU_PROJECT_ID') || !DB_CONFIG.supabase.anonKey || DB_CONFIG.supabase.anonKey.includes('SUA_ANON_KEY')) {
        console.error('❌ Supabase não configurado. Configure DB_CONFIG.supabase.url e DB_CONFIG.supabase.anonKey');
        return false;
    }

    // Valida URL do Supabase
    try {
        new URL(DB_CONFIG.supabase.url);
    } catch (urlError) {
        console.error('❌ URL do Supabase inválida:', DB_CONFIG.supabase.url);
        return false;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.error('❌ Array de mensagens inválido ou vazio');
        return false;
    }

    try {
        const conversationId = messages[0]?.conversationId;
        if (!conversationId) {
            console.error('❌ Conversation ID não encontrado nas mensagens');
            return false;
        }

        let savedCount = 0;
        let skippedCount = 0;

        // Salva cada mensagem
        for (const message of messages) {
            const messageId = message.messageId || `${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Verifica se a mensagem já existe
            const checkUrl = `${DB_CONFIG.supabase.url}/rest/v1/messages?message_id=eq.${encodeURIComponent(messageId)}&select=message_id&limit=1`;
            
            let messageExists = false;
            try {
                const checkResponse = await fetchWithTimeout(checkUrl, {
                    method: 'GET',
                    headers: {
                        'apikey': DB_CONFIG.supabase.anonKey,
                        'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                        'Content-Type': 'application/json'
                    }
                }, 5000); // 5 segundos de timeout
                
                if (checkResponse.ok) {
                    const existing = await checkResponse.json();
                    if (existing && existing.length > 0) {
                        // Log removido para reduzir ruído
                        skippedCount++;
                        messageExists = true;
                    }
                } else if (checkResponse.status === 404) {
                    // Mensagem não existe, pode continuar
                    messageExists = false;
                } else {
                    console.warn('⚠️ Erro ao verificar se mensagem existe:', checkResponse.status, checkResponse.statusText);
                    // Continua tentando salvar mesmo com erro na verificação
                }
            } catch (checkError) {
                if (checkError.message && checkError.message.includes('Failed to fetch')) {
                    console.warn('⚠️ Erro de rede ao verificar mensagem existente: Erro de conexão (Failed to fetch). Verifique sua conexão com a internet.');
                } else if (checkError.message && checkError.message.includes('timeout')) {
                    console.warn('⚠️ Erro de rede ao verificar mensagem existente: Timeout na requisição.');
                } else {
                    console.warn('⚠️ Erro de rede ao verificar mensagem existente:', checkError.message || checkError);
                }
                // Continua tentando salvar mesmo com erro na verificação
            }
            
            if (messageExists) {
                continue;
            }
            
            // Prepara dados para Supabase (snake_case)
            const supabaseData = {
                message_id: messageId,
                conversation_id: message.conversationId,
                content: message.content || '',
                timestamp: convertToSupabaseTimestamp(message.timestamp),
                sender: message.sender || 'unknown',
                time: message.time || '',
                order: message.order !== undefined ? message.order : 0
            };
            
            const url = `${DB_CONFIG.supabase.url}/rest/v1/messages`;
            
            try {
                const response = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: {
                        'apikey': DB_CONFIG.supabase.anonKey,
                        'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(supabaseData)
                }, 10000); // 10 segundos de timeout

                if (response.ok) {
                    savedCount++;
                    console.log('✅ Mensagem salva:', messageId);
                } else {
                    const errorText = await response.text();
                    let isDuplicate = false;
                    
                    try {
                        const errorJson = JSON.parse(errorText);
                        
                        // Erro 409 = Mensagem já existe (não é um erro crítico)
                        if (response.status === 409) {
                            isDuplicate = true;
                            skippedCount++;
                            // Log removido para reduzir ruído
                        } else {
                            // Outros erros são críticos
                            console.warn('⚠️ Erro ao salvar mensagem:', messageId, response.status);
                            console.warn('Erro detalhado:', errorJson);
                        }
                    } catch (e) {
                        // Não é JSON
                        if (response.status === 409) {
                            isDuplicate = true;
                            skippedCount++;
                            // Log removido para reduzir ruído
                        } else {
                            console.warn('⚠️ Erro ao salvar mensagem:', messageId, response.status);
                            console.warn('Erro texto:', errorText.substring(0, 200));
                        }
                    }
                    
                    // Se for duplicata, pula para próxima mensagem
                    if (isDuplicate) {
                        continue;
                    }
                }
            } catch (fetchError) {
                // Erro de rede (Failed to fetch)
                console.error('❌ Erro de rede ao salvar mensagem:', messageId);
                console.error('Tipo de erro:', fetchError.name);
                console.error('Mensagem:', fetchError.message);
                console.error('URL tentada:', url);
                
                // Verifica se é erro de CORS
                if (fetchError.message.includes('CORS') || fetchError.message.includes('cors')) {
                    console.error('🔒 ERRO DE CORS: Verifique as configurações CORS do Supabase');
                }
                
                // Verifica se é erro de rede
                if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                    console.error('🌐 ERRO DE REDE: Verifique sua conexão com a internet e a URL do Supabase');
                    console.error('URL configurada:', DB_CONFIG.supabase.url);
                }
                
                // Continua para próxima mensagem em vez de parar tudo
                continue;
            }
        }

        if (savedCount > 0 || skippedCount > 0) {
            console.log(`✅ ${savedCount} novas mensagens salvas, ${skippedCount} duplicadas puladas de ${messages.length} total para conversa ${conversationId}`);
        }
        
        // Após salvar todas as mensagens, atualiza o last_message_date da conversa
        // com o timestamp da mensagem mais recente
        if (messages.length > 0 && typeof updateConversationInSupabase === 'function') {
            // Encontra a mensagem com o timestamp mais recente
            let latestMessage = messages[0];
            for (const msg of messages) {
                if (msg.timestamp) {
                    const msgDate = new Date(msg.timestamp);
                    const latestDate = new Date(latestMessage.timestamp || 0);
                    if (msgDate > latestDate) {
                        latestMessage = msg;
                    }
                }
            }
            
            // Atualiza a conversa com o timestamp da mensagem mais recente
            if (latestMessage.timestamp) {
                try {
                    await updateConversationInSupabase(conversationId, {
                        lastMessageDate: latestMessage.timestamp
                    });
                    console.log('✅ last_message_date atualizado com timestamp da mensagem mais recente:', latestMessage.timestamp);
                } catch (err) {
                    console.warn('⚠️ Erro ao atualizar last_message_date após salvar mensagens:', err);
                }
            }
        }
        
        return savedCount > 0;
    } catch (error) {
        console.error('❌ Erro ao salvar mensagens no Supabase:', error);
        console.error('Tipo de erro:', error.name);
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        
        // Informações adicionais para debug
        if (messages && messages.length > 0) {
            console.error('Conversa ID:', messages[0]?.conversationId);
            console.error('Total de mensagens:', messages.length);
        }
        
        return false;
    }
}

/**
 * Salva mensagens do chat
 * @param {Array<ChatMessage>} messages - Array de mensagens
 * @returns {Promise<boolean>} Sucesso
 */
async function saveChatMessages(messages) {
    if (!messages || messages.length === 0) return false;

    try {
        if (DB_CONFIG.mode === 'supabase') {
            return await saveMessagesToSupabase(messages);
        } else if (DB_CONFIG.mode === 'rest') {
            console.warn('⚠️ Modo REST não suporta salvamento de mensagens. Use Supabase.');
            return false;
        }
        
        console.error('❌ Modo de banco de dados não configurado. Configure DB_CONFIG.mode como "supabase"');
        return false;
    } catch (error) {
        console.error('❌ Erro ao salvar mensagens:', error);
        return false;
    }
}


/**
 * Atualiza uma conversa existente (atualiza apenas campos específicos)
 * @param {string} conversationId - ID da conversa
 * @param {Object} updates - Campos para atualizar (ex: { phoneNumber: '...', lastMessage: '...' })
 * @returns {Promise<boolean>} Se foi atualizado com sucesso
 */
async function updateConversation(conversationId, updates) {
    if (!conversationId || !updates || Object.keys(updates).length === 0) {
        return false;
    }

    try {
        if (DB_CONFIG.mode === 'supabase') {
            return await updateConversationInSupabase(conversationId, updates);
        } else if (DB_CONFIG.mode === 'rest') {
            console.warn('⚠️ Modo REST não suporta atualização de conversas. Use Supabase.');
            return false;
        }
        
        console.error('❌ Modo de banco de dados não configurado. Configure DB_CONFIG.mode como "supabase"');
        return false;
    } catch (error) {
        console.error('❌ Erro ao atualizar conversa:', error);
        return false;
    }
}

/**
 * Atualiza conversa no Supabase
 */
async function updateConversationInSupabase(conversationId, updates) {
    if (!DB_CONFIG.supabase.url || DB_CONFIG.supabase.url.includes('SEU_PROJECT_ID') || !DB_CONFIG.supabase.anonKey || DB_CONFIG.supabase.anonKey.includes('SUA_ANON_KEY')) {
        console.error('❌ Supabase não configurado. Configure DB_CONFIG.supabase.url e DB_CONFIG.supabase.anonKey');
        return false;
    }

    try {
        const url = `${DB_CONFIG.supabase.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(conversationId)}`;
        
        // Primeiro, busca o documento atual para verificar campos existentes
        let currentPhoneNumber = null;
        let currentUserName = null;
        let currentData = null;
        try {
            const getResponse = await fetch(`${DB_CONFIG.supabase.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(conversationId)}&select=*&limit=1`, {
                method: 'GET',
                headers: {
                    'apikey': DB_CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (getResponse.ok) {
                const data = await getResponse.json();
                if (data && data.length > 0) {
                    currentData = data[0];
                    currentPhoneNumber = currentData.phone_number || '';
                    currentUserName = currentData.user_name || '';
                    console.log('📞 PhoneNumber atual no DB:', currentPhoneNumber || '(vazio)');
                    console.log('👤 UserName atual no DB:', currentUserName || '(vazio)');
                }
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível buscar documento atual:', e);
        }
        
        // Constrói os campos para atualizar (em snake_case para Supabase)
        const supabaseUpdates = {};
        
        // Regra: phoneNumber só atualiza se:
        // 1. O novo valor não está vazio E
        // 2. O valor atual está vazio/null/string vazia
        if (updates.phoneNumber !== undefined) {
            const newPhoneNumber = String(updates.phoneNumber || '').trim();
            const currentPhone = (currentPhoneNumber || '').trim();
            const hasCurrentValue = currentPhone && currentPhone.length > 0;
            const hasNewValue = newPhoneNumber && newPhoneNumber.length > 0;
            
            console.log('🔍 Verificação phoneNumber:', {
                newPhoneNumber: newPhoneNumber || '(vazio)',
                currentPhone: currentPhone || '(vazio)',
                hasCurrentValue,
                hasNewValue
            });
            
            if (hasNewValue && !hasCurrentValue) {
                supabaseUpdates.phone_number = newPhoneNumber;
                console.log('✅ Atualizando phoneNumber de vazio para:', newPhoneNumber);
            } else if (hasNewValue && hasCurrentValue) {
                console.log('ℹ️ PhoneNumber já existe, mantendo valor atual:', currentPhone);
            } else if (!hasNewValue && hasCurrentValue) {
                console.log('🔒 PhoneNumber atual protegido, não será sobrescrito para vazio. Valor atual:', currentPhone);
            } else {
                console.log('ℹ️ PhoneNumber vazio, não atualizando');
            }
        }
        
        // Regra: userName só atualiza se:
        // 1. O novo valor não está vazio E
        // 2. O valor atual está vazio/null
        if (updates.userName !== undefined) {
            const newUserName = String(updates.userName || '').trim();
            const currentUser = (currentUserName || '').trim();
            
            if (newUserName && !currentUser) {
                supabaseUpdates.user_name = newUserName;
                console.log('✅ Atualizando userName de vazio para:', newUserName);
            } else if (newUserName && currentUser) {
                console.log('ℹ️ UserName já existe, mantendo valor atual:', currentUser);
            } else if (!newUserName && currentUser) {
                console.log('🔒 UserName atual protegido, não será sobrescrito para vazio');
            } else {
                console.log('ℹ️ UserName vazio, não atualizando');
            }
        }
        
        // Regra: agent_ia_phone_requested pode ser atualizado para true
        if (updates.agentIaPhoneRequested !== undefined) {
            supabaseUpdates.agent_ia_phone_requested = updates.agentIaPhoneRequested;
            console.log('🤖 Atualizando agent_ia_phone_requested para:', updates.agentIaPhoneRequested);
        }

        // Regra: prefers_phone_call pode ser atualizado
        if (updates.prefersPhoneCall !== undefined) {
            supabaseUpdates.prefers_phone_call = updates.prefersPhoneCall;
            console.log('📞 Atualizando prefers_phone_call para:', updates.prefersPhoneCall);
        }
        
        // Regra: lastMessage só atualiza se mudou
        if (updates.lastMessage !== undefined) {
            const newLastMessage = String(updates.lastMessage || '').trim();
            const currentLastMessage = (currentData?.last_message || '').trim();
            
            if (newLastMessage && newLastMessage !== currentLastMessage) {
                supabaseUpdates.last_message = newLastMessage;
                console.log('✅ Atualizando lastMessage:', newLastMessage.substring(0, 50) + '...');
            } else if (newLastMessage === currentLastMessage) {
                console.log('ℹ️ LastMessage não mudou, não será atualizado');
            }
        }
        
        // Regra: lastMessageDate SEMPRE atualiza com o timestamp da última mensagem
        // Sempre atualiza quando há um novo valor, comparando timestamps para garantir que é mais recente
        if (updates.lastMessageDate !== undefined) {
            const currentLastMessageDate = currentData?.last_message_date || '';
            const newLastMessageDate = String(updates.lastMessageDate || '').trim();
            
            if (newLastMessageDate) {
                // Se não há valor atual, atualiza diretamente
                if (!currentLastMessageDate) {
                    supabaseUpdates.last_message_date = convertToSupabaseTimestamp(newLastMessageDate);
                    console.log('✅ Atualizando lastMessageDate (primeira vez):', supabaseUpdates.last_message_date);
                } else {
                    // Compara timestamps para ver se o novo é mais recente ou igual
                    try {
                        const currentDate = new Date(currentLastMessageDate);
                        const newDate = new Date(newLastMessageDate);
                        
                        // Se o novo timestamp é mais recente ou igual, atualiza
                        if (newDate >= currentDate) {
                            supabaseUpdates.last_message_date = convertToSupabaseTimestamp(newLastMessageDate);
                            console.log('✅ Atualizando lastMessageDate (novo timestamp mais recente ou igual):', supabaseUpdates.last_message_date);
                        } else {
                            // Se o novo é mais antigo, não atualiza (pode ser uma mensagem antiga sendo processada)
                            console.log('ℹ️ LastMessageDate não atualizado (novo timestamp é mais antigo que o atual):', {
                                atual: currentLastMessageDate,
                                novo: newLastMessageDate
                            });
                        }
                    } catch (e) {
                        // Se houver erro ao comparar, atualiza de qualquer forma (melhor ser seguro)
                        console.warn('⚠️ Erro ao comparar timestamps, atualizando lastMessageDate de qualquer forma:', e);
                        supabaseUpdates.last_message_date = convertToSupabaseTimestamp(newLastMessageDate);
                    }
                }
            } else if (!newLastMessageDate && currentLastMessageDate) {
                // Se o novo valor está vazio mas há um valor atual, mantém o atual
                console.log('ℹ️ LastMessageDate vazio, mantendo valor atual:', currentLastMessageDate);
            } else {
                console.log('ℹ️ LastMessageDate vazio, não atualizando');
            }
        }
        
        if (updates.isRead !== undefined) {
            supabaseUpdates.is_read = Boolean(updates.isRead);
        }
        
        // Regra: propertyUrl só atualiza se:
        // 1. O novo valor não está vazio E
        // 2. O valor atual está vazio/null
        if (updates.propertyUrl !== undefined) {
            const newPropertyUrl = String(updates.propertyUrl || '').trim();
            const currentPropertyUrl = (currentData?.property_url || '').trim();
            
            if (newPropertyUrl && !currentPropertyUrl) {
                supabaseUpdates.property_url = newPropertyUrl;
                console.log('✅ Atualizando propertyUrl de vazio para:', newPropertyUrl);
            } else if (newPropertyUrl && currentPropertyUrl) {
                console.log('ℹ️ PropertyUrl já existe, mantendo valor atual:', currentPropertyUrl);
            } else if (!newPropertyUrl && currentPropertyUrl) {
                console.log('🔒 PropertyUrl atual protegido, não será sobrescrito para vazio');
            } else {
                console.log('ℹ️ PropertyUrl vazio, não atualizando');
            }
        }
        if (updates.unreadCount !== undefined) {
            supabaseUpdates.unread_count = updates.unreadCount;
        }
        if (updates.hasUnread !== undefined) {
            supabaseUpdates.has_unread = Boolean(updates.hasUnread);
        }
        
        // Regra: isLead só atualiza se:
        // 1. O novo valor não é NULL E
        // 2. O valor atual é NULL (ainda não foi determinado) OU mudou
        if (updates.isLead !== undefined && updates.isLead !== null) {
            const newIsLead = Boolean(updates.isLead);
            const currentIsLead = currentData?.is_lead;
            
            // Só atualiza se o valor atual é NULL (ainda não determinado) ou se mudou
            if (currentIsLead === null || currentIsLead === undefined || newIsLead !== currentIsLead) {
                supabaseUpdates.is_lead = newIsLead;
                console.log(`✅ Atualizando isLead de ${currentIsLead === null || currentIsLead === undefined ? 'NULL' : currentIsLead} para ${newIsLead}`);
            } else {
                console.log(`ℹ️ IsLead não mudou, mantendo valor atual: ${currentIsLead}`);
            }
        } else if (updates.isLead === null) {
            // Se o valor é explicitamente NULL, não atualiza (mantém o valor atual se existir)
            console.log('ℹ️ IsLead é NULL, não atualizando (mantendo valor atual se existir)');
        }
        
        // Se não houver campos para atualizar, retorna sem fazer nada
        if (Object.keys(supabaseUpdates).length === 0) {
            console.log('ℹ️ Nenhum campo para atualizar (phoneNumber protegido ou sem mudanças)');
            return true;
        }

        console.log('🔄 Atualizando conversa no Supabase:', conversationId, Object.keys(supabaseUpdates));

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'apikey': DB_CONFIG.supabase.anonKey,
                'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(supabaseUpdates)
        });

        if (response.ok) {
            console.log('✅ Conversa atualizada no Supabase:', conversationId);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Erro ao atualizar conversa no Supabase:', response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar conversa no Supabase:', error);
        return false;
    }
}


/**
 * Verifica se uma conversa já existe no Supabase
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<boolean>} Se existe
 */
async function conversationExistsInSupabase(conversationId) {
    if (!DB_CONFIG.supabase.url || DB_CONFIG.supabase.url.includes('SEU_PROJECT_ID')) {
        console.error('❌ Supabase não configurado. Configure DB_CONFIG.supabase.url');
        return false;
    }
    
    try {
        const url = `${DB_CONFIG.supabase.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(conversationId)}&select=conversation_id&limit=1`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'apikey': DB_CONFIG.supabase.anonKey,
                'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data && data.length > 0;
        }
        
        return false;
    } catch (error) {
        console.warn('⚠️ Erro ao verificar se conversa existe no Supabase:', error);
        return false;
    }
}


/**
 * Verifica se uma conversa já existe (compatibilidade)
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<boolean>} Se existe
 */
async function conversationExists(conversationId) {
    if (DB_CONFIG.mode === 'supabase') {
        return await conversationExistsInSupabase(conversationId);
    } else if (DB_CONFIG.mode === 'rest') {
        console.warn('⚠️ Modo REST não suporta verificação de existência. Use Supabase.');
        return false;
    }
    
    console.error('❌ Modo de banco de dados não configurado. Configure DB_CONFIG.mode como "supabase"');
    return false;
}

// Exporta funções globalmente para uso no content.js
if (typeof window !== 'undefined') {
    window.Conversation = Conversation;
    window.ChatMessage = ChatMessage;
    window.saveConversation = saveConversation;
    window.saveChatMessages = saveChatMessages;
    window.updateConversation = updateConversation;
    window.conversationExists = conversationExists;
}

// Exporta para Node.js também
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Conversation, saveConversation, conversationExists };
}

