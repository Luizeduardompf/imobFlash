// Autenticação simples (pode ser melhorada com Supabase Auth)
document.addEventListener('DOMContentLoaded', function() {
    // Verifica se já está logado
    const isLoggedIn = sessionStorage.getItem('imobflash_logged_in');
    if (isLoggedIn === 'true') {
        window.location.href = 'dashboard.html';
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const submitBtn = loginForm.querySelector('button[type="submit"]');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        
        // Mostra loading
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        submitBtn.disabled = true;
        loginError.style.display = 'none';
        
        // Simula autenticação (substitua por Supabase Auth se necessário)
        // Por enquanto, aceita qualquer email/senha para desenvolvimento
        setTimeout(() => {
            // Salva sessão
            sessionStorage.setItem('imobflash_logged_in', 'true');
            sessionStorage.setItem('imobflash_user_email', email);
            
            // Redireciona para dashboard
            window.location.href = 'dashboard.html';
        }, 500);
    });
});

