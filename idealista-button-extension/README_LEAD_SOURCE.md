# Adicionar Campo lead_source

Este guia explica como adicionar o campo `lead_source` na tabela `conversations` do Supabase.

## Método 1: SQL Editor (Recomendado)

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** no menu lateral
4. Abra o arquivo `ADD_LEAD_SOURCE.sql`
5. Cole o conteúdo no editor
6. Clique em **Run** ou pressione `Ctrl+Enter`

## Método 2: Script Node.js (Automático)

### Pré-requisitos

```bash
npm install @supabase/supabase-js
```

### Configuração

1. Abra o arquivo `add-lead-source-field.js`
2. Substitua `SUA_SERVICE_ROLE_KEY_AQUI` pela sua Service Role Key:
   - Acesse https://supabase.com/dashboard
   - Selecione seu projeto
   - Vá em **Settings** > **API**
   - Copie a **service_role** key (secret)

### Execução

```bash
node add-lead-source-field.js
```

**Nota:** O script pode não funcionar se o Supabase não tiver uma função RPC `exec_sql` configurada. Nesse caso, use o Método 1.

## O que o script faz?

1. Adiciona a coluna `lead_source` na tabela `conversations`
2. Atualiza conversas existentes baseado na URL:
   - Se a URL contém "idealista" → `lead_source = 'Idealista'`
   - Caso contrário → `lead_source = 'Outro'`
3. Cria um índice para melhor performance

## Detecção Automática

O código JavaScript (`database.js`) agora detecta automaticamente a origem do lead baseado na URL:

- URLs com "idealista" → `Idealista`
- Outras URLs → `Outro`

Você pode adicionar mais origens editando a função `detectLeadSource()` em `database.js`.

