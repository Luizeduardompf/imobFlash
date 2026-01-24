// Página de Agentes

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../../index.html';
}

// Estado para agentes, países e cidades
let agents = [];
let countries = [];
let cities = [];
let citiesByCountry = {}; // Cache de cidades por país

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('👤 Página de Agentes carregada');
    
    // Carrega países e cidades
    await fetchCountries();
    await fetchCities();
    
    // Configura listener para mudança de país
    const countrySelect = document.getElementById('agentCountry');
    if (countrySelect) {
        countrySelect.addEventListener('change', onCountryChange);
    }
    
    // Carrega agentes
    await fetchAgents();
    
    // Configura listeners para upload de avatar
    setupAvatarUpload();
});

// Configura upload de avatar
function setupAvatarUpload() {
    const avatarFileInput = document.getElementById('agentAvatarFile');
    const avatarUrlInput = document.getElementById('agentAvatarUrl');
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');
    const removeAvatarBtn = document.getElementById('removeAvatarBtn');
    
    // Quando seleciona arquivo
    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (file) {
                // Valida tipo de arquivo
                if (!file.type.startsWith('image/')) {
                    showError('Por favor, selecione apenas arquivos de imagem.');
                    avatarFileInput.value = '';
                    return;
                }
                
                // Valida tamanho (máximo 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    showError('A imagem deve ter no máximo 5MB.');
                    avatarFileInput.value = '';
                    return;
                }
                
                // Mostra preview
                const reader = new FileReader();
                reader.onload = (e) => {
                    avatarPreviewImg.src = e.target.result;
                    avatarPreview.style.display = 'block';
                    // Limpa URL quando seleciona arquivo
                    avatarUrlInput.value = '';
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Quando digita URL
    if (avatarUrlInput) {
        avatarUrlInput.addEventListener('input', (e) => {
            const url = e.target.value.trim();
            if (url) {
                // Valida se é uma URL válida
                try {
                    new URL(url);
                    avatarPreviewImg.src = url;
                    avatarPreviewImg.onerror = () => {
                        avatarPreviewImg.src = '';
                        showWarning('Não foi possível carregar a imagem da URL informada.');
                    };
                    avatarPreview.style.display = 'block';
                    // Limpa arquivo quando digita URL
                    if (avatarFileInput) {
                        avatarFileInput.value = '';
                    }
                } catch (error) {
                    // URL inválida, não faz nada
                }
            } else {
                // Se não há arquivo selecionado, esconde preview
                if (!avatarFileInput || !avatarFileInput.files || avatarFileInput.files.length === 0) {
                    avatarPreview.style.display = 'none';
                }
            }
        });
    }
    
    // Botão para remover foto
    if (removeAvatarBtn) {
        removeAvatarBtn.addEventListener('click', () => {
            if (avatarFileInput) avatarFileInput.value = '';
            if (avatarUrlInput) avatarUrlInput.value = '';
            avatarPreview.style.display = 'none';
        });
    }
}

// ============================================================================
// CRUD de Agentes
// ============================================================================

// Busca todos os países
async function fetchCountries() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/countries?select=*&order=name.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            countries = await response.json();
            populateCountrySelect();
            console.log(`✅ ${countries.length} países carregados`);
            return true;
        } else {
            console.error('Erro ao buscar países:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar países:', error);
        return false;
    }
}

// Busca todas as cidades
async function fetchCities() {
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/cities?select=*,countries(*)&order=name.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            cities = await response.json();
            // Organiza cidades por país
            citiesByCountry = {};
            cities.forEach(city => {
                const countryId = city.country_id;
                if (!citiesByCountry[countryId]) {
                    citiesByCountry[countryId] = [];
                }
                citiesByCountry[countryId].push(city);
            });
            console.log(`✅ ${cities.length} cidades carregadas`);
            return true;
        } else {
            console.error('Erro ao buscar cidades:', response.status);
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        return false;
    }
}

// Preenche o select de países
function populateCountrySelect() {
    const select = document.getElementById('agentCountry');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um país...</option>';
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = country.name;
        select.appendChild(option);
    });
}

// Preenche o select de cidades baseado no país selecionado
function populateCitySelect(countryId) {
    const select = document.getElementById('agentCity');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione uma cidade...</option>';
    
    if (!countryId) {
        select.innerHTML = '<option value="">Selecione primeiro um país...</option>';
        return;
    }
    
    const countryCities = citiesByCountry[countryId] || [];
    countryCities.forEach(city => {
        const option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.name;
        select.appendChild(option);
    });
}

