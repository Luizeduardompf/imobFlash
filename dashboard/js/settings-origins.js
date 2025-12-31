// Página de Origens de Leads

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../../index.html';
}

// Estado para origens
let leadSources = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🏠 Página de Origens carregada');
    
    // Carrega origens
    await fetchLeadSources();
});

// ============================================================================
// CRUD de Origens de Leads
// ============================================================================

// Busca todas as origens
async function fetchLeadSources() {
    const container = document.getElementById('originsList');
    if (!container) return false;
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?select=*&order=id.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            leadSources = await response.json();
            renderLeadSources();
            console.log(`✅ ${leadSources.length} origens carregadas`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar origens:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar origens</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar origens:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
            </div>
        `;
        return false;
    }
}

// Renderiza lista de origens
function renderLeadSources() {
    const container = document.getElementById('originsList');
    if (!container) return;
    
    if (!leadSources || leadSources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏠</div>
                <p>Nenhuma origem cadastrada</p>
                <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Clique em "Adicionar Origem" para criar uma nova</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = leadSources.map(source => `
        <div class="origin-item">
            <div class="origin-info">
                <div class="origin-id">${source.id}</div>
                <div class="origin-name">${source.source}</div>
            </div>
            <div class="origin-actions">
                <button class="btn btn-primary btn-icon" onclick="editOrigin(${source.id}, '${source.source.replace(/'/g, "\\'")}')" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-danger btn-icon" onclick="deleteOrigin(${source.id}, '${source.source.replace(/'/g, "\\'")}')" title="Deletar">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// Mostra modal para adicionar origem
function showAddOriginModal() {
    document.getElementById('modalTitle').textContent = 'Adicionar Origem';
    document.getElementById('originId').value = '';
    document.getElementById('originSource').value = '';
    document.getElementById('originModal').style.display = 'flex';
    document.getElementById('originSource').focus();
}

// Mostra modal para editar origem
function editOrigin(id, source) {
    document.getElementById('modalTitle').textContent = 'Editar Origem';
    document.getElementById('originId').value = id;
    document.getElementById('originSource').value = source;
    document.getElementById('originModal').style.display = 'flex';
    document.getElementById('originSource').focus();
}

// Fecha modal
function closeOriginModal() {
    document.getElementById('originModal').style.display = 'none';
    document.getElementById('originForm').reset();
    document.getElementById('originId').value = '';
}

// Salva origem (criar ou editar)
async function saveOrigin(event) {
    event.preventDefault();
    
    const id = document.getElementById('originId').value;
    const source = document.getElementById('originSource').value.trim();
    
    if (!source) {
        showWarning('Por favor, informe o nome da origem.');
        return;
    }
    
    try {
        let response;
        
        if (id) {
            // Editar origem existente
            const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?id=eq.${id}`;
            response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ source })
            });
        } else {
            // Criar nova origem - precisa do próximo ID disponível
            const maxId = leadSources.length > 0 
                ? Math.max(...leadSources.map(s => s.id)) 
                : 0;
            const newId = maxId + 1;
            
            const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({ id: newId, source })
            });
        }
        
        if (response.ok) {
            showSuccess(`Origem ${id ? 'atualizada' : 'criada'} com sucesso!`);
            closeOriginModal();
            await fetchLeadSources();
        } else {
            const errorText = await response.text();
            console.error('Erro ao salvar origem:', errorText);
            showError('Erro ao salvar origem. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao salvar origem:', error);
        showError('Erro ao salvar origem: ' + error.message);
    }
}

// Deleta origem
async function deleteOrigin(id, source) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar a origem "${source}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    // Verifica se há conversas usando esta origem
    try {
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/conversations?lead_source_id=eq.${id}&select=conversation_id&limit=1`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            const conversations = await checkResponse.json();
            if (conversations && conversations.length > 0) {
                showError(`Não é possível deletar esta origem pois existem conversa(s) associada(s). Primeiro, atualize as conversas para usar outra origem.`);
                return;
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar conversas:', error);
    }
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/param_lead_sources?id=eq.${id}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        });
        
        if (response.ok) {
            showSuccess('Origem deletada com sucesso!');
            await fetchLeadSources();
        } else {
            const errorText = await response.text();
            console.error('Erro ao deletar origem:', errorText);
            showError('Erro ao deletar origem. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar origem:', error);
        showError('Erro ao deletar origem: ' + error.message);
    }
}

// Logout
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = '../../index.html';
}

