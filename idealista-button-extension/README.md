# Idealista Button Extension

Extensão para Chrome que adiciona funcionalidades à página de conversas do Idealista.

## Funcionalidades

1. ✅ Botão WhatsApp automático
2. ✅ Extração automática de números de telefone
3. ✅ Monitoramento de conversas em tempo real
4. ✅ Salvamento automático no banco de dados (Supabase)
5. ✅ Salvamento de mensagens do chat
6. ✅ Reload aleatório (3-10 minutos)
7. ✅ Proteção de dados (phoneNumber não é sobrescrito)

## Configuração do Banco de Dados

### Opção 1: Supabase (Recomendado) ⭐

**Vantagens:**

- ✅ PostgreSQL completo e robusto
- ✅ Gratuito: 500MB storage, 2GB bandwidth
- ✅ REST API nativa
- ✅ Real-time subscriptions (opcional)
- ✅ Setup rápido: ~10 minutos

**Passos:**

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. Obtenha as credenciais (Project URL e Anon Key)
4. Configure as tabelas no banco (veja [SUPABASE_SETUP.md](SUPABASE_SETUP.md))
5. Edite `database.js` e configure:

   ```javascript
   supabase: {
       url: 'https://seu-projeto.supabase.co',
       anonKey: 'sua-anon-key-aqui'
   },
   mode: 'supabase'
   ```

**Documentação completa:** [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

---

### Opção 2: API REST Simples

Para usar uma API REST personalizada:

1. Crie uma API REST (Node.js, Python, PHP, etc.)
2. Endpoint: `POST /api/conversations`
3. Edite `database.js` e configure:

   ```javascript
   apiUrl: 'https://sua-api.com/api/conversations',
   mode: 'rest'
   ```

---

### Opção 3: localStorage (Fallback)

Por padrão, se nenhuma configuração for feita, os dados serão salvos apenas no `localStorage` do navegador (sem sincronização online).

---

## Instalação

1. Abra Chrome e vá em `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `idealista-button-extension/`
5. Configure o banco de dados (veja seção acima)

## Estrutura de Dados

### Conversa

Cada conversa salva contém:

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

Cada mensagem do chat contém:

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

## Como Funciona

1. **Monitoramento**: A extensão observa a lista de conversas na página
2. **Detecção**: Quando uma nova conversa aparece, ela é detectada automaticamente
3. **Extração**: Dados são extraídos (nome, telefone, mensagem, informações do anúncio)
4. **Salvamento**: Conversa é salva no banco de dados (Supabase)
5. **Mensagens**: Mensagens do chat são extraídas e salvas separadamente
6. **Proteção**: PhoneNumber existente nunca é sobrescrito por valores vazios
7. **Reload**: A página é recarregada aleatoriamente entre 3-10 minutos para capturar novas conversas

## Logs

Abra o Console do Desenvolvedor (F12) para ver os logs:

- 📝 Nova conversa detectada
- 💾 Conversa salva no Supabase
- 📨 Mensagens salvas
- 🔄 Reload agendado
- 🔒 PhoneNumber protegido (quando já existe)

## Troubleshooting

### Conversas não estão sendo salvas

1. Verifique o console do navegador (F12) para erros
2. Certifique-se de que o Supabase está configurado corretamente em `database.js`
3. Verifique se as políticas RLS (Row Level Security) do Supabase permitem INSERT
4. Verifique se as tabelas `conversations` e `messages` foram criadas

### Erro de CORS

- Se estiver usando API REST, certifique-se de que o CORS está configurado no servidor
- Supabase já tem CORS configurado por padrão

### PhoneNumber não está sendo salvo

- A extensão protege phoneNumbers existentes e não os sobrescreve
- Se o phoneNumber estiver vazio, ele será adicionado quando disponível
- Verifique os logs no console para entender o comportamento

## Estrutura de Arquivos

```text
idealista-button-extension/
├── content.js              # Script principal da extensão
├── database.js            # Gerenciamento de banco de dados
├── manifest.json           # Manifest da extensão Chrome
├── dashboard.html          # Dashboard web (separado)
├── README.md              # Este arquivo
├── SUPABASE_SETUP.md      # Guia completo de setup do Supabase
└── DATABASE_SETUP.md      # Informações sobre estrutura de dados
```

## Configuração Avançada

### Modo de Operação

A extensão suporta três modos de operação:

- `supabase`: Usa Supabase (recomendado)
- `rest`: Usa API REST personalizada
- `localStorage`: Apenas armazenamento local (fallback automático)

### Proteção de Dados

A extensão implementa proteção automática para dados importantes:

- **phoneNumber**: Nunca é sobrescrito se já existir um valor
- **userName**: Protegido contra sobrescrita para valores vazios
- **lastMessageDate**: Protegido contra sobrescrita para valores vazios

Isso garante que dados valiosos não sejam perdidos acidentalmente.

## Próximos Passos

Após configurar a extensão:

1. Configure o Dashboard para visualizar as conversas (veja `DASHBOARD_README.md`)
2. Configure as políticas RLS no Supabase para segurança
3. Monitore os logs no console para verificar o funcionamento

## Suporte

Para problemas ou dúvidas:

1. Verifique os logs no console do navegador
2. Consulte a documentação do Supabase: [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
3. Verifique se todas as tabelas foram criadas corretamente
