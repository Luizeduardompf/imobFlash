// Overlay script que cobre toda a página e desativa interações

(function() {
    'use strict';

    // Verifica se o overlay já foi injetado (evita duplicação)
    if (document.getElementById('imobflash-overlay') || document.getElementById('imobflash-mask')) {
        console.log('ℹ️ Overlay já está ativo');
        return;
    }

    // Cria o overlay (discreto no canto superior direito)
    const overlay = document.createElement('div');
    overlay.id = 'imobflash-overlay';
    
    // Cria máscara escura semi-transparente que cobre toda a página
    const mask = document.createElement('div');
    mask.id = 'imobflash-mask';
    mask.style.cssText = 'position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; z-index: 999997 !important; background: rgba(0, 0, 0, 0.6) !important; pointer-events: auto !important; backdrop-filter: blur(2px) !important; -webkit-backdrop-filter: blur(2px) !important;';
    
    // Cria camada invisível que cobre toda a página para bloquear interações do usuário
    // Mas permite cliques programáticos através de pointer-events: none
    const blocker = document.createElement('div');
    blocker.id = 'imobflash-blocker';
    blocker.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 999998; background: transparent; pointer-events: none;';
    
    // Cria indicador visual discreto com logs
    overlay.innerHTML = `
        <div class="imobflash-overlay-content">
            <div class="imobflash-overlay-header">
                <span class="imobflash-icon">🤖</span>
                <div class="imobflash-text">
                    <h3>ImobFlash Agent Ativo</h3>
                    <p>Monitorando conversas</p>
                </div>
            </div>
            <div class="imobflash-logs-container" id="imobflash-logs-container">
                <div class="imobflash-logs-header">
                    <span>📋 Logs em Tempo Real</span>
                    <div style="display: flex; gap: 6px;">
                        <button id="imobflash-whatsapp-test" class="imobflash-logs-clear-btn" title="Enviar mensagem teste WhatsApp">📱</button>
                        <button id="imobflash-logs-clear" class="imobflash-logs-clear-btn">Limpar</button>
                    </div>
                </div>
                <div class="imobflash-logs-content" id="imobflash-logs-content">
                    <div class="imobflash-logs-empty">Aguardando logs...</div>
                </div>
            </div>
        </div>
    `;
    
    // Cria countdown no canto inferior direito
    const countdown = document.createElement('div');
    countdown.id = 'imobflash-countdown';
    countdown.className = 'imobflash-countdown';
    countdown.innerHTML = `
        <div class="imobflash-countdown-label">Próximo refresh em:</div>
        <div class="imobflash-countdown-time" id="imobflash-countdown-time">--:--</div>
        <div class="imobflash-indicators">
            <div class="imobflash-indicator" id="imobflash-indicator-list" title="Mensagens não lidas na lista">
                <span class="imobflash-indicator-icon">📋</span>
                <span class="imobflash-indicator-text">Lista: --</span>
            </div>
            <div class="imobflash-indicator" id="imobflash-indicator-chat" title="Mensagem não lida no chat aberto">
                <span class="imobflash-indicator-icon">💬</span>
                <span class="imobflash-indicator-text">Chat: --</span>
            </div>
        </div>
    `;

    // Função para injetar o overlay
    function injectOverlay() {
        // Verifica se já existe
        if (document.getElementById('imobflash-overlay') || document.getElementById('imobflash-blocker') || document.getElementById('imobflash-mask')) {
            return;
        }

        // Adiciona todos ao body (máscara primeiro, depois blocker, depois indicador, depois countdown)
        document.body.appendChild(mask);
        document.body.appendChild(blocker);
        document.body.appendChild(overlay);
        document.body.appendChild(countdown);
        
        // Log para debug
        console.log('✅ Máscara criada:', document.getElementById('imobflash-mask') ? 'SIM' : 'NÃO');
        console.log('✅ Blocker criado:', document.getElementById('imobflash-blocker') ? 'SIM' : 'NÃO');
        console.log('✅ Overlay criado:', document.getElementById('imobflash-overlay') ? 'SIM' : 'NÃO');
        console.log('✅ Countdown criado:', document.getElementById('imobflash-countdown') ? 'SIM' : 'NÃO');
    }

    // Tenta injetar imediatamente se o body já existe
    if (document.body) {
        injectOverlay();
    } else {
        // Aguarda o DOM estar pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectOverlay);
        } else {
            injectOverlay();
        }
    }

    // Previne apenas interações do usuário, não cliques programáticos
    function preventInteraction(e) {
        // Permite cliques programáticos (dispatched pelo JavaScript)
        // Cliques programáticos não têm isTrusted = true
        if (!e.isTrusted) {
            // É um clique programático, permite passar
            return true;
        }
        
        // Permite interações dentro do overlay (logs, botões, etc)
        if (e.target.closest('#imobflash-overlay')) {
            // Permite todas as interações dentro do overlay (logs, botões)
            return true;
        }
        
        // Bloqueia todas as outras interações do usuário
        e.stopPropagation();
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }

    // Adiciona event listeners para bloquear interações (capture phase para interceptar antes)
    const events = ['click', 'mousedown', 'mouseup', 'keydown', 'keyup', 'touchstart', 'touchend', 'contextmenu', 'dblclick'];
    events.forEach(event => {
        document.addEventListener(event, preventInteraction, { capture: true, passive: false });
    });
    
    // Bloqueia também eventos de formulário
    document.addEventListener('submit', preventInteraction, { capture: true, passive: false });
    document.addEventListener('change', preventInteraction, { capture: true, passive: false });

    // Bloqueia scroll
    document.body.style.overflow = 'hidden';

    // Overlay não pode ser fechado - sempre ativo quando o agente está rodando

    // Observa mudanças no DOM para manter o overlay, mask e blocker sempre visíveis
    const observer = new MutationObserver(() => {
        if (!document.body.contains(mask)) {
            document.body.appendChild(mask);
        }
        if (!document.body.contains(blocker)) {
            document.body.appendChild(blocker);
        }
        if (!document.body.contains(overlay)) {
            document.body.appendChild(overlay);
        }
        
        // Garante que estão sempre no topo
        mask.style.zIndex = '999997';
        blocker.style.zIndex = '999998';
        overlay.style.zIndex = '999999';
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Sistema de logs em tempo real
    let logs = [];
    const maxLogs = 200; // Limita a 200 logs
    const logsContainer = document.getElementById('imobflash-logs-content');
    const logsClearBtn = document.getElementById('imobflash-logs-clear');
    
    // Função para formatar timestamp
    function formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }
    
    // Função para determinar nível do log
    function getLogLevel(message) {
        if (message.includes('❌') || message.includes('Erro') || message.includes('ERROR') || message.includes('error')) {
            return 'error';
        }
        if (message.includes('⚠️') || message.includes('Aviso') || message.includes('WARNING') || message.includes('warn')) {
            return 'warning';
        }
        if (message.includes('✅') || message.includes('Sucesso') || message.includes('SUCCESS')) {
            return 'success';
        }
        if (message.includes('🔍') || message.includes('DEBUG') || message.includes('[DEBUG]')) {
            return 'debug';
        }
        return 'info';
    }
    
    // Função para adicionar log
    function addLog(message, level = null) {
        const timestamp = new Date();
        const logEntry = {
            time: timestamp,
            message: message,
            level: level || getLogLevel(message)
        };
        
        logs.push(logEntry);
        
        // Limita o número de logs
        if (logs.length > maxLogs) {
            logs.shift();
        }
        
        renderLogs();
    }
    
    // Função para renderizar logs
    function renderLogs() {
        if (!logsContainer) return;
        
        if (logs.length === 0) {
            logsContainer.innerHTML = '<div class="imobflash-logs-empty">Aguardando logs...</div>';
            return;
        }
        
        logsContainer.innerHTML = logs.slice(-100).map(log => {
            const time = formatTime(log.time);
            const levelClass = `imobflash-log-level-${log.level}`;
            const escapedMessage = escapeHtml(log.message);
            return `
                <div class="imobflash-log-entry ${levelClass}">
                    <span class="imobflash-log-time">[${time}]</span>
                    <span class="imobflash-log-message">${escapedMessage}</span>
                </div>
            `;
        }).join('');
        
        // Auto-scroll para o final
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    
    // Função para escapar HTML
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Intercepta console.log para adicionar ao overlay
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.log = function(...args) {
        originalConsoleLog.apply(console, args);
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        addLog(message, 'info');
    };
    
    console.error = function(...args) {
        originalConsoleError.apply(console, args);
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        addLog(message, 'error');
    };
    
    console.warn = function(...args) {
        originalConsoleWarn.apply(console, args);
        const message = args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        addLog(message, 'warning');
    };
    
    // Botão para limpar logs
    if (logsClearBtn) {
        logsClearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            logs = [];
            renderLogs();
        });
    }
    
    // Botão para enviar mensagem teste WhatsApp
    const whatsappTestBtn = document.getElementById('imobflash-whatsapp-test');
    if (whatsappTestBtn) {
        whatsappTestBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await sendWhatsAppTestMessage();
        });
    }
    
    // Função para enviar mensagem teste WhatsApp
    async function sendWhatsAppTestMessage() {
        const testNumber = '351939712410';
        const testMessage = 'Mensagem de teste do ImobFlash Agent';
        
        try {
            addLog(`📱 Enviando mensagem teste para ${testNumber}...`, 'info');
            
            // Busca configurações do WhatsApp do banco de dados
            const whatsappSettings = await getWhatsAppSettings();
            
            if (!whatsappSettings) {
                addLog('❌ Configurações do WhatsApp não encontradas no banco de dados', 'error');
                return;
            }
            
            // Valida se os dados necessários estão presentes
            if (!whatsappSettings.instancia_id || !whatsappSettings.instancia_token) {
                addLog('❌ Instância ID ou Token não encontrados nas configurações', 'error');
                return;
            }
            
            // Monta URL da API Z-API no formato: https://api.z-api.io/instances/SEU_INSTANCE_ID/token/SEU_TOKEN/send-text
            // Substitui SEU_INSTANCE_ID e SEU_TOKEN pelos valores do banco de dados
            // Se url_api não estiver definida ou estiver vazia, usa https://api.z-api.io como padrão
            let baseUrl = whatsappSettings.url_api || 'https://api.z-api.io';
            baseUrl = baseUrl.replace(/\/$/, ''); // Remove barra final se existir
            
            const apiUrl = `${baseUrl}/instances/${whatsappSettings.instancia_id}/token/${whatsappSettings.instancia_token}/send-text`;
            
            addLog(`🔗 URL da API: ${apiUrl.replace(whatsappSettings.instancia_token, '***')}`, 'debug');
            
            // Envia mensagem
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': whatsappSettings.client_token
                },
                body: JSON.stringify({
                    phone: testNumber,
                    message: testMessage
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                addLog(`✅ Mensagem teste enviada com sucesso para ${testNumber}`, 'success');
                console.log('✅ Resposta da API:', result);
            } else {
                let errorText;
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = `Erro ao ler resposta: ${e.message}`;
                }
                addLog(`❌ Erro ao enviar mensagem: ${response.status} - ${errorText}`, 'error');
                console.error('❌ Erro ao enviar mensagem:', response.status, errorText);
                console.error('❌ URL usada:', apiUrl.replace(whatsappSettings.instancia_token, '***'));
            }
        } catch (error) {
            addLog(`❌ Erro ao enviar mensagem teste: ${error.message}`, 'error');
            console.error('❌ Erro ao enviar mensagem teste:', error);
        }
    }
    
    // Função para buscar configurações do WhatsApp do banco de dados
    async function getWhatsAppSettings() {
        try {
            // Usa as mesmas configurações do database.js
            const supabaseUrl = 'https://bhguniomuytyzrfcpbeo.supabase.co';
            const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3VuaW9tdXl0eXpyZmNwYmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDAxNTQsImV4cCI6MjA4MjU3NjE1NH0.cLEcnoEXy4dANZya-pr3PYIYrgwE8eDFbULl8r0-ybM';
            
            const url = `${supabaseUrl}/rest/v1/whatsapp_settings?select=*&limit=1`;
            const response = await fetch(url, {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    return {
                        url_api: data[0].url_api,
                        instancia_id: data[0].instancia_id,
                        instancia_token: data[0].instancia_token,
                        client_token: data[0].client_token
                    };
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Erro ao buscar configurações do WhatsApp:', error);
            return null;
        }
    }
    
    // Função helper para verificar se o contexto da extensão ainda é válido
    function isExtensionContextValid() {
        try {
            // Tenta acessar chrome.runtime para verificar se o contexto ainda é válido
            return typeof chrome !== 'undefined' && 
                   chrome.runtime && 
                   chrome.runtime.id !== undefined;
        } catch (e) {
            return false;
        }
    }
    
    // Função helper para usar chrome.storage com verificação de contexto
    function safeStorageGet(keys, callback) {
        if (!isExtensionContextValid()) {
            return;
        }
        
        try {
            chrome.storage.local.get(keys, (result) => {
                if (chrome.runtime.lastError) {
                    // Contexto inválido, para de tentar
                    return;
                }
                callback(result);
            });
        } catch (e) {
            // Contexto inválido, ignora
        }
    }
    
    function safeStorageSet(data, callback) {
        if (!isExtensionContextValid()) {
            return;
        }
        
        try {
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    // Contexto inválido, para de tentar
                    return;
                }
                if (callback) callback();
            });
        } catch (e) {
            // Contexto inválido, ignora
        }
    }
    
    // Listener para mensagens do content script (via storage)
    if (typeof chrome !== 'undefined' && chrome.storage && isExtensionContextValid()) {
        try {
            chrome.storage.onChanged.addListener((changes, areaName) => {
                if (!isExtensionContextValid()) {
                    return;
                }
                
                if (areaName === 'local' && changes.pendingLogs) {
                    const newLogs = changes.pendingLogs.newValue || [];
                    const oldLogs = changes.pendingLogs.oldValue || [];
                    
                    if (newLogs.length > oldLogs.length) {
                        const addedLogs = newLogs.slice(oldLogs.length);
                        addedLogs.forEach(log => {
                            addLog(log.message, log.level);
                        });
                        
                        // Limpa logs pendentes após processar
                        safeStorageSet({ pendingLogs: [] });
                    }
                }
            });
        } catch (e) {
            // Contexto inválido, ignora
        }
        
        // Polling alternativo para logs (fallback)
        let pollingInterval = setInterval(() => {
            if (!isExtensionContextValid()) {
                // Para o polling se o contexto ficar inválido
                clearInterval(pollingInterval);
                return;
            }
            
            safeStorageGet(['pendingLogs'], (result) => {
                if (result && result.pendingLogs && result.pendingLogs.length > 0) {
                    result.pendingLogs.forEach(log => {
                        addLog(log.message, log.level);
                    });
                    
                    // Limpa logs pendentes após processar
                    safeStorageSet({ pendingLogs: [] });
                }
            });
        }, 500);
    }
    
    // Função para atualizar o countdown
    function updateCountdown(secondsRemaining) {
        const countdownTimeEl = document.getElementById('imobflash-countdown-time');
        if (!countdownTimeEl) return;
        
        if (secondsRemaining === null || secondsRemaining === undefined || secondsRemaining < 0) {
            countdownTimeEl.textContent = '--:--';
            return;
        }
        
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        countdownTimeEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Atualiza o countdown a cada segundo (fallback caso content.js não esteja atualizando)
    setInterval(() => {
        // Busca o tempo restante do window (será definido pelo content.js)
        if (window.imobflashRefreshTimeRemaining !== undefined && window.imobflashRefreshTimeRemaining !== null) {
            updateCountdown(window.imobflashRefreshTimeRemaining);
        } else {
            // Se não há valor definido, tenta ler do DOM diretamente
            const countdownTimeEl = document.getElementById('imobflash-countdown-time');
            if (countdownTimeEl && countdownTimeEl.textContent === '--:--') {
                // Se ainda está em --:--, não faz nada (aguarda content.js atualizar)
            }
        }
    }, 1000);
    
    // Expõe função para atualizar countdown via mensagem
    window.updateRefreshCountdown = function(secondsRemaining) {
        window.imobflashRefreshTimeRemaining = secondsRemaining;
        updateCountdown(secondsRemaining);
    };

    console.log('✅ ImobFlash Agent Overlay ativado');
})();

