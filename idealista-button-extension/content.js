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

    // Flag para indicar se o clique foi simulado (automático)
    let isSimulatedClick = false;

    // ============================================================================
    // SELEÇÃO DE ELEMENTOS DOM
    // ============================================================================

    /**
     * Encontra o botão de telefone no header da conversa
     * @returns {HTMLElement|null} Botão de telefone ou null se não encontrado
     */
    function findPhoneButton() {
        // Tenta múltiplos seletores para encontrar o botão de telefone
        const header = getConversationHeader();
        if (!header) {
            console.log('ℹ️ Header da conversa não encontrado');
            return null;
        }

        // 1. Busca no header da conversa
        let buttons = header.querySelectorAll('button[aria-label*="telefone" i], button[aria-label*="phone" i]');
        if (buttons.length === 0) {
            // 2. Busca qualquer botão com ícone de telefone no header
            buttons = header.querySelectorAll('button');
        }
        
        for (const btn of buttons) {
            // Verifica se tem aria-label relacionado a telefone
            const ariaLabel = btn.getAttribute('aria-label') || '';
            if (ariaLabel.toLowerCase().includes('telefone') || ariaLabel.toLowerCase().includes('phone')) {
                return btn;
            }
            
            // Verifica se tem SVG com path de telefone
            const svg = btn.querySelector('svg path');
            if (svg) {
                const pathD = svg.getAttribute('d') || '';
                if ((pathD.includes('17.05') && pathD.includes('19.68')) ||
                    (pathD.includes('3.21') && pathD.includes('8.1')) ||
                    pathD.includes('M10') && pathD.includes('M20')) {
                    return btn;
                }
            }
        }
        
        // 3. Busca alternativa: qualquer botão no header que possa ser o telefone
        const allButtons = header.querySelectorAll('button');
        for (const btn of allButtons) {
            // Verifica se o botão tem um menu associado (aria-controls)
            const ariaControls = btn.getAttribute('aria-controls');
            if (ariaControls && ariaControls.startsWith('kiwi-menu-')) {
                // Verifica se o menu contém um link tel:
                const menu = document.getElementById(ariaControls);
                if (menu && menu.querySelector('a[href^="tel:"]')) {
                    return btn;
                }
            }
        }
        
        console.log('⚠️ Botão de telefone não encontrado no header');
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

    /**
     * Obtém o ID da conversa atual
     * @returns {string|null} ID da conversa ou null
     */
    function getCurrentConversationId() {
        const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
        if (!activeButton) return null;
        
        const activeLi = activeButton.closest('li[data-conversation-id]');
        return activeLi?.getAttribute('data-conversation-id') || null;
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
        
        if (!button) {
            console.error('❌ Não foi possível obter/criar botão WhatsApp');
            return;
        }
        
        button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.open(`https://wa.me/${cleanNumber}`, '_blank');
        };
        
        // Salva o número no dataset (usando setAttribute para garantir)
        button.setAttribute('data-phone-number', cleanNumber);
        button.dataset.phoneNumber = cleanNumber;
        
        console.log('✅ Botão WhatsApp atualizado com phoneNumber:', cleanNumber);
        console.log('🔍 Verificação - dataset.phoneNumber:', button.dataset.phoneNumber);
        console.log('🔍 Verificação - getAttribute:', button.getAttribute('data-phone-number'));
        
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
     * Esconde o menu imediatamente quando detectado
     * @param {HTMLElement} menu - Elemento do menu
     */
    function hideMenuImmediately(menu) {
        if (!menu || !isSimulatedClick) {
            return;
        }

        // Aplica estilos para esconder completamente
        menu.style.setProperty('display', 'none', 'important');
        menu.style.setProperty('visibility', 'hidden', 'important');
        menu.style.setProperty('opacity', '0', 'important');
        menu.style.setProperty('position', 'absolute', 'important');
        menu.style.setProperty('left', '-9999px', 'important');
        menu.style.setProperty('pointer-events', 'none', 'important');
        
        // Também aplica via cssText como fallback
        menu.style.cssText += 'display: none !important; visibility: hidden !important; opacity: 0 !important; position: absolute !important; left: -9999px !important; pointer-events: none !important;';
        
        console.log('✅ Menu escondido:', menu.id || 'sem-id');
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
                
                // Atualiza cache local e banco de dados apenas se mudou
                const conversationId = getCurrentConversationId();
                if (conversationId) {
                    const cached = conversationCache.get(conversationId);
                    const cachedPhoneNumber = cached?.phoneNumber || '';
                    
                    // Só atualiza no banco se o número mudou
                    if (phoneNumber !== cachedPhoneNumber && typeof updateConversation !== 'undefined') {
                        console.log('🔄 PhoneNumber extraído mudou, atualizando no Supabase:', conversationId, phoneNumber);
                        updateConversation(conversationId, { phoneNumber: phoneNumber }).then(updated => {
                            if (updated) {
                                // Atualiza cache
                                if (!cached) {
                                    conversationCache.set(conversationId, { phoneNumber });
                                } else {
                                    cached.phoneNumber = phoneNumber;
                                }
                            }
                        });
                    } else if (phoneNumber === cachedPhoneNumber) {
                        console.log('ℹ️ PhoneNumber não mudou, não será atualizado:', conversationId);
                    }
                }
                
                // Reseta a flag após extrair o número
                isSimulatedClick = false;
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
            console.log('ℹ️ Botão de telefone não encontrado - isso é normal se a conversa não tiver número disponível');
            // Não é um erro crítico, apenas log informativo
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

            // Marca que o clique será simulado
            isSimulatedClick = true;
            console.log('🤖 Clique simulado ativado, menu será escondido automaticamente');

            currentPhoneButton.click();
            
            // Esconde o menu imediatamente após o clique (múltiplas tentativas rápidas)
            hideAllPhoneMenus();
            setTimeout(() => hideAllPhoneMenus(), 10);
            setTimeout(() => hideAllPhoneMenus(), 25);
            setTimeout(() => hideAllPhoneMenus(), 50);
            setTimeout(() => hideAllPhoneMenus(), 100);
            setTimeout(() => hideAllPhoneMenus(), 200);
            
            // Esconde o menu continuamente por 1 segundo
            let hideAttempts = 0;
            const maxHideAttempts = 20;
            const hideInterval = setInterval(() => {
                hideAttempts++;
                hideAllPhoneMenus();
                
                // Para após algumas tentativas ou quando a flag for resetada
                if (hideAttempts >= maxHideAttempts || !isSimulatedClick) {
                    clearInterval(hideInterval);
                }
            }, 50);
            
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
    async function handleConversationChange(userName) {
        console.log('📨 Mensagem mudou! Remetente:', userName);
        console.log('📞 Clicando no telefone para a mensagem de:', userName);
        
        // Desabilita o botão WhatsApp enquanto atualiza o número
        disableWhatsAppButton();
        
        // Processa a conversa (clica no telefone e extrai número)
        processConversation();
        
        // Aguarda um pouco e atualiza o phoneNumber no Supabase (só se mudou)
        setTimeout(async () => {
            await updatePhoneNumberInDatabase();
        }, 3000); // Aguarda 3 segundos para o número ser extraído
    }
    
    /**
     * Atualiza o phoneNumber no banco de dados para a conversa atual
     * Só atualiza se o valor mudou desde a última verificação
     */
    async function updatePhoneNumberInDatabase() {
        try {
            // Obtém o ID da conversa atual
            const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
            if (!activeButton) return;
            
            const activeLi = activeButton.closest('li[data-conversation-id]');
            const conversationId = activeLi?.getAttribute('data-conversation-id');
            if (!conversationId) return;
            
            // Tenta extrair o phoneNumber de múltiplas fontes
            let phoneNumber = '';
            
            // 1. Do botão WhatsApp
            const whatsappButton = document.getElementById(WHATSAPP_BUTTON_ID);
            phoneNumber = whatsappButton?.dataset.phoneNumber || whatsappButton?.getAttribute('data-phone-number') || '';
            
            // 2. Se não encontrou, tenta extrair do menu do telefone
            if (!phoneNumber) {
                const phoneButton = findPhoneButton();
                if (phoneButton) {
                    const menuId = phoneButton.getAttribute('aria-controls');
                    if (menuId) {
                        phoneNumber = extractPhoneNumber(menuId) || '';
                    }
                    
                    // Se ainda não encontrou, tenta buscar em todos os menus
                    if (!phoneNumber) {
                        const allMenus = document.querySelectorAll('div[id^="kiwi-menu-"]');
                        for (const menu of allMenus) {
                            const extracted = extractPhoneNumber(menu.id);
                            if (extracted) {
                                phoneNumber = extracted;
                                break;
                            }
                        }
                    }
                }
            }
            
            // VERIFICA SE O VALOR MUDOU ANTES DE ATUALIZAR
            const cached = conversationCache.get(conversationId);
            const cachedPhoneNumber = cached?.phoneNumber || '';
            
            // Se o phoneNumber não mudou, não atualiza
            if (phoneNumber && phoneNumber === cachedPhoneNumber) {
                console.log('ℹ️ PhoneNumber não mudou, não será atualizado:', conversationId, phoneNumber);
                return;
            }
            
            // 3. Se encontrou o phoneNumber E mudou, atualiza no Supabase
            if (phoneNumber && typeof updateConversation !== 'undefined') {
                console.log('🔄 PhoneNumber mudou, atualizando no Supabase:', conversationId, phoneNumber);
                const updated = await updateConversation(conversationId, {
                    phoneNumber: phoneNumber
                    // NÃO atualiza timestamp a cada vez - só quando realmente necessário
                });
                
                if (updated) {
                    console.log('✅ PhoneNumber atualizado no Supabase:', conversationId, phoneNumber);
                    // Atualiza cache
                    if (!cached) {
                        conversationCache.set(conversationId, { phoneNumber });
                    } else {
                        cached.phoneNumber = phoneNumber;
                    }
                } else {
                    console.warn('⚠️ Falha ao atualizar phoneNumber no Supabase:', conversationId);
                }
            } else if (!phoneNumber) {
                console.log('ℹ️ PhoneNumber ainda não disponível para:', conversationId);
            }
        } catch (error) {
            console.error('❌ Erro ao atualizar phoneNumber no banco de dados:', error);
        }
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
     * Esconde todos os menus do telefone visíveis
     */
    function hideAllPhoneMenus() {
        if (!isSimulatedClick) {
            return; // Só esconde se for clique simulado
        }

        // Busca por ID (kiwi-menu-*)
        const menusById = document.querySelectorAll('[id^="kiwi-menu-"]');
        menusById.forEach((menu) => {
            hideMenuImmediately(menu);
        });

        // Busca por classe também (caso o ID não seja encontrado)
        const menusByClass = document.querySelectorAll('._kiwi-dropdown-menu_1pzru_1');
        menusByClass.forEach((menu) => {
            hideMenuImmediately(menu);
        });
    }

    /**
     * Observer para detectar quando o menu do telefone é adicionado ao DOM
     * e escondê-lo imediatamente se for um clique simulado
     */
    const menuObserver = new MutationObserver((mutations) => {
        if (!isSimulatedClick) {
            return; // Se não for clique simulado, não faz nada
        }

        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // Verifica se é um menu por ID (kiwi-menu-*)
                    if (node.id && node.id.startsWith('kiwi-menu-')) {
                        console.log('🔍 Menu detectado por ID e sendo escondido:', node.id);
                        hideMenuImmediately(node);
                    }
                    // Verifica se é um menu por classe
                    if (node.classList && node.classList.contains('_kiwi-dropdown-menu_1pzru_1')) {
                        console.log('🔍 Menu detectado por classe e sendo escondido:', node.id || 'sem-id');
                        hideMenuImmediately(node);
                    }
                    // Verifica filhos recursivamente por ID
                    const menusById = node.querySelectorAll?.('[id^="kiwi-menu-"]');
                    if (menusById && menusById.length > 0) {
                        menusById.forEach((menu) => {
                            console.log('🔍 Menu filho (ID) detectado e sendo escondido:', menu.id);
                            hideMenuImmediately(menu);
                        });
                    }
                    // Verifica filhos recursivamente por classe
                    const menusByClass = node.querySelectorAll?.('._kiwi-dropdown-menu_1pzru_1');
                    if (menusByClass && menusByClass.length > 0) {
                        menusByClass.forEach((menu) => {
                            console.log('🔍 Menu filho (classe) detectado e sendo escondido:', menu.id || 'sem-id');
                            hideMenuImmediately(menu);
                        });
                    }
                }
            });
        });

        // Verifica todos os menus existentes após processar as mutações
        hideAllPhoneMenus();
    });

    /**
     * Listener para detectar cliques diretos em mensagens da lista
     */
    function setupMessageClickListeners() {
        document.addEventListener('click', (e) => {
            let target = e.target;
            let conversationItem = null;
            
            // Verifica se é um clique manual no botão de telefone
            const phoneButton = findPhoneButton();
            if (phoneButton && (target === phoneButton || phoneButton.contains(target))) {
                // É um clique manual, não simulado
                isSimulatedClick = false;
                return;
            }
            
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
    // MONITORAMENTO DE CONVERSAS E BANCO DE DADOS
    // ============================================================================

    let monitoredConversations = new Set(); // IDs de conversas já monitoradas
    let reloadTimeout = null;
    let unreadClickTimeout = null; // Timeout para clique em mensagens não lidas
    let isProcessingUnread = false; // Flag para evitar múltiplos processamentos
    let processedUnreadConversations = new Set(); // Conversas não lidas já processadas nesta sessão
    
    // Cache local para rastrear valores atuais e evitar atualizações desnecessárias
    const conversationCache = new Map(); // Map<conversationId, {phoneNumber, lastMessage, lastMessageDate}>

    /**
     * Converte a data da última mensagem da lista de conversas em timestamp ISO
     * Suporta: "22:38", "26 dez.", "31 out.", etc.
     * @param {string} dateStr - String com data/hora da última mensagem
     * @returns {string} Timestamp ISO (ex: "2025-12-28T22:38:00.000Z") ou string vazia se não conseguir parsear
     */
    function parseConversationDate(dateStr) {
        if (!dateStr || !dateStr.trim()) {
            return '';
        }

        const trimmed = dateStr.trim();
        const now = new Date();
        
        try {
            // Padrão 1: Apenas hora (ex: "22:38")
            const timeOnlyPattern = /^(\d{1,2}):(\d{2})$/;
            const timeOnlyMatch = trimmed.match(timeOnlyPattern);
            if (timeOnlyMatch) {
                const hours = parseInt(timeOnlyMatch[1], 10);
                const minutes = parseInt(timeOnlyMatch[2], 10);
                
                if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    // Usa a data atual e adiciona a hora
                    const messageDate = new Date(now);
                    messageDate.setHours(hours, minutes, 0, 0);
                    // Retorna timestamp ISO (termina com 'Z')
                    return messageDate.toISOString();
                }
            }

            // Padrão 2: Data e mês abreviado (ex: "26 dez.", "31 out.")
            const monthNames = {
                'jan': 0, 'jan.': 0, 'janeiro': 0,
                'fev': 1, 'fev.': 1, 'fevereiro': 1,
                'mar': 2, 'mar.': 2, 'março': 2,
                'abr': 3, 'abr.': 3, 'abril': 3,
                'mai': 4, 'mai.': 4, 'maio': 4,
                'jun': 5, 'jun.': 5, 'junho': 5,
                'jul': 6, 'jul.': 6, 'julho': 6,
                'ago': 7, 'ago.': 7, 'agosto': 7,
                'set': 8, 'set.': 8, 'setembro': 8,
                'out': 9, 'out.': 9, 'outubro': 9,
                'nov': 10, 'nov.': 10, 'novembro': 10,
                'dez': 11, 'dez.': 11, 'dezembro': 11
            };
            
            const dateMonthPattern = /^(\d{1,2})\s+([a-z]+\.?)$/i;
            const dateMonthMatch = trimmed.match(dateMonthPattern);
            if (dateMonthMatch) {
                const day = parseInt(dateMonthMatch[1], 10);
                const monthName = dateMonthMatch[2].toLowerCase();
                const month = monthNames[monthName];
                
                if (day >= 1 && day <= 31 && month !== undefined) {
                    // Assume o ano atual e hora 00:00
                    const messageDate = new Date(now.getFullYear(), month, day, 0, 0, 0, 0);
                    // Retorna timestamp ISO (termina com 'Z')
                    return messageDate.toISOString();
                }
            }

            // Se não conseguiu parsear, retorna string vazia (não salva timestamp inválido)
            console.warn('⚠️ Não foi possível parsear data da conversa:', trimmed);
            return '';
        } catch (error) {
            console.error('❌ Erro ao parsear data da conversa:', error, 'dateStr:', trimmed);
            return '';
        }
    }

    /**
     * Extrai dados de uma conversa da lista usando a estrutura específica do Idealista
     * @param {HTMLElement} conversationElement - Elemento <li> da conversa na lista
     * @returns {Object|null} Dados da conversa ou null
     */
    function extractConversationData(conversationElement) {
        try {
            const conversationId = conversationElement.getAttribute('data-conversation-id');
            if (!conversationId) return null;

            // Encontra o botão card dentro do li
            const cardButton = conversationElement.querySelector('button._card_1z13v_1');
            if (!cardButton) return null;

            // Extrai nome do cliente - está em .card__meta > p[data-testid="kiwi-text"] (primeiro p)
            const cardMeta = cardButton.querySelector('._card__meta_1z13v_65');
            const userNameElement = cardMeta?.querySelector('p[data-testid="kiwi-text"]');
            const userName = userNameElement?.textContent?.trim() || 'Sem nome';

            // Extrai data da última mensagem - está em .card__date > p[data-testid="kiwi-text"]
            const cardDate = cardButton.querySelector('._card__date_1z13v_75');
            const dateElement = cardDate?.querySelector('p[data-testid="kiwi-text"]');
            const rawLastMessageDate = dateElement?.textContent?.trim() || '';
            
            // Converte a data para formato legível (DD/MM/YYYY HH:MM)
            // Suporta: "22:38" (hora apenas), "26 dez." (data e mês), etc.
            const lastMessageDate = parseConversationDate(rawLastMessageDate);
            
            // Log para debug
            console.log('📅 Extração de lastMessageDate:', {
                conversationId,
                raw: rawLastMessageDate,
                formatted: lastMessageDate,
                cardDateFound: !!cardDate,
                dateElementFound: !!dateElement
            });
            
            if (!rawLastMessageDate) {
                console.warn('⚠️ lastMessageDate vazio para conversa:', conversationId, {
                    cardDateFound: !!cardDate,
                    dateElementFound: !!dateElement,
                    cardDateHTML: cardDate?.outerHTML?.substring(0, 200)
                });
            } else if (rawLastMessageDate !== lastMessageDate) {
                console.log('✅ Data convertida com sucesso:', {
                    conversationId,
                    raw: rawLastMessageDate,
                    formatted: lastMessageDate
                });
            } else {
                console.log('ℹ️ Data não foi convertida (já está no formato correto ou não reconhecido):', {
                    conversationId,
                    raw: rawLastMessageDate,
                    formatted: lastMessageDate
                });
            }

            // Extrai última mensagem - está em .last-message__text ou .last-message > p[data-testid="kiwi-text"]
            const lastMessageContainer = cardButton.querySelector('._last-message_14xs4_1');
            let lastMessage = '';
            if (lastMessageContainer) {
                const messageText = lastMessageContainer.querySelector('._last-message__text_14xs4_11');
                if (messageText) {
                    lastMessage = messageText.textContent?.trim() || '';
                } else {
                    // Fallback: pega o primeiro p dentro de last-message
                    const fallbackMessage = lastMessageContainer.querySelector('p[data-testid="kiwi-text"]');
                    lastMessage = fallbackMessage?.textContent?.trim() || '';
                }
            }

            // Extrai informações do anúncio - está em .ad__price > p[data-testid="kiwi-text"]
            const adPrice = cardButton.querySelector('._ad__price_1yxel_44');
            const adInfo = adPrice?.querySelector('p[data-testid="kiwi-text"]');
            const adInfoText = adInfo?.textContent?.trim() || '';

            // Extrai número de telefone da mensagem (se houver)
            let phoneNumber = '';
            // Procura por padrões de telefone na última mensagem
            const phonePattern = /(\+?\d{1,3}[\s.-]?)?\(?\d{2,3}\)?[\s.-]?\d{3}[\s.-]?\d{3}[\s.-]?\d{3}/g;
            const phoneMatch = lastMessage.match(phonePattern);
            if (phoneMatch) {
                phoneNumber = phoneMatch[0].replace(/\s/g, '').replace(/\./g, '').replace(/-/g, '');
            }

            // Verifica se está lida - verifica se o botão tem classe _card--active_1z13v_18
            const isRead = cardButton.classList.contains('_card--active_1z13v_18') || 
                          !conversationElement.classList.contains('unread');

            // Extrai número de mensagens não lidas - badge dentro de .card__date
            const badge = cardDate?.querySelector('._kiwi-badge_111w6_4._kiwi-badge__number_111w6_1');
            const unreadCount = badge ? parseInt(badge.textContent?.trim() || '0', 10) : 0;
            const hasUnread = unreadCount > 0;

            // Extrai imagem do anúncio (se houver)
            const adImage = cardButton.querySelector('._ad__image_1yxel_14');
            const adImageUrl = adImage?.getAttribute('src') || '';

            const conversationData = {
                conversationId,
                userName,
                phoneNumber,
                lastMessage: lastMessage || 'Sem mensagem',
                lastMessageDate,
                adInfo: adInfoText,
                adImageUrl,
                unreadCount,
                hasUnread,
                url: window.location.href,
                timestamp: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                isRead,
                metadata: {
                    extractedAt: new Date().toISOString(),
                    pageUrl: window.location.href,
                    cardActive: cardButton.classList.contains('_card--active_1z13v_18')
                }
            };
            
            // Log final para verificar se lastMessageDate está correto
            console.log('📋 Dados da conversa extraídos:', {
                conversationId,
                userName,
                lastMessageDate: conversationData.lastMessageDate,
                lastMessage: conversationData.lastMessage.substring(0, 50)
            });
            
            return conversationData;
        } catch (error) {
            console.error('❌ Erro ao extrair dados da conversa:', error);
            return null;
        }
    }

    /**
     * Processa e salva uma conversa
     * @param {HTMLElement} conversationElement - Elemento da conversa
     */
    async function processAndSaveConversation(conversationElement) {
        const data = extractConversationData(conversationElement);
        if (!data || !data.conversationId) return;

        // Verifica se já foi processada nesta sessão
        if (monitoredConversations.has(data.conversationId)) {
            return;
        }

        // VERIFICA SE A CONVERSA JÁ EXISTE NO BANCO DE DADOS
        try {
            if (typeof conversationExists !== 'undefined') {
                const exists = await conversationExists(data.conversationId);
                if (exists) {
                    console.log('ℹ️ Conversa já existe no banco de dados:', data.conversationId, '- Não será salva novamente');
                    monitoredConversations.add(data.conversationId);
                    return; // Não salva se já existe
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao verificar se conversa existe, continuando...', error);
        }

        monitoredConversations.add(data.conversationId);
        
        console.log('📝 Processando nova conversa:', data.conversationId, data.userName);

        // Salva no banco de dados (Supabase)
        try {
            if (typeof Conversation !== 'undefined' && typeof saveConversation !== 'undefined') {
                console.log('🔄 Salvando nova conversa no Supabase:', data.conversationId);
                const conversation = new Conversation(data);
                const saved = await saveConversation(conversation);
                if (saved) {
                    console.log('✅ Conversa salva com sucesso:', data.conversationId);
                } else {
                    console.warn('⚠️ Falha ao salvar (pode ter usado fallback localStorage):', data.conversationId);
                }
            } else {
                console.warn('⚠️ Funções do banco de dados não disponíveis (Conversation ou saveConversation)');
            }
        } catch (error) {
            console.error('❌ Erro ao salvar conversa:', error);
            console.error('Detalhes do erro:', error.message);
        }
    }

    /**
     * Monitora todas as conversas na lista
     */
    function monitorConversationsList() {
        // Busca a lista de conversas usando o seletor específico
        const conversationsList = document.querySelector('[data-testid="conversation-list-component"]');
        if (!conversationsList) {
            // Fallback: busca qualquer ul com li que tenha data-conversation-id
            const conversationItems = document.querySelectorAll('li[data-conversation-id]');
            conversationItems.forEach((item) => {
                const conversationId = item.getAttribute('data-conversation-id');
                if (conversationId && !monitoredConversations.has(conversationId)) {
                    processAndSaveConversation(item);
                }
            });
            return;
        }

        // Busca todos os li dentro da lista
        const conversationItems = conversationsList.querySelectorAll('li[data-conversation-id]');
        
        conversationItems.forEach((item) => {
            const conversationId = item.getAttribute('data-conversation-id');
            if (conversationId && !monitoredConversations.has(conversationId)) {
                processAndSaveConversation(item);
            }
        });
    }

    /**
     * Observer para monitorar novas conversas na lista
     * Detecta quando novos <li> são adicionados ao <ul>
     */
    const conversationsListObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                // Verifica se é um elemento <li> com data-conversation-id
                if (node.nodeType === 1) { // Element node
                    // Verifica se o próprio nó é um <li>
                    if (node.tagName === 'LI' && node.hasAttribute('data-conversation-id')) {
                        const conversationId = node.getAttribute('data-conversation-id');
                        if (conversationId && !monitoredConversations.has(conversationId)) {
                            console.log('🆕 Novo <li> detectado:', conversationId);
                            processAndSaveConversation(node);
                        }
                    }
                    // Verifica filhos <li> dentro do nó adicionado
                    const liChildren = node.querySelectorAll?.('li[data-conversation-id]');
                    if (liChildren && liChildren.length > 0) {
                        liChildren.forEach((li) => {
                            const conversationId = li.getAttribute('data-conversation-id');
                            if (conversationId && !monitoredConversations.has(conversationId)) {
                                console.log('🆕 Novo <li> filho detectado:', conversationId);
                                processAndSaveConversation(li);
                            }
                        });
                    }
                }
            });
        });
        
        // Também monitora a lista completa periodicamente
        monitorConversationsList();
    });

    /**
     * Encontra conversas com mensagens não lidas
     * @returns {Array<HTMLElement>} Array de elementos <li> com mensagens não lidas
     */
    function findUnreadConversations() {
        const conversationsList = document.querySelector('[data-testid="conversation-list-component"]');
        if (!conversationsList) return [];

        const allConversations = conversationsList.querySelectorAll('li[data-conversation-id]');
        const unreadConversations = [];

        allConversations.forEach((li) => {
            const cardButton = li.querySelector('button._card_1z13v_1');
            if (!cardButton) return;

            // Verifica se tem badge de mensagens não lidas
            const cardDate = cardButton.querySelector('._card__date_1z13v_75');
            const badge = cardDate?.querySelector('._kiwi-badge_111w6_4._kiwi-badge__number_111w6_1');
            
            if (badge) {
                const unreadCount = parseInt(badge.textContent?.trim() || '0', 10);
                if (unreadCount > 0) {
                    unreadConversations.push(li);
                }
            }
        });

        return unreadConversations;
    }

    /**
     * Clica automaticamente em uma conversa com mensagens não lidas
     * @param {HTMLElement} conversationElement - Elemento <li> da conversa
     */
    function clickUnreadConversation(conversationElement) {
        const conversationId = conversationElement.getAttribute('data-conversation-id');
        if (!conversationId) return;

        // Verifica se já foi processada
        if (processedUnreadConversations.has(conversationId)) {
            return;
        }

        const cardButton = conversationElement.querySelector('button._card_1z13v_1');
        if (!cardButton) return;

        console.log('🖱️ Clicando automaticamente na conversa não lida:', conversationId);
        
        // Marca como processada
        processedUnreadConversations.add(conversationId);
        
        // Clica no botão
        cardButton.click();
    }

    /**
     * Processa conversas não lidas: detecta e clica automaticamente
     */
    function processUnreadConversations() {
        if (isProcessingUnread) {
            return; // Já está processando uma conversa
        }

        // Verifica se há um chat aberto atualmente
        const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
        if (activeButton) {
            // Há um chat aberto, não processa novas conversas até que este seja fechado
            return;
        }

        const unreadConversations = findUnreadConversations();
        
        if (unreadConversations.length === 0) {
            return;
        }

        // Filtra conversas ainda não processadas nesta sessão
        const unprocessed = unreadConversations.filter(li => {
            const id = li.getAttribute('data-conversation-id');
            return id && !processedUnreadConversations.has(id);
        });

        if (unprocessed.length === 0) {
            console.log('ℹ️ Todas as conversas não lidas já foram processadas');
            return;
        }

        // Pega a primeira conversa não processada
        const nextConversation = unprocessed[0];
        const conversationId = nextConversation.getAttribute('data-conversation-id');
        
        // Gera delay aleatório entre 15 e 40 segundos
        const minSeconds = 15;
        const maxSeconds = 40;
        const randomSeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
        const randomMs = randomSeconds * 1000;

        console.log(`⏱️ Agendando clique em conversa não lida (${conversationId}) em ${randomSeconds} segundos`);
        console.log(`📊 Total de conversas não lidas: ${unreadConversations.length}, não processadas: ${unprocessed.length}`);

        isProcessingUnread = true;

        // Limpa timeout anterior se existir
        if (unreadClickTimeout) {
            clearTimeout(unreadClickTimeout);
        }

        unreadClickTimeout = setTimeout(() => {
            clickUnreadConversation(nextConversation);
            // Reseta flag após clicar (o processamento do chat será feito separadamente)
            setTimeout(() => {
                isProcessingUnread = false;
            }, 1000);
        }, randomMs);
    }

    /**
     * Converte o time extraído (hora ou data+hora) em timestamp ISO completo
     * Se for apenas hora (ex: "14:30"), usa a data atual e adiciona essa hora
     * Se tiver data (ex: "26/12 14:30" ou "26/12/2024 14:30"), parse a data e hora
     * @param {string} timeStr - String com hora ou data+hora (ex: "14:30", "26/12 14:30", "26/12/2024 14:30")
     * @returns {string} Timestamp ISO completo ou null se não conseguir parsear
     */
    function parseMessageTimestamp(timeStr) {
        if (!timeStr || !timeStr.trim()) {
            return null;
        }

        const trimmed = timeStr.trim();
        const now = new Date();
        
        try {
            // Padrão 1: Apenas hora (ex: "14:30")
            const timeOnlyPattern = /^(\d{1,2}):(\d{2})$/;
            const timeOnlyMatch = trimmed.match(timeOnlyPattern);
            if (timeOnlyMatch) {
                const hours = parseInt(timeOnlyMatch[1], 10);
                const minutes = parseInt(timeOnlyMatch[2], 10);
                
                if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    // Usa a data atual e adiciona a hora
                    const messageDate = new Date(now);
                    messageDate.setHours(hours, minutes, 0, 0);
                    return messageDate.toISOString();
                }
            }

            // Padrão 2: Data e hora sem ano (ex: "26/12 14:30")
            const dateTimePattern1 = /^(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})$/;
            const dateTimeMatch1 = trimmed.match(dateTimePattern1);
            if (dateTimeMatch1) {
                const day = parseInt(dateTimeMatch1[1], 10);
                const month = parseInt(dateTimeMatch1[2], 10) - 1; // Mês é 0-indexed
                const hours = parseInt(dateTimeMatch1[3], 10);
                const minutes = parseInt(dateTimeMatch1[4], 10);
                
                if (day >= 1 && day <= 31 && month >= 0 && month < 12 && 
                    hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    // Assume o ano atual
                    const messageDate = new Date(now.getFullYear(), month, day, hours, minutes, 0, 0);
                    return messageDate.toISOString();
                }
            }

            // Padrão 3: Data completa e hora (ex: "26/12/2024 14:30")
            const dateTimePattern2 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;
            const dateTimeMatch2 = trimmed.match(dateTimePattern2);
            if (dateTimeMatch2) {
                const day = parseInt(dateTimeMatch2[1], 10);
                const month = parseInt(dateTimeMatch2[2], 10) - 1; // Mês é 0-indexed
                const year = parseInt(dateTimeMatch2[3], 10);
                const hours = parseInt(dateTimeMatch2[4], 10);
                const minutes = parseInt(dateTimeMatch2[5], 10);
                
                if (day >= 1 && day <= 31 && month >= 0 && month < 12 && 
                    hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    const messageDate = new Date(year, month, day, hours, minutes, 0, 0);
                    return messageDate.toISOString();
                }
            }

            // Se não conseguiu parsear, retorna null
            console.warn('⚠️ Não foi possível parsear o time:', trimmed);
            return null;
        } catch (error) {
            console.error('❌ Erro ao parsear timestamp:', error, 'timeStr:', trimmed);
            return null;
        }
    }

    /**
     * Extrai todas as mensagens do chat aberto
     * @returns {Array<Object>} Array de mensagens
     */
    function extractChatMessages() {
        const messages = [];
        const conversationContainer = document.querySelector('[data-testid="conversation-detail-component"]');
        if (!conversationContainer) return messages;

        // Obtém o ID da conversa atual - busca pelo botão ativo na lista
        let conversationId = 'unknown';
        const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
        if (activeButton) {
            const activeLi = activeButton.closest('li[data-conversation-id]');
            conversationId = activeLi?.getAttribute('data-conversation-id') || 'unknown';
        }

        // Busca todos os containers de mensagens
        const messageContainers = conversationContainer.querySelectorAll('[data-testid="message-container"]');
        
        messageContainers.forEach((container, index) => {
            try {
                // Verifica se é mensagem do cliente ou do agente
                // Cliente tem classe: _message-container__box--is-from-other_ssm3t_45
                const isFromOther = container.classList.contains('_message-container__box--is-from-other_ssm3t_45');
                const sender = isFromOther ? 'client' : 'agent';

                // Extrai conteúdo da mensagem
                const messageContent = container.querySelector('._message-text__content_136tk_1');
                let content = messageContent?.textContent?.trim() || '';

                // Se não encontrou, tenta outros seletores
                if (!content) {
                    const fallbackContent = container.querySelector('p[data-testid="testId"]');
                    content = fallbackContent?.textContent?.trim() || '';
                }

                // Extrai hora da mensagem
                const messageInfo = container.querySelector('._message-container__info_ssm3t_108');
                const time = messageInfo?.textContent?.trim() || '';

                // Converte o time em timestamp completo (data/hora real da mensagem)
                const messageTimestamp = parseMessageTimestamp(time);
                
                // Se não conseguiu parsear o timestamp, usa o timestamp atual como fallback
                // mas loga um aviso
                const timestamp = messageTimestamp || new Date().toISOString();
                if (!messageTimestamp && time) {
                    console.warn('⚠️ Usando timestamp atual como fallback para time:', time);
                }

                // Gera ID único para a mensagem (usando hash do conteúdo para garantir unicidade)
                // Remove caracteres especiais e limita tamanho
                const contentHash = content
                    .substring(0, 30)
                    .replace(/[^\w]/g, '')
                    .toLowerCase();
                const timestampForId = Date.now();
                const random = Math.random().toString(36).substr(2, 6);
                const messageId = `${conversationId}_${index}_${contentHash}_${timestampForId}_${random}`;

                if (content) {
                    messages.push({
                        messageId,
                        conversationId,
                        content,
                        timestamp: timestamp, // ✅ Usa timestamp real da mensagem
                        sender,
                        time
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao extrair mensagem:', error);
            }
        });

        return messages;
    }

    // Flag para evitar múltiplos processamentos do mesmo chat
    let currentProcessingChatId = null;

    /**
     * Processa o chat aberto: extrai mensagens e salva
     */
    async function processOpenChat() {
        // Obtém o ID da conversa atual
        const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
        if (!activeButton) return;

        const activeLi = activeButton.closest('li[data-conversation-id]');
        const conversationId = activeLi?.getAttribute('data-conversation-id');
        
        if (!conversationId) return;

        // Evita processar o mesmo chat múltiplas vezes
        if (currentProcessingChatId === conversationId) {
            return;
        }

        currentProcessingChatId = conversationId;
        console.log('📥 Chat aberto detectado:', conversationId);

        // Aguarda 15 segundos após abrir o chat
        setTimeout(async () => {
            console.log('📥 Processando chat aberto após 15 segundos...');

            // Verifica se ainda está no mesmo chat
            const currentActive = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
            if (!currentActive || currentActive.closest('li[data-conversation-id]')?.getAttribute('data-conversation-id') !== conversationId) {
                console.log('⚠️ Chat mudou, cancelando processamento');
                currentProcessingChatId = null;
                return;
            }

            // Extrai número de telefone - tenta múltiplas fontes
            let phoneNumber = '';
            
            // 1. Tenta do dataset do botão WhatsApp
            const whatsappButton = document.getElementById(WHATSAPP_BUTTON_ID);
            phoneNumber = whatsappButton?.dataset.phoneNumber || '';
            console.log('🔍 PhoneNumber do dataset do botão WhatsApp:', phoneNumber || 'não encontrado');
            
            // 2. Se não encontrou, tenta extrair do href do botão WhatsApp (se tiver onclick configurado)
            if (!phoneNumber && whatsappButton) {
                // Verifica se há um onclick que contém wa.me
                const onclickAttr = whatsappButton.getAttribute('onclick');
                if (onclickAttr && onclickAttr.includes('wa.me')) {
                    const match = onclickAttr.match(/wa\.me\/(\d+)/);
                    if (match && match[1]) {
                        phoneNumber = match[1];
                        console.log('✅ PhoneNumber extraído do onclick do botão WhatsApp:', phoneNumber);
                    }
                }
            }
            
            // 3. Se ainda não encontrou, tenta extrair diretamente do menu do telefone
            if (!phoneNumber) {
                console.log('⚠️ PhoneNumber não encontrado no botão WhatsApp, tentando extrair do menu...');
                const phoneButton = findPhoneButton();
                if (phoneButton) {
                    // Tenta encontrar o menu aberto
                    const menuId = phoneButton.getAttribute('aria-controls');
                    if (menuId) {
                        const menu = document.getElementById(menuId);
                        if (menu) {
                            const extracted = extractPhoneNumber(menuId);
                            if (extracted) {
                                phoneNumber = extracted;
                                console.log('✅ PhoneNumber extraído diretamente do menu:', phoneNumber);
                            }
                        }
                    }
                    
                    // Se ainda não encontrou, tenta clicar e extrair
                    if (!phoneNumber) {
                        console.log('🔄 Tentando clicar no telefone para extrair número...');
                        phoneButton.click();
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const menuIdAfterClick = phoneButton.getAttribute('aria-controls');
                        if (menuIdAfterClick) {
                            const extracted = extractPhoneNumber(menuIdAfterClick);
                            if (extracted) {
                                phoneNumber = extracted;
                                console.log('✅ PhoneNumber extraído após clique:', phoneNumber);
                            }
                        }
                    }
                } else {
                    console.warn('⚠️ Botão de telefone não encontrado');
                }
            }
            
            console.log('📞 Número de telefone final:', phoneNumber || 'NÃO ENCONTRADO');
            
            // Se ainda não encontrou, tenta buscar em todos os menus abertos
            if (!phoneNumber) {
                console.log('🔍 Buscando phoneNumber em todos os menus abertos...');
                const allMenus = document.querySelectorAll('div[id^="kiwi-menu-"]');
                for (const menu of allMenus) {
                    const menuId = menu.id;
                    const extracted = extractPhoneNumber(menuId);
                    if (extracted) {
                        phoneNumber = extracted;
                        console.log('✅ PhoneNumber encontrado no menu:', menuId, phoneNumber);
                        break;
                    }
                }
            }

            // Extrai todas as mensagens
            const messages = extractChatMessages();
            
            if (messages.length === 0) {
                console.log('⚠️ Nenhuma mensagem encontrada no chat');
                currentProcessingChatId = null;
                return;
            }

            console.log(`📨 ${messages.length} mensagens extraídas do chat`);
            console.log('📋 Mensagens:', messages.map(m => ({ sender: m.sender, content: m.content.substring(0, 50) + '...' })));

            // Atualiza a conversa com o phoneNumber e detalhes do chat
            if (typeof updateConversation !== 'undefined') {
                try {
                    // Obtém informações das mensagens
                    // As mensagens vêm na ordem do DOM (mais antigas primeiro)
                    // A última mensagem (mais recente) é a última do array
                    const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
                    const firstMessage = messages.length > 0 ? messages[0] : null;
                    const lastMessageContent = lastMessage?.content || '';
                    const lastMessageTime = lastMessage?.time || '';
                    const lastMessageTimestamp = lastMessage?.timestamp || null;
                    const totalMessages = messages.length;
                    
                    // Conta mensagens por tipo
                    const clientMessages = messages.filter(m => m.sender === 'client').length;
                    const agentMessages = messages.filter(m => m.sender === 'agent').length;
                    
                    // Usa o timestamp ISO diretamente (não formata como string brasileira)
                    // O convertToFirestoreTimestamp espera um timestamp ISO ou Date
                    let lastMessageDateForDB = null;
                    if (lastMessageTimestamp) {
                        try {
                            // Se já é um timestamp ISO, usa diretamente
                            if (typeof lastMessageTimestamp === 'string' && lastMessageTimestamp.includes('T')) {
                                lastMessageDateForDB = lastMessageTimestamp;
                            } else {
                                // Tenta converter para Date e depois para ISO
                                const msgDate = new Date(lastMessageTimestamp);
                                if (!isNaN(msgDate.getTime())) {
                                    lastMessageDateForDB = msgDate.toISOString();
                                }
                            }
                        } catch (e) {
                            console.warn('⚠️ Erro ao processar timestamp da última mensagem:', e);
                        }
                    }
                    
                    // Se não conseguiu do timestamp, tenta parsear do time
                    if (!lastMessageDateForDB && lastMessageTime) {
                        try {
                            const parsedTime = parseMessageTimestamp(lastMessageTime);
                            if (parsedTime) {
                                lastMessageDateForDB = parsedTime;
                            }
                        } catch (e) {
                            console.warn('⚠️ Erro ao parsear time da última mensagem:', e);
                        }
                    }
                    
                    // VERIFICA SE HOUVE MUDANÇAS REAIS ANTES DE ATUALIZAR
                    const cached = conversationCache.get(conversationId);
                    const cachedLastMessage = cached?.lastMessage || '';
                    const cachedLastMessageDate = cached?.lastMessageDate || '';
                    const cachedPhoneNumber = cached?.phoneNumber || '';
                    
                    // Prepara dados para atualização (só inclui campos que mudaram)
                    const updateData = {};
                    let hasChanges = false;
                    
                    // Verifica se lastMessage mudou
                    if (lastMessageContent && lastMessageContent !== cachedLastMessage) {
                        updateData.lastMessage = lastMessageContent;
                        hasChanges = true;
                    }
                    
                    // Verifica se lastMessageDate mudou
                    if (lastMessageDateForDB && lastMessageDateForDB !== cachedLastMessageDate) {
                        updateData.lastMessageDate = lastMessageDateForDB;
                        hasChanges = true;
                    }
                    
                    // Verifica se phoneNumber mudou
                    if (phoneNumber && phoneNumber !== cachedPhoneNumber) {
                        updateData.phoneNumber = phoneNumber;
                        hasChanges = true;
                        console.log('✅ PhoneNumber mudou, será atualizado:', phoneNumber);
                    } else if (!phoneNumber && cachedPhoneNumber) {
                        // PhoneNumber não disponível agora, mas já existe no cache - não atualiza
                        console.log('ℹ️ PhoneNumber não disponível, mas já existe no cache. Não será atualizado.');
                    } else if (!phoneNumber) {
                        console.warn('⚠️ PhoneNumber não disponível no momento do processamento do chat');
                        // Tenta atualizar novamente após um delay
                        setTimeout(async () => {
                            await updatePhoneNumberInDatabase();
                        }, 2000);
                    }
                    
                    // Se não houve mudanças, não atualiza
                    if (!hasChanges) {
                        console.log('ℹ️ Nenhuma mudança detectada, não será atualizado:', conversationId);
                        currentProcessingChatId = null;
                        return;
                    }
                    
                    console.log('📅 Mudanças detectadas:', {
                        lastMessageChanged: lastMessageContent !== cachedLastMessage,
                        lastMessageDateChanged: lastMessageDateForDB !== cachedLastMessageDate,
                        phoneNumberChanged: phoneNumber !== cachedPhoneNumber,
                        lastMessageDateForDB: lastMessageDateForDB || '(não disponível)',
                        phoneNumber: phoneNumber || '(não disponível)'
                    });
                    
                    // Atualiza a conversa no Supabase (apenas campos que mudaram)
                    const updated = await updateConversation(conversationId, updateData);
                    if (updated) {
                        console.log('✅ Conversa atualizada com detalhes do chat:', {
                            phoneNumber: phoneNumber || 'não disponível',
                            totalMessages,
                            clientMessages,
                            agentMessages,
                            lastMessage: lastMessageContent.substring(0, 50) + '...'
                        });
                        
                        // Atualiza cache com os novos valores
                        if (!cached) {
                            conversationCache.set(conversationId, {
                                phoneNumber: phoneNumber || '',
                                lastMessage: lastMessageContent || '',
                                lastMessageDate: lastMessageDateForDB || ''
                            });
                        } else {
                            if (phoneNumber) cached.phoneNumber = phoneNumber;
                            if (lastMessageContent) cached.lastMessage = lastMessageContent;
                            if (lastMessageDateForDB) cached.lastMessageDate = lastMessageDateForDB;
                        }
                    } else {
                        console.warn('⚠️ Falha ao atualizar conversa no Supabase');
                    }
                } catch (error) {
                    console.error('❌ Erro ao atualizar conversa:', error);
                }
            } else {
                console.warn('⚠️ Função updateConversation não disponível');
            }

            // Salva mensagens no banco de dados
            try {
                if (typeof ChatMessage !== 'undefined' && typeof saveChatMessages !== 'undefined') {
                    const chatMessages = messages.map(msg => new ChatMessage(msg));
                    await saveChatMessages(chatMessages);
                    console.log('✅ Mensagens salvas no banco de dados');
                } else {
                    // Fallback: salva no localStorage
                    const key = `messages_${conversationId}`;
                    localStorage.setItem(key, JSON.stringify(messages));
                    console.log('💾 Mensagens salvas no localStorage');
                }
            } catch (error) {
                console.error('❌ Erro ao salvar mensagens:', error);
            }

            // Reseta flag
            currentProcessingChatId = null;

            // Aguarda um pouco e passa para próxima mensagem não lida
            setTimeout(() => {
                // Verifica se ainda há conversas não lidas
                const unread = findUnreadConversations();
                if (unread.length > 0) {
                    console.log('➡️ Passando para próxima conversa não lida...');
                    processUnreadConversations();
                } else {
                    console.log('✅ Todas as conversas não lidas foram processadas');
                }
            }, 3000);

        }, 15000); // 15 segundos
    }

    /**
     * Configura reload aleatório entre 3-10 minutos
     */
    function setupRandomReload() {
        // Limpa timeout anterior se existir
        if (reloadTimeout) {
            clearTimeout(reloadTimeout);
        }

        // Gera tempo aleatório entre 3 e 10 minutos (em milissegundos)
        const minMinutes = 3;
        const maxMinutes = 10;
        const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
        const randomMs = randomMinutes * 60 * 1000;

        console.log(`🔄 Reload agendado em ${randomMinutes} minutos`);

        reloadTimeout = setTimeout(() => {
            console.log('🔄 Recarregando página...');
            window.location.reload();
        }, randomMs);
    }
    
    /**
     * Verifica periodicamente novas mensagens (sem atualizar phoneNumber desnecessariamente)
     */
    function setupPeriodicChecks() {
        // Verifica novas conversas a cada 5 segundos
        setInterval(() => {
            console.log('🔍 Verificando novas conversas...');
            monitorConversationsList();
        }, 5000);
        
        // REMOVIDO: Atualização periódica de phoneNumber (só atualiza quando há mudança real)
        // O phoneNumber será atualizado apenas quando:
        // 1. A conversa mudar (handleConversationChange)
        // 2. O chat for processado (processOpenChat)
        // 3. O número for extraído pela primeira vez (extractAndUpdate)
        
        // Verifica mudanças de conversa a cada 2 segundos
        setInterval(() => {
            const changeInfo = checkConversationChange();
            if (changeInfo.changed) {
                handleConversationChange(changeInfo.userName);
            }
        }, 2000);
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

        // Observa mudanças no DOM da conversa
        const conversationContainer = document.querySelector('[data-testid="conversation-detail-component"]');
        if (conversationContainer) {
            conversationObserver.observe(conversationContainer, {
                childList: true,
                subtree: true
            });
        }

        // Observa mudanças no body para detectar menus adicionados
        menuObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Monitora lista de conversas usando o seletor específico
        const conversationsList = document.querySelector('[data-testid="conversation-list-component"]');
        
        if (conversationsList) {
            console.log('✅ Lista de conversas encontrada, iniciando monitoramento...');
            
            // Observa mudanças na lista (adicionar/remover nós)
            conversationsListObserver.observe(conversationsList, {
                childList: true,      // Detecta quando filhos são adicionados/removidos
                subtree: true,        // Monitora toda a árvore (incluindo divs dentro do ul)
                attributes: false,    // Não monitora mudanças de atributos
                characterData: false  // Não monitora mudanças de texto
            });
            
            // Processa conversas existentes após um delay
            setTimeout(() => {
                console.log('🔍 Processando conversas existentes...');
                monitorConversationsList();
            }, 2000);
            
            // Também monitora periodicamente (a cada 5 segundos) como backup
            setInterval(() => {
                monitorConversationsList();
            }, 5000);
        } else {
            console.warn('⚠️ Lista de conversas não encontrada, tentando novamente...');
            // Tenta novamente após 3 segundos
            setTimeout(() => {
                const retryList = document.querySelector('[data-testid="conversation-list-component"]');
                if (retryList) {
                    console.log('✅ Lista encontrada na segunda tentativa');
                    conversationsListObserver.observe(retryList, {
                        childList: true,
                        subtree: true,
                        attributes: false,
                        characterData: false
                    });
                    monitorConversationsList();
                } else {
                    console.error('❌ Lista de conversas não encontrada após tentativas');
                }
            }, 3000);
        }
        
        // Configura reload aleatório
        setupRandomReload();
        
        // Configura listeners para cliques
        setupMessageClickListeners();
        
        // Configura verificações periódicas (novas mensagens e phoneNumber)
        setupPeriodicChecks();

        // Monitora conversas não lidas periodicamente
        setInterval(() => {
            processUnreadConversations();
        }, 5000); // Verifica a cada 5 segundos

        // Processa conversas não lidas na inicialização
        setTimeout(() => {
            processUnreadConversations();
        }, 5000);

        // Observer para detectar quando o chat é aberto ou fechado
        let lastActiveConversationId = null;
        const chatObserver = new MutationObserver(() => {
            const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
            const chatSection = document.querySelector('section._chat__conversation_1ita9_33');
            const conversationDetail = document.querySelector('[data-testid="conversation-detail-component"]');
            
            if (activeButton) {
                // Chat está aberto
                const activeLi = activeButton.closest('li[data-conversation-id]');
                const conversationId = activeLi?.getAttribute('data-conversation-id');
                
                // Verifica se mudou de conversa
                if (conversationId && conversationId !== lastActiveConversationId) {
                    lastActiveConversationId = conversationId;
                    
                    if (chatSection && conversationDetail) {
                        console.log('💬 Nova conversa aberta:', conversationId);
                        // Chat foi aberto, processa após 15 segundos
                        processOpenChat();
                    }
                }
            } else if (lastActiveConversationId && !chatSection) {
                // Chat foi fechado (voltou para a lista)
                console.log('🔙 Chat fechado, voltou para a lista');
                lastActiveConversationId = null;
                currentProcessingChatId = null;
                
                // Aguarda um pouco e processa próxima conversa não lida
                setTimeout(() => {
                    processUnreadConversations();
                }, 2000);
            }
        });

        // Observa mudanças na lista de conversas para detectar cliques
        const conversationsListForChatObserver = document.querySelector('[data-testid="conversation-list-component"]');
        if (conversationsListForChatObserver) {
            chatObserver.observe(conversationsListForChatObserver, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Verifica se o chat já está aberto na inicialização
        setTimeout(() => {
            const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
            if (activeButton) {
                const activeLi = activeButton.closest('li[data-conversation-id]');
                const conversationId = activeLi?.getAttribute('data-conversation-id');
                if (conversationId) {
                    lastActiveConversationId = conversationId;
                    processOpenChat();
                }
            }
        }, 3000);
    }

    // Inicia quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }
})();
