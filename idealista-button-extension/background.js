// Background script para gerenciar abas e verificar login

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openIdealista') {
        handleOpenIdealista(request.url)
            .then(result => sendResponse(result))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Indica que vamos responder assincronamente
    }
    
    // Repassa logs para popups abertos (broadcast via storage)
    if (request.type === 'log') {
        // Usa storage como broadcast mechanism
        const logEntry = {
            time: Date.now(),
            message: request.message,
            level: request.level || 'info'
        };
        
        // Salva no storage para que o popup possa ler
        chrome.storage.local.get(['pendingLogs'], (result) => {
            const pendingLogs = result.pendingLogs || [];
            pendingLogs.push(logEntry);
            
            // Mantém apenas os últimos 100 logs pendentes
            if (pendingLogs.length > 100) {
                pendingLogs.shift();
            }
            
            chrome.storage.local.set({ pendingLogs: pendingLogs });
        });
    }
});

/**
 * Abre ou encontra a aba do Idealista e verifica login
 */
async function handleOpenIdealista(url) {
    try {
        // Procura se já existe uma aba aberta com o Idealista
        const tabs = await chrome.tabs.query({ url: 'https://www.idealista.pt/*' });
        
        if (tabs.length > 0) {
            // Se já existe, ativa a aba e verifica se está na página de conversas
            const tab = tabs[0];
            
            // Ativa a aba
            await chrome.tabs.update(tab.id, { active: true });
            await chrome.windows.update(tab.windowId, { focused: true });
            
            // Verifica se está na página de conversas, se não, navega
            if (!tab.url.includes('/conversations')) {
                await chrome.tabs.update(tab.id, { url: url });
                // Aguarda a página carregar
                await waitForTabLoad(tab.id);
            }
            
            // Verifica login e navega se necessário
            await checkAndNavigateToConversations(tab.id);
            
            return { success: true, tabId: tab.id };
        } else {
            // Cria nova aba
            const tab = await chrome.tabs.create({ url: url, active: true });
            
            // Aguarda a página carregar
            await waitForTabLoad(tab.id);
            
            // Verifica login e navega se necessário
            await checkAndNavigateToConversations(tab.id);
            
            return { success: true, tabId: tab.id };
        }
    } catch (error) {
        console.error('Erro ao abrir Idealista:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Aguarda a aba carregar completamente
 */
function waitForTabLoad(tabId) {
    return new Promise((resolve) => {
        const listener = (updatedTabId, changeInfo) => {
            if (updatedTabId === tabId && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                // Aguarda um pouco mais para garantir que o DOM está pronto
                setTimeout(resolve, 1000);
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

/**
 * Verifica se está logado e navega para conversations se necessário
 */
async function checkAndNavigateToConversations(tabId) {
    try {
        // Injeta script para verificar se está logado
        const results = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: checkLoginStatus
        });

        const isLoggedIn = results[0]?.result?.isLoggedIn || false;
        const currentUrl = results[0]?.result?.currentUrl || '';

        if (!isLoggedIn) {
            // Se não está logado, navega para a página de login
            if (!currentUrl.includes('/login')) {
                await chrome.tabs.update(tabId, { url: 'https://www.idealista.pt/login' });
                await waitForTabLoad(tabId);
            }
            
            // Aguarda o usuário fazer login (verifica a cada 2 segundos)
            await waitForLogin(tabId);
        }

        // Após login confirmado, navega para conversations se não estiver lá
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url.includes('/conversations')) {
            await chrome.tabs.update(tabId, { url: 'https://www.idealista.pt/conversations' });
            await waitForTabLoad(tabId);
        }

        // Injeta o overlay/panel que cobre toda a página
        await injectOverlay(tabId);
    } catch (error) {
        console.error('Erro ao verificar login:', error);
        throw error;
    }
}

/**
 * Função injetada para verificar status de login
 */
function checkLoginStatus() {
    const currentUrl = window.location.href;
    const isOnLoginPage = currentUrl.includes('/login') || currentUrl.includes('/loginremember');
    const isOnConversationsPage = currentUrl.includes('/conversations');
    
    // Se está na página de conversations, provavelmente está logado
    if (isOnConversationsPage) {
        // Verifica se há elementos que indicam que está logado
        const hasUserMenu = !!document.querySelector('[data-testid="user-menu"], .user-menu, [class*="user"], [class*="profile"], [class*="account"]');
        const hasLogoutButton = !!document.querySelector('a[href*="logout"], button[class*="logout"]');
        const hasChatButton = !!document.querySelector('[data-testid="conversation-list-component"], [class*="conversation"]');
        
        return {
            isLoggedIn: hasUserMenu || hasLogoutButton || hasChatButton,
            currentUrl: currentUrl
        };
    }
    
    // Se está na página de login, não está logado
    if (isOnLoginPage) {
        return {
            isLoggedIn: false,
            currentUrl: currentUrl
        };
    }
    
    // Para outras páginas, verifica elementos de login
    const hasUserMenu = !!document.querySelector('[data-testid="user-menu"], .user-menu, [class*="user"], [class*="profile"], [class*="account"]');
    const hasLogoutButton = !!document.querySelector('a[href*="logout"], button[class*="logout"]');
    
    return {
        isLoggedIn: hasUserMenu || hasLogoutButton,
        currentUrl: currentUrl
    };
}

/**
 * Aguarda o usuário fazer login
 */
function waitForLogin(tabId, maxAttempts = 60) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkLogin = async () => {
            attempts++;
            
            try {
                const results = await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: checkLoginStatus
                });

                const isLoggedIn = results[0]?.result?.isLoggedIn || false;
                
                if (isLoggedIn) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Timeout aguardando login'));
                } else {
                    setTimeout(checkLogin, 2000); // Verifica a cada 2 segundos
                }
            } catch (error) {
                reject(error);
            }
        };
        
        checkLogin();
    });
}

