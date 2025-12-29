// ============================================================================
// MÓDULO DE BANCO DE DADOS
// ============================================================================

/**
 * Configuração do banco de dados
 * Opções:
 * 1. API REST simples (recomendado para começar)
 * 2. Supabase (via REST API) - RECOMENDADO
 * 3. Firebase Firestore (via REST API) - DEPRECADO
 */
const DB_CONFIG = {
    // Para usar API REST simples, defina a URL da sua API
    apiUrl: 'https://sua-api.com/api/conversations',
    
    // Para usar Supabase, defina as credenciais
    supabase: {
        url: 'https://SEU_PROJECT_ID.supabase.co', // Substitua SEU_PROJECT_ID pelo ID do seu projeto
        anonKey: 'SUA_ANON_KEY_AQUI' // Substitua pela sua chave anônima (anon/public key)
    },
    
    // Modo: 'rest', 'supabase' ou 'firebase' (firebase está deprecado)
    mode: 'supabase'
};

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
            metadata: this.metadata
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
    }

    toJSON() {
        return {
            messageId: this.messageId,
            conversationId: this.conversationId,
            content: this.content,
            timestamp: this.timestamp,
            sender: this.sender,
            time: this.time
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
        } else if (DB_CONFIG.mode === 'firebase') {
            return await saveToFirebase(data);
        }
        
        // Fallback: salva no localStorage
        return await saveToLocalStorage(data);
    } catch (error) {
        console.error('❌ Erro ao salvar conversa:', error);
        // Fallback: salva no localStorage
        return await saveToLocalStorage(conversation.toJSON());
    }
}

/**
 * Salva no localStorage (fallback)
 */
async function saveToLocalStorage(data) {
    try {
        const key = `conversation_${data.conversationId}`;
        const existing = localStorage.getItem(key);
        
        if (existing) {
            const existingData = JSON.parse(existing);
            // Atualiza apenas se for mais recente
            if (new Date(data.timestamp) > new Date(existingData.timestamp)) {
                localStorage.setItem(key, JSON.stringify(data));
            }
        } else {
            localStorage.setItem(key, JSON.stringify(data));
        }
        
        // Mantém lista de IDs
        const ids = JSON.parse(localStorage.getItem('conversation_ids') || '[]');
        if (!ids.includes(data.conversationId)) {
            ids.push(data.conversationId);
            localStorage.setItem('conversation_ids', JSON.stringify(ids));
        }
        
        console.log('💾 Conversa salva no localStorage:', data.conversationId);
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar no localStorage:', error);
        return false;
    }
}

/**
 * Salva via API REST
 */
async function saveToRESTAPI(data) {
    if (!DB_CONFIG.apiUrl || DB_CONFIG.apiUrl.includes('sua-api.com')) {
        console.warn('⚠️ API URL não configurada, usando localStorage');
        return await saveToLocalStorage(data);
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
        return await saveToLocalStorage(data);
    }
}

/**
 * Salva no Supabase via REST API
 */
