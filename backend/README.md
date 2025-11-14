# Backend API - Document Form

Express.js REST API para gerenciar endpoints, campos de resposta, grupos de requisições e configurações de IA.

## 🚀 Quick Start

### Desenvolvimento Local

```bash
# Entrar na pasta backend
cd backend

# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Edite o .env com suas credenciais MySQL

# Iniciar servidor
npm start
```

O servidor estará disponível em `http://localhost:3001`.

### Com Docker

```bash
# Na raiz do projeto
docker-compose up
```

O backend será iniciado automaticamente junto com MySQL e frontend.

## 📁 Estrutura

```
backend/
├── lib/
│   └── mysql.js           # Configuração do MySQL connection pool
├── routes/
│   ├── endpoints.js       # CRUD de endpoints
│   ├── responseFields.js  # CRUD de campos de resposta
│   ├── requestGroups.js   # CRUD de grupos de requisições
│   ├── aiSettings.js      # Configurações de AI providers
│   └── dictionary.js      # CRUD de dicionário de campos
├── server.js              # Servidor Express principal
├── package.json           # Dependências e scripts
└── .env.example           # Exemplo de variáveis de ambiente
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Verifica se o servidor está rodando

### Endpoints
- `GET /api/endpoints` - Lista todos os endpoints
- `POST /api/endpoints` - Cria novo endpoint
- `DELETE /api/endpoints/:id` - Deleta endpoint

### Response Fields
- `POST /api/response-fields` - Salva campo de resposta
- `GET /api/response-fields/without-description` - Campos sem descrição
- `GET /api/response-fields/with-description` - Campos com descrição
- `PUT /api/response-fields/:id/description` - Atualiza descrição
- `GET /api/response-fields/statistics` - Estatísticas de documentação

### Request Groups
- `GET /api/request-groups` - Lista todos os grupos
- `GET /api/request-groups/:id` - Busca grupo com requests
- `POST /api/request-groups` - Cria novo grupo
- `DELETE /api/request-groups/:id` - Deleta grupo
- `POST /api/request-groups/:id/requests` - Adiciona request ao grupo
- `DELETE /api/request-groups/:groupId/requests/:requestId` - Remove request

### AI Settings
- `GET /api/ai-settings/:provider` - Busca configurações do provider
- `POST /api/ai-settings` - Cria/atualiza configurações
- `DELETE /api/ai-settings/:provider` - Deleta configurações

### Dictionary
- `GET /api/dictionary` - Lista todos os campos
- `POST /api/dictionary/batch` - Importa múltiplos campos
- `PUT /api/dictionary/:id/description` - Atualiza descrição
- `DELETE /api/dictionary/:id` - Deleta campo

## ⚙️ Variáveis de Ambiente

```env
# MySQL Database
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=document_form
MYSQL_USER=root
MYSQL_PASSWORD=your_password

# Server
PORT=3001
NODE_ENV=development

# CORS
CORS_ORIGIN=http://localhost:5173
```

## 🛠️ Tecnologias

- **Express.js** - Framework web
- **mysql2** - Driver MySQL com Promises
- **cors** - Middleware CORS
- **dotenv** - Gerenciamento de variáveis de ambiente
- **nodemon** - Hot reload (development)

## 📝 Scripts

```bash
npm start    # Inicia servidor (produção)
npm run dev  # Inicia com nodemon (desenvolvimento)
```

## 🔒 Segurança

- CORS configurado para aceitar apenas origem especificada
- Validação de entrada em todos os endpoints
- Prepared statements (proteção contra SQL injection)
- Connection pool com limite de conexões

## 🐳 Docker

O backend é automaticamente construído e iniciado via `docker-compose.yml`:

```yaml
backend:
  build:
    context: ./backend
    dockerfile: ../Dockerfile.backend
  ports:
    - "3001:3001"
  depends_on:
    mysql:
      condition: service_healthy
```

## 🔍 Logs

O servidor Express loga:
- ✅ Conexão bem-sucedida com MySQL
- ❌ Erros de conexão
- 🚀 Porta em que está rodando
- 📦 Ambiente (development/production)
- 🔗 Origem CORS permitida

## 🤝 Integração com Frontend

O frontend React chama a API via `fetch()`:

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const response = await fetch(`${API_BASE_URL}/api/endpoints`);
const endpoints = await response.json();
```

## 📄 Licença

Este projeto é parte do sistema Document Form.
