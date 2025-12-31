# Configuração do Supabase Realtime

Para que a atualização em tempo real funcione no dashboard, é necessário habilitar o Realtime no Supabase.

## Passo 1: Habilitar Realtime nas Tabelas

1. Acesse o painel do Supabase: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Database** > **Replication**
4. Ou vá em **Database** > **Tables** e clique na tabela desejada

### Para a tabela `conversations`:

1. Na lista de tabelas, encontre `conversations`
2. Clique nos três pontos (⋯) ao lado da tabela
3. Selecione **"Enable Realtime"** ou **"Replication"**
4. Marque a opção para habilitar Realtime

### Para a tabela `messages`:

1. Repita o mesmo processo para a tabela `messages`
2. Habilite o Realtime

## Passo 2: Verificar Configuração

Após habilitar, você deve ver um ícone de "rádio" ou "Realtime" ao lado das tabelas na interface do Supabase.

## Passo 3: Testar

1. Abra o dashboard de conversas
2. Abra o console do navegador (F12)
3. Você deve ver mensagens como:
   - `✅ Canal de conversas inscrito com sucesso`
   - `✅ Canal de mensagens inscrito com sucesso`
4. Quando houver mudanças no banco, você verá:
   - `🔄 Mudança detectada em conversas: INSERT`
   - `🔄 Mudança detectada em mensagens: INSERT`

## Troubleshooting

### Realtime não está funcionando

1. **Verifique se o Realtime está habilitado**: Vá em Database > Replication e confirme que as tabelas estão listadas
2. **Verifique o console**: Procure por erros relacionados a "channel" ou "realtime"
3. **Verifique as políticas RLS**: O Realtime precisa que as políticas RLS permitam SELECT
4. **Teste manualmente**: Crie uma nova conversa ou mensagem e veja se aparece automaticamente no dashboard

### Fallback para Polling

Se o Realtime não estiver disponível, o sistema automaticamente usa polling (atualização a cada 5 segundos) como fallback.