// Handler para mudança de país
function onCountryChange() {
    const countryId = document.getElementById('agentCountry').value;
    populateCitySelect(countryId);
}

// Busca todos os agentes com joins para cidade e país
async function fetchAgents() {
    const container = document.getElementById('agentsList');
    if (!container) return false;
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/agents?select=*,city:cities(id,name),country:countries(id,name)&order=created_at.desc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            agents = await response.json();
            renderAgents();
            console.log(`✅ ${agents.length} agentes carregados`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar agentes:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar agentes</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar agentes:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
            </div>
        `;
        return false;
    }
}

// Renderiza lista de agentes
function renderAgents() {
    const container = document.getElementById('agentsList');
    if (!container) return;
    
    if (!agents || agents.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👤</div>
                <p>Nenhum agente cadastrado</p>
                <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Clique em "Adicionar Agente" para criar um novo</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = agents.map(agent => {
        const statusClass = agent.status === 'Ativo' ? 'status-active' : 
                           agent.status === 'Inativo' ? 'status-inactive' : 'status-pending';
        const statusIcon = agent.status === 'Ativo' ? '✅' : 
                          agent.status === 'Inativo' ? '❌' : '⏳';
        
        const avatarHtml = agent.avatar_url 
            ? `<img src="${escapeHtml(agent.avatar_url)}" alt="Avatar" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; margin-right: 12px;">`
            : '<div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; margin-right: 12px;">' + (agent.full_name ? agent.full_name.charAt(0).toUpperCase() : '?') + '</div>';
        
        return `
            <div class="agent-item">
                <div class="agent-info">
                    <div class="agent-header" style="display: flex; align-items: center;">
                        ${avatarHtml}
                        <div style="flex: 1;">
                            <div class="agent-name">${escapeHtml(agent.commercial_name)}</div>
                            <span class="agent-status ${statusClass}">${statusIcon} ${agent.status}</span>
                        </div>
                    </div>
                    <div class="agent-details">
                        <div class="agent-detail">
                            <strong>Nome:</strong> ${escapeHtml(agent.full_name)}
                        </div>
                        ${agent.email ? `<div class="agent-detail"><strong>Email:</strong> ${escapeHtml(agent.email)}</div>` : ''}
                        ${agent.phone ? `<div class="agent-detail"><strong>Telefone:</strong> ${escapeHtml(agent.phone)}</div>` : ''}
                        ${agent.whatsapp ? `<div class="agent-detail"><strong>WhatsApp:</strong> ${escapeHtml(agent.whatsapp)}</div>` : ''}
                        ${agent.nif ? `<div class="agent-detail"><strong>NIF:</strong> ${escapeHtml(agent.nif)}</div>` : ''}
                        ${agent.city && agent.city.name ? `<div class="agent-detail"><strong>Cidade:</strong> ${escapeHtml(agent.city.name)}</div>` : ''}
                        ${agent.country && agent.country.name ? `<div class="agent-detail"><strong>País:</strong> ${escapeHtml(agent.country.name)}</div>` : ''}
                        <div class="agent-detail">
                            <strong>Cadastrado em:</strong> ${formatDate(agent.created_at)}
                        </div>
                    </div>
                </div>
                <div class="agent-actions">
                    <button class="btn btn-primary btn-icon" onclick="editAgent('${agent.id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteAgent('${agent.id}', '${escapeHtml(agent.commercial_name)}')" title="Deletar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Mostra modal para adicionar agente
function showAddAgentModal() {
    document.getElementById('modalTitle').textContent = 'Adicionar Agente';
    document.getElementById('agentId').value = '';
    document.getElementById('agentForm').reset();
    document.getElementById('agentCountry').value = '';
    document.getElementById('agentCity').innerHTML = '<option value="">Selecione primeiro um país...</option>';
    document.getElementById('agentStatus').value = 'Pendente';
    document.getElementById('avatarPreview').style.display = 'none';
    document.getElementById('agentModal').style.display = 'flex';
    document.getElementById('agentFullName').focus();
}

// Mostra modal para editar agente
async function editAgent(id) {
    const agent = agents.find(a => a.id === id);
    if (!agent) {
        showError('Agente não encontrado');
        return;
    }
    
    document.getElementById('modalTitle').textContent = 'Editar Agente';
    document.getElementById('agentId').value = agent.id;
    document.getElementById('agentFullName').value = agent.full_name || '';
    document.getElementById('agentCommercialName').value = agent.commercial_name || '';
    document.getElementById('agentNif').value = agent.nif || '';
    document.getElementById('agentPhone').value = agent.phone || '';
    document.getElementById('agentWhatsApp').value = agent.whatsapp || '';
    document.getElementById('agentEmail').value = agent.email || '';
    document.getElementById('agentPassword').value = ''; // Não mostra senha ao editar
    document.getElementById('agentAvatarUrl').value = agent.avatar_url || '';
    document.getElementById('agentAvatarFile').value = ''; // Limpa arquivo ao editar
    
    // Mostra preview se houver avatar
    const avatarPreview = document.getElementById('avatarPreview');
    const avatarPreviewImg = document.getElementById('avatarPreviewImg');
    if (agent.avatar_url) {
        avatarPreviewImg.src = agent.avatar_url;
        avatarPreview.style.display = 'block';
    } else {
        avatarPreview.style.display = 'none';
    }
    
    document.getElementById('agentStatus').value = agent.status || 'Pendente';
    
    // Define país e cidade
    const countryId = agent.country_id || '';
    const cityId = agent.city_id || '';
    
    document.getElementById('agentCountry').value = countryId;
    populateCitySelect(countryId);
    
    // Aguarda um pouco para garantir que as cidades foram carregadas
    setTimeout(() => {
        document.getElementById('agentCity').value = cityId;
    }, 100);
    
    document.getElementById('agentModal').style.display = 'flex';
    document.getElementById('agentFullName').focus();
}

// Fecha modal
function closeAgentModal() {
    document.getElementById('agentModal').style.display = 'none';
    document.getElementById('agentForm').reset();
    document.getElementById('agentId').value = '';
    document.getElementById('avatarPreview').style.display = 'none';
}

// Faz upload da imagem para Supabase Storage
async function uploadAvatarToSupabase(file, agentId) {
    try {
        // Gera nome único para o arquivo
        const fileExt = file.name.split('.').pop();
        const fileName = `agent-${agentId || 'new'}-${Date.now()}.${fileExt}`;
        const bucketName = 'avatars'; // Nome do bucket (deve ser criado no Supabase)
        
        // Faz upload usando Supabase Storage API
        // NOTA: Requer que o bucket 'avatars' esteja criado e configurado no Supabase
        const url = `${SUPABASE_CONFIG.url}/storage/v1/object/${bucketName}/${fileName}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': file.type,
                'x-upsert': 'true'
            },
            body: file
        });
        
        if (response.ok) {
            // Retorna URL pública da imagem
            const publicUrl = `${SUPABASE_CONFIG.url}/storage/v1/object/public/${bucketName}/${fileName}`;
            return publicUrl;
        } else {
            const errorText = await response.text();
            console.error('Erro ao fazer upload:', errorText);
            
            // Se o bucket não existir, retorna erro específico
            if (response.status === 404 || errorText.includes('Bucket not found')) {
                throw new Error('Bucket "avatars" não encontrado. Configure o bucket no Supabase Storage primeiro.');
            }
            
            throw new Error('Erro ao fazer upload da imagem: ' + errorText);
        }
    } catch (error) {
        console.error('Erro ao fazer upload:', error);
        throw error;
    }
}

