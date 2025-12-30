# 🚀 Guia de Configuração do Supabase

Este guia irá te ajudar a configurar o Supabase na extensão.

## 📋 Pré-requisitos

- Conta no Supabase (gratuita): [https://supabase.com](https://supabase.com)
- Navegador web

---

## 📝 Passo 1: Criar Conta e Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em **"Start your project"** ou **"Sign In"** se já tiver conta
3. Faça login ou crie uma conta (pode usar GitHub, Google, etc.)
4. Após login, clique em **"New Project"**
5. Preencha os dados:
   - **Name**: Nome do projeto (ex: "idealista-extension")
   - **Database Password**: Le120380@imobflash!
   Escolha uma senha forte (GUARDE ESTA SENHA!)
   - **Region**: Europe
   Escolha a região mais próxima (ex: "South America (São Paulo)")
   - **Pricing Plan**: Selecione **"Free"** (plano gratuito)
6. Clique em **"Create new project"**
7. Aguarde alguns minutos enquanto o projeto é criado (pode levar 2-3 minutos)

---

## 🔑 Passo 2: Obter Credenciais da API

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem no menu lateral)

   **a) Project URL:**
   https://bhguniomuytyzrfcpbeo.supabase.co

   **b) API Keys:**
   - **anon public**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3VuaW9tdXl0eXpyZmNwYmVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMDAxNTQsImV4cCI6MjA4MjU3NjE1NH0.cLEcnoEXy4dANZya-pr3PYIYrgwE8eDFbULl8r0-ybM

   - **service_role**:
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoZ3VuaW9tdXl0eXpyZmNwYmVvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzAwMDE1NCwiZXhwIjoyMDgyNTc2MTU0fQ.3QEY5mq252ObL3ICdTqgqdgCkUbSuUUWVqZWUCgoqiM

   - **api key**:
   sb_secret_ZKPRtSPdC258JPFc9DxJgw_TKRI6psp

---

## 🗄️ Passo 3: Criar Tabelas no Banco de Dados

1. No painel do Supabase, vá em **"SQL Editor"** (ícone de banco de dados no menu lateral)
2. Clique em **"New query"**
3. Cole o seguinte SQL e clique em **"Run"** (ou pressione `Ctrl+Enter`):

```sql
-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
    conversation_id TEXT PRIMARY KEY,
    user_name TEXT DEFAULT '',
    phone_number TEXT,
    last_message TEXT DEFAULT '',
    last_message_date TIMESTAMPTZ,
    ad_info TEXT DEFAULT '',
    ad_image_url TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    url TEXT DEFAULT '',
    is_read BOOLEAN DEFAULT false,
    unread_count INTEGER DEFAULT 0,
    has_unread BOOLEAN DEFAULT false
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    message_id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    content TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    sender TEXT DEFAULT 'unknown',
    time TEXT DEFAULT '',
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_conversation_id ON conversations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_id ON messages(message_id);
```

4. Verifique se apareceu a mensagem **"Success. No rows returned"** ou similar
5. Vá em **"Table Editor"** no menu lateral para verificar se as tabelas foram criadas:
   - Você deve ver `conversations` e `messages`

---

## 🔒 Passo 4: Configurar Políticas de Segurança (RLS)

O Supabase usa Row Level Security (RLS) para proteger os dados. Vamos configurar para permitir leitura e escrita:

1. No painel do Supabase, vá em **"Authentication"** > **"Policies"**
2. Ou vá em **"Table Editor"**, clique na tabela `conversations` e depois em **"Policies"**

### Para a tabela `conversations`:

1. Clique em **"New Policy"**
2. Selecione **"Create a policy from scratch"**
3. Configure:
   - **Policy name**: `Allow all operations`
   - **Allowed operation**: Selecione **"ALL"** (ou crie políticas separadas para SELECT, INSERT, UPDATE)
   - **Policy definition**: Cole:
   ```sql
   true
   ```
   - **With check expression**: Cole:
   ```sql
   true
   ```
4. Clique em **"Review"** e depois em **"Save policy"**

### Para a tabela `messages`:

