// Página de Países e Cidades

// Verifica autenticação
if (sessionStorage.getItem('imobflash_logged_in') !== 'true') {
    window.location.href = '../../index.html';
}

// Estado para países e cidades
let countries = [];
let cities = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🌍 Página de Países e Cidades carregada');
    
    // Carrega países e cidades
    await fetchCountries();
    await fetchCities();
});

// ============================================================================
// CRUD de Países
// ============================================================================

// Busca todos os países
async function fetchCountries() {
    const container = document.getElementById('countriesList');
    if (!container) return false;
    
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
            renderCountries();
            populateCountrySelectInCityModal();
            console.log(`✅ ${countries.length} países carregados`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar países:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar países</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar países:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
            </div>
        `;
        return false;
    }
}

// Renderiza lista de países
function renderCountries() {
    const container = document.getElementById('countriesList');
    if (!container) return;
    
    if (!countries || countries.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🌍</div>
                <p>Nenhum país cadastrado</p>
                <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Clique em "Adicionar País" para criar um novo</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = countries.map(country => `
        <div class="origin-item">
            <div class="origin-info">
                <div class="origin-name">
                    <strong>${escapeHtml(country.name)}</strong>
                    <span style="color: var(--text-muted); font-size: 12px; margin-left: 8px;">(${escapeHtml(country.code)})</span>
                </div>
            </div>
            <div class="origin-actions">
                <button class="btn btn-primary btn-icon" onclick="editCountry('${country.id}', '${escapeHtml(country.name)}', '${escapeHtml(country.code)}')" title="Editar">
                    ✏️
                </button>
                <button class="btn btn-danger btn-icon" onclick="deleteCountry('${country.id}', '${escapeHtml(country.name)}')" title="Deletar">
                    🗑️
                </button>
            </div>
        </div>
    `).join('');
}

// Mostra modal para adicionar país
function showAddCountryModal() {
    document.getElementById('countryModalTitle').textContent = 'Adicionar País';
    document.getElementById('countryId').value = '';
    document.getElementById('countryForm').reset();
    document.getElementById('countryModal').style.display = 'flex';
    document.getElementById('countryName').focus();
}

// Mostra modal para editar país
function editCountry(id, name, code) {
    document.getElementById('countryModalTitle').textContent = 'Editar País';
    document.getElementById('countryId').value = id;
    document.getElementById('countryName').value = name;
    document.getElementById('countryCode').value = code;
    document.getElementById('countryModal').style.display = 'flex';
    document.getElementById('countryName').focus();
}

// Fecha modal de país
function closeCountryModal() {
    document.getElementById('countryModal').style.display = 'none';
    document.getElementById('countryForm').reset();
    document.getElementById('countryId').value = '';
}

// Salva país (criar ou editar)
async function saveCountry(event) {
    event.preventDefault();
    
    const id = document.getElementById('countryId').value;
    const name = document.getElementById('countryName').value.trim();
    const code = document.getElementById('countryCode').value.trim().toUpperCase();
    
    if (!name || !code) {
        showWarning('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }
    
    if (code.length !== 2) {
        showWarning('O código ISO deve ter exatamente 2 caracteres.');
        return;
    }
    
    try {
        const countryData = {
            name: name,
            code: code
        };
        
        let response;
        
        if (id) {
            // Editar país existente
            const url = `${SUPABASE_CONFIG.url}/rest/v1/countries?id=eq.${id}`;
            response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(countryData)
            });
        } else {
            // Criar novo país
            const url = `${SUPABASE_CONFIG.url}/rest/v1/countries`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(countryData)
            });
        }
        
        if (response.ok) {
            showSuccess(`País ${id ? 'atualizado' : 'criado'} com sucesso!`);
            closeCountryModal();
            await fetchCountries();
        } else {
            const errorText = await response.text();
            console.error('Erro ao salvar país:', errorText);
            
            // Verifica se é erro de duplicação
            if (errorText.includes('duplicate key') || errorText.includes('unique constraint')) {
                if (errorText.includes('name')) {
                    showError('Este nome de país já está cadastrado.');
                } else if (errorText.includes('code')) {
                    showError('Este código ISO já está cadastrado.');
                } else {
                    showError('Erro: Dados duplicados. Verifique nome e código.');
                }
            } else {
                showError('Erro ao salvar país. Verifique o console para mais detalhes.');
            }
        }
    } catch (error) {
        console.error('Erro ao salvar país:', error);
        showError('Erro ao salvar país: ' + error.message);
    }
}

// Deleta país
async function deleteCountry(id, name) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar o país "${name}"?\n\nEsta ação irá deletar todas as cidades associadas e não pode ser desfeita!`)) {
        return;
    }
    
    // Verifica se há cidades usando este país
    try {
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/cities?country_id=eq.${id}&select=id&limit=1`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            const cities = await checkResponse.json();
            if (cities && cities.length > 0) {
                if (!confirm(`⚠️ Este país possui ${cities.length} cidade(s) associada(s).\n\nTodas as cidades serão deletadas também. Deseja continuar?`)) {
                    return;
                }
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar cidades:', error);
    }
    
    // Verifica se há agentes usando este país
    try {
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/agents?country_id=eq.${id}&select=id&limit=1`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            const agents = await checkResponse.json();
            if (agents && agents.length > 0) {
                showError(`Não é possível deletar este país pois existem agente(s) associado(s). Primeiro, atualize os agentes para usar outro país.`);
                return;
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar agentes:', error);
    }
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/countries?id=eq.${id}`;
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
            showSuccess('País deletado com sucesso!');
            await fetchCountries();
            await fetchCities(); // Recarrega cidades também
        } else {
            const errorText = await response.text();
            console.error('Erro ao deletar país:', errorText);
            showError('Erro ao deletar país. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar país:', error);
        showError('Erro ao deletar país: ' + error.message);
    }
}

// ============================================================================
// CRUD de Cidades
// ============================================================================

// Busca todas as cidades
async function fetchCities() {
    const container = document.getElementById('citiesList');
    if (!container) return false;
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/cities?select=*,countries(id,name,code)&order=countries(name).asc,name.asc`;
        const response = await fetch(url, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            cities = await response.json();
            renderCities();
            console.log(`✅ ${cities.length} cidades carregadas`);
            return true;
        } else {
            const errorText = await response.text();
            console.error('Erro ao buscar cidades:', response.status, errorText);
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">❌</div>
                    <p>Erro ao carregar cidades</p>
                </div>
            `;
            return false;
        }
    } catch (error) {
        console.error('Erro ao buscar cidades:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">❌</div>
                <p>Erro ao conectar com o servidor</p>
            </div>
        `;
        return false;
    }
}

