// Configurações Gerais
document.addEventListener('DOMContentLoaded', async function() {
    console.log('⚙️ Página de Configurações Gerais carregada');
    
    // Inicializa Supabase Client
    let supabaseClient = null;
    if (typeof supabase !== 'undefined' && supabase.createClient) {
        try {
            supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✅ Supabase SDK inicializado para Configurações Gerais');
        } catch (error) {
            console.error('❌ Erro ao inicializar Supabase para Configurações Gerais:', error);
            showError('Erro ao inicializar Supabase. Verifique o console.');
            return;
        }
    } else {
        console.warn('⚠️ Supabase SDK não disponível para Configurações Gerais');
        showError('Supabase SDK não disponível. Verifique a conexão.');
        return;
    }

    const autoReloadEnabledCheckbox = document.getElementById('autoReloadEnabled');
    const autoReloadMinMinutesInput = document.getElementById('autoReloadMinMinutes');
    const autoReloadMaxMinutesInput = document.getElementById('autoReloadMaxMinutes');
    const refreshAfterConversationCheckbox = document.getElementById('refreshAfterConversation');
    const saveButton = document.getElementById('saveGeneralSettingsBtn');

    // Função para carregar configurações
    async function loadSettings() {
        try {
            const { data, error } = await supabaseClient
                .from('general_settings')
                .select('*')
                .limit(1);

            if (error) throw error;

            if (data && data.length > 0) {
                const settings = data[0];
                autoReloadEnabledCheckbox.checked = settings.auto_reload_enabled !== false;
                autoReloadMinMinutesInput.value = settings.auto_reload_min_minutes || 3;
                autoReloadMaxMinutesInput.value = settings.auto_reload_max_minutes || 10;
                refreshAfterConversationCheckbox.checked = settings.refresh_after_conversation === true;
                console.log('✅ Configurações Gerais carregadas:', settings);
            } else {
                console.log('ℹ️ Nenhuma configuração encontrada. Usando padrões.');
                // Usa valores padrão
                autoReloadEnabledCheckbox.checked = true;
                autoReloadMinMinutesInput.value = 3;
                autoReloadMaxMinutesInput.value = 10;
                refreshAfterConversationCheckbox.checked = false;
            }
        } catch (error) {
            console.error('❌ Erro ao carregar configurações gerais:', error.message);
            showError('Erro ao carregar configurações gerais.');
        }
    }

    // Função para salvar configurações
    saveButton.addEventListener('click', async function() {
        const enabled = autoReloadEnabledCheckbox.checked;
        const minMinutes = parseInt(autoReloadMinMinutesInput.value, 10);
        const maxMinutes = parseInt(autoReloadMaxMinutesInput.value, 10);
        const refreshAfterConversation = refreshAfterConversationCheckbox.checked;

        // Validações
        if (isNaN(minMinutes) || minMinutes < 1 || minMinutes > 60) {
            showWarning('O intervalo mínimo deve ser entre 1 e 60 minutos.');
            return;
        }

        if (isNaN(maxMinutes) || maxMinutes < 1 || maxMinutes > 60) {
            showWarning('O intervalo máximo deve ser entre 1 e 60 minutos.');
            return;
        }

        if (minMinutes >= maxMinutes) {
            showWarning('O intervalo mínimo deve ser menor que o máximo.');
            return;
        }

        try {
            // Tenta buscar uma configuração existente
            const { data: existingSettings, error: fetchError } = await supabaseClient
                .from('general_settings')
                .select('id')
                .limit(1);

            if (fetchError) throw fetchError;

            const settingsData = {
                auto_reload_enabled: enabled,
                auto_reload_min_minutes: minMinutes,
                auto_reload_max_minutes: maxMinutes,
                refresh_after_conversation: refreshAfterConversation
            };

            let updateResult;
            if (existingSettings && existingSettings.length > 0) {
                // Atualiza a configuração existente
                updateResult = await supabaseClient
                    .from('general_settings')
                    .update(settingsData)
                    .eq('id', existingSettings[0].id);
                console.log('🔄 Configurações Gerais atualizadas.');
            } else {
                // Insere uma nova configuração
                updateResult = await supabaseClient
                    .from('general_settings')
                    .insert([settingsData]);
                console.log('➕ Novas configurações Gerais salvas.');
            }

            if (updateResult.error) throw updateResult.error;

            showSuccess('Configurações Gerais salvas com sucesso!');
            console.log('✅ Configurações salvas:', settingsData);
        } catch (error) {
            console.error('❌ Erro ao salvar configurações gerais:', error.message);
            showError('Erro ao salvar configurações gerais.');
        }
    });

    // Carrega as configurações ao iniciar a página
    await loadSettings();
});

