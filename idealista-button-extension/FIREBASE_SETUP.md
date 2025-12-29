# Guia de Configuração do Firebase Firestore

## Passo 1: Criar o Projeto no Firebase

1. Acesse: https://console.firebase.google.com/
2. Clique em **"Adicionar projeto"** ou **"Create a project"**
3. Digite o nome do projeto (ex: "idealista-conversations")
4. Aceite os termos e clique em **"Continuar"**
5. Desative o Google Analytics (ou mantenha ativado, como preferir)
6. Clique em **"Criar projeto"**

## Passo 2: Ativar o Firestore Database

1. No menu lateral, clique em **"Firestore Database"**
2. Clique em **"Criar banco de dados"** ou **"Create database"**
3. Escolha o modo:
   - **Modo de teste** (recomendado para começar) - permite leitura/escrita por 30 dias
   - **Modo de produção** - requer regras de segurança
4. Escolha a localização (ex: `europe-west` para Portugal)
5. Clique em **"Ativar"** ou **"Enable"**

## Passo 3: Configurar Regras de Segurança

1. Vá em **"Regras"** (Rules) no Firestore
2. Para desenvolvimento/teste, use estas regras temporárias:

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

⚠️ **ATENÇÃO**: Essas regras permitem acesso total. Para produção, configure regras mais restritivas.

3. Clique em **"Publicar"** (Publish)

## Passo 4: Obter as Credenciais do Projeto

1. Vá em **"Configurações do projeto"** (ícone de engrenagem) > **"Configurações do projeto"**
2. Role até **"Seus aplicativos"** ou **"Your apps"**
3. Clique no ícone **"Web"** (`</>`)
4. Registre um app (nome: "Idealista Extension")
5. **NÃO** precisa instalar o SDK Firebase
6. Copie as informações que aparecem:
   - `apiKey`
   - `projectId`
   - `authDomain`
   - `storageBucket`
   - `messagingSenderId`
   - `appId`

## Passo 5: Configurar o database.js

1. Abra o arquivo `database.js`
2. Localize a seção `DB_CONFIG`
3. Configure assim:

```javascript
const DB_CONFIG = {
    apiUrl: '', // Deixe vazio se usar Firebase
    
    firebase: {
        projectId: 'SEU_PROJECT_ID_AQUI',  // Cole o projectId aqui
        apiKey: 'SUA_API_KEY_AQUI'          // Cole a apiKey aqui
    },
    
    mode: 'firebase'  // Mude de 'rest' para 'firebase'
};
```

## Passo 6: Criar a Coleção (Tabela)

O Firestore usa **coleções** ao invés de tabelas. A coleção será criada automaticamente quando a primeira conversa for salva.

**Estrutura esperada:**
- **Coleção**: `conversations`
- **Documento ID**: `{conversationId}` (ex: "53564943")
- **Campos do documento**:
  - `conversationId` (string)
  - `userName` (string)
  - `phoneNumber` (string)
  - `lastMessage` (string)
  - `lastMessageDate` (string)
  - `adInfo` (string)
  - `adImageUrl` (string)
  - `url` (string)
  - `timestamp` (timestamp)
  - `createdAt` (timestamp)
  - `isRead` (boolean)
  - `metadata` (map/object)

## Passo 7: Testar

1. Recarregue a extensão no Chrome
2. Abra a página de conversas do Idealista
3. Abra o Console (F12)
4. Verifique os logs:
   - `✅ Conversa salva no Firebase: {id}`
5. No Firebase Console, vá em Firestore Database
6. Você deve ver a coleção `conversations` aparecer
7. Clique nela para ver os documentos salvos

## Estrutura Visual no Firebase

```
Firestore Database
└── conversations (coleção)
    ├── 53564943 (documento)
    │   ├── conversationId: "53564943"
    │   ├── userName: "Cortesia Vip"
    │   ├── phoneNumber: ""
    │   ├── lastMessage: "Olá, tenho interesse..."
    │   ├── timestamp: 2024-12-26T...
    │   └── ...
    ├── 53564556 (documento)
    └── ...
```

## Regras de Segurança para Produção (Opcional)

Para produção, use regras mais seguras:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conversations/{conversationId} {
      // Permite leitura e escrita apenas para usuários autenticados
      allow read, write: if request.auth != null;
      
      // Ou permite apenas escrita (sem autenticação)
      // allow write: if true;
      // allow read: if false; // Apenas o app pode ler
    }
  }
}
```

## Limites Gratuitos do Firebase

- **50.000 leituras/dia**
- **20.000 escritas/dia**
- **20.000 exclusões/dia**
- **1 GB de armazenamento**

## Troubleshooting

### Erro: "Permission denied"
- Verifique as regras de segurança no Firestore
- Certifique-se de que as regras permitem escrita

### Erro: "Project not found"
- Verifique se o `projectId` está correto
- Verifique se o Firestore está ativado

### Conversas não aparecem
- Verifique o console do navegador para erros
- Verifique se `mode: 'firebase'` está configurado
- Verifique se as credenciais estão corretas

## Próximos Passos

1. Configure as credenciais no `database.js`
2. Teste salvando uma conversa
3. Verifique no Firebase Console se os dados aparecem
4. Ajuste as regras de segurança conforme necessário

