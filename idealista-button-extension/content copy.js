(function() {
    'use strict';

    // ============================================================================
    // CONSTANTES
    // ============================================================================
    const WHATSAPP_BUTTON_ID = 'whatsapp-button-idealista-unique';
    const PHONE_LABEL_ID = 'phone-label-idealista-unique';
    const DELAY_BEFORE_CLICK = 300;
    const DELAY_BEFORE_EXTRACT = 400;
    const DELAY_BEFORE_PROCESS = 600;
    const MAX_EXTRACTION_ATTEMPTS = 60;
    const RETRY_CLICK_ATTEMPT = 25;

    // ============================================================================
    // SELEÇÃO DE ELEMENTOS DOM
    // ============================================================================

    /**
     * Encontra o botão de telefone no header da conversa
     * @returns {HTMLElement|null} Botão de telefone ou null se não encontrado
     */
    function findPhoneButton() {
        const buttons = document.querySelectorAll('button[aria-label*="telefone" i], button[aria-label*="phone" i]');
        for (const btn of buttons) {
            const svg = btn.querySelector('svg path');
            if (svg) {
                const pathD = svg.getAttribute('d') || '';
                if ((pathD.includes('17.05') && pathD.includes('19.68')) ||
                    (pathD.includes('3.21') && pathD.includes('8.1'))) {
                    return btn;
                }
            }
        }
        return null;
    }

    /**
     * Obtém o header da conversa atual
     * @returns {HTMLElement|null} Header da conversa ou null
     */
    function getConversationHeader() {
        return document.querySelector('[data-testid="conversation-detail-header-component"]');
    }

    /**
     * Obtém o nome do remetente da conversa atual
     * @returns {string|null} Nome do remetente ou null
     */
    function getCurrentUserName() {
        const header = getConversationHeader();
        return header?.querySelector('[data-testid="testId"]')?.textContent?.trim() || null;
    }

    // ============================================================================
    // EXTRAÇÃO DE DADOS
    // ============================================================================

    /**
     * Extrai o número de telefone do menu dropdown
     * @param {string} menuId - ID do menu dropdown
     * @returns {string|null} Número de telefone ou null
     */
    function extractPhoneNumber(menuId) {
        if (!menuId) return null;
        
        const menu = document.getElementById(menuId);
        if (!menu) return null;

        const telLink = menu.querySelector('a[href^="tel:"]');
        if (!telLink) return null;

        const href = telLink.getAttribute('href');
        if (!href) return null;
        
        const phoneNumber = href.replace('tel:', '');
        
        // Valida se o número tem pelo menos 9 dígitos
        return (phoneNumber && phoneNumber.length >= 9) ? phoneNumber : null;
    }

    /**
     * Formata número de telefone para exibição
     * @param {string} phoneNumber - Número de telefone bruto
     * @returns {string} Número formatado
     */
    function formatPhoneNumber(phoneNumber) {
        let formatted = phoneNumber.replace(/\+/g, '');
        
        if (formatted.startsWith('351')) {
            formatted = '+351 ' + formatted.substring(3).replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        } else {
            formatted = formatted.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
        }
        
        return formatted;
    }

    // ============================================================================
    // CRIAÇÃO E ATUALIZAÇÃO DE UI
    // ============================================================================

    /**
     * Cria o botão WhatsApp único
     * @param {HTMLElement} phoneButton - Botão de telefone de referência
     * @returns {HTMLElement} Botão WhatsApp criado
     */
    function createWhatsAppButton(phoneButton) {
        const button = document.createElement('button');
        button.id = WHATSAPP_BUTTON_ID;
        button.className = 'whatsapp-button-idealista';
        button.setAttribute('aria-label', 'Abrir WhatsApp');
        button.type = 'button';
        button.disabled = true; // Começa desabilitado até o número ser extraído

        button.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            margin-left: 8px;
            background: #25D366;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: not-allowed;
            opacity: 0.5;
            pointer-events: none;
            transition: background-color 0.2s, opacity 0.2s;
        `;

        button.onmouseover = () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#20BA5A';
            }
        };
        button.onmouseout = () => {
            if (!button.disabled) {
                button.style.backgroundColor = '#25D366';
            }
        };

        button.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="display: block;">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
        `;

        // Insere ao lado do botão de telefone
        if (phoneButton?.parentElement) {
            phoneButton.parentElement.insertBefore(button, phoneButton.nextSibling);
        }

        return button;
    }

    /**
     * Obtém ou cria o botão WhatsApp único
     * @param {HTMLElement} phoneButton - Botão de telefone de referência
     * @returns {HTMLElement} Botão WhatsApp
     */
    function getOrCreateWhatsAppButton(phoneButton) {
        let button = document.getElementById(WHATSAPP_BUTTON_ID);
        
        if (!button) {
            button = createWhatsAppButton(phoneButton);
        } else if (phoneButton?.parentElement && button.parentElement !== phoneButton.parentElement) {
            // Reposiciona se necessário
            phoneButton.parentElement.insertBefore(button, phoneButton.nextSibling);
        }
        
        return button;
    }

    /**
     * Cria a label de telefone única
     * @param {HTMLElement} phoneButton - Botão de telefone de referência
     * @returns {HTMLElement} Label criada
     */
    function createPhoneLabel(phoneButton) {
        const label = document.createElement('span');
        label.id = PHONE_LABEL_ID;
        label.className = 'phone-number-label-idealista';
        label.style.cssText = `
            display: none;
            align-items: center;
            margin-left: 8px;
            padding: 4px 8px;
            font-size: 14px;
            color: var(--color-core-content-primary, #333);
            font-weight: 500;
        `;

        // Insere após o botão WhatsApp ou após o botão de telefone
        const whatsappButton = document.getElementById(WHATSAPP_BUTTON_ID);
        if (whatsappButton?.parentElement) {
            whatsappButton.parentElement.insertBefore(label, whatsappButton.nextSibling);
        } else if (phoneButton?.parentElement) {
            phoneButton.parentElement.insertBefore(label, phoneButton.nextSibling);
        }

        return label;
    }

    /**
     * Obtém ou cria a label de telefone única
     * @param {HTMLElement} phoneButton - Botão de telefone de referência
     * @returns {HTMLElement} Label de telefone
     */
    function getOrCreatePhoneLabel(phoneButton) {
        let label = document.getElementById(PHONE_LABEL_ID);
        
        if (!label) {
            label = createPhoneLabel(phoneButton);
        } else {
            // Garante que a label está oculta
            label.style.display = 'none';
            
            // Reposiciona se necessário
            const whatsappButton = document.getElementById(WHATSAPP_BUTTON_ID);
            if (whatsappButton?.parentElement && label.parentElement !== whatsappButton.parentElement) {
                whatsappButton.parentElement.insertBefore(label, whatsappButton.nextSibling);
            }
        }
        
        return label;
    }

    /**
     * Desabilita o botão WhatsApp
     */
    function disableWhatsAppButton() {
        const button = document.getElementById(WHATSAPP_BUTTON_ID);
        if (button) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.style.pointerEvents = 'none';
        }
    }

    /**
     * Habilita o botão WhatsApp
     */
    function enableWhatsAppButton() {
        const button = document.getElementById(WHATSAPP_BUTTON_ID);
        if (button) {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.style.pointerEvents = 'auto';
        }
    }

    /**
     * Atualiza o botão WhatsApp com o novo número
     * @param {HTMLElement} phoneButton - Botão de telefone de referência
     * @param {string} phoneNumber - Número de telefone
     */
    function updateWhatsAppButton(phoneButton, phoneNumber) {
        const cleanNumber = phoneNumber.replace(/\+/g, '');
        const button = getOrCreateWhatsAppButton(phoneButton);
        
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        };
        button.dataset.phoneNumber = cleanNumber;
        
        // Habilita o botão após atualizar o número
        enableWhatsAppButton();
    }

    /**
     * Atualiza a label de telefone com o novo número
     * @param {HTMLElement} phoneButton - Botão de telefone de referência
     * @param {string} phoneNumber - Número de telefone
     */
    function updatePhoneLabel(phoneButton, phoneNumber) {
        const formatted = formatPhoneNumber(phoneNumber);
        const label = getOrCreatePhoneLabel(phoneButton);
        
        label.textContent = formatted;
    }

    /**
     * Esconde o menu dropdown
     * @param {string} menuId - ID do menu
     */
    function hideMenu(menuId) {
        const menu = document.getElementById(menuId);
        if (menu) {
            menu.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; position: absolute !important; left: -9999px !important;';
        }
    }

    /**
     * Ajusta o layout do container pai para flex
     * @param {HTMLElement} element - Elemento cujo pai será ajustado
     */
    function adjustParentLayout(element) {
        const parent = element?.parentElement;
        if (parent && window.getComputedStyle(parent).display !== 'flex') {
            parent.style.display = 'flex';
            parent.style.alignItems = 'center';
            parent.style.gap = '8px';
        }
    }

    // ============================================================================
    // LÓGICA DE PROCESSAMENTO
    // ============================================================================

    /**
     * Extrai o número e atualiza os elementos UI
     * @param {HTMLElement} phoneButton - Botão de telefone
     */
    function extractAndUpdate(phoneButton) {
        const currentUserName = getCurrentUserName();
        let attempts = 0;

        const tryExtract = () => {
            attempts++;

            if (attempts > MAX_EXTRACTION_ATTEMPTS) {
                return;
            }

            // Verifica se ainda estamos na mesma conversa
            const userNameNow = getCurrentUserName();
            if (currentUserName && userNameNow && currentUserName !== userNameNow) {
                return;
            }

            // Busca o botão atual novamente
            const currentPhoneButton = findPhoneButton();
            if (!currentPhoneButton || currentPhoneButton !== phoneButton) {
                return;
            }

            const menuId = currentPhoneButton.getAttribute('aria-controls');
            if (!menuId) {
                setTimeout(tryExtract, 100);
                return;
            }
            
            const phoneNumber = extractPhoneNumber(menuId);
            
            if (phoneNumber) {
                hideMenu(menuId);
                currentPhoneButton.setAttribute('aria-expanded', 'false');

                updateWhatsAppButton(currentPhoneButton, phoneNumber);
                updatePhoneLabel(currentPhoneButton, phoneNumber);
                adjustParentLayout(currentPhoneButton);
            } else {
                // Tenta clicar novamente após algumas tentativas
                if (attempts === RETRY_CLICK_ATTEMPT && currentPhoneButton.getAttribute('aria-expanded') !== 'true') {
                    currentPhoneButton.click();
                }
                setTimeout(tryExtract, 150);
            }
        };

        setTimeout(tryExtract, DELAY_BEFORE_EXTRACT);
    }

    /**
     * Processa a conversa atual: clica no telefone e extrai o número
     */
    function processConversation() {
        const phoneButton = findPhoneButton();
        if (!phoneButton) {
            return;
        }

        // Fecha menu aberto se houver
        if (phoneButton.getAttribute('aria-expanded') === 'true') {
            phoneButton.click();
        }

        setTimeout(() => {
            const currentPhoneButton = findPhoneButton();
            if (!currentPhoneButton) {
                return;
            }

            const menuId = currentPhoneButton.getAttribute('aria-controls');
            if (!menuId) {
                return;
            }

            currentPhoneButton.click();
            extractAndUpdate(currentPhoneButton);
        }, DELAY_BEFORE_CLICK);
    }

    // ============================================================================
    // DETECÇÃO DE MUDANÇAS
    // ============================================================================

    let lastConversationId = null;

    /**
     * Verifica se a conversa mudou
     * @returns {{changed: boolean, userName: string|null}} Informações sobre a mudança
     */
    function checkConversationChange() {
        const userName = getCurrentUserName();
        
        if (userName && userName !== lastConversationId) {
            const previousName = lastConversationId;
            lastConversationId = userName;
            return { changed: true, userName, previousName };
        }
        
        return { changed: false, userName };
    }

    /**
     * Processa mudança de conversa
     * @param {string} userName - Nome do remetente
     */
    function handleConversationChange(userName) {
        console.log('📨 Mensagem mudou! Remetente:', userName);
        console.log('📞 Clicando no telefone para a mensagem de:', userName);
        
        // Desabilita o botão WhatsApp enquanto atualiza o número
        disableWhatsAppButton();
        
        processConversation();
    }

    // ============================================================================
    // OBSERVERS E LISTENERS
    // ============================================================================

    let processingTimeout = null;

    /**
     * Observer para detectar mudanças no DOM da conversa
     */
    const conversationObserver = new MutationObserver(() => {
        const changeInfo = checkConversationChange();
        if (changeInfo.changed) {
            if (processingTimeout) {
                clearTimeout(processingTimeout);
            }
            
            processingTimeout = setTimeout(() => {
                handleConversationChange(changeInfo.userName);
            }, DELAY_BEFORE_PROCESS);
        }
    });

    /**
     * Listener para detectar cliques diretos em mensagens da lista
     */
    function setupMessageClickListeners() {
        document.addEventListener('click', (e) => {
            let target = e.target;
            let conversationItem = null;
            
            // Procura elemento com data-conversation-id
            for (let i = 0; i < 10 && target; i++) {
                if (target.hasAttribute?.('data-conversation-id')) {
                    conversationItem = target;
                    break;
                }
                target = target.parentElement;
            }
            
            if (conversationItem) {
                const conversationId = conversationItem.getAttribute('data-conversation-id');
                console.log('🖱️ Clique detectado na mensagem (conversation-id:', conversationId + ')');
                
                setTimeout(() => {
                    const changeInfo = checkConversationChange();
                    if (changeInfo.changed) {
                        handleConversationChange(changeInfo.userName);
                    }
                }, DELAY_BEFORE_CLICK);
            }
        }, true);
    }

    // ============================================================================
    // INICIALIZAÇÃO
    // ============================================================================

    /**
     * Inicializa a extensão
     */
    function init() {
        // Processa conversa atual
        setTimeout(processConversation, 1500);

        // Observa mudanças no DOM
        const conversationContainer = document.querySelector('[data-testid="conversation-detail-component"]');
        if (conversationContainer) {
            conversationObserver.observe(conversationContainer, {
                childList: true,
                subtree: true
            });
        }
        
        // Configura listeners para cliques
        setupMessageClickListeners();
    }

    // Inicia quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }
})();