async function saveToSupabase(data) {
    if (!DB_CONFIG.supabase.url || DB_CONFIG.supabase.url.includes('SEU_PROJECT_ID') || !DB_CONFIG.supabase.anonKey || DB_CONFIG.supabase.anonKey.includes('SUA_ANON_KEY')) {
        console.warn('⚠️ Supabase não configurado, usando localStorage');
        return await saveToLocalStorage(data);
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
            has_unread: data.hasUnread || false
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
            console.log('✅ Conversa salva no Supabase:', data.conversationId);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Erro HTTP ao salvar no Supabase:', response.status, response.statusText);
            console.error('Resposta do servidor:', errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                console.error('Erro detalhado:', errorJson);
                
                if (response.status === 403 || response.status === 401) {
                    console.error('🔒 ERRO DE PERMISSÃO: Verifique as políticas RLS (Row Level Security) do Supabase.');
                    console.error('💡 SOLUÇÃO: Configure as políticas RLS para permitir INSERT na tabela conversations');
                } else if (response.status === 409) {
                    // Conflito - conversa já existe, tenta atualizar
                    console.log('⚠️ Conversa já existe, tentando atualizar...');
                    return await updateConversationInSupabase(data.conversationId, { phoneNumber: data.phoneNumber });
                }
            } catch (e) {
                // Não é JSON
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
 * Salva no Firebase Firestore via REST API (DEPRECADO - use Supabase)
 */
async function saveToFirebase(data) {
    if (!DB_CONFIG.firebase.projectId || DB_CONFIG.firebase.projectId.includes('SEU_PROJECT_ID')) {
        console.warn('⚠️ Firebase não configurado, usando localStorage');
        return await saveToLocalStorage(data);
    }

    try {
        const url = `https://firestore.googleapis.com/v1/projects/${DB_CONFIG.firebase.projectId}/databases/(default)/documents/conversations/${data.conversationId}`;
        
        // VERIFICA SE A CONVERSA JÁ EXISTE ANTES DE SALVAR
        const exists = await conversationExistsInFirebase(data.conversationId);
        
        if (exists) {
            const existingUrl = `https://firestore.googleapis.com/v1/projects/${DB_CONFIG.firebase.projectId}/databases/(default)/documents/conversations/${data.conversationId}`;
            const getResponse = await fetch(existingUrl);
            if (getResponse.ok) {
                const existingDoc = await getResponse.json();
                const existingPhoneNumber = existingDoc.fields?.phoneNumber?.stringValue || '';
                const hasExistingPhone = existingPhoneNumber && existingPhoneNumber.trim().length > 0;
                const hasNewPhone = data.phoneNumber && data.phoneNumber.trim().length > 0;
                
                console.log('🔍 Verificação antes de salvar conversa existente:', {
                    conversationId: data.conversationId,
                    hasExistingPhone,
                    hasNewPhone,
                    existingPhoneNumber: existingPhoneNumber || '(vazio)',
                    newPhoneNumber: data.phoneNumber || '(vazio)'
                });
                
                // PROTEÇÃO: Se já existe e tem phoneNumber, NUNCA atualiza (mesmo que tenha phoneNumber novo)
                // Isso evita sobrescrever acidentalmente
                if (hasExistingPhone) {
                    console.log('🔒 Conversa já existe com phoneNumber, não será atualizada. PhoneNumber protegido:', existingPhoneNumber);
                    return true; // Retorna true porque não é um erro, apenas não precisa atualizar
                }
                
                // Se existe mas não tem phoneNumber e agora temos, atualiza apenas o phoneNumber
                if (hasNewPhone && !hasExistingPhone) {
                    console.log('📞 Conversa existe mas sem phoneNumber, atualizando apenas phoneNumber:', data.conversationId);
                    return await updateConversationInFirebase(data.conversationId, { phoneNumber: data.phoneNumber });
                }
                
                // Se existe mas não tem phoneNumber e o novo também está vazio, não atualiza
                if (!hasNewPhone && !hasExistingPhone) {
                    console.log('ℹ️ Conversa já existe no Firebase sem phoneNumber, e novo também está vazio. Não será atualizada:', data.conversationId);
                    return true;
                }
            }
        }
        
        // Se não existe, cria nova conversa
        console.log('🔥 Criando nova conversa no Firebase:', {
            projectId: DB_CONFIG.firebase.projectId,
            conversationId: data.conversationId,
            userName: data.userName,
            hasPhoneNumber: !!(data.phoneNumber && data.phoneNumber.trim())
        });
        
        // Constrói os campos do Firestore
        const fields = {
            conversationId: { stringValue: data.conversationId },
            userName: { stringValue: data.userName },
            lastMessage: { stringValue: data.lastMessage || '' },
            adInfo: { stringValue: data.adInfo || '' },
            adImageUrl: { stringValue: data.adImageUrl || '' },
            timestamp: { timestampValue: data.timestamp },
            createdAt: { timestampValue: data.createdAt },
            url: { stringValue: data.url },
            isRead: { booleanValue: data.isRead || false },
            unreadCount: { integerValue: String(data.unreadCount || 0) },
            hasUnread: { booleanValue: data.hasUnread || false }
        };
        
        // Adiciona phoneNumber apenas se não estiver vazio (NUNCA salvar vazio)
        if (data.phoneNumber && data.phoneNumber.trim()) {
            fields.phoneNumber = { stringValue: data.phoneNumber.trim() };
            console.log('📞 phoneNumber será salvo:', data.phoneNumber.trim());
        } else {
            console.log('⚠️ phoneNumber vazio, não será salvo (será adicionado depois quando disponível)');
        }
        
        // Adiciona lastMessageDate apenas se não estiver vazio
        if (data.lastMessageDate && data.lastMessageDate.trim()) {
            const formattedTimestamp = convertToFirestoreTimestamp(data.lastMessageDate);
            fields.lastMessageDate = { timestampValue: formattedTimestamp };
            console.log('📅 lastMessageDate será salvo como timestamp:', formattedTimestamp);
        } else {
            console.log('⚠️ lastMessageDate vazio, não será salvo');
        }
        
        // VERIFICAÇÃO FINAL DE SEGURANÇA: Se a conversa já existe, verifica se não está removendo phoneNumber
        if (exists) {
            const existingUrl = `https://firestore.googleapis.com/v1/projects/${DB_CONFIG.firebase.projectId}/databases/(default)/documents/conversations/${data.conversationId}`;
            const safetyCheck = await fetch(existingUrl);
            if (safetyCheck.ok) {
                const existingDoc = await safetyCheck.json();
                const existingPhoneNumber = existingDoc.fields?.phoneNumber?.stringValue || '';
                const hasExistingPhone = existingPhoneNumber && existingPhoneNumber.trim().length > 0;
                
                // Se existe phoneNumber no banco mas não está nos fields, remove phoneNumber dos fields para não sobrescrever
                if (hasExistingPhone && !fields.phoneNumber) {
                    console.log('🔒 SEGURANÇA: PhoneNumber existente protegido, não será removido:', existingPhoneNumber);
                    // Não adiciona phoneNumber aos fields, mantém o existente
                }
            }
        }
        
        const firestoreData = { fields };

        console.log('📤 Enviando para Firebase:', url);
        console.log('📦 Dados:', JSON.stringify(firestoreData, null, 2));
        console.log('🔍 Verificação final - phoneNumber nos fields:', fields.phoneNumber ? fields.phoneNumber.stringValue : '(não incluído - será mantido o existente)');

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(firestoreData)
        });

        if (response.ok) {
            console.log('✅ Conversa salva no Firebase:', data.conversationId);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Erro HTTP ao salvar no Firebase:', response.status, response.statusText);
            console.error('Resposta do servidor:', errorText);
            
            try {
                const errorJson = JSON.parse(errorText);
                console.error('Erro detalhado:', errorJson);
                
                // Mensagens específicas para erros comuns
                if (response.status === 403) {
                    console.error('🔒 ERRO DE PERMISSÃO: As regras de segurança do Firestore estão bloqueando a escrita.');
                    console.error('💡 SOLUÇÃO: Vá no Firebase Console > Firestore > Rules e configure:');
                    console.error('   match /conversations/{conversationId} {');
                    console.error('     allow read, write: if true;');
                    console.error('   }');
                } else if (response.status === 404) {
                    console.error('🔍 PROJETO NÃO ENCONTRADO: Verifique se o projectId está correto:', DB_CONFIG.firebase.projectId);
                } else if (response.status === 401) {
                    console.error('🔑 ERRO DE AUTENTICAÇÃO: Verifique se o Firestore está ativado no projeto.');
                }
            } catch (e) {
                // Não é JSON
            }
            
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('❌ Erro ao salvar no Firebase:', error);
        console.error('Stack trace:', error.stack);
        // Não retorna para localStorage aqui, deixa o erro propagar
        return false;
    }
}

/**
 * Salva mensagens do chat no Supabase
 * @param {Array<ChatMessage>} messages - Array de mensagens
 * @returns {Promise<boolean>} Sucesso
 */
async function saveMessagesToSupabase(messages) {
    if (!DB_CONFIG.supabase.url || DB_CONFIG.supabase.url.includes('SEU_PROJECT_ID') || !DB_CONFIG.supabase.anonKey || DB_CONFIG.supabase.anonKey.includes('SUA_ANON_KEY')) {
        return await saveMessagesToLocalStorage(messages);
    }

    try {
        const conversationId = messages[0]?.conversationId;
        if (!conversationId) return false;

        let savedCount = 0;
        let skippedCount = 0;

        // Salva cada mensagem
        for (const message of messages) {
            const messageId = message.messageId || `${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Verifica se a mensagem já existe
            const checkUrl = `${DB_CONFIG.supabase.url}/rest/v1/messages?message_id=eq.${encodeURIComponent(messageId)}&select=message_id&limit=1`;
            const checkResponse = await fetch(checkUrl, {
                method: 'GET',
                headers: {
                    'apikey': DB_CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (checkResponse.ok) {
                const existing = await checkResponse.json();
                if (existing && existing.length > 0) {
                    console.log('⏭️ Mensagem já existe no Supabase, pulando:', messageId);
                    skippedCount++;
                    continue;
                }
            }
            
            // Prepara dados para Supabase (snake_case)
            const supabaseData = {
                message_id: messageId,
                conversation_id: message.conversationId,
                content: message.content || '',
                timestamp: convertToSupabaseTimestamp(message.timestamp),
                sender: message.sender || 'unknown',
                time: message.time || ''
            };
            
            const url = `${DB_CONFIG.supabase.url}/rest/v1/messages`;
            
            try {
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
                    savedCount++;
                    console.log('✅ Mensagem salva:', messageId);
                } else {
                    const errorText = await response.text();
                    console.warn('⚠️ Erro ao salvar mensagem:', messageId, response.status);
                    try {
                        const errorJson = JSON.parse(errorText);
                        console.warn('Erro detalhado:', errorJson);
                    } catch (e) {
                        console.warn('Erro texto:', errorText.substring(0, 200));
                    }
                }
            } catch (error) {
                console.warn('⚠️ Erro ao salvar mensagem:', messageId, error);
            }
        }

        if (savedCount > 0 || skippedCount > 0) {
            console.log(`✅ ${savedCount} novas mensagens salvas, ${skippedCount} duplicadas puladas de ${messages.length} total para conversa ${conversationId}`);
        }
        
        return savedCount > 0;
    } catch (error) {
        console.error('❌ Erro ao salvar mensagens no Supabase:', error);
        return await saveMessagesToLocalStorage(messages);
    }
}

/**
 * Salva mensagens do chat no Firebase (DEPRECADO - use Supabase)
 * @param {Array<ChatMessage>} messages - Array de mensagens
 * @returns {Promise<boolean>} Sucesso
 */
async function saveChatMessages(messages) {
    if (!messages || messages.length === 0) return false;

    try {
        if (DB_CONFIG.mode === 'supabase') {
            return await saveMessagesToSupabase(messages);
        } else if (DB_CONFIG.mode === 'firebase') {
            return await saveMessagesToFirebase(messages);
        }
        
        // Fallback: salva no localStorage
        return await saveMessagesToLocalStorage(messages);
    } catch (error) {
        console.error('❌ Erro ao salvar mensagens:', error);
        return await saveMessagesToLocalStorage(messages);
    }
}

/**
 * Sanitiza um ID para ser válido no Firestore
 * Firestore não permite: /, ?, #, [, ], *, espaços, e alguns outros caracteres
 * Document IDs podem conter apenas: letras, números, _, -, e devem ter no máximo 1500 bytes
 */
function sanitizeFirestoreId(id) {
    if (!id) return '';
    
    // Remove ou substitui caracteres inválidos
    let sanitized = id
        .replace(/[\/?#\[\]*\s]/g, '_')  // Substitui caracteres inválidos por _
        .replace(/[^\w\-]/g, '')          // Remove tudo que não é alfanumérico, _ ou -
        .replace(/_{2,}/g, '_')           // Remove underscores duplicados
        .replace(/^_+|_+$/g, '');         // Remove underscores no início/fim
    
    // Se ficou vazio, gera um ID aleatório
    if (!sanitized || sanitized.length === 0) {
        sanitized = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Limita tamanho (Firestore tem limite de 1500 bytes, mas IDs devem ser menores)
    return sanitized.substring(0, 150);
}

/**
 * Converte timestamp ISO para formato Firestore
 * Garante que o timestamp termina com 'Z' ou tem offset de timezone válido
 */
function convertToFirestoreTimestamp(isoString) {
    if (!isoString) {
        return new Date().toISOString();
    }
    
    // Se já é uma string ISO válida, verifica se termina com 'Z'
    if (typeof isoString === 'string') {
        // Se já termina com 'Z', retorna como está
        if (isoString.endsWith('Z')) {
            return isoString;
        }
        
        // Se tem offset de timezone (ex: +00:00, -03:00), retorna como está
        if (/[+-]\d{2}:\d{2}$/.test(isoString)) {
            return isoString;
        }
        
        // Tenta parsear formatos brasileiros (DD/MM/YYYY, DD/MM/YYYY HH:MM, etc)
        // Padrão: "29/12/2025, 00:04" ou "29/12/2025 00:04" ou "29/12/2025"
        const brazilianDatePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2}))?/;
        const brazilianMatch = isoString.match(brazilianDatePattern);
        if (brazilianMatch) {
            try {
                const day = parseInt(brazilianMatch[1], 10);
                const month = parseInt(brazilianMatch[2], 10) - 1; // JavaScript months are 0-indexed
                const year = parseInt(brazilianMatch[3], 10);
                const hours = brazilianMatch[4] ? parseInt(brazilianMatch[4], 10) : 0;
                const minutes = brazilianMatch[5] ? parseInt(brazilianMatch[5], 10) : 0;
                
                const date = new Date(year, month, day, hours, minutes, 0, 0);
                if (!isNaN(date.getTime())) {
                    return date.toISOString();
                }
            } catch (e) {
                // Continua para tentar outros formatos
            }
        }
        
        // Tenta parsear como ISO ou outros formatos padrão
        try {
            const date = new Date(isoString);
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
    
    // Fallback: retorna timestamp atual (sem warning para não poluir o console)
    return new Date().toISOString();
}

/**
 * Salva mensagens no Firebase
 */
async function saveMessagesToFirebase(messages) {
    if (!DB_CONFIG.firebase.projectId || DB_CONFIG.firebase.projectId.includes('SEU_PROJECT_ID')) {
        return await saveMessagesToLocalStorage(messages);
    }

    try {
        const conversationId = messages[0]?.conversationId;
        if (!conversationId) return false;

        // Set para rastrear messageIds já processados nesta execução (evita duplicatas no mesmo batch)
        const processedMessageIds = new Set();

        let savedCount = 0;
        let skippedCount = 0;

        // Salva cada mensagem como um documento na subcoleção 'messages'
        for (const message of messages) {
            // Gera ID único e sanitizado para o documento Firestore
            // O ID do documento deve ser sanitizado, mas mantemos o ID original nos dados
            const originalMessageId = message.messageId || `${conversationId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Verifica se a mensagem já foi processada neste batch (evita duplicatas no mesmo lote)
            if (processedMessageIds.has(originalMessageId)) {
                console.log('⏭️ Mensagem duplicada no mesmo batch, pulando:', originalMessageId);
                skippedCount++;
                continue;
            }
            
            // Sanitiza o ID para usar como nome do documento (remove caracteres inválidos)
            let sanitizedMessageId = sanitizeFirestoreId(originalMessageId);
            
            // Se o ID sanitizado ficou muito curto ou vazio, gera um novo baseado no índice
            if (!sanitizedMessageId || sanitizedMessageId.length < 10) {
                const index = messages.indexOf(message);
                sanitizedMessageId = `${conversationId}_msg_${index}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
            }
            
            // Usa o ID sanitizado diretamente na URL (não precisa encodeURIComponent para IDs válidos)
            const url = `https://firestore.googleapis.com/v1/projects/${DB_CONFIG.firebase.projectId}/databases/(default)/documents/conversations/${conversationId}/messages/${sanitizedMessageId}`;
            
            // Verifica se o documento já existe no Firestore (GET antes de PATCH)
            try {
                const checkResponse = await fetch(url);
                if (checkResponse.ok) {
                    const existingDoc = await checkResponse.json();
                    const existingMessageId = existingDoc.fields?.messageId?.stringValue;
                    if (existingMessageId === originalMessageId) {
                        console.log('⏭️ Mensagem já existe no Firestore, pulando:', originalMessageId);
                        skippedCount++;
                        processedMessageIds.add(originalMessageId);
                        continue;
                    }
                }
            } catch (e) {
                // Se não conseguir verificar, continua (pode ser que o documento não exista)
            }
            
            const firestoreData = {
                fields: {
                    messageId: { stringValue: originalMessageId }, // Mantém o ID original nos dados
                    conversationId: { stringValue: message.conversationId },
                    content: { stringValue: message.content || '' },
                    timestamp: { timestampValue: convertToFirestoreTimestamp(message.timestamp) },
                    sender: { stringValue: message.sender || 'unknown' },
                    time: { stringValue: message.time || '' }
                }
            };

            try {
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(firestoreData)
                });

                if (response.ok) {
                    savedCount++;
                    processedMessageIds.add(originalMessageId); // Adiciona ao Set para evitar duplicatas no mesmo batch
                    console.log('✅ Mensagem salva:', sanitizedMessageId);
                } else {
                    const errorText = await response.text();
                    console.warn('⚠️ Erro ao salvar mensagem:', sanitizedMessageId, response.status);
                    try {
                        const errorJson = JSON.parse(errorText);
                        console.warn('Erro detalhado:', errorJson.error?.message || errorJson);
                    } catch (e) {
                        console.warn('Erro texto:', errorText.substring(0, 200));
                    }
                }
            } catch (error) {
                console.warn('⚠️ Erro ao salvar mensagem:', sanitizedMessageId, error);
            }
        }

        if (savedCount > 0 || skippedCount > 0) {
            console.log(`✅ ${savedCount} novas mensagens salvas, ${skippedCount} duplicadas puladas de ${messages.length} total para conversa ${conversationId}`);
        }
        
        return savedCount > 0;
    } catch (error) {
        console.error('❌ Erro ao salvar mensagens no Firebase:', error);
        return await saveMessagesToLocalStorage(messages);
    }
}

/**
 * Salva mensagens no localStorage
 */
async function saveMessagesToLocalStorage(messages) {
    try {
        const conversationId = messages[0]?.conversationId;
        if (!conversationId) return false;

        const key = `messages_${conversationId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Adiciona apenas mensagens novas
        const existingIds = new Set(existing.map(m => m.messageId));
        const newMessages = messages.filter(m => !existingIds.has(m.messageId));
        
        if (newMessages.length > 0) {
            existing.push(...newMessages.map(m => m.toJSON()));
            localStorage.setItem(key, JSON.stringify(existing));
            console.log(`💾 ${newMessages.length} novas mensagens salvas no localStorage`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erro ao salvar mensagens no localStorage:', error);
        return false;
    }
}

/**
 * Atualiza uma conversa existente no Firebase (atualiza apenas campos específicos)
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
        } else if (DB_CONFIG.mode === 'firebase') {
            return await updateConversationInFirebase(conversationId, updates);
        }
        
        // Fallback: atualiza no localStorage
        return await updateConversationInLocalStorage(conversationId, updates);
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
        return await updateConversationInLocalStorage(conversationId, updates);
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
        
        // Regra: lastMessageDate só atualiza se:
        // 1. O novo valor não está vazio E
        // 2. O valor atual está vazio/null
        if (updates.lastMessageDate !== undefined) {
            const currentLastMessageDate = currentData?.last_message_date || '';
            const newLastMessageDate = String(updates.lastMessageDate || '').trim();
            
            if (newLastMessageDate && !currentLastMessageDate) {
                supabaseUpdates.last_message_date = convertToSupabaseTimestamp(newLastMessageDate);
                console.log('✅ Atualizando lastMessageDate de vazio para:', supabaseUpdates.last_message_date);
            } else if (newLastMessageDate && currentLastMessageDate) {
                console.log('ℹ️ LastMessageDate já existe, mantendo valor atual:', currentLastMessageDate);
            } else if (!newLastMessageDate && currentLastMessageDate) {
                console.log('🔒 LastMessageDate atual protegido, não será sobrescrito para vazio');
            } else {
                console.log('ℹ️ LastMessageDate vazio, não atualizando');
            }
        }
        
        if (updates.isRead !== undefined) {
            supabaseUpdates.is_read = Boolean(updates.isRead);
        }
        if (updates.unreadCount !== undefined) {
            supabaseUpdates.unread_count = updates.unreadCount;
        }
        if (updates.hasUnread !== undefined) {
            supabaseUpdates.has_unread = Boolean(updates.hasUnread);
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
 * Atualiza conversa no Firebase (DEPRECADO - use Supabase)
 */
async function updateConversationInFirebase(conversationId, updates) {
    if (!DB_CONFIG.firebase.projectId || DB_CONFIG.firebase.projectId.includes('SEU_PROJECT_ID')) {
        return await updateConversationInLocalStorage(conversationId, updates);
    }

    try {
        const url = `https://firestore.googleapis.com/v1/projects/${DB_CONFIG.firebase.projectId}/databases/(default)/documents/conversations/${conversationId}`;
        
        // Primeiro, busca o documento atual para verificar campos existentes
        let currentPhoneNumber = null;
        let currentUserName = null;
        let currentData = null;
        try {
            const getResponse = await fetch(url);
            if (getResponse.ok) {
                currentData = await getResponse.json();
                currentPhoneNumber = currentData.fields?.phoneNumber?.stringValue || '';
                currentUserName = currentData.fields?.userName?.stringValue || '';
                console.log('📞 PhoneNumber atual no DB:', currentPhoneNumber || '(vazio)');
                console.log('👤 UserName atual no DB:', currentUserName || '(vazio)');
                console.log('📅 LastMessageDate atual no DB:', currentData.fields?.lastMessageDate?.stringValue || '(vazio)');
            }
        } catch (e) {
            console.warn('⚠️ Não foi possível buscar documento atual:', e);
        }
        
        // Constrói os campos para atualizar
        const fields = {};
        
        // Regra: phoneNumber só atualiza se:
        // 1. O novo valor não está vazio E
        // 2. O valor atual está vazio/null/string vazia
        if (updates.phoneNumber !== undefined) {
            const newPhoneNumber = String(updates.phoneNumber || '').trim();
            // Considera string vazia como "sem valor" (para documentos criados antes da correção)
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
                // Novo valor não está vazio E atual está vazio -> atualiza
                fields.phoneNumber = { stringValue: newPhoneNumber };
                console.log('✅ Atualizando phoneNumber de vazio para:', newPhoneNumber);
            } else if (hasNewValue && hasCurrentValue) {
                // Ambos têm valor -> mantém o atual (não atualiza)
                console.log('ℹ️ PhoneNumber já existe, mantendo valor atual:', currentPhone);
            } else if (!hasNewValue && hasCurrentValue) {
                // Novo está vazio mas atual tem valor -> não atualiza (protege valor existente)
                console.log('🔒 PhoneNumber atual protegido, não será sobrescrito para vazio. Valor atual:', currentPhone);
            } else {
                // Ambos vazios -> não atualiza
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
                // Novo valor não está vazio E atual está vazio -> atualiza
                fields.userName = { stringValue: newUserName };
                console.log('✅ Atualizando userName de vazio para:', newUserName);
            } else if (newUserName && currentUser) {
                // Ambos têm valor -> mantém o atual (não atualiza)
                console.log('ℹ️ UserName já existe, mantendo valor atual:', currentUser);
            } else if (!newUserName && currentUser) {
                // Novo está vazio mas atual tem valor -> não atualiza (protege valor existente)
                console.log('🔒 UserName atual protegido, não será sobrescrito para vazio');
            } else {
                // Ambos vazios -> não atualiza
                console.log('ℹ️ UserName vazio, não atualizando');
            }
        }
        // Regra: lastMessage só atualiza se mudou
        if (updates.lastMessage !== undefined) {
            const newLastMessage = String(updates.lastMessage || '').trim();
            const currentLastMessage = (currentData?.fields?.lastMessage?.stringValue || '').trim();
            
            // Só atualiza se o valor mudou
            if (newLastMessage && newLastMessage !== currentLastMessage) {
                fields.lastMessage = { stringValue: newLastMessage };
                console.log('✅ Atualizando lastMessage:', newLastMessage.substring(0, 50) + '...');
            } else if (newLastMessage === currentLastMessage) {
                console.log('ℹ️ LastMessage não mudou, não será atualizado');
            }
        }
        
        // Regra: lastMessageDate só atualiza se:
        // 1. O novo valor não está vazio E
        // 2. O valor atual está vazio/null
        if (updates.lastMessageDate !== undefined) {
            // Pode vir como timestampValue (novo) ou stringValue (antigo - compatibilidade)
            const currentLastMessageDate = currentData?.fields?.lastMessageDate?.timestampValue || 
                                          currentData?.fields?.lastMessageDate?.stringValue || '';
            const newLastMessageDate = String(updates.lastMessageDate || '').trim();
            
            if (newLastMessageDate && !currentLastMessageDate) {
                // Novo valor não está vazio E atual está vazio -> atualiza como timestamp
                // Garante que está no formato correto (termina com 'Z')
                const formattedTimestamp = convertToFirestoreTimestamp(newLastMessageDate);
                fields.lastMessageDate = { timestampValue: formattedTimestamp };
                console.log('✅ Atualizando lastMessageDate de vazio para:', formattedTimestamp);
            } else if (newLastMessageDate && currentLastMessageDate) {
                // Ambos têm valor -> mantém o atual (não atualiza)
                console.log('ℹ️ LastMessageDate já existe, mantendo valor atual:', currentLastMessageDate);
            } else if (!newLastMessageDate && currentLastMessageDate) {
                // Novo está vazio mas atual tem valor -> não atualiza (protege valor existente)
                console.log('🔒 LastMessageDate atual protegido, não será sobrescrito para vazio');
            } else {
                // Ambos vazios -> não atualiza
                console.log('ℹ️ LastMessageDate vazio, não atualizando');
            }
        }
        if (updates.isRead !== undefined) {
            fields.isRead = { booleanValue: Boolean(updates.isRead) };
        }
        if (updates.unreadCount !== undefined) {
            fields.unreadCount = { integerValue: String(updates.unreadCount || 0) };
        }
        if (updates.hasUnread !== undefined) {
            fields.hasUnread = { booleanValue: Boolean(updates.hasUnread) };
        }
        // REMOVIDO: timestamp não deve ser atualizado a cada mudança
        // O timestamp só deve ser atualizado quando a conversa é criada
        // Não atualiza timestamp em updates para evitar atualizações desnecessárias

        // Verificação final de segurança: remove phoneNumber do fields se estiver vazio
        if (fields.phoneNumber && (!fields.phoneNumber.stringValue || !fields.phoneNumber.stringValue.trim())) {
            console.warn('⚠️ SEGURANÇA: Removendo phoneNumber vazio do objeto fields antes de salvar');
            delete fields.phoneNumber;
        }
        
        // Se não houver campos para atualizar, retorna sem fazer nada
        if (Object.keys(fields).length === 0) {
            console.log('ℹ️ Nenhum campo para atualizar (phoneNumber protegido ou sem mudanças)');
            return true; // Retorna true porque não há erro, apenas nada para atualizar
        }

        const firestoreData = { fields };

        console.log('🔄 Atualizando conversa no Firebase:', conversationId, Object.keys(fields));
        console.log('🔍 Verificação final - phoneNumber nos fields:', fields.phoneNumber ? fields.phoneNumber.stringValue : '(não incluído)');

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(firestoreData)
        });

        if (response.ok) {
            console.log('✅ Conversa atualizada no Firebase:', conversationId);
            return true;
        } else {
            const errorText = await response.text();
            console.error('❌ Erro ao atualizar conversa no Firebase:', response.status, errorText);
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao atualizar conversa no Firebase:', error);
        return false;
    }
}