1. Repita o mesmo processo para a tabela `messages`
2. Crie uma política com:
   - **Policy name**: `Allow all operations`
   - **Allowed operation**: **"ALL"**
   - **Policy definition**: `true`
   - **With check expression**: `true`

**Alternativa rápida (via SQL):**

Se preferir, você pode executar este SQL no SQL Editor:

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Política para conversations (permite tudo)
CREATE POLICY "Allow all operations on conversations"
ON conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- Política para messages (permite tudo)
CREATE POLICY "Allow all operations on messages"
ON messages
FOR ALL
USING (true)
WITH CHECK (true);
```

---

## ⚙️ Passo 5: Configurar o Código da Extensão

1. Abra o arquivo `database.js` no seu projeto
2. Localize a seção `DB_CONFIG` (no início do arquivo)
3. Substitua os valores:

```javascript
const DB_CONFIG = {
    // ... outras configurações ...
    
    // Para usar Supabase, defina as credenciais
    supabase: {
        url: 'https://SEU_PROJECT_ID.supabase.co', // COLE AQUI SUA PROJECT URL
        anonKey: 'SUA_ANON_KEY_AQUI' // COLE AQUI SUA ANON KEY
    },
    
    // Modo: 'rest' ou 'supabase'
    mode: 'supabase'
};
```

**Exemplo:**
```javascript
supabase: {
    url: 'https://abcdefghijklmnop.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
},
mode: 'supabase'
```

---

## ✅ Passo 6: Testar a Configuração

1. Recarregue a extensão no navegador:
   - Chrome: `chrome://extensions/` > Recarregar
   - Firefox: `about:addons` > Recarregar
2. Acesse `https://www.idealista.pt/conversations`
3. Abra o Console do navegador (F12 > Console)
4. Você deve ver logs como:
   - `✅ Conversa salva no Supabase: ...`
   - `✅ Mensagens salvas no Supabase: ...`
5. No painel do Supabase, vá em **"Table Editor"** e verifique se os dados estão sendo salvos

---

## 🔍 Passo 7: Verificar Dados no Supabase

1. No painel do Supabase, vá em **"Table Editor"**
2. Clique na tabela `conversations` para ver as conversas
3. Clique na tabela `messages` para ver as mensagens
4. Os dados devem aparecer em tempo real conforme a extensão os captura

---

## 🐛 Solução de Problemas

### Erro 401/403 (Não autorizado)
- **Causa**: Políticas RLS não configuradas corretamente
- **Solução**: Verifique o Passo 4 e certifique-se de que as políticas estão ativas

### Erro 404 (Tabela não encontrada)
- **Causa**: Tabelas não foram criadas
- **Solução**: Execute o SQL do Passo 3 novamente

### Erro de conexão
- **Causa**: URL ou chave incorretas
- **Solução**: Verifique se copiou corretamente a URL e a chave no Passo 5

### Dados não aparecem
- **Causa**: Modo não está configurado corretamente
- **Solução**: Verifique se `mode: 'supabase'` está configurado no `database.js`

---

## 📊 Dashboard (Opcional)

Se você estiver usando o `dashboard.html`, você precisará configurá-lo para usar Supabase:

1. Abra `dashboard.html`
2. Adicione o script do Supabase: `<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>`
3. Configure o Supabase com suas credenciais
4. Substitua as chamadas de banco de dados para usar a API REST do Supabase

---

## 🎉 Pronto!

Agora sua extensão está configurada para usar o Supabase! 

Os dados serão salvos automaticamente no Supabase sempre que:
- Uma nova conversa for detectada
- Um número de telefone for extraído
- Mensagens do chat forem capturadas

---

## 📚 Recursos Adicionais

- [Documentação do Supabase](https://supabase.com/docs)
- [Guia de REST API do Supabase](https://supabase.com/docs/reference/javascript/introduction)
- [SQL Editor do Supabase](https://supabase.com/docs/guides/database/tables)

---

## ⚠️ Importante

- **Nunca compartilhe sua chave `service_role`** - ela tem acesso total ao banco
- Use apenas a chave **anon public** no código do cliente
- Mantenha suas credenciais seguras
- O plano gratuito do Supabase tem limites (500MB de banco, 2GB de transferência)

