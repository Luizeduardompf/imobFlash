# Configuração do Banco de Dados

## Opções Recomendadas

### 1. Firebase Firestore (RECOMENDADO) ⭐
- **Gratuito**: 50k leituras/dia, 20k escritas/dia
- **Fácil**: SDK simples, sem backend necessário
- **Real-time**: Atualizações automáticas
- **Setup**: 5 minutos

**Passos:**
1. Acesse: https://console.firebase.google.com/
2. Crie um novo projeto
3. Ative Firestore Database
4. Copie as credenciais (será usado no código)

### 2. Supabase
- **Gratuito**: 500MB, 2GB bandwidth
- **PostgreSQL**: Banco relacional completo
- **Setup**: 10 minutos

### 3. MongoDB Atlas
- **Gratuito**: 512MB storage
- **NoSQL**: Flexível
- **Setup**: 15 minutos

## Estrutura de Dados

```javascript
{
  conversationId: "string", // ID único da conversa (data-conversation-id)
  userName: "string", // Nome do remetente
  phoneNumber: "string", // Número de telefone extraído
  lastMessage: "string", // Última mensagem
  timestamp: "timestamp", // Data/hora da última atualização
  createdAt: "timestamp", // Data/hora de criação
  url: "string", // URL da conversa
  isRead: boolean, // Se foi lida
  metadata: {
    // Informações adicionais
  }
}
```

## Implementação

Vou implementar com Firebase Firestore por ser a opção mais simples e rápida.

