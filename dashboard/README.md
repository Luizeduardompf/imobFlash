# 📊 Dashboard ImobFlash

Dashboard web para visualizar conversas e mensagens do Supabase em tempo real.

## 🚀 Como Usar

### Opção 1: Servidor Local (Recomendado)

```bash
# Com Python 3
python3 -m http.server 8000

# Com Node.js (npx)
npx http-server -p 8000

# Com PHP
php -S localhost:8000
```

Depois acesse: `http://localhost:8000/dashboard/index.html`

### Opção 2: Hospedar Online

1. Faça upload dos arquivos para um servidor web
2. Acesse via navegador

## ✨ Funcionalidades

### 🔐 Autenticação
- Tela de login simples
- Sessão persistente
- Logout

### 📈 Estatísticas em Tempo Real
- **Total de Conversas**: Número total de conversas
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
- Busca por nome, telefone ou conteúdo

### 📨 Visualização de Mensagens
- Lista todas as mensagens
- Filtro por conversa
- Busca por conteúdo
- Diferencia mensagens do cliente (azul) e do agente (roxo)
- Exibe:
  - Remetente (Cliente ou Agente)
  - Data e hora da mensagem
  - Conteúdo completo

### 🔄 Atualização em Tempo Real
- Atualização automática a cada 5 segundos
- Para usar Supabase Realtime completo, configure no projeto Supabase

## ⚙️ Configuração

As credenciais do Supabase estão configuradas no arquivo `js/config.js`:

```javascript
const SUPABASE_CONFIG = {
    url: 'https://seu-projeto.supabase.co',
    anonKey: 'sua-anon-key-aqui'
};
```

**⚠️ IMPORTANTE**: Para produção, considere:
1. Mover as credenciais para variáveis de ambiente
2. Configurar autenticação real com Supabase Auth
3. Configurar Supabase Realtime para atualizações instantâneas

## 🔒 Segurança

O dashboard atualmente permite leitura de todas as conversas. Para produção:

1. Configure regras de segurança no Supabase (RLS)
2. Adicione autenticação real com Supabase Auth
3. Configure políticas de acesso baseadas em usuário

## 📱 Responsividade

O dashboard é responsivo e funciona bem em:
- Desktop
- Tablet
- Mobile (com algumas limitações)

## 🐛 Troubleshooting

### Erro de CORS
- Use um servidor local ao invés de abrir o arquivo diretamente

### Não carrega dados
- Verifique se as credenciais do Supabase estão corretas em `js/config.js`
- Verifique se as políticas RLS do Supabase permitem leitura
- Abra o console do navegador (F12) para ver erros

### Não atualiza em tempo real
- Verifique a conexão com a internet
- Verifique se o Supabase está configurado corretamente
- Para atualizações instantâneas, configure Supabase Realtime

## 🚀 Próximas Melhorias

- [ ] Autenticação real com Supabase Auth
- [ ] Supabase Realtime para atualizações instantâneas
- [ ] Filtros avançados (por data, cliente, etc.)
- [ ] Exportação de dados (CSV, JSON)
- [ ] Gráficos e estatísticas
- [ ] Notificações para novas mensagens
- [ ] Modo escuro (já implementado)
- [ ] Paginação para grandes volumes de dados