// Renderiza lista de cidades
function renderCities() {
    const container = document.getElementById('citiesList');
    if (!container) return;
    
    if (!cities || cities.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏙️</div>
                <p>Nenhuma cidade cadastrada</p>
                <p style="font-size: 14px; color: var(--text-muted); margin-top: 8px;">Clique em "Adicionar Cidade" para criar uma nova</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = cities.map(city => {
        const country = city.countries || {};
        return `
            <div class="origin-item">
                <div class="origin-info">
                    <div class="origin-name">
                        <strong>${escapeHtml(city.name)}</strong>
                        <span style="color: var(--text-muted); font-size: 12px; margin-left: 8px;">- ${escapeHtml(country.name || 'N/A')} (${escapeHtml(country.code || 'N/A')})</span>
                    </div>
                </div>
                <div class="origin-actions">
                    <button class="btn btn-primary btn-icon" onclick="editCity('${city.id}', '${escapeHtml(city.name)}', '${city.country_id}')" title="Editar">
                        ✏️
                    </button>
                    <button class="btn btn-danger btn-icon" onclick="deleteCity('${city.id}', '${escapeHtml(city.name)}')" title="Deletar">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Preenche o select de países no modal de cidade
function populateCountrySelectInCityModal() {
    const select = document.getElementById('cityCountry');
    if (!select) return;
    
    select.innerHTML = '<option value="">Selecione um país...</option>';
    countries.forEach(country => {
        const option = document.createElement('option');
        option.value = country.id;
        option.textContent = `${country.name} (${country.code})`;
        select.appendChild(option);
    });
}

// Mostra modal para adicionar cidade
function showAddCityModal() {
    if (countries.length === 0) {
        showWarning('Por favor, cadastre pelo menos um país antes de adicionar cidades.');
        return;
    }
    
    document.getElementById('cityModalTitle').textContent = 'Adicionar Cidade';
    document.getElementById('cityId').value = '';
    document.getElementById('cityForm').reset();
    populateCountrySelectInCityModal();
    document.getElementById('cityModal').style.display = 'flex';
    document.getElementById('cityCountry').focus();
}

// Mostra modal para editar cidade
function editCity(id, name, countryId) {
    document.getElementById('cityModalTitle').textContent = 'Editar Cidade';
    document.getElementById('cityId').value = id;
    document.getElementById('cityName').value = name;
    populateCountrySelectInCityModal();
    document.getElementById('cityCountry').value = countryId;
    document.getElementById('cityModal').style.display = 'flex';
    document.getElementById('cityName').focus();
}

// Fecha modal de cidade
function closeCityModal() {
    document.getElementById('cityModal').style.display = 'none';
    document.getElementById('cityForm').reset();
    document.getElementById('cityId').value = '';
}

// Salva cidade (criar ou editar)
async function saveCity(event) {
    event.preventDefault();
    
    const id = document.getElementById('cityId').value;
    const name = document.getElementById('cityName').value.trim();
    const countryId = document.getElementById('cityCountry').value;
    
    if (!name || !countryId) {
        showWarning('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }
    
    try {
        const cityData = {
            name: name,
            country_id: countryId
        };
        
        let response;
        
        if (id) {
            // Editar cidade existente
            const url = `${SUPABASE_CONFIG.url}/rest/v1/cities?id=eq.${id}`;
            response = await fetch(url, {
                method: 'PATCH',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(cityData)
            });
        } else {
            // Criar nova cidade
            const url = `${SUPABASE_CONFIG.url}/rest/v1/cities`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_CONFIG.anonKey,
                    'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(cityData)
            });
        }
        
        if (response.ok) {
            showSuccess(`Cidade ${id ? 'atualizada' : 'criada'} com sucesso!`);
            closeCityModal();
            await fetchCities();
        } else {
            const errorText = await response.text();
            console.error('Erro ao salvar cidade:', errorText);
            
            // Verifica se é erro de duplicação
            if (errorText.includes('duplicate key') || errorText.includes('unique constraint')) {
                showError('Esta cidade já está cadastrada para este país.');
            } else {
                showError('Erro ao salvar cidade. Verifique o console para mais detalhes.');
            }
        }
    } catch (error) {
        console.error('Erro ao salvar cidade:', error);
        showError('Erro ao salvar cidade: ' + error.message);
    }
}

// Deleta cidade
async function deleteCity(id, name) {
    if (!confirm(`⚠️ Tem certeza que deseja deletar a cidade "${name}"?\n\nEsta ação não pode ser desfeita!`)) {
        return;
    }
    
    // Verifica se há agentes usando esta cidade
    try {
        const checkUrl = `${SUPABASE_CONFIG.url}/rest/v1/agents?city_id=eq.${id}&select=id&limit=1`;
        const checkResponse = await fetch(checkUrl, {
            headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (checkResponse.ok) {
            const agents = await checkResponse.json();
            if (agents && agents.length > 0) {
                showError(`Não é possível deletar esta cidade pois existem agente(s) associado(s). Primeiro, atualize os agentes para usar outra cidade.`);
                return;
            }
        }
    } catch (error) {
        console.warn('Erro ao verificar agentes:', error);
    }
    
    try {
        const url = `${SUPABASE_CONFIG.url}/rest/v1/cities?id=eq.${id}`;
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
            showSuccess('Cidade deletada com sucesso!');
            await fetchCities();
        } else {
            const errorText = await response.text();
            console.error('Erro ao deletar cidade:', errorText);
            showError('Erro ao deletar cidade. Verifique o console para mais detalhes.');
        }
    } catch (error) {
        console.error('Erro ao deletar cidade:', error);
        showError('Erro ao deletar cidade: ' + error.message);
    }
}

// Funções auxiliares
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Logout
function logout() {
    sessionStorage.removeItem('imobflash_logged_in');
    sessionStorage.removeItem('imobflash_user_email');
    window.location.href = '../../index.html';
}

