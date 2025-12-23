# Pasteon - API Testing & Documentation Tool [![Skills](https://skillicons.dev/icons?i=react,typescript,vite,express,mysql,docker)](https://skillicons.dev)

<p>Ferramenta para testar APIs e documentar automaticamente os campos de requisições e respostas usando IA.</p>

## Funcionalidades Implementadas:
<p><b>API Tester</b></p>
<p><b>Gerenciamento de Endpoints</b> (CRUD completo)</p>
<p><b>Requisições Sequenciais</b> (múltiplos endpoints em batch)</p>
<p><b>Extração Automática de Campos</b> (Body, Query Params, Response)</p>
<p><b>Documentação com IA</b> (Ollama, Gemini, Groq, OpenRouter)</p>
<p><b>Rate Limit Configurável</b> (RPM e RPD por provider)</p>
<p><b>Importação Postman</b> (collections e environments)</p>
<p><b>Grupos de Requisições</b> (organização por domínio)</p>
<p><b>Sistema de Retry</b> (requisições falhadas)</p>
<p><b>Exportação para Excel</b></p>

## Arquitetura & Padrões:
<p>Adapter Pattern (multi-provider IA)</p>
<p>Data Transfer Objects</p>
<p>Repository Pattern</p>
<p>Feature-based Module Organization</p>

## Tecnologias:

### Frontend
<p>React 18</p>
<p>TypeScript</p>
<p>Vite (HMR)</p>
<p>TailwindCSS</p>
<p>shadcn/ui</p>

### Backend
<p>Express.js</p>
<p>Node.js 20</p>
<p>MySQL 8.0 (connection pool)</p>
<p>CORS</p>

### DevOps
<p>Docker & Docker Compose</p>

### IA Integration
<p>Ollama</p>
<p>Google Gemini</p>
<p>Groq</p>
<p>OpenRouter</p>

### Docker (Recomendado)
```bash
docker-compose up
```
http://localhost:5173

### Configuração IA

**Gemini** (cloud):
```env
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=sua_chave
```

**Ollama** (local):
```bash
# 1. Instale e baixe o modelo
ollama pull llama3.2

# 2. Inicie o servidor (manter rodando)
ollama serve
```
```env

VITE_AI_PROVIDER=ollama
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2
```

**Groq** (cloud):
```env
VITE_AI_PROVIDER=groq
VITE_GROQ_API_KEY=sua_chave
```
