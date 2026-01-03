// Logs popup script para exibir logs em tempo real

let autoScroll = true;
let logs = [];

// Função para formatar timestamp
function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// Função para determinar nível do log
function getLogLevel(message) {
    if (message.includes('❌') || message.includes('Erro') || message.includes('ERROR')) {
        return 'error';
    }
    if (message.includes('⚠️') || message.includes('Aviso') || message.includes('WARNING')) {
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
    
    // Limita a 1000 logs
    if (logs.length > 1000) {
        logs.shift();
    }
    
    renderLogs();
}

// Função para renderizar logs
function renderLogs() {
    const container = document.getElementById('logs-container');
    
    if (logs.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📝</div>
                <p>Aguardando logs...</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = logs.map(log => {
        const time = formatTime(log.time);
        const levelClass = `log-level-${log.level}`;
        return `
            <div class="log-entry">
                <span class="log-time">[${time}]</span>
                <span class="${levelClass}">${escapeHtml(log.message)}</span>
            </div>
        `;
    }).join('');
    
    // Auto-scroll para o final
    if (autoScroll) {
        container.scrollTop = container.scrollHeight;
    }
}

// Função para escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Função para limpar logs
function clearLogs() {
    logs = [];
    renderLogs();
}

// Listener para mensagens do background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'log') {
        addLog(message.message, message.level);
    }
    return true; // Mantém o canal aberto para respostas assíncronas
});

// Monitora storage para novos logs
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.pendingLogs) {
        const newLogs = changes.pendingLogs.newValue || [];
        const oldLogs = changes.pendingLogs.oldValue || [];
        
        // Adiciona apenas os novos logs
        if (newLogs.length > oldLogs.length) {
            const addedLogs = newLogs.slice(oldLogs.length);
            addedLogs.forEach(log => {
                addLog(log.message, log.level);
            });
            
            // Limpa logs pendentes após processar
            chrome.storage.local.set({ pendingLogs: [] });
        }
    }
});

// Polling alternativo para logs (fallback)
setInterval(() => {
    chrome.storage.local.get(['pendingLogs'], (result) => {
        if (result.pendingLogs && result.pendingLogs.length > 0) {
            result.pendingLogs.forEach(log => {
                addLog(log.message, log.level);
            });
            
            // Limpa logs pendentes após processar
            chrome.storage.local.set({ pendingLogs: [] });
        }
    });
}, 500); // Verifica a cada 500ms

// Carrega logs salvos do storage
chrome.storage.local.get(['logs'], (result) => {
    if (result.logs && Array.isArray(result.logs)) {
        logs = result.logs.slice(-500); // Carrega últimos 500 logs
        renderLogs();
    }
});

// Salva logs periodicamente
setInterval(() => {
    if (logs.length > 0) {
        chrome.storage.local.set({ logs: logs.slice(-500) });
    }
}, 5000);

// Botões
document.getElementById('clear-btn').addEventListener('click', () => {
    clearLogs();
    chrome.storage.local.remove('logs');
});

document.getElementById('auto-scroll-btn').addEventListener('click', () => {
    autoScroll = !autoScroll;
    document.getElementById('auto-scroll-btn').textContent = 
        `Auto-scroll: ${autoScroll ? 'ON' : 'OFF'}`;
    
    if (autoScroll) {
        const container = document.getElementById('logs-container');
        container.scrollTop = container.scrollHeight;
    }
});

// Inicializa
renderLogs();

