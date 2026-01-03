# ImobFlash Agent - Painel de Monitoramento

## Visão Geral

O ImobFlash Agent é um painel de controle que permite gerenciar o monitoramento de múltiplos sites imobiliários através de uma interface centralizada.

## Funcionalidades

### 1. Popup do Agente
- Interface moderna e intuitiva
- Lista de sites monitorados (Idealista, OLX, SuperCasa, Instagram, Facebook)
- Botões para abrir cada site

### 2. Gerenciamento de Abas
- Detecta se já existe uma aba aberta do site
- Reutiliza abas existentes quando possível
- Abre novas abas quando necessário

### 3. Verificação de Login
- Verifica automaticamente se o usuário está logado
- Redireciona para a página de login se necessário
- Aguarda o login do usuário antes de continuar
- Navega automaticamente para a página de conversas após login

### 4. Overlay de Proteção
- Cobre toda a página quando o agente está ativo
- Bloqueia todas as interações do usuário com a página
- Garante que o agente funcione sem interferências
- Pode ser fechado pelo usuário se necessário

## Estrutura de Arquivos

```
idealista-button-extension/
├── popup.html          # Interface do painel do agente
├── popup.js            # Lógica do popup
├── background.js       # Service worker para gerenciar abas
├── overlay.js          # Script do overlay que cobre a página
├── overlay.css         # Estilos do overlay
└── manifest.json       # Configuração da extensão
```

## Como Usar

1. **Abrir o Painel**: Clique no ícone da extensão no Chrome
2. **Selecionar Site**: Clique no botão do site desejado (ex: Idealista)
3. **Login Automático**: Se não estiver logado, será redirecionado para login
4. **Overlay Ativo**: Após login, o overlay será ativado automaticamente
5. **Fechar Overlay**: Clique no botão "Fechar Overlay" se precisar interagir com a página

## Sites Suportados

### ✅ Idealista
- Totalmente funcional
- Verificação de login automática
- Overlay de proteção ativo

### 🚧 Em Desenvolvimento
- OLX
- SuperCasa
- Instagram
- Facebook

## Permissões Necessárias

- `tabs`: Para gerenciar abas do navegador
- `scripting`: Para injetar scripts nas páginas
- `storage`: Para armazenar configurações

## Notas Técnicas

- O overlay é injetado apenas na página de conversas do Idealista
- O overlay bloqueia todas as interações usando event listeners com capture phase
- O sistema aguarda até 2 minutos pelo login do usuário
- O overlay pode ser removido pelo usuário a qualquer momento

