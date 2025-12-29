# 🏠 ImobFlash

Sistema completo para gerenciamento de conversas e leads imobiliários.

## 📋 Sobre o Projeto

O ImobFlash é uma solução integrada que automatiza a captura, armazenamento e visualização de conversas e leads do Idealista, facilitando o gerenciamento de clientes imobiliários.

## 🚀 Subprojetos

### 1. 📱 Extensão (Extension)

Extensão para Chrome que adiciona funcionalidades à página de conversas do Idealista.

**Localização:** `idealista-button-extension/`

**Funcionalidades:**

- ✅ Botão WhatsApp automático
- ✅ Extração automática de números de telefone
- ✅ Monitoramento de conversas
- ✅ Salvamento automático no banco de dados
- ✅ Reload aleatório (3-10 minutos)

**Documentação:** [README da Extensão](idealista-button-extension/README.md)

**Configuração:**

- Suporta Supabase (recomendado), API REST ou localStorage
- Guias disponíveis: [SUPABASE_SETUP.md](idealista-button-extension/SUPABASE_SETUP.md), [DATABASE_SETUP.md](idealista-button-extension/DATABASE_SETUP.md)

---

### 2. 📊 Dashboard

Dashboard web para visualizar conversas e mensagens em tempo real.

**Localização:** `idealista-button-extension/dashboard.html`

**Funcionalidades:**

- 📈 Estatísticas em tempo real (total de conversas, mensagens, não lidas)
- 💬 Lista de conversas ordenadas por data
- 🔍 Busca por nome, telefone ou conteúdo
- 📨 Visualização completa de mensagens
- 🔄 Atualização em tempo real via Supabase

**Documentação:** [DASHBOARD_README.md](idealista-button-extension/DASHBOARD_README.md)

**Como usar:**

```bash
# Servidor local (recomendado)
python3 -m http.server 8000
# ou
npx http-server -p 8000

# Acesse: http://localhost:8000/dashboard.html
```

---

### 3. 📱 App

Aplicativo mobile/web para gerenciamento completo de leads e conversas.

**Status:** 🚧 Em desenvolvimento

**Funcionalidades planejadas:**

- Gerenciamento de leads
- Notificações push
- Integração com CRM
- Relatórios e analytics

---

## 🛠️ Tecnologias

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Supabase (PostgreSQL)
- **Extensão:** Chrome Extension API
- **Real-time:** Supabase Realtime (opcional)

## 📦 Estrutura do Projeto

```text
imobFlash/
├── idealista-button-extension/    # Extensão Chrome
│   ├── content.js                 # Script principal da extensão
│   ├── database.js                # Gerenciamento de banco de dados
│   ├── dashboard.html             # Dashboard web
│   ├── database.js                # Configuração de banco de dados
│   ├── manifest.json              # Manifest da extensão
│   └── README.md                  # Documentação da extensão
├── app/                           # Aplicativo (em desenvolvimento)
└── README.md                      # Este arquivo
```

## 🚀 Início Rápido

### 1. Configurar a Extensão

1. Acesse `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `idealista-button-extension/`
5. Configure o banco de dados (veja [DATABASE_SETUP.md](idealista-button-extension/DATABASE_SETUP.md))

### 2. Configurar o Dashboard

1. Configure o Supabase (veja [SUPABASE_SETUP.md](idealista-button-extension/SUPABASE_SETUP.md))
2. Inicie um servidor local:

   ```bash
   python3 -m http.server 8000
   ```

3. Acesse `http://localhost:8000/dashboard.html`

## 📚 Documentação

- [Extensão - README](idealista-button-extension/README.md)
- [Dashboard - README](idealista-button-extension/DASHBOARD_README.md)
- [Configuração Supabase](idealista-button-extension/SUPABASE_SETUP.md)
- [Configuração do Banco de Dados](idealista-button-extension/DATABASE_SETUP.md)

## 🔧 Configuração

### Banco de Dados

O projeto suporta múltiplas opções de banco de dados:

1. **Supabase** (Recomendado) - [Guia de Setup](idealista-button-extension/SUPABASE_SETUP.md)
2. **API REST** - Configure endpoint personalizado
3. **localStorage** - Apenas local (sem sincronização)

## 📊 Estrutura de Dados

### Conversa

```json
{
  "conversationId": "string",
  "userName": "string",
  "phoneNumber": "string",
  "lastMessage": "string",
  "lastMessageDate": "ISO string",
  "adInfo": "string",
  "adImageUrl": "string",
  "timestamp": "ISO string",
  "createdAt": "ISO string",
  "url": "string",
  "isRead": boolean,
  "unreadCount": number,
  "hasUnread": boolean
}
```

### Mensagem

```json
{
  "messageId": "string",
  "conversationId": "string",
  "content": "string",
  "timestamp": "ISO string",
  "sender": "client" | "agent",
  "time": "string"
}
```

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob licença proprietária.

## 👤 Autor

### Luiz Eduardo

- GitHub: [@Luizeduardompf](https://github.com/Luizeduardompf)

## 🗺️ Roadmap

- [ ] Finalizar desenvolvimento do App
- [ ] Adicionar autenticação ao Dashboard
- [ ] Implementar notificações push
- [ ] Integração com CRM
- [ ] Relatórios e analytics avançados
- [ ] Exportação de dados (CSV, JSON)
- [ ] Modo escuro no Dashboard

---

⭐ Se este projeto foi útil para você, considere dar uma estrela!
