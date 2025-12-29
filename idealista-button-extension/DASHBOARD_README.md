# 📊 Dashboard - Idealista Conversas

Dashboard web para visualizar conversas e mensagens do Firebase em tempo real.

## 🚀 Como Usar

### Opção 1: Abrir Localmente

1. Abra o arquivo `dashboard.html` diretamente no navegador
2. O dashboard se conectará automaticamente ao Firebase

### Opção 2: Servidor Local (Recomendado)

Para evitar problemas de CORS, use um servidor local:

```bash
# Com Python 3
python3 -m http.server 8000

# Com Node.js (npx)
npx http-server -p 8000

# Com PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000/dashboard.html`

### Opção 3: Hospedar Online

1. Faça upload do arquivo `dashboard.html` para um servidor web
2. Acesse via navegador

## ✨ Funcionalidades

### 📈 Estatísticas em Tempo Real
- **Total de Conversas**: Número total de conversas no banco
- **Total de Mensagens**: Soma de todas as mensagens
- **Não Lidas**: Conversas com mensagens não lidas
- **Com Telefone**: Conversas que têm número de telefone

### 💬 Lista de Conversas
- Lista todas as conversas ordenadas por data (mais recentes primeiro)
- Mostra:
  - Nome do cliente
  - Número de telefone formatado
  - Última mensagem
  - Data da última mensagem
  - Badge com número de mensagens não lidas

### 🔍 Busca
- Busca por nome do cliente, telefone ou conteúdo da mensagem
- Atualização em tempo real dos resultados

### 📨 Visualização de Mensagens
Ao clicar em uma conversa:
- Mostra todas as mensagens da conversa
- Diferencia mensagens do cliente (azul) e do agente (roxo)
- Exibe:
  - Remetente (Cliente ou Agente)
  - Data e hora da mensagem
  - Conteúdo completo
- Informações da conversa:
  - Nome do cliente
  - Telefone formatado
  - Data da última mensagem
  - Total de mensagens
  - Informações do anúncio

## 🔄 Atualização em Tempo Real

O dashboard usa **Firebase Firestore Listeners** para atualização automática:
- Novas conversas aparecem automaticamente
- Novas mensagens aparecem em tempo real
- Mudanças nos dados são refletidas instantaneamente
- Indicador visual quando há atualizações

## 🎨 Interface

- Design moderno e responsivo
- Cores gradientes (roxo/azul)
- Animações suaves
- Scroll automático para novas mensagens
- Destaque visual para conversa selecionada

## ⚙️ Configuração

As credenciais do Firebase estão configuradas no arquivo `dashboard.html`:

```javascript
const firebaseConfig = {
    projectId: 'imobflash-da1e3',
    apiKey: 'AIzaSyC_gCf-rNWjvicMlJTGyVbbs2SmuISijbc'
};
```

**⚠️ IMPORTANTE**: Para produção, considere:
1. Mover as credenciais para variáveis de ambiente
2. Configurar regras de segurança no Firestore para leitura
3. Adicionar autenticação se necessário

## 🔒 Segurança

O dashboard atualmente permite leitura de todas as conversas. Para produção:

1. Configure regras de segurança no Firestore:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /conversations/{conversationId} {
      allow read: if true; // Ou adicione autenticação
      match /messages/{messageId} {
        allow read: if true;
      }
    }
  }
}
```

2. Considere adicionar autenticação para proteger os dados

## 📱 Responsividade

O dashboard é responsivo e funciona bem em:
- Desktop
- Tablet
- Mobile (com algumas limitações)

## 🐛 Troubleshooting

### Erro de CORS
- Use um servidor local ao invés de abrir o arquivo diretamente

### Não carrega dados
- Verifique se as credenciais do Firebase estão corretas
- Verifique se as regras de segurança do Firestore permitem leitura
- Abra o console do navegador (F12) para ver erros

### Não atualiza em tempo real
- Verifique a conexão com a internet
- Verifique se o Firebase está configurado corretamente
- Recarregue a página

## 📝 Estrutura de Dados

O dashboard espera a seguinte estrutura no Firestore:

```
conversations/
  ├── {conversationId}/
  │   ├── conversationId: string
  │   ├── userName: string
  │   ├── phoneNumber: string
  │   ├── lastMessage: string
  │   ├── lastMessageDate: string
  │   ├── timestamp: timestamp
  │   ├── hasUnread: boolean
  │   ├── unreadCount: number
  │   └── messages/ (subcoleção)
  │       ├── {messageId}/
  │       │   ├── content: string
  │       │   ├── sender: "client" | "agent"
  │       │   ├── timestamp: timestamp
  │       │   └── time: string
```

## 🚀 Próximas Melhorias

- [ ] Filtros avançados (por data, cliente, etc.)
- [ ] Exportação de dados (CSV, JSON)
- [ ] Gráficos e estatísticas
- [ ] Notificações para novas mensagens
- [ ] Modo escuro
- [ ] Paginação para grandes volumes de dados

