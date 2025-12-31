# ImobFlash Backend API

API Python para análise de mensagens usando OpenAI.

## 🚀 Como Usar

### Início Rápido

Se você já tem tudo configurado:

```bash
cd backend
source venv/bin/activate
python run.py
```

A API estará disponível em: `http://localhost:8000`

- **Documentação Swagger**: `http://localhost:8000/docs`
- **Health Check**: `http://localhost:8000/api/analysis/health`

### Usando no Dashboard

1. Certifique-se de que o servidor está rodando na porta 8000
2. Abra o dashboard de conversas
3. Selecione uma conversa
4. Use os botões de análise:
   - 📊 Resumir Conversa
   - 😊 Análise de Sentimento
   - 🎯 Intenção de Compra
   - ⭐ Qualidade do Lead

### Usando a API diretamente

```bash
# Health check
curl http://localhost:8000/api/analysis/health

# Análise de mensagens
curl -X POST http://localhost:8000/api/analysis/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_id": "conv_123",
    "messages": [...],
    "analysis_type": "summary"
  }'
```

---

## 📋 Requisitos

- Python 3.9+
- pip

## 🔧 Instalação

1. Navegue até a pasta `backend`:
```bash
cd backend
```

2. Crie um ambiente virtual (recomendado):
```bash
python3 -m venv venv
source venv/bin/activate  # No Windows: venv\Scripts\activate
```

3. Instale as dependências:
```bash
pip install -r requirements.txt
```

## ⚙️ Configuração

1. O arquivo `.env` já deve estar criado. Se não, copie o `.env.example`:
```bash
cp .env.example .env
```

2. Edite o arquivo `.env` e configure as variáveis:
```env
OPENAI_API_KEY=sua_chave_openai_aqui
SUPABASE_URL=sua_url_supabase_aqui
SUPABASE_KEY=sua_chave_supabase_aqui
API_HOST=0.0.0.0
API_PORT=8000
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000
OPENAI_MODEL=gpt-4o-mini
```

## 🗄️ Banco de Dados

Execute o script SQL para criar a tabela de análises:

1. Acesse o SQL Editor do Supabase
2. Execute o conteúdo do arquivo `ADD_ANALYSIS_TABLE.sql`

Ou copie e cole o conteúdo do arquivo `ADD_ANALYSIS_TABLE.sql` no SQL Editor do Supabase.

## 🏃 Executando o Servidor

### Desenvolvimento (com reload automático)

```bash
cd backend
source venv/bin/activate
python run.py
```

Ou usando uvicorn diretamente:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Produção

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Parar o servidor

Pressione `Ctrl+C` no terminal, ou:

```bash
lsof -ti:8000 | xargs kill -9
```

## 📚 Documentação da API

Após iniciar o servidor, acesse:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 🔌 Endpoints

### GET `/`
Status da API

**Response:**
```json
{
  "status": "ok",
  "message": "ImobFlash API está rodando",
  "version": "1.0.0"
}
```

### GET `/api/analysis/health`
Verifica status dos serviços

**Response:**
```json
{
  "openai_configured": true,
  "supabase_configured": true,
  "status": "ok"
}
```

### POST `/api/analysis/analyze`
Analisa mensagens de uma conversa

**Request Body:**
```json
{
  "conversation_id": "conv_123",
  "messages": [
    {
      "message_id": "msg_1",
      "conversation_id": "conv_123",
      "content": "Olá, tenho interesse em um apartamento",
      "timestamp": "2024-01-15T10:00:00Z",
      "sender": "client",
      "time": null,
      "order": 1
    }
  ],
  "analysis_type": "summary"
}
```

**Tipos de análise disponíveis:**
- `summary`: Resumo completo da conversa
- `sentiment`: Análise de sentimento
- `intent`: Intenção de compra
- `lead_quality`: Qualidade do lead

**Response:**
```json
{
  "success": true,
  "conversation_id": "conv_123",
  "analysis_type": "summary",
  "result": {
    "key_info": {
      "cliente": "João Silva",
      "propriedade": "Apartamento T2",
      "interesse": "Alto",
      "contato": "+5511999999999"
    },
    "next_steps": ["Agendar visita", "Enviar mais informações"],
    "summary": "Cliente demonstrou interesse em apartamento T2..."
  },
  "error": null
}
```

## 📝 Exemplos de Uso

### Python

```python
import requests

url = "http://localhost:8000/api/analysis/analyze"
data = {
    "conversation_id": "conv_123",
    "messages": [
        {
            "message_id": "msg_1",
            "conversation_id": "conv_123",
            "content": "Olá, tenho interesse",
            "timestamp": "2024-01-15T10:00:00Z",
            "sender": "client"
        }
    ],
    "analysis_type": "summary"
}

response = requests.post(url, json=data)
print(response.json())
```

### JavaScript/Fetch

```javascript
const response = await fetch('http://localhost:8000/api/analysis/analyze', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    conversation_id: 'conv_123',
    messages: [
      {
        message_id: 'msg_1',
        conversation_id: 'conv_123',
        content: 'Olá, tenho interesse',
        timestamp: '2024-01-15T10:00:00Z',
        sender: 'client'
      }
    ],
    analysis_type: 'summary'
  })
});

const result = await response.json();
console.log(result);
```

## 🛠️ Estrutura do Projeto

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # Aplicação FastAPI principal
│   ├── config.py            # Configurações
│   ├── models.py            # Modelos Pydantic
│   ├── services/
│   │   ├── __init__.py
│   │   ├── openai_service.py    # Serviço OpenAI
│   │   └── supabase_service.py  # Serviço Supabase
│   └── routes/
│       ├── __init__.py
│       └── analysis.py      # Rotas de análise
├── requirements.txt
├── .env
├── .env.example
├── run.py
├── ADD_ANALYSIS_TABLE.sql
└── README.md
```

## 🐛 Troubleshooting

### Erro: "OpenAI não está configurado"
- Verifique se a variável `OPENAI_API_KEY` está configurada no `.env`
- Certifique-se de que o arquivo `.env` está na pasta `backend`

### Erro: "Supabase não está configurado"
- Verifique se `SUPABASE_URL` e `SUPABASE_KEY` estão configurados no `.env`

### Erro de CORS
- Verifique se a origem do frontend está em `CORS_ORIGINS` no `.env`

## 📄 Licença

Este projeto é parte do ImobFlash.

