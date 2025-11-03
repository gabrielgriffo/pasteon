# Pasteon - API Testing & Documentation Tool

Uma ferramenta completa para testar APIs e documentar automaticamente os campos de requisições e respostas. Salva automaticamente todos os campos extraídos em um banco de dados Supabase, permitindo construir uma documentação viva da sua API.

## 📋 Sobre o Projeto

Este projeto foi criado para facilitar o processo de testar APIs e documentar seus endpoints de forma automática. Ao fazer requisições, o sistema extrai e salva automaticamente:

- **Query Parameters** (para métodos GET)
- **Campos do Body** (para POST/PUT/PATCH)
- **Campos do Response** (para todos os métodos)

Todos os campos são salvos no banco de dados com detalhes sobre tipo, valor de exemplo e estrutura, eliminando a necessidade de documentação manual.

## ✨ Funcionalidades

### 🔧 Gerenciamento de Endpoints
- Cadastro de endpoints reutilizáveis (método + URL)
- Edição e exclusão de endpoints salvos
- Validação de duplicatas (mesmo método + URL)
- Lista organizada de todos os endpoints cadastrados

### 🚀 Execução de Requisições
- **Múltiplas requisições sequenciais** - Execute vários endpoints em sequência
- **Cards colapsáveis** - Organize visualmente suas requisições
- **Botão "Expandir/Colapsar Todos"** - Gerencie todos os cards de uma vez
- **Bodies customizados** - Cada endpoint pode ter seu próprio body JSON
- **Indicadores visuais** - Badges de erro, método, e status
- **Progresso em tempo real** - Veja qual requisição está sendo executada

### 🔐 Autenticação
- **Bearer Token centralizado** - Configure o token uma vez, use em todas as requisições
- **Armazenamento local** - Token salvo no localStorage para persistência
- **Gerenciamento fácil** - Campo dedicado no modal de configurações

### 📊 Visualização de Resultados
- **Tabela unificada** - Todos os resultados em uma única visualização
- **Separação por tipo** - Badges coloridas para Body, Query Params e Response
- **Campos organizados** - Body/Query Params aparecem antes do Response
- **Separadores visuais** - Linhas azuis separam diferentes requisições
- **Exportação para Excel** - Copie dados formatados com um clique

### 💾 Documentação Automática
- **Salvamento automático** - Todos os campos são salvos no Supabase após cada requisição bem-sucedida
- **Prevenção de duplicatas** - Constraint única evita campos repetidos
- **Extração inteligente** - Suporta objetos aninhados com notação de pontos (ex: `user.address.city`)
- **Tipos identificados** - Cada campo é marcado como Body, Query Params ou Response
- **Histórico completo** - Campos de descrição preparados para documentação futura

### 🤖 Geração Automática de Descrições com IA
- **Triple AI Integration** - Suporte para Ollama (local), Google Gemini (cloud) e Groq (cloud ultra-rápido)
- **Dashboard de Estatísticas** - Visualize campos documentados vs pendentes em tempo real
- **Processamento em Lote** - Gera descrições automáticas para todos os campos sem descrição
- **Progresso ao Vivo** - Acompanhe o processamento com estimativas de tempo
- **Rate Limit Inteligente** - RPM e RPD configuráveis por provider, salvos no banco
- **Exportação Completa** - Copie toda a documentação em formato de tabela
- **Configuração Persistente** - Settings sincronizados via Supabase entre dispositivos
- **Toasts Informativos** - Notificações em tempo real de todas as operações

## 🛠️ Tecnologias

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Vite** - Build tool com HMR
- **TailwindCSS** - Estilização (via CDN)

### Backend/Database
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados relacional
- **Row Level Security (RLS)** - Políticas de acesso público

### Ferramentas
- **Supabase CLI** - Gerenciamento de migrations
- **TypeScript Type Generation** - Types gerados automaticamente do schema do banco

## 📁 Estrutura do Banco de Dados

### Tabela: `endpoints`
Armazena os endpoints configurados pelo usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | ID único (autoincremento) |
| metodo | TEXT | Método HTTP (GET, POST, PUT, PATCH, DELETE) |
| url | TEXT | URL completa do endpoint |
| created_at | TIMESTAMP | Data de criação |

