# Idealista Button Extension

Extensão para Chrome que adiciona funcionalidades à página de conversas do Idealista.

## Funcionalidades

1. ✅ Botão WhatsApp automático
2. ✅ Extração automática de números de telefone
3. ✅ Monitoramento de conversas
4. ✅ Salvamento automático no banco de dados
5. ✅ Reload aleatório (3-10 minutos)

## Configuração do Banco de Dados

### Opção 1: API REST Simples (Recomendado para começar)

1. Crie uma API REST simples (Node.js, Python, PHP, etc.)
2. Endpoint: `POST /api/conversations`
3. Edite `database.js` e configure:
   ```javascript
   apiUrl: 'https://sua-api.com/api/conversations',
   mode: 'rest'
   ```

### Opção 2: Firebase Firestore

1. Acesse: https://console.firebase.google.com/
2. Crie um novo projeto
3. Ative Firestore Database
4. Vá em Project Settings > General > Your apps > Web
5. Copie o `projectId` e `apiKey`
6. Edite `database.js`:
   ```javascript
   firebase: {
       projectId: 'seu-project-id',
       apiKey: 'sua-api-key'
   },
   mode: 'firebase'
   ```

### Opção 3: Usar apenas localStorage (sem banco online)

Por padrão, se nenhuma configuração for feita, os dados serão salvos apenas no `localStorage` do navegador.

## Instalação

1. Abra Chrome e vá em `chrome://extensions/`
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta do projeto

## Estrutura de Dados

Cada conversa salva contém:

```json
{
  "conversationId": "string",
  "userName": "string",
  "phoneNumber": "string",
  "lastMessage": "string",
  "timestamp": "ISO string",
  "createdAt": "ISO string",
  "url": "string",
  "isRead": boolean,
  "metadata": {}
}
```

## Como Funciona

1. **Monitoramento**: A extensão observa a lista de conversas
2. **Detecção**: Quando uma nova conversa aparece, ela é detectada automaticamente
3. **Extração**: Dados são extraídos (nome, telefone, mensagem)
4. **Salvamento**: Conversa é salva no banco de dados
5. **Reload**: A página é recarregada aleatoriamente entre 3-10 minutos

## Logs

Abra o Console do Desenvolvedor (F12) para ver os logs:
- 📝 Nova conversa detectada
- 💾 Conversa salva
- 🔄 Reload agendado

## Troubleshooting

- Se as conversas não estão sendo salvas, verifique o console para erros
- Certifique-se de que a API está acessível (CORS configurado)
- Verifique as credenciais do Firebase se estiver usando