/**
 * Atualiza conversa no localStorage
 */
async function updateConversationInLocalStorage(conversationId, updates) {
    try {
        const key = `conversation_${conversationId}`;
        const existing = localStorage.getItem(key);
        
        if (existing) {
            const data = JSON.parse(existing);
            
            // Regra: phoneNumber só atualiza se:
            // 1. O novo valor não está vazio E
            // 2. O valor atual está vazio/null/string vazia
            if (updates.phoneNumber !== undefined) {
                const newPhoneNumber = String(updates.phoneNumber || '').trim();
                const currentPhone = String(data.phoneNumber || '').trim();
                // Considera string vazia como "sem valor"
                const hasCurrentValue = currentPhone && currentPhone.length > 0;
                const hasNewValue = newPhoneNumber && newPhoneNumber.length > 0;
                
                if (hasNewValue && !hasCurrentValue) {
                    data.phoneNumber = newPhoneNumber;
                    console.log('✅ Atualizando phoneNumber no localStorage de vazio para:', newPhoneNumber);
                } else if (hasNewValue && hasCurrentValue) {
                    console.log('ℹ️ PhoneNumber já existe no localStorage, mantendo:', currentPhone);
                } else if (!hasNewValue && hasCurrentValue) {
                    console.log('🔒 PhoneNumber no localStorage protegido, não será sobrescrito para vazio. Valor atual:', currentPhone);
                } else {
                    console.log('ℹ️ PhoneNumber vazio, não atualizando no localStorage');
                }
            }
            
            // Regra: userName só atualiza se:
            // 1. O novo valor não está vazio E
            // 2. O valor atual está vazio/null
            if (updates.userName !== undefined) {
                const newUserName = String(updates.userName || '').trim();
                const currentUser = String(data.userName || '').trim();
                
                if (newUserName && !currentUser) {
                    data.userName = newUserName;
                    console.log('✅ Atualizando userName no localStorage de vazio para:', newUserName);
                } else if (newUserName && currentUser) {
                    console.log('ℹ️ UserName já existe no localStorage, mantendo:', currentUser);
                } else if (!newUserName && currentUser) {
                    console.log('🔒 UserName no localStorage protegido, não será sobrescrito para vazio');
                }
            }
            
            // Regra: lastMessageDate só atualiza se:
            // 1. O novo valor não está vazio E
            // 2. O valor atual está vazio/null
            if (updates.lastMessageDate !== undefined) {
                const newLastMessageDate = String(updates.lastMessageDate || '').trim();
                const currentLastMessageDate = String(data.lastMessageDate || '').trim();
                
                if (newLastMessageDate && !currentLastMessageDate) {
                    data.lastMessageDate = newLastMessageDate;
                    console.log('✅ Atualizando lastMessageDate no localStorage de vazio para:', newLastMessageDate);
                } else if (newLastMessageDate && currentLastMessageDate) {
                    console.log('ℹ️ LastMessageDate já existe no localStorage, mantendo:', currentLastMessageDate);
                } else if (!newLastMessageDate && currentLastMessageDate) {
                    console.log('🔒 LastMessageDate no localStorage protegido, não será sobrescrito para vazio');
                }
            }
            
            // Atualiza outros campos (apenas se não estiverem vazios)
            // Remove campos vazios dos updates para não sobrescrever valores existentes
            const cleanUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                // Não processa phoneNumber, userName e lastMessageDate novamente (já foram processados acima)
                if (key === 'phoneNumber' || key === 'userName' || key === 'lastMessageDate') {
                    continue;
                }
                // Só adiciona se não estiver vazio
                if (value !== undefined && value !== null && value !== '') {
                    cleanUpdates[key] = value;
                }
            }
            
            // Aplica os updates limpos
            Object.assign(data, cleanUpdates);
            localStorage.setItem(key, JSON.stringify(data));
            console.log('💾 Conversa atualizada no localStorage:', conversationId);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('❌ Erro ao atualizar conversa no localStorage:', error);
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
        // Fallback para localStorage
        const key = `conversation_${conversationId}`;
        const existing = localStorage.getItem(key);
        return !!existing;
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
 * Verifica se uma conversa já existe no Firebase (deprecado)
 * @param {string} conversationId - ID da conversa
 * @returns {Promise<boolean>} Se existe
 */
async function conversationExistsInFirebase(conversationId) {
    if (!DB_CONFIG.firebase?.projectId || DB_CONFIG.firebase.projectId.includes('SEU_PROJECT_ID')) {
        // Fallback para localStorage
        const key = `conversation_${conversationId}`;
        const existing = localStorage.getItem(key);
        return !!existing;
    }
    
    try {
        const url = `https://firestore.googleapis.com/v1/projects/${DB_CONFIG.firebase.projectId}/databases/(default)/documents/conversations/${conversationId}`;
        const response = await fetch(url);
        return response.ok;
    } catch (error) {
        console.warn('⚠️ Erro ao verificar se conversa existe:', error);
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
    } else if (DB_CONFIG.mode === 'firebase') {
        return await conversationExistsInFirebase(conversationId);
    }
    
    // Fallback para localStorage
    const key = `conversation_${conversationId}`;
    const existing = localStorage.getItem(key);
    return !!existing;
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

