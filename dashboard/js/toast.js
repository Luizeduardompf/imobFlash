// Sistema de Toast/Notificação

// Cria o container de toasts se não existir
function initToastContainer() {
    if (!document.getElementById('toastContainer')) {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
}

// Mostra um toast
function showToast(message, type = 'info', duration = 2000) {
    initToastContainer();
    
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Ícone baseado no tipo
    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    else if (type === 'error') icon = '❌';
    else if (type === 'warning') icon = '⚠️';
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${icon}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    // Anima entrada
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Remove após duração
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// Funções auxiliares
function showSuccess(message, duration = 2000) {
    showToast(message, 'success', duration);
}

function showError(message, duration = 3000) {
    showToast(message, 'error', duration);
}

function showWarning(message, duration = 2500) {
    showToast(message, 'warning', duration);
}

function showInfo(message, duration = 2000) {
    showToast(message, 'info', duration);
}

