// Popup script para ImobFlash Agent

document.addEventListener('DOMContentLoaded', () => {
    const idealistaBtn = document.getElementById('idealista-btn');
    const loading = document.getElementById('loading');

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
});