// Salva agente (criar ou editar)
async function saveAgent(event) {
    event.preventDefault();
    
    const id = document.getElementById('agentId').value;
    const fullName = document.getElementById('agentFullName').value.trim();
    const commercialName = document.getElementById('agentCommercialName').value.trim();
    const nif = document.getElementById('agentNif').value.trim();
    const phone = document.getElementById('agentPhone').value.trim();
    const whatsapp = document.getElementById('agentWhatsApp').value.trim();
    const email = document.getElementById('agentEmail').value.trim();
    const password = document.getElementById('agentPassword').value.trim();
    const avatarFileInput = document.getElementById('agentAvatarFile');
    const avatarUrl = document.getElementById('agentAvatarUrl').value.trim();
    const cityId = document.getElementById('agentCity').value;
    const countryId = document.getElementById('agentCountry').value;
    const status = document.getElementById('agentStatus').value;
    
    if (!fullName || !commercialName || !email) {
        showWarning('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }
    
    try {
        let finalAvatarUrl = avatarUrl || null;
        
        // Se há arquivo selecionado, faz upload
        if (avatarFileInput && avatarFileInput.files && avatarFileInput.files.length > 0) {
            const file = avatarFileInput.files[0];
            try {
                // Mostra loading
                const submitBtn = event.target.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '⏳ Fazendo upload...';
                
                finalAvatarUrl = await uploadAvatarToSupabase(file, id);
                console.log('✅ Upload concluído:', finalAvatarUrl);
                
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            } catch (uploadError) {
                console.error('Erro no upload:', uploadError);
                
                // Se não há URL alternativa, pergunta se quer continuar
                if (!avatarUrl) {
                    const continueWithoutUpload = confirm(
                        'Erro ao fazer upload da imagem:\n\n' + uploadError.message + 
                        '\n\nDeseja continuar sem a foto? Você pode adicionar uma URL manualmente depois.'
                    );
                    
                    if (!continueWithoutUpload) {
                        const submitBtn = event.target.querySelector('button[type="submit"]');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Salvar';
                        return;
                    }
                    finalAvatarUrl = null;
                } else {
                    // Usa URL manual se houver
                    finalAvatarUrl = avatarUrl;
                    showWarning('Upload falhou, usando URL manual informada.');
                }
                
                const submitBtn = event.target.querySelector('button[type="submit"]');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Salvar';
            }
        }
        
        const agentData = {
            full_name: fullName,
            commercial_name: commercialName,
            email: email,
            status: status,
            nif: nif || null,
            phone: phone || null,
            whatsapp: whatsapp || null,
            avatar_url: finalAvatarUrl,
            city_id: cityId || null,
            country_id: countryId || null
        };
        
        // Só inclui senha se foi preenchida (ao editar, se deixar em branco mantém a atual)
        if (password) {
            // NOTA: Em produção, a senha deve ser hasheada (bcrypt) antes de salvar
            // Por enquanto, salvamos em texto plano (NÃO RECOMENDADO PARA PRODUÇÃO)
            agentData.password = password;
        }
        
        let response;
        
        if (id) {
            // Editar agente existente
            const url = `${SUPABASE_CONFIG.url}/rest/v1/agents?id=eq.${id}`;
            response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(agentData)
            });
        } else {
            // Criar novo agente
            const url = `${SUPABASE_CONFIG.url}/rest/v1/agents`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(agentData)
            });
        }
        
        if (response.ok) {
            showSuccess(`Agente ${id ? 'atualizado' : 'criado'} com sucesso!`);
            closeAgentModal();
            await fetchAgents();
        } else {
            const errorText = await response.text();
            console.error('Erro ao salvar agente:', errorText);
            
            // Verifica se é erro de duplicação
            if (errorText.includes('duplicate key') || errorText.includes('unique constraint')) {
                if (errorText.includes('email')) {
                    showError('Este email já está cadastrado para outro agente.');
                } else if (errorText.includes('nif')) {
                    showError('Este NIF já está cadastrado para outro agente.');
                } else {
                    showError('Erro: Dados duplicados. Verifique email e NIF.');
                }
            } else {
                showError('Erro ao salvar agente. Verifique o console para mais detalhes.');
            }
        }
    } catch (error) {
        console.error('Erro ao salvar agente:', error);
        showError('Erro ao salvar agente: ' + error.message);
    }
}

// Deleta agente
async function deleteAgent(id, commercialName) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar o agente "${commercialName}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    // Verifica se há conversas usando este agente
    try {
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/conversations?agent_id=eq.${id}&select=conversation_id&limit=1`;
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
                showError(`Não é possível deletar este agente pois existem conversa(s) associada(s). Primeiro, atualize as conversas para usar outro agente.`);
                return;
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar conversas:', error);
    }
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/agents?id=eq.${id}`;
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
            showSuccess('Agente deletado com sucesso!');
            await fetchAgents();
        } else {
            const errorText = await response.text();
            console.error('Erro ao deletar agente:', errorText);
            showError('Erro ao deletar agente. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar agente:', error);
        showError('Erro ao deletar agente: ' + error.message);
    }
}

// Funções auxiliares
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Logout
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = '../../index.html';
}

