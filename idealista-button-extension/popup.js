// Popup script para ImobFlash Agent

// Importa módulo de autenticação (se estiver em arquivo separado)
// Se não, as funções devem estar definidas aqui ou importadas

document.addEventListener('DOMContentLoaded', async () => {
    // Verifica se está logado
    const loggedInAgent = await checkLogin();
    
    if (loggedInAgent) {
        // Mostra tela principal
        showMainScreen();
    } else {
        // Mostra tela de login
        showLoginScreen();
    }
});

// Flag para evitar múltiplos listeners
let loginFormConfigured = false;

/**
 * Mostra a tela de login
 */
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('main-screen').style.display = 'none';
    
    // Preenche automaticamente com usuário padrão (apenas para desenvolvimento)
    // TODO: Remover em produção
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    if (emailInput && passwordInput) {
        emailInput.value = 'eduardo@moreira.com';
        passwordInput.value = '123456';
    }
    
    // Configura formulário de login apenas uma vez
    if (!loginFormConfigured) {
        const loginForm = document.getElementById('login-form');
        const loginError = document.getElementById('login-error');
        
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                showLoginError('Por favor, preencha email e senha');
                return;
            }
            
            // Desabilita botão durante login
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span><span class="icon">⏳</span>Entrando...</span>';
            loginError.style.display = 'none';
            
            // Faz login
            const result = await loginAgent(email, password);
            
            if (result.success) {
                // Login bem-sucedido, mostra tela principal
                showMainScreen();
            } else {
                // Mostra erro
                showLoginError(result.error || 'Erro ao fazer login');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<span><span class="icon">🔐</span>Entrar</span>';
            }
        });
        
        loginFormConfigured = true;
    }
}

/**
 * Mostra a tela principal
 */
function showMainScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-screen').style.display = 'block';
    
    // Configura botões
    setupMainScreenButtons();
}

/**
 * Configura botões da tela principal
 */
function setupMainScreenButtons() {
    const idealistaBtn = document.getElementById('idealista-btn');
    const loading = document.getElementById('loading');
    const logoutBtn = document.getElementById('logout-btn');
    const settingsBtn = document.getElementById('settings-btn');

    // Botão Idealista
    idealistaBtn.addEventListener('click', async () => {
        try {
            // Mostra loading
            loading.classList.add('active');
            idealistaBtn.disabled = true;

            // Envia mensagem para o background script abrir a aba
            const response = await chrome.runtime.sendMessage({
                action: 'openIdealista',
                url: 'https://www.idealista.pt/conversations'
            });

            if (response.success) {
                // Fecha a popup após abrir a aba
                window.close();
            } else {
                console.error('Erro ao abrir Idealista:', response.error);
                alert('Erro ao abrir Idealista: ' + (response.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao abrir Idealista: ' + error.message);
        } finally {
            loading.classList.remove('active');
            idealistaBtn.disabled = false;
        }
    });

    // Desabilita botões que ainda não estão implementados
    ['olx', 'supercasa', 'instagram', 'facebook'].forEach(site => {
        const btn = document.getElementById(`${site}-btn`);
        if (btn) {
            btn.addEventListener('click', () => {
                alert(`${site.charAt(0).toUpperCase() + site.slice(1)} será implementado em breve!`);
            });
        }
    });

    // Botão de logs
    const logsBtn = document.getElementById('logs-btn');
    if (logsBtn) {
        logsBtn.addEventListener('click', async () => {
            try {
                // Abre popup de logs
                await chrome.windows.create({
                    url: chrome.runtime.getURL('logs-popup.html'),
                    type: 'popup',
                    width: 600,
                    height: 600
                });
            } catch (error) {
                console.error('Erro ao abrir logs:', error);
                alert('Erro ao abrir logs: ' + error.message);
            }
        });
    }

    // Botão de logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (confirm('Deseja realmente sair? Todas as abas abertas pela extensão serão fechadas.')) {
                try {
                    // Fecha todas as abas abertas pela extensão (via background script)
                    const response = await chrome.runtime.sendMessage({ action: 'closeExtensionTabs' });
                    
                    if (response && response.success) {
                        console.log(`✅ ${response.closed || 0} aba(s) fechada(s)`);
                    }
                    
                    // Também tenta fechar localmente (fallback)
                    if (typeof closeExtensionTabs === 'function') {
                        await closeExtensionTabs();
                    }
                } catch (error) {
                    console.error('Erro ao fechar abas:', error);
                    // Continua com o logout mesmo se houver erro ao fechar abas
                }
                
                // Faz logout
                await logoutAgent();
                
                // Mostra tela de login
                showLoginScreen();
            }
        });
    }

    // Botão de configurações
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            // Abre página de configurações do dashboard (ajuste a URL conforme necessário)
            // Se o dashboard estiver hospedado online, use a URL completa
            chrome.tabs.create({
                url: 'http://localhost:8000/pages/settings.html' // Ajuste conforme sua configuração
            });
        });
    }
}

/**
 * Mostra erro de login
 */
function showLoginError(message) {
    const loginError = document.getElementById('login-error');
    if (loginError) {
        loginError.textContent = message;
        loginError.style.display = 'block';
    }
}