/**
 * Injeta overlay que cobre toda a página
 */
async function injectOverlay(tabId) {
    try {
        // Verifica se está na página de conversations antes de injetar
        const tab = await chrome.tabs.get(tabId);
        if (!tab.url.includes('/conversations')) {
            console.log('Não está na página de conversations, não injetando overlay');
            return;
        }

        // Marca no storage que o overlay deve estar ativo para esta aba
        await chrome.storage.local.set({ 
            [`overlay_active_${tabId}`]: true 
        });

        // Aguarda um pouco para garantir que a página está totalmente carregada
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Injeta CSS primeiro para garantir que os estilos estejam disponíveis
        await chrome.scripting.insertCSS({
            target: { tabId: tabId },
            files: ['overlay.css']
        });
        
        // Aguarda um pouco para o CSS ser aplicado
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: ['overlay.js']
        });
        
        console.log('✅ Overlay injetado com sucesso');
    } catch (error) {
        console.error('Erro ao injetar overlay:', error);
        // Não lança erro para não bloquear o fluxo
    }
}

// Listener para reinjetar overlay após refresh/navegação
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // Verifica se a página terminou de carregar e está na página de conversations
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('/conversations')) {
        // Verifica se o overlay deve estar ativo para esta aba
        const storage = await chrome.storage.local.get([`overlay_active_${tabId}`]);
        if (storage[`overlay_active_${tabId}`]) {
            // Aguarda um pouco para garantir que o DOM está pronto
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Reinjeta o overlay
            try {
                // Injeta CSS primeiro
                await chrome.scripting.insertCSS({
                    target: { tabId: tabId },
                    files: ['overlay.css']
                });
                
                // Aguarda um pouco para o CSS ser aplicado
                await new Promise(resolve => setTimeout(resolve, 100));
                
                await chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['overlay.js']
                });
                
                console.log('✅ Overlay reinjetado após refresh/navegação');
            } catch (error) {
                // Se der erro (ex: página ainda não está pronta), tenta novamente após um delay
                console.log('⚠️ Tentando reinjetar overlay novamente...');
                setTimeout(async () => {
                    try {
                        // Injeta CSS primeiro
                        await chrome.scripting.insertCSS({
                            target: { tabId: tabId },
                            files: ['overlay.css']
                        });
                        
                        // Aguarda um pouco para o CSS ser aplicado
                        await new Promise(resolve => setTimeout(resolve, 100));
                        
                        await chrome.scripting.executeScript({
                            target: { tabId: tabId },
                            files: ['overlay.js']
                        });
                        
                        console.log('✅ Overlay reinjetado após retry');
                    } catch (retryError) {
                        console.error('❌ Erro ao reinjetar overlay após retry:', retryError);
                    }
                }, 2000);
            }
        }
    }
});