**Constraint**: Método + URL devem ser únicos

### Tabela: `response_fields`
Armazena todos os campos extraídos de requisições (body, query params e responses).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | BIGSERIAL | ID único (autoincremento) |
| metodo | TEXT | Método HTTP da requisição |
| url | TEXT | Origem da URL (ex: https://api.exemplo.com) |
| endpoint | TEXT | Path do endpoint (ex: /users) |
| tipo | TEXT | Tipo do campo: 'Body', 'Query Params' ou 'Response' |
| campo | TEXT | Nome/caminho do campo (ex: user.name) |
| detalhes | TEXT | Tipo e valor exemplo (ex: [string] e.g.: João) |
| descricao | TEXT | Descrição do campo (vazio por enquanto, uso futuro) |
| created_at | TIMESTAMP | Data de criação |

**Constraint Única**: metodo + url + endpoint + campo + detalhes não podem repetir

**Índices**: Criados em endpoint, metodo+url, e tipo para otimização de consultas

## 🎯 Casos de Uso

1. **Documentação Automática de API**
   - Faça requisições normalmente
   - Sistema extrai e documenta campos automaticamente
   - Construa documentação completa sem esforço manual

2. **Testes de Regressão**
   - Salve endpoints importantes
   - Execute múltiplas requisições sequencialmente
   - Compare responses entre versões

3. **Análise de Estrutura de API**
   - Visualize todos os campos retornados
   - Identifique campos aninhados
   - Entenda a estrutura de dados completa

4. **Desenvolvimento Frontend**
   - Teste endpoints antes de integrar
   - Veja exemplos de valores reais
   - Copie estruturas para TypeScript interfaces

## 📸 Fluxo de Trabalho

```
1. Configure Bearer Token (se necessário)
   ↓
2. Cadastre endpoints reutilizáveis
   ↓
3. Selecione endpoints para testar
   ↓
4. Configure bodies JSON (POST/PUT/PATCH)
   ↓
5. Execute requisições
   ↓
6. Sistema extrai campos automaticamente
   ↓
7. Campos salvos no banco (duplicatas ignoradas)
   ↓
8. Visualize resultados na tabela
   ↓
9. Exporte para Excel (opcional)
```

## 🔄 Extração Inteligente de Campos

### Objetos Aninhados
```json
{
  "user": {
    "name": "João",
    "address": {
      "city": "São Paulo"
    }
  }
}
```
**Campos extraídos**: `user.name`, `user.address.city`

### Arrays
```json
{
  "users": [
    { "id": 1, "name": "João" }
  ]
}
```
**Campos extraídos**: `users.id`, `users.name` (usando primeiro item como referência)

### Query Params (GET)
```
https://api.exemplo.com/users?id=123&active=true
```
**Campos extraídos**: `id`, `active`

---

## 🚀 Como Executar

### Pré-requisitos
- Node.js 20+
- Conta no Supabase

### Configuração

1. Clone o repositório e instale dependências:
```bash
npm install
```

2. Configure as variáveis de ambiente:
```bash
# Copie o arquivo de exemplo
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais:

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
VITE_SUPABASE_URL=sua-url-aqui
VITE_SUPABASE_ANON_KEY=sua-chave-aqui

# ============================================
# AI PROVIDER CONFIGURATION
# ============================================
# Choose: 'ollama' (local) or 'gemini' (cloud)
VITE_AI_PROVIDER=gemini

# ============================================
# OLLAMA (LOCAL)
# ============================================
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2

# ============================================
# GOOGLE GEMINI (CLOUD)
# ============================================
# Get your API key at: https://aistudio.google.com/
VITE_GEMINI_API_KEY=sua_chave_aqui
VITE_GEMINI_MODEL=gemini-2.0-flash-exp
```

> 💡 **Onde encontrar as credenciais?**
> - **Supabase**: [Dashboard](https://supabase.com/dashboard) → Seu Projeto → Settings → API
> - **Gemini API Key**: [Google AI Studio](https://aistudio.google.com/) (gratuito)

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse: `http://localhost:5173`

---

## 🤖 Configuração da IA para Auto-Documentação

O sistema suporta três providers de IA para gerar descrições automáticas dos campos:

### Opção 1: Google Gemini (Recomendado para Início Rápido) ⚡

**Vantagens:**
- ✅ Não requer instalação local
- ✅ Tier gratuito generoso (60 requisições/min)
- ✅ Funciona de qualquer lugar
- ✅ Sempre atualizado

**Como Configurar:**

1. Obtenha sua API Key gratuita em: https://aistudio.google.com/
2. No arquivo `.env`, configure:
```env
VITE_AI_PROVIDER=gemini
VITE_GEMINI_API_KEY=sua_chave_aqui
VITE_GEMINI_MODEL=gemini-2.0-flash-exp
```
3. Reinicie o servidor de desenvolvimento
4. Acesse "Auto Docs" → "Configurar IA" para testar a conexão

**Rate Limit Configurável:**
- **RPM (Requests Per Minute)**: Limite por minuto - aguarda reset automático
- **RPD (Requests Per Day)**: Limite diário - cancela processamento se atingido
- Gemini Free Tier padrão: RPM=10, RPD=50
- Configurações salvas no Supabase e sincronizadas entre dispositivos

---

### Opção 2: Ollama (Local - Máxima Privacidade) 🔒

**Vantagens:**
- ✅ 100% privado (dados nunca saem da sua máquina)
- ✅ Sem custos de API
- ✅ Sem rate limits
- ✅ Funciona offline

**Como Configurar:**

1. Instale o Ollama: https://ollama.com
2. Baixe um modelo (recomendado `llama3.2`):
```bash
ollama pull llama3.2
```
3. Inicie o servidor Ollama:
```bash
ollama serve
```
4. No arquivo `.env`, configure:
```env
VITE_AI_PROVIDER=ollama
VITE_OLLAMA_URL=http://localhost:11434
VITE_OLLAMA_MODEL=llama3.2
```
5. Reinicie o servidor de desenvolvimento
6. Acesse "Auto Docs" → "Configurar IA" para testar a conexão

**Modelos Recomendados:**
- `llama3.2` - Rápido e eficiente (recomendado)
- `llama3.1` - Mais poderoso, requer mais recursos
- `mistral` - Alternativa leve

---

### Opção 3: Groq (Cloud - Ultra Rápido) ⚡🚀

**Vantagens:**
- ✅ Inferência extremamente rápida (até 10x mais rápido que outros providers)
- ✅ API gratuita com tier generoso (~30 requisições/min)
- ✅ Modelos open-source (Llama, Mistral, Qwen)
- ✅ Não requer instalação local

**Como Configurar:**

1. Obtenha sua API Key gratuita em: https://console.groq.com/
2. No arquivo `.env`, configure:
```env
VITE_AI_PROVIDER=groq
VITE_GROQ_API_KEY=sua_chave_aqui
VITE_GROQ_MODEL=llama3-8b-8192
```
3. Reinicie o servidor de desenvolvimento
4. Acesse "Auto Docs" → "Configurar IA" para testar a conexão

**Modelos Disponíveis:**
- `llama3-8b-8192` - Rápido e eficiente (recomendado)
- `llama3-70b-8192` - Mais poderoso
- `mixtral-8x7b-32768` - Excelente para tarefas complexas
- `gemma-7b-it` - Alternativa leve

**Rate Limit Padrão:**
- RPM: 30 requisições por minuto
- RPD: 14.400 requisições por dia

---

### Alternar entre Providers e Configurar Rate Limits

Você pode alternar entre Ollama, Gemini e Groq e configurar limites personalizados:
1. No aplicativo (Auto Docs), clique em "Configurar IA"
2. Selecione o provider desejado
3. Configure RPM (requisições por minuto) e RPD (requisições por dia):
   - **RPM**: Sistema aguarda até próximo minuto ao atingir limite
   - **RPD**: Cancela processamento ao atingir limite diário (reset à meia-noite)
4. Clique em "Testar Conexão" para verificar disponibilidade
5. Salve as configurações (sincronizadas automaticamente no banco)

---

### Build para Produção
```bash
npm run build
npm run preview
```

### Docker (Opcional)
```bash
docker build -t api-tester .
docker run -p 3000:3000 api-tester
```

---

**Desenvolvido com React + TypeScript + Vite + Supabase**
