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

            // Padrão 2: Data completa com barras (ex: "10/05/2024", "10/05/24")
            const datePattern = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/;
            const dateMatch = trimmed.match(datePattern);
            if (dateMatch) {
                const day = parseInt(dateMatch[1], 10);
                const month = parseInt(dateMatch[2], 10) - 1; // Mês é 0-indexed
                let year = parseInt(dateMatch[3], 10);
                
                // Se o ano tem apenas 2 dígitos, assume 20xx
                if (year < 100) {
                    year = 2000 + year;
                }
                
                if (day >= 1 && day <= 31 && month >= 0 && month < 12 && year >= 2000 && year <= 2100) {
                    // Assume hora 00:00
                    const messageDate = new Date(year, month, day, 0, 0, 0, 0);
                    // Retorna timestamp ISO (termina com 'Z')
                    return messageDate.toISOString();
                }
            }

            // Padrão 3: Data e mês abreviado (ex: "26 dez.", "31 out.")
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
        let conversationAlreadyExists = false;
        try {
            if (typeof conversationExists !== 'undefined') {
                const exists = await conversationExists(data.conversationId);
                if (exists) {
                    console.log('ℹ️ Conversa já existe no banco de dados:', data.conversationId, '- Não será salva novamente');
                    monitoredConversations.add(data.conversationId);
                    conversationAlreadyExists = true;
                    // NÃO retorna aqui - continua para verificar Agente IA mesmo se já existe
                }
            }
        } catch (error) {
            console.warn('⚠️ Erro ao verificar se conversa existe, continuando...', error);
        }
        
        // Se a conversa já existe, apenas retorna (não processa Agente IA aqui)
        // O Agente IA só processa quando a conversa está ABERTA (em processOpenChat)
        if (conversationAlreadyExists) {
            return;
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

        // NOTA: Agente IA só processa quando a conversa está ABERTA
        // A verificação é feita em processOpenChat() quando o chat é aberto
        // Isso evita processar todas as conversas na lista
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
     * Se for apenas hora (ex: "14:30"), usa a data do divisor de dia ou data atual
     * Se tiver data (ex: "26/12 14:30" ou "26/12/2024 14:30"), parse a data e hora
     * @param {string} timeStr - String com hora ou data+hora (ex: "14:30", "26/12 14:30", "26/12/2024 14:30")
     * @param {Date|null} dayDividerDate - Data do divisor de dia mais próximo (opcional)
     * @returns {string} Timestamp ISO completo ou null se não conseguir parsear
     */
    function parseMessageTimestamp(timeStr, dayDividerDate = null) {
        if (!timeStr || !timeStr.trim()) {
            return null;
        }

        const trimmed = timeStr.trim();
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        try {
            // Padrão 1: Apenas hora (ex: "14:30")
            const timeOnlyPattern = /^(\d{1,2}):(\d{2})$/;
            const timeOnlyMatch = trimmed.match(timeOnlyPattern);
            if (timeOnlyMatch) {
                const hours = parseInt(timeOnlyMatch[1], 10);
                const minutes = parseInt(timeOnlyMatch[2], 10);
                
                if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    // Prioriza a data do divisor de dia (mais próxima e precisa)
                    if (dayDividerDate) {
                        const messageDate = new Date(dayDividerDate);
                        messageDate.setHours(hours, minutes, 0, 0);
                        return messageDate.toISOString();
                    }
                    
                    // Se não há divisor, usa a data atual
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
                    // Determina o ano correto baseado no mês
                    const year = determineYear(month, currentMonth, currentYear);
                    const messageDate = new Date(year, month, day, hours, minutes, 0, 0);
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
     * Determina o ano correto baseado no mês da mensagem e mês atual
     * Se o mês da mensagem é maior que o mês atual, provavelmente é do ano passado
     * Ex: Estamos em janeiro (mês 0) e a mensagem é de dezembro (mês 11) = ano passado
     * @param {number} messageMonth - Mês da mensagem (0-11)
     * @param {number} currentMonth - Mês atual (0-11)
     * @param {number} currentYear - Ano atual
     * @returns {number} Ano correto para a mensagem
     */
    function determineYear(messageMonth, currentMonth, currentYear) {
        // Se o mês da mensagem é maior que o mês atual, provavelmente é do ano passado
        // Ex: Estamos em janeiro (0) e a mensagem é de dezembro (11) = ano passado
        // Ex: Estamos em janeiro (0) e a mensagem é de maio (4) = ano passado
        if (messageMonth > currentMonth) {
            return currentYear - 1;
        }
        
        // Se o mês da mensagem é menor que o mês atual, é do ano corrente
        // Ex: Estamos em dezembro (11) e a mensagem é de maio (4) = ano corrente
        if (messageMonth < currentMonth) {
            return currentYear;
        }
        
        // Se é o mesmo mês, é do ano corrente
        // Ex: Estamos em maio (4) e a mensagem é de maio (4) = ano corrente
        return currentYear;
    }

    /**
     * Extrai a data de um divisor de dia
     * @param {HTMLElement} divider - Elemento do divisor de dia
     * @returns {Date|null} Data do divisor ou null
     */
    function parseDayDividerDate(divider) {
        if (!divider) return null;
        
        const text = divider.textContent?.trim() || '';
        if (!text) return null;
        
        try {
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth();
            
            // Formato 1: "Hoje", "Ontem"
            const lowerText = text.toLowerCase();
            if (lowerText.includes('hoje')) {
                return new Date(currentYear, currentMonth, now.getDate());
            }
            if (lowerText.includes('ontem')) {
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
            }
            
            // Formato 2: "28 DEZ." ou "28 DEZ" (formato abreviado português)
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
            
            // Padrão: "28 DEZ." ou "28 DEZ" (dia + mês abreviado em maiúsculas)
            const datePattern1 = /^(\d{1,2})\s+([A-Z]{3,9}\.?)$/;
            const dateMatch1 = text.match(datePattern1);
            if (dateMatch1) {
                const day = parseInt(dateMatch1[1], 10);
                const monthName = dateMatch1[2].toLowerCase();
                const month = monthNames[monthName];
                
                if (month !== undefined && day >= 1 && day <= 31) {
                    // Determina o ano correto baseado no mês
                    const year = determineYear(month, currentMonth, currentYear);
                    return new Date(year, month, day);
                }
            }
            
            // Formato 3: "26 de dezembro" (português completo)
            const datePattern2 = /^(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?$/i;
            const dateMatch2 = text.match(datePattern2);
            if (dateMatch2) {
                const day = parseInt(dateMatch2[1], 10);
                const monthName = dateMatch2[2].toLowerCase();
                const month = monthNames[monthName];
                
                if (month !== undefined && day >= 1 && day <= 31) {
                    // Se o ano foi especificado, usa ele; senão determina baseado no mês
                    const year = dateMatch2[3] 
                        ? parseInt(dateMatch2[3], 10) 
                        : determineYear(month, currentMonth, currentYear);
                    return new Date(year, month, day);
                }
            }
            
            // Formato 4: "26/12" ou "26/12/2024"
            const datePattern3 = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/;
            const dateMatch3 = text.match(datePattern3);
            if (dateMatch3) {
                const day = parseInt(dateMatch3[1], 10);
                const month = parseInt(dateMatch3[2], 10) - 1; // Mês é 0-indexed
                
                if (day >= 1 && day <= 31 && month >= 0 && month < 12) {
                    // Se o ano foi especificado, usa ele; senão determina baseado no mês
                    const year = dateMatch3[3] 
                        ? parseInt(dateMatch3[3], 10) 
                        : determineYear(month, currentMonth, currentYear);
                    return new Date(year, month, day);
                }
            }
            
            console.warn('⚠️ Não foi possível parsear a data do divisor:', text);
            return null;
        } catch (error) {
            console.error('❌ Erro ao parsear data do divisor:', error);
            return null;
        }
    }

    /**
     * Encontra o divisor de dia mais próximo anterior a um elemento
     * @param {HTMLElement} element - Elemento de mensagem (wrapper ou container)
     * @param {NodeList} allDividers - Lista de todos os divisores de dia (não usado, mantido para compatibilidade)
     * @returns {Date|null} Data do divisor ou null
     */
    function findClosestDayDivider(element, allDividers) {
        if (!element) return null;
        
        // Busca o container de mensagens (_messages--container)
        let messagesContainer = element.closest('._messages--container_');
        if (!messagesContainer) {
            // Tenta encontrar pelo seletor alternativo (pode ter hash diferente)
            messagesContainer = element.closest('[class*="_messages--container"]');
        }
        
        if (!messagesContainer) {
            // Tenta buscar o container de outra forma (pode estar em um nível diferente)
            const conversationDetail = element.closest('[data-testid="conversation-detail-component"]');
            if (conversationDetail) {
                messagesContainer = conversationDetail.querySelector('[class*="_messages--container"]');
            }
        }
        
        if (!messagesContainer) {
            console.warn('⚠️ Container de mensagens não encontrado para elemento:', element);
            return null;
        }
        
        // Obtém todos os elementos filhos diretos do container (divisores e wrappers de mensagens)
        const allChildren = Array.from(messagesContainer.children);
        
        // Se o elemento passado é o wrapper, usa ele diretamente
        // Se é o container da mensagem, busca o wrapper pai ou usa o próprio elemento
        let targetElement = element;
        
        // Verifica se o elemento já é um wrapper
        const isWrapper = element.classList && (
            element.classList.toString().includes('message-container__wrapper') ||
            Array.from(element.classList).some(cls => cls.includes('message-container__wrapper'))
        );
        
        if (!isWrapper) {
            // Tenta encontrar o wrapper pai
            targetElement = element.closest('._message-container__wrapper_') || 
                          element.closest('[class*="message-container__wrapper"]') ||
                          element.parentElement; // Usa o pai como fallback
            
            // Se o pai não parece ser um wrapper, usa o elemento original
            if (targetElement && targetElement !== element) {
                const parentIsWrapper = targetElement.classList && (
                    targetElement.classList.toString().includes('message-container__wrapper') ||
                    Array.from(targetElement.classList).some(cls => cls.includes('message-container__wrapper'))
                );
                if (!parentIsWrapper) {
                    targetElement = element;
                }
            } else {
                targetElement = element;
            }
        }
        
        const elementIndex = allChildren.indexOf(targetElement);
        
        if (elementIndex === -1) {
            // Se não encontrou diretamente, tenta buscar pelo container da mensagem
            const messageContainer = element.closest('[data-testid="message-container"]');
            if (messageContainer) {
                const containerWrapper = messageContainer.closest('[class*="message-container__wrapper"]');
                if (containerWrapper) {
                    const wrapperIndex = allChildren.indexOf(containerWrapper);
                    if (wrapperIndex !== -1) {
                        targetElement = containerWrapper;
                        // Continua com o índice encontrado
                        return findDividerFromIndex(allChildren, wrapperIndex);
                    }
                }
            }
            
            // Última tentativa: busca qualquer elemento que contenha o elemento atual
            for (let i = 0; i < allChildren.length; i++) {
                const child = allChildren[i];
                if (child.contains && child.contains(element)) {
                    return findDividerFromIndex(allChildren, i);
                }
            }
            
            console.warn('⚠️ Elemento não encontrado no container de mensagens, tentando busca alternativa...');
            // Retorna null mas não quebra o fluxo
            return null;
        }
        
        return findDividerFromIndex(allChildren, elementIndex);
    }
    
    /**
     * Função auxiliar para buscar divisor a partir de um índice
     */
    function findDividerFromIndex(allChildren, startIndex) {
        // Busca o divisor mais próximo anterior ao elemento
        for (let i = startIndex - 1; i >= 0; i--) {
            const child = allChildren[i];
            
            // Verifica se é um divisor de dia (pode ter hash diferente na classe)
            const isDivider = child.classList && (
                child.classList.toString().includes('_chat-day-divider_') ||
                Array.from(child.classList).some(cls => cls.includes('chat-day-divider'))
            );
            
            if (isDivider) {
                // O divisor pode estar diretamente no child ou dentro dele
                let divider = child;
                if (!child.classList.toString().includes('_chat-day-divider_')) {
                    const nestedDivider = child.querySelector('[class*="chat-day-divider"]');
                    if (nestedDivider) {
                        divider = nestedDivider;
                    }
                }
                
                const dividerDate = parseDayDividerDate(divider);
                if (dividerDate) {
                    console.log(`✅ Divisor de dia encontrado: ${divider.textContent?.trim()} → ${dividerDate.toLocaleDateString('pt-BR')}`);
                    return dividerDate;
                }
            }
        }
        
        console.warn('⚠️ Nenhum divisor de dia encontrado anterior à mensagem');
        return null;
    }

    /**
     * Extrai todas as mensagens do chat aberto
     * @returns {Object} Objeto com {messages: Array, propertyUrl: string|null, isLead: boolean} - Array de mensagens, URL do anúncio e se é lead
     */
    function extractChatMessages() {
        const messages = [];
        let propertyUrl = null;
        let isLead = null; // NULL até que seja possível determinar (true = lead, false = não-lead)
        const conversationContainer = document.querySelector('[data-testid="conversation-detail-component"]');
        if (!conversationContainer) return { messages, propertyUrl, isLead };

        // Obtém o ID da conversa atual - busca pelo botão ativo na lista
        let conversationId = 'unknown';
        const activeButton = document.querySelector('li[data-conversation-id] button._card--active_1z13v_18');
        if (activeButton) {
            const activeLi = activeButton.closest('li[data-conversation-id]');
            conversationId = activeLi?.getAttribute('data-conversation-id') || 'unknown';
        }

        // Busca todos os divisores de dia para referência
        const dayDividers = conversationContainer.querySelectorAll('._chat-day-divider_');
        console.log(`📅 Encontrados ${dayDividers.length} divisores de dia`);

        // Busca todos os containers de mensagens
        const messageContainers = conversationContainer.querySelectorAll('[data-testid="message-container"]');
        console.log(`📨 Encontrados ${messageContainers.length} containers de mensagens`);
        
        messageContainers.forEach((container, index) => {
            try {
                // Verifica se é mensagem do cliente ou do agente
                // Cliente tem classe: _message-container__box--is-from-other_ssm3t_45
                const isFromOther = container.classList.contains('_message-container__box--is-from-other_ssm3t_45');
                const sender = isFromOther ? 'client' : 'agent';

                // Determina se é lead baseado na primeira mensagem
                if (index === 0) {
                    // Se a primeira mensagem é do cliente, é um lead (cliente iniciou)
                    // Se a primeira mensagem é do agente, não é um lead (agente iniciou)
                    isLead = isFromOther;
                    console.log(`🏷️ Tipo de conversa detectado: ${isLead ? 'LEAD' : 'NÃO-LEAD'} (primeira mensagem: ${sender})`);
                }

                // Extrai o link do anúncio da primeira mensagem (seja do cliente ou do agente)
                if (index === 0 && !propertyUrl) {
                    // Busca o link do anúncio dentro do container da mensagem
                    // Pode estar em: a._property-card_ ou a[class*="property-card"]
                    let propertyCard = container.querySelector('a._property-card_');
                    if (!propertyCard) {
                        // Tenta buscar por seletor mais genérico
                        propertyCard = container.querySelector('a[class*="property-card"]');
                    }
                    if (!propertyCard) {
                        // Tenta buscar qualquer link que contenha "/imovel/" no href
                        const allLinks = container.querySelectorAll('a[href*="/imovel/"]');
                        if (allLinks.length > 0) {
                            propertyCard = allLinks[0];
                        }
                    }
                    
                    if (propertyCard) {
                        const href = propertyCard.getAttribute('href');
                        if (href) {
                            // Constrói a URL completa (relativa ou absoluta)
                            if (href.startsWith('/')) {
                                propertyUrl = `https://www.idealista.pt${href}`;
                            } else if (href.startsWith('http')) {
                                propertyUrl = href;
                            } else {
                                propertyUrl = `https://www.idealista.pt/${href}`;
                            }
                            console.log(`🏠 Link do anúncio extraído da primeira mensagem (${sender}): ${propertyUrl}`);
                        }
                    }
                }

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

                // Encontra o divisor de dia mais próximo anterior
                // Passa o wrapper da mensagem para buscar corretamente no container
                // Tenta múltiplos seletores para encontrar o wrapper
                let messageWrapper = container.closest('._message-container__wrapper_');
                if (!messageWrapper) {
                    // Tenta seletor alternativo com hash variável
                    messageWrapper = container.closest('[class*="_message-container__wrapper"]');
                }
                if (!messageWrapper) {
                    // Tenta buscar o pai direto que pode ser o wrapper
                    const parent = container.parentElement;
                    if (parent && (
                        parent.classList.toString().includes('message-container__wrapper') ||
                        Array.from(parent.classList).some(cls => cls.includes('message-container__wrapper'))
                    )) {
                        messageWrapper = parent;
                    }
                }
                
                // Se ainda não encontrou, usa o container diretamente (algumas mensagens podem não ter wrapper)
                // Isso é normal e não deve gerar aviso
                const elementForDividerSearch = messageWrapper || container;
                const dayDividerDate = findClosestDayDivider(elementForDividerSearch, dayDividers);
                
                // Converte o time em timestamp completo (data/hora real da mensagem)
                // Passa a data do divisor de dia como referência
                const messageTimestamp = parseMessageTimestamp(time, dayDividerDate);
                
                // Se não conseguiu parsear o timestamp, usa o timestamp atual como fallback
                // mas loga um aviso
                const timestamp = messageTimestamp || new Date().toISOString();
                if (!messageTimestamp && time) {
                    console.warn('⚠️ Usando timestamp atual como fallback para time:', time);
                } else if (dayDividerDate && messageTimestamp) {
                    console.log(`✅ Timestamp construído usando divisor de dia: ${dayDividerDate.toLocaleDateString('pt-BR')} + ${time} = ${messageTimestamp}`);
                }

                // Gera ID único e determinístico para a mensagem
                // Usa hash do conteúdo + timestamp real + sender para garantir unicidade
                // Isso evita duplicatas quando a mesma mensagem é processada múltiplas vezes
                const contentHash = content
                    .substring(0, 50)
                    .replace(/[^\w]/g, '')
                    .toLowerCase();
                
                // Usa o timestamp real da mensagem (não Date.now()) para garantir determinismo
                const timestampHash = timestamp ? 
                    timestamp.replace(/[^\w]/g, '').substring(0, 15) : 
                    Date.now().toString().substring(0, 10);
                
                // ID determinístico: mesmo conteúdo + mesmo timestamp + mesmo sender = mesmo ID
                const messageId = `${conversationId}_${sender}_${contentHash}_${timestampHash}`;

                if (content) {
                    messages.push({
                        messageId,
                        conversationId,
                        content,
                        timestamp: timestamp, // ✅ Usa timestamp real da mensagem
                        sender,
                        time,
                        order: index + 1 // Ordem de exibição (1-based, baseada na posição na página)
                    });
                }
            } catch (error) {
                console.error('❌ Erro ao extrair mensagem:', error);
            }
        });

        return { messages, propertyUrl, isLead };
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
                    // É normal algumas conversas não terem botão de telefone disponível
                    console.log('ℹ️ Botão de telefone não encontrado - isso é normal se a conversa não tiver número disponível');
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

            // Extrai todas as mensagens, o link do anúncio e o tipo de conversa (lead/não-lead)
            const { messages, propertyUrl, isLead } = extractChatMessages();
            
            if (messages.length === 0) {
                console.log('⚠️ Nenhuma mensagem encontrada no chat');
                currentProcessingChatId = null;
                return;
            }

            console.log(`📨 ${messages.length} mensagens extraídas do chat`);
            console.log('📋 Mensagens:', messages.map(m => ({ sender: m.sender, content: m.content.substring(0, 50) + '...' })));
            if (isLead !== null && isLead !== undefined) {
                console.log(`🏷️ Tipo de conversa: ${isLead ? 'LEAD' : 'NÃO-LEAD'}`);
            } else {
                console.log('🏷️ Tipo de conversa: Ainda não determinado (NULL)');
            }
            
            if (propertyUrl) {
                console.log(`🏠 Link do anúncio extraído: ${propertyUrl}`);
            }

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
                        // É normal algumas conversas não terem número disponível imediatamente
                        console.log('ℹ️ PhoneNumber não disponível no momento do processamento - tentando novamente em 2 segundos...');
                        // Tenta atualizar novamente após um delay
                        setTimeout(async () => {
                            await updatePhoneNumberInDatabase();
                        }, 2000);
                    }
                    
                    // Verifica se propertyUrl foi encontrado e precisa ser salvo
                    if (propertyUrl) {
                        const cachedPropertyUrl = cached?.propertyUrl || '';
                        if (propertyUrl !== cachedPropertyUrl) {
                            updateData.propertyUrl = propertyUrl;
                            hasChanges = true;
                            console.log('✅ PropertyUrl encontrado e será salvo:', propertyUrl);
                        }
                    }
                    
                    // Verifica se isLead foi detectado e precisa ser salvo
                    // Só atualiza se isLead não for NULL (foi possível determinar)
                    const cachedIsLead = cached?.isLead;
                    if (isLead !== null && isLead !== undefined && isLead !== cachedIsLead) {
                        updateData.isLead = isLead;
                        hasChanges = true;
                        console.log(`✅ Tipo de conversa detectado e será salvo: ${isLead ? 'LEAD' : 'NÃO-LEAD'}`);
                    } else if (isLead === null) {
                        console.log('ℹ️ Tipo de conversa ainda não determinado (isLead = NULL), não será atualizado');
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
                        
                        // Verifica se não tem telefone e processa com Agente IA
                        // IMPORTANTE: Só processa se a conversa estiver ABERTA (já está aberta aqui)
                        if (!phoneNumber || !phoneNumber.trim()) {
                            console.log('📱 Conversa ABERTA sem telefone detectada! Processando com Agente IA...', {
                                conversationId: conversationId,
                                userName: getCurrentUserName(),
                                lastMessage: lastMessageContent?.substring(0, 50)
                            });
                            
                            // Verifica se é a conversa atual aberta
                            const currentOpenConversationId = getCurrentConversationId();
                            if (currentOpenConversationId === conversationId) {
                                // Aguarda um pouco antes de processar (3-5 segundos)
                                const delay = Math.random() * 2000 + 3000;
                                console.log(`⏱️ Aguardando ${Math.round(delay/1000)}s antes de processar com Agente IA...`);
                                setTimeout(() => {
                                    // Verifica novamente se ainda é a conversa aberta antes de processar
                                    const stillOpen = getCurrentConversationId();
                                    if (stillOpen === conversationId) {
                                        checkAndProcessConversationWithoutPhone(
                                            conversationId, 
                                            phoneNumber || '', 
                                            getCurrentUserName() || '', 
                                            lastMessageContent || ''
                                        );
                                    } else {
                                        console.log('ℹ️ Conversa foi fechada antes de processar, cancelando Agente IA');
                                    }
                                }, delay);
                            } else {
                                console.log('ℹ️ Conversa não está mais aberta, não processando Agente IA');
                            }
                        }
                        
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

    // ============================================================================
    // AGENTE IA - SOLICITAÇÃO AUTOMÁTICA DE TELEFONE
    // ============================================================================

    let agentIASettings = null;
    let processedConversationsWithoutPhone = new Set();

    /**
     * Busca configurações do Agente IA do Supabase
     */
    async function loadAgentIASettings() {
        try {
            if (!DB_CONFIG.supabase.url || !DB_CONFIG.supabase.anonKey) {
                console.warn('⚠️ Supabase não configurado para Agente IA');
                return null;
            }

            console.log('📥 Buscando configurações do Agente IA...');
            const url = `${DB_CONFIG.supabase.url}/rest/v1/agent_ia_settings?select=*&limit=1`;
            const response = await fetch(url, {
                headers: {
                    'apikey': DB_CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                console.log('📋 Resposta do Supabase:', data);
                if (data && data.length > 0) {
                    if (data[0].enabled) {
                        agentIASettings = data[0];
                        console.log('✅ Configurações do Agente IA carregadas e ativadas');
                        return agentIASettings;
                    } else {
                        console.log('ℹ️ Agente IA está desativado nas configurações');
                    }
                } else {
                    console.warn('⚠️ Nenhuma configuração do Agente IA encontrada no Supabase');
                }
            } else {
                const errorText = await response.text();
                console.error('❌ Erro ao buscar configurações:', response.status, errorText);
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações do Agente IA:', error);
        }
        return null;
    }

    /**
     * Gera resposta usando OpenAI para solicitar telefone
     */
    async function generatePhoneRequestMessage(clientMessage, userName) {
        if (!agentIASettings || !agentIASettings.openai_key) {
            console.warn('⚠️ Agente IA não configurado ou sem chave OpenAI');
            return null;
        }

        try {
            console.log('🤖 Chamando OpenAI para gerar mensagem...');
            const systemPrompt = `Você é um assistente imobiliário profissional e educado. Sua função é solicitar o número de telefone do cliente de forma natural e profissional, preferencialmente WhatsApp. Seja breve, educado e explique o motivo (para poder ligar e passar todas as informações).`;

            const userPrompt = `Cliente "${userName}" enviou a seguinte mensagem: "${clientMessage}"

Baseado no prompt configurado: "${agentIASettings.phone_prompt}"

Gere uma resposta educada e profissional solicitando o número de telefone (preferencialmente WhatsApp) do cliente. A resposta deve ser natural, breve e explicar que você precisa do telefone para ligar e passar todas as informações sobre a propriedade.`;

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${agentIASettings.openai_key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt }
                    ],
                    max_tokens: 150,
                    temperature: 0.7
                })
            });

            if (response.ok) {
                const data = await response.json();
                const message = data.choices[0]?.message?.content?.trim();
                if (message) {
                    console.log('✅ Resposta gerada pelo Agente IA:', message);
                    return message;
                } else {
                    console.warn('⚠️ Resposta vazia da OpenAI');
                }
            } else {
                const error = await response.json().catch(() => ({}));
                console.error('❌ Erro ao gerar resposta da OpenAI:', response.status, error);
            }
        } catch (error) {
            console.error('❌ Erro ao chamar OpenAI:', error);
        }
        return null;
    }

    /**
     * Insere mensagem no textarea e envia
     */
    async function sendMessageToClient(message) {
        try {
            // Encontra o textarea
            const textarea = document.querySelector('textarea[placeholder*="Escreve" i], textarea[aria-label*="mensagem" i]');
            if (!textarea) {
                console.warn('⚠️ Textarea não encontrado');
                return false;
            }

            // Adiciona delay aleatório entre 2-5 segundos antes de digitar
            const typingDelay = Math.random() * 3000 + 2000; // 2-5 segundos
            await new Promise(resolve => setTimeout(resolve, typingDelay));

            // Simula digitação (opcional, mas mais natural)
            textarea.focus();
            textarea.value = '';
            
            // Digita a mensagem caractere por caractere (simula digitação humana)
            for (let i = 0; i < message.length; i++) {
                textarea.value += message[i];
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                
                // Delay aleatório entre caracteres (50-150ms)
                const charDelay = Math.random() * 100 + 50;
                await new Promise(resolve => setTimeout(resolve, charDelay));
            }

            // Dispara evento de input para garantir que o botão de enviar seja habilitado
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));

            // Aguarda um pouco antes de enviar (1-3 segundos)
            const sendDelay = Math.random() * 2000 + 1000; // 1-3 segundos
            await new Promise(resolve => setTimeout(resolve, sendDelay));

            // Encontra e clica no botão de enviar
            // Tenta múltiplos seletores
            let sendButton = document.querySelector('button[aria-label*="Enviar" i]');
            
            if (!sendButton) {
                sendButton = document.querySelector('button[aria-label*="enviar" i]');
            }
            
            if (!sendButton) {
                // Busca pelo SVG de enviar (path contém M5 11h8v2H5)
                const buttons = document.querySelectorAll('button[data-kiwi-button="icon"]');
                for (const btn of buttons) {
                    const svg = btn.querySelector('svg path');
                    if (svg) {
                        const pathD = svg.getAttribute('d') || '';
                        if (pathD.includes('M5 11h8v2H5') || pathD.includes('M5 11')) {
                            sendButton = btn;
                            console.log('✅ Botão de enviar encontrado pelo SVG');
                            break;
                        }
                    }
                }
            }
            
            if (!sendButton) {
                // Última tentativa: busca botão dentro do footer do chat
                const footer = document.querySelector('footer[aria-label*="chat" i]');
                if (footer) {
                    const buttons = footer.querySelectorAll('button');
                    for (const btn of buttons) {
                        const svg = btn.querySelector('svg');
                        if (svg) {
                            sendButton = btn;
                            console.log('✅ Botão de enviar encontrado no footer');
                            break;
                        }
                    }
                }
            }
            
            console.log('🔍 Botão de enviar encontrado?', !!sendButton);

            if (sendButton && !sendButton.disabled) {
                sendButton.click();
                console.log('✅ Mensagem enviada pelo Agente IA');
                return true;
            } else {
                console.warn('⚠️ Botão de enviar não encontrado ou desabilitado');
                return false;
            }
        } catch (error) {
            console.error('❌ Erro ao enviar mensagem:', error);
            return false;
        }
    }


    /**
     * Verifica se uma conversa tem novas mensagens detectáveis (badge de não lidas)
     */
    async function checkIfConversationHasNewMessages(conversationId) {
        try {
            const conversationElement = document.querySelector(`li[data-conversation-id="${conversationId}"]`);
            if (!conversationElement) {
                return false;
            }

            const cardButton = conversationElement.querySelector('button._card_1z13v_1');
            if (!cardButton) {
                return false;
            }

            // Verifica se tem badge de mensagens não lidas
            const cardDate = cardButton.querySelector('._card__date_1z13v_75');
            const badge = cardDate?.querySelector('._kiwi-badge_111w6_4._kiwi-badge__number_111w6_1');
            
            if (badge) {
                const unreadCount = parseInt(badge.textContent?.trim() || '0', 10);
                if (unreadCount > 0) {
                    console.log(`📨 Conversa ${conversationId} tem ${unreadCount} mensagens não lidas`);
                    return true;
                }
            }

            return false;
        } catch (error) {
            console.error('❌ Erro ao verificar novas mensagens:', error);
            return false;
        }
    }

    /**
     * Abre uma conversa clicando nela
     */
    async function openConversation(conversationId) {
        try {
            const conversationElement = document.querySelector(`li[data-conversation-id="${conversationId}"]`);
            if (!conversationElement) {
                console.warn('⚠️ Elemento da conversa não encontrado:', conversationId);
                return false;
            }

            const button = conversationElement.querySelector('button._card_1z13v_1');
            if (button) {
                console.log('🖱️ Clicando na conversa para abrir:', conversationId);
                button.click();
                
                // Aguarda a conversa abrir
                await new Promise(resolve => setTimeout(resolve, 1500));
                return true;
            }
        } catch (error) {
            console.error('❌ Erro ao abrir conversa:', error);
        }
        return false;
    }

    /**
     * Processa conversa sem telefone - gera e envia mensagem
     */
    async function processConversationWithoutPhone(conversationId, userName, lastMessage) {
        console.log('🤖 Agente IA: Iniciando processamento para conversa:', conversationId, userName);
        
        // Verifica se já processou esta conversa nesta sessão
        if (processedConversationsWithoutPhone.has(conversationId)) {
            console.log('ℹ️ Conversa já processada pelo Agente IA nesta sessão:', conversationId);
            return;
        }

        // Verifica se o Agente IA já solicitou telefone anteriormente (no banco)
        const alreadyRequested = await hasAgentIARequestedPhone(conversationId);
        if (alreadyRequested) {
            console.log('ℹ️ Agente IA já solicitou telefone para esta conversa anteriormente, não será solicitado novamente');
            processedConversationsWithoutPhone.add(conversationId); // Marca como processada para não verificar novamente
            return;
        }

        // Carrega configurações se ainda não carregou
        if (!agentIASettings) {
            console.log('📥 Carregando configurações do Agente IA...');
            await loadAgentIASettings();
        }

        // Verifica se Agente IA está ativado
        if (!agentIASettings || !agentIASettings.enabled) {
            console.log('ℹ️ Agente IA não está ativado ou não configurado');
            return;
        }

        console.log('✅ Agente IA está ativado e configurado');

        // Verifica se a conversa está aberta (não abre, apenas verifica)
        const currentConversationId = getCurrentConversationId();
        if (currentConversationId !== conversationId) {
            console.log('⚠️ Conversa não está aberta. Agente IA só processa conversas ABERTAS.', {
                current: currentConversationId,
                target: conversationId
            });
            console.log('ℹ️ A abertura automática é feita por processUnreadConversations() quando detecta novas mensagens.');
            return;
        }

        console.log('✅ Conversa está aberta, processando com Agente IA...');

        // Aguarda um pouco para garantir que a interface está pronta
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Gera mensagem usando OpenAI
        console.log('🤖 Agente IA: Gerando mensagem para solicitar telefone...');
        const message = await generatePhoneRequestMessage(lastMessage, userName);
        
        if (message) {
            console.log('✅ Mensagem gerada:', message);
            // Marca como processada antes de enviar
            processedConversationsWithoutPhone.add(conversationId);
            
            // Envia a mensagem
            const sent = await sendMessageToClient(message);
            if (sent) {
                console.log('✅ Agente IA: Mensagem enviada com sucesso para', userName);
                // Marca que o Agente IA já solicitou telefone
                await markAgentIAPhoneRequested(conversationId);
            } else {
                console.warn('⚠️ Agente IA: Falha ao enviar mensagem');
                // Remove do set para tentar novamente depois
                processedConversationsWithoutPhone.delete(conversationId);
            }
        } else {
            console.warn('⚠️ Agente IA: Não foi possível gerar mensagem');
        }
    }

    /**
     * Verifica se o Agente IA já solicitou telefone para esta conversa
     */
    async function hasAgentIARequestedPhone(conversationId) {
        try {
            if (!DB_CONFIG.supabase.url || !DB_CONFIG.supabase.anonKey) {
                return false;
            }

            const url = `${DB_CONFIG.supabase.url}/rest/v1/conversations?conversation_id=eq.${encodeURIComponent(conversationId)}&select=agent_ia_phone_requested&limit=1`;
            const response = await fetch(url, {
                headers: {
                    'apikey': DB_CONFIG.supabase.anonKey,
                    'Authorization': `Bearer ${DB_CONFIG.supabase.anonKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    return data[0].agent_ia_phone_requested === true;
                }
            }
        } catch (error) {
            console.error('❌ Erro ao verificar se Agente IA já solicitou telefone:', error);
        }
        return false;
    }

    /**
     * Marca que o Agente IA solicitou telefone para esta conversa
     */
    async function markAgentIAPhoneRequested(conversationId) {
        try {
            if (typeof updateConversation !== 'undefined') {
                const updated = await updateConversation(conversationId, { agentIaPhoneRequested: true });
                if (updated) {
                    console.log('✅ Marcado que Agente IA já solicitou telefone para:', conversationId);
                    return true;
                }
            }
        } catch (error) {
            console.error('❌ Erro ao marcar solicitação do Agente IA:', error);
        }
        return false;
    }

    /**
     * Verifica se conversa foi salva sem telefone e processa
     * IMPORTANTE: Esta função apenas VERIFICA, não abre conversas.
     * A abertura automática é feita em processUnreadConversations() quando detecta novas mensagens.
     */
    async function checkAndProcessConversationWithoutPhone(conversationId, phoneNumber, userName, lastMessage) {
        console.log('🔍 Verificando conversa para Agente IA:', {
            conversationId,
            hasPhone: !!(phoneNumber && phoneNumber.trim()),
            userName,
            hasLastMessage: !!lastMessage
        });

        // Verifica se a conversa está ABERTA (não abre, apenas verifica)
        const currentOpenConversationId = getCurrentConversationId();
        if (currentOpenConversationId !== conversationId) {
            console.log('⚠️ Conversa não está aberta. Agente IA só processa conversas ABERTAS.', {
                current: currentOpenConversationId,
                target: conversationId
            });
            console.log('ℹ️ A abertura automática é feita por processUnreadConversations() quando detecta novas mensagens.');
            return;
        }

        console.log('✅ Conversa está aberta, verificando se deve processar...');

        // Se tem telefone, não processa
        if (phoneNumber && phoneNumber.trim()) {
            console.log('✅ Conversa tem telefone, não será processada pelo Agente IA');
            return;
        }

        // Se não tem userName ou lastMessage, tenta buscar
        if (!userName || !lastMessage) {
            console.log('📋 Buscando dados adicionais da conversa...');
            const conversationElement = document.querySelector(`li[data-conversation-id="${conversationId}"]`);
            if (conversationElement) {
                const data = extractConversationData(conversationElement);
                if (data) {
                    userName = userName || data.userName;
                    lastMessage = lastMessage || data.lastMessage;
                    console.log('✅ Dados encontrados:', {
                        userName,
                        lastMessage: lastMessage?.substring(0, 50)
                    });
                }
            }
        }

        if (!userName || !lastMessage) {
            console.warn('⚠️ Dados insuficientes para processar:', { userName, hasLastMessage: !!lastMessage });
            return;
        }

        // Adiciona delay aleatório antes de processar (5-15 segundos)
        const delay = Math.random() * 10000 + 5000; // 5-15 segundos
        console.log(`⏱️ Processando em ${Math.round(delay/1000)}s...`);
        setTimeout(async () => {
            // Verifica novamente se ainda é a conversa aberta antes de processar
            const stillOpen = getCurrentConversationId();
            if (stillOpen === conversationId) {
                await processConversationWithoutPhone(conversationId, userName, lastMessage);
            } else {
                console.log('ℹ️ Conversa foi fechada antes de processar, cancelando Agente IA');
            }
        }, delay);
    }


    // Carrega configurações do Agente IA ao iniciar
    setTimeout(async () => {
        const settings = await loadAgentIASettings();
        if (settings) {
            console.log('✅ Agente IA pronto para uso');
        } else {
            console.warn('⚠️ Agente IA não configurado. Configure em: Dashboard > Configurações > Agente IA');
        }
    }, 2000);
    
    // Recarrega configurações periodicamente (a cada 5 minutos)
    setInterval(async () => {
        await loadAgentIASettings();
    }, 5 * 60 * 1000);

    // Inicia quando o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }
})();

