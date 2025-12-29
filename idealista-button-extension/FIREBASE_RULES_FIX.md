# 🔒 Correção das Regras do Firestore

## Problema
Erro 403 (Forbidden) ao salvar mensagens: "Missing or insufficient permissions"

## Causa
As regras de segurança do Firestore não estão permitindo escrita na subcoleção `messages`.

## Solução

### Passo 1: Acesse as Regras do Firestore
1. Acesse: https://console.firebase.google.com/project/imobflash-da1e3/firestore/rules

### Passo 2: Cole as Regras Corretas
Substitua as regras atuais por estas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite leitura e escrita para todas as conversas
    match /conversations/{conversationId} {
      allow read, write: if true;
      
      // IMPORTANTE: Permite leitura e escrita nas mensagens de cada conversa
      match /messages/{messageId} {
        allow read, write: if true;
      }
    }
  }
}
```

### Passo 3: Publique as Regras
1. Clique no botão **"Publicar"** (Publish)
2. Aguarde a confirmação de que as regras foram atualizadas

### Passo 4: Teste Novamente
1. Recarregue a extensão no Chrome
2. Abra a página de conversas do Idealista
3. Verifique o console - os erros 403 devem desaparecer

## ⚠️ Importante
Essas regras permitem acesso total (leitura e escrita) para qualquer pessoa. 
Isso é adequado para desenvolvimento/teste, mas para produção você deve:
- Adicionar autenticação
- Restringir acesso baseado em usuário
- Usar regras mais específicas

## Estrutura das Regras
```
conversations/
  ├── {conversationId}          ← Regra principal
  └── messages/
      └── {messageId}            ← Subcoleção (precisa de regra separada!)
```

A regra para `messages` deve estar **dentro** da regra de `conversations` para funcionar corretamente.

