# API Testing & Documentation Tool

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

# Edite o arquivo .env com suas credenciais do Supabase
# VITE_SUPABASE_URL=sua-url-aqui
# VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

> 💡 **Onde encontrar as credenciais?**
> Acesse [Supabase Dashboard](https://supabase.com/dashboard) → Seu Projeto → Settings → API

3. Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Acesse: `http://localhost:5173`

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
