# 50 Scripts 2.0 - Plataforma de Scripts de Vendas

Plataforma SaaS completa de scripts de vendas com gamificacao, pipeline de leads, IA generativa e extensao Chrome. Construida com Next.js 16, Supabase, Tailwind CSS e Claude AI.

## Visao Geral

50 Scripts 2.0 e uma plataforma que oferece scripts de vendas organizados em trilhas, com funcionalidades progressivas desbloqueadas por plano (Starter, Pro, Premium, Copilot). Inclui pipeline CRM, geracao de scripts por IA, sistema de gamificacao com XP e badges, e uma extensao Chrome para acesso rapido.

### Funcionalidades Principais

- **Trilhas de Scripts**: 8 categorias de vendas (abordagem, qualificacao, fechamento, etc.)
- **Planos Progressivos**: Starter > Pro > Premium > Copilot com features desbloqueadas
- **Pipeline de Leads**: Kanban drag-and-drop para gerenciamento de leads (Premium+)
- **IA Generativa**: Geracao de scripts personalizados com Claude AI (Premium+)
- **IA Copilot**: Assistente conversacional para vendas em tempo real (Copilot)
- **Gamificacao**: XP, niveis, badges, desafios diarios e streaks
- **Dashboard**: Metricas basicas e avancadas de uso e receita
- **Extensao Chrome**: Acesso rapido a scripts no navegador (Pro+)
- **Agenda de Vendas**: Blocos de tempo com sugestoes de scripts
- **Colecoes**: Salvar e organizar scripts favoritos (Premium+)
- **Sistema de Referral**: Convide amigos e ganhe creditos IA
- **Busca de Objecoes**: Encontre scripts por objecao do cliente
- **Botao de Emergencia**: FAB com scripts rapidos por situacao
- **Microlearning**: Dicas diarias de vendas

## Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript |
| Estilizacao | Tailwind CSS 3, tailwind-merge, class-variance-authority |
| UI Components | Radix UI (Avatar, Dropdown Menu), Lucide React (icones) |
| Animacoes | Framer Motion |
| Drag & Drop | @hello-pangea/dnd |
| Charts | Recharts |
| State | Zustand |
| Validacao | Zod |
| Backend/DB | Supabase (PostgreSQL, Auth, RLS, Realtime) |
| IA | Anthropic Claude API (@anthropic-ai/sdk) |
| Exportacao | html2canvas |
| Testes | Vitest (unit), Playwright (E2E) |
| Deploy | Vercel |

## Inicio Rapido

### Pre-requisitos

- Node.js 18+
- npm ou yarn
- Conta Supabase (projeto configurado)
- Chave API Anthropic (para features IA)

### Instalacao

```bash
# 1. Clone o repositorio
git clone <repo-url> 50scripts2.0
cd 50scripts2.0

# 2. Instale dependencias
npm install

# 3. Configure variaveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais

# 4. Configure o banco Supabase
# Execute os scripts SQL em supabase/migrations/ no Supabase SQL Editor

# 5. Inicie o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

### Variaveis de Ambiente

Copie `.env.example` para `.env.local` e configure:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic (Claude AI)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Webhooks
WEBHOOK_SECRET=your_webhook_secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEFAULT_USER_PASSWORD=Script@123

# Push Notifications (VAPID)
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Stripe (Payments)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
```

## Estrutura do Projeto

```
50scripts2.0/
├── src/
│   ├── app/
│   │   ├── (auth)/              # Paginas de autenticacao (login, alterar-senha)
│   │   ├── (dashboard)/         # Paginas protegidas
│   │   │   ├── page.tsx         # Dashboard principal
│   │   │   ├── trilhas/         # Listagem e detalhe de trilhas
│   │   │   ├── scripts/[id]/    # Detalhe do script
│   │   │   ├── pipeline/        # Pipeline de leads (Premium+)
│   │   │   ├── ai-generator/    # Gerador de scripts IA (Premium+)
│   │   │   ├── ai-copilot/      # Copilot conversacional (Copilot)
│   │   │   ├── agenda/          # Agenda de vendas
│   │   │   ├── colecoes/        # Colecoes de scripts
│   │   │   ├── badges/          # Badges e conquistas
│   │   │   ├── desafio/         # Desafio diario
│   │   │   ├── referrals/       # Sistema de indicacao
│   │   │   ├── historico/       # Historico de uso
│   │   │   ├── busca/           # Busca de scripts
│   │   │   ├── perfil/          # Perfil do usuario
│   │   │   └── upgrade/         # Pagina de upgrade
│   │   ├── api/                 # API Routes
│   │   │   ├── auth/            # Autenticacao
│   │   │   ├── categories/      # Categorias de scripts
│   │   │   ├── scripts/         # CRUD e operacoes de scripts
│   │   │   ├── leads/           # CRUD de leads
│   │   │   ├── ai/              # Endpoints IA (generate, conversation, patterns, credits)
│   │   │   ├── dashboard/       # Dados do dashboard (basic, revenue, community)
│   │   │   ├── gamification/    # Status, desafios, badges
│   │   │   ├── agenda/          # Agenda de vendas
│   │   │   ├── collections/     # Colecoes de scripts
│   │   │   ├── referrals/       # Sistema de referral
│   │   │   ├── notifications/   # Push notifications
│   │   │   ├── tips/            # Dicas de microlearning
│   │   │   ├── webhooks/        # Webhooks (access-grant, plan-upgrade, plan-cancel)
│   │   │   ├── user/            # LGPD (data-export, data-delete)
│   │   │   └── admin/           # Painel administrativo
│   │   └── layout.tsx           # Root layout
│   ├── components/              # Componentes React reutilizaveis
│   │   └── ui/                  # Componentes base (Button, Card, etc.)
│   ├── lib/
│   │   ├── constants.ts         # Constantes globais (planos, niveis, XP, cores)
│   │   ├── utils.ts             # Funcoes utilitarias (cn)
│   │   ├── plans/
│   │   │   └── gate.ts          # Logica de gating por plano
│   │   ├── validations/
│   │   │   └── schemas.ts       # Schemas Zod para validacao
│   │   ├── supabase/
│   │   │   ├── client.ts        # Supabase browser client
│   │   │   ├── server.ts        # Supabase server client + admin client
│   │   │   └── middleware.ts    # Supabase middleware (auth refresh)
│   │   └── security/
│   │       ├── rate-limit.ts    # Rate limiting in-memory
│   │       └── headers.ts       # Security headers (CSP, HSTS, etc.)
│   ├── stores/                  # Zustand stores
│   └── types/
│       └── database.ts          # TypeScript types (Plan, Lead, Script, etc.)
├── extension/                   # Chrome Extension
│   ├── manifest.json            # Extension manifest v3
│   ├── popup.html/js/css        # Popup UI
│   ├── background.js            # Service worker
│   ├── content-script.js        # Content script injection
│   └── icons/                   # Extension icons
├── tests/
│   ├── setup.ts                 # Vitest setup com mocks
│   ├── unit/                    # Testes unitarios
│   │   ├── plans-gate.test.ts   # Testes de gating por plano
│   │   ├── constants.test.ts    # Testes de integridade das constantes
│   │   ├── validations.test.ts  # Testes dos schemas Zod
│   │   └── utils.test.ts        # Testes de funcoes utilitarias
│   └── e2e/                     # Testes end-to-end (Playwright)
│       ├── auth.spec.ts         # Fluxo de autenticacao
│       ├── scripts.spec.ts      # Navegacao de scripts e trilhas
│       ├── pipeline.spec.ts     # Pipeline de leads
│       └── admin.spec.ts        # Painel administrativo
├── vitest.config.ts             # Configuracao Vitest
├── playwright.config.ts         # Configuracao Playwright
├── .env.example                 # Template de variaveis de ambiente
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.ts
```

## API Endpoints

### Autenticacao

| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/api/auth/change-password` | Alterar senha (primeira troca obrigatoria) |

### Scripts

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/categories` | Listar categorias/trilhas |
| GET | `/api/categories/[slug]/scripts` | Scripts de uma trilha |
| GET | `/api/scripts/[id]` | Detalhe de um script |
| POST | `/api/scripts/[id]/use` | Registrar uso de script |
| POST | `/api/scripts/[id]/rate` | Avaliar script |
| GET | `/api/scripts/search` | Buscar scripts por texto |
| GET | `/api/scripts/objection-search` | Buscar por objecao |
| GET | `/api/scripts/emergency/[type]` | Script de emergencia |
| GET | `/api/scripts/recommendations` | Scripts recomendados |
| GET | `/api/scripts/history` | Historico de uso |

### Leads / Pipeline

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/leads` | Listar leads do usuario |
| POST | `/api/leads` | Criar novo lead |
| GET | `/api/leads/[id]` | Detalhe do lead |
| PUT | `/api/leads/[id]` | Atualizar lead |
| DELETE | `/api/leads/[id]` | Remover lead |
| POST | `/api/leads/[id]/conversation` | Adicionar snippet de conversa |

### IA

| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/api/ai/generate` | Gerar script com IA (Premium+) |
| POST | `/api/ai/conversation` | Copilot conversacional (Copilot) |
| GET | `/api/ai/patterns` | Analise de padroes de venda (Copilot) |
| GET | `/api/ai/credits` | Consultar creditos IA |

### Dashboard

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/dashboard/basic` | Dashboard basico |
| GET | `/api/dashboard/revenue` | Dashboard de receita (Pro+) |
| GET | `/api/dashboard/community` | Metricas da comunidade (Pro+) |

### Gamificacao

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/gamification/status` | Status de XP, nivel e streak |
| GET | `/api/gamification/challenge` | Desafio diario |
| POST | `/api/gamification/challenge` | Atualizar progresso do desafio |
| GET | `/api/gamification/badges` | Listar badges |

### Colecoes

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/collections` | Listar colecoes |
| POST | `/api/collections` | Criar colecao |
| GET | `/api/collections/[id]/scripts` | Scripts de uma colecao |
| POST | `/api/collections/[id]/scripts` | Adicionar script a colecao |

### Outros

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/agenda/today` | Agenda do dia |
| GET | `/api/tips/daily` | Dica de microlearning |
| POST | `/api/notifications/subscribe` | Inscrever push notification |
| PUT | `/api/notifications/preferences` | Preferencias de notificacao |
| GET | `/api/referrals` | Status de referrals |

### Webhooks (Integracao Externa)

| Metodo | Rota | Descricao |
|---|---|---|
| POST | `/api/webhooks/access-grant` | Conceder acesso (Hotmart/Stripe) |
| POST | `/api/webhooks/plan-upgrade` | Upgrade de plano |
| POST | `/api/webhooks/plan-cancel` | Cancelar plano |

### LGPD (Dados do Usuario)

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/user/data-export` | Exportar todos os dados (JSON) |
| DELETE | `/api/user/data-delete` | Remover todos os dados e conta |

### Admin

| Metodo | Rota | Descricao |
|---|---|---|
| GET | `/api/admin/dashboard` | Dashboard administrativo |
| - | `/api/admin/users/` | Gerenciamento de usuarios |
| - | `/api/admin/scripts/` | Gerenciamento de scripts |
| - | `/api/admin/categories/` | Gerenciamento de categorias |
| - | `/api/admin/tips/` | Gerenciamento de dicas |
| - | `/api/admin/prompts/` | Gerenciamento de prompts IA |
| - | `/api/admin/webhooks/` | Logs de webhooks |
| - | `/api/admin/config/` | Configuracoes da plataforma |

## Schema do Banco de Dados

### Tabelas Principais

- **profiles** - Perfil do usuario (plano, XP, nivel, streak, preferencias)
- **script_categories** - Categorias/trilhas de scripts
- **scripts** - Scripts de vendas (conteudo, tons, min_plan, tags)
- **script_usage** - Registro de uso e avaliacao de scripts
- **leads** - Leads do pipeline (nome, telefone, estagio, valor)
- **user_badges** - Badges conquistados
- **daily_challenges** - Desafios diarios de gamificacao
- **user_collections** - Colecoes de scripts do usuario
- **collection_scripts** - Relacao colecao-script
- **referrals** - Sistema de indicacao
- **ai_prompts** - Templates de prompts IA
- **ai_generation_log** - Log de geracoes IA
- **sales_agenda** - Agenda de vendas com blocos de tempo
- **microlearning_tips** - Dicas de vendas
- **webhook_logs** - Logs de webhooks recebidos

### Tipos Enumerados

- **Plan**: `starter`, `pro`, `premium`, `copilot`
- **Level**: `iniciante`, `vendedor`, `closer`, `topseller`, `elite`
- **LeadStage**: `novo`, `abordado`, `qualificado`, `proposta`, `fechado`, `perdido`
- **Tone**: `formal`, `casual`, `direct`
- **Role**: `user`, `admin`

### Hierarquia de Planos

```
starter (0) -> pro (1) -> premium (2) -> copilot (3)
   R$29,90     R$19,90/mes  R$49,90/mes   R$97,90/mes
```

## Extensao Chrome

A extensao Chrome permite acesso rapido aos scripts diretamente no navegador.

### Setup

1. Navegue ate `chrome://extensions/` no Chrome
2. Ative "Modo do desenvolvedor"
3. Clique em "Carregar sem compactacao"
4. Selecione a pasta `extension/`

### Funcionalidades

- Popup com busca rapida de scripts
- Copia de scripts com um clique
- Registro automatico de uso
- Requer plano Pro ou superior

Veja `extension/README.md` para mais detalhes.

## Testes

### Testes Unitarios (Vitest)

```bash
# Executar todos os testes unitarios
npm test

# Executar em modo watch
npm run test:watch

# Executar com cobertura
npm run test:coverage
```

Testes unitarios cobrem:
- **plans-gate**: Logica de gating por plano (hasAccess, canAccessScript, getAvailableFeatures, getUpgradePlan)
- **constants**: Integridade das constantes (hierarquia de planos, thresholds de nivel, valores de XP, slugs de trilhas)
- **validations**: Schemas Zod (login, changePassword, scriptUsage, lead, webhooks, AI)
- **utils**: Funcoes utilitarias (cn - merge de class names Tailwind)

### Testes E2E (Playwright)

```bash
# Executar testes E2E
npm run test:e2e

# Executar com UI
npx playwright test --ui

# Executar teste especifico
npx playwright test tests/e2e/auth.spec.ts
```

Testes E2E cobrem:
- **auth**: Login, troca de senha, onboarding, logout
- **scripts**: Navegacao de trilhas, visualizacao de scripts, copia, avaliacao, busca
- **pipeline**: CRUD de leads, drag-and-drop de estagios, detalhe de lead
- **admin**: Acesso admin, dashboard, CRUD de usuarios/scripts/categorias

## Deployment

### Vercel (Recomendado)

1. Conecte o repositorio no [Vercel](https://vercel.com)
2. Configure as variaveis de ambiente no dashboard do Vercel
3. O deploy e automatico a cada push na branch `main`

### Configuracoes Vercel

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Node.js Version**: 18.x ou 20.x

## Seguranca

### Headers de Seguranca

Todas as respostas da API incluem:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` (restritivo, permite Supabase e Anthropic)

### Rate Limiting

Rate limiting in-memory por plano:
- **Starter**: 30 requisicoes/minuto
- **Pro**: 60 requisicoes/minuto
- **Premium**: 120 requisicoes/minuto
- **Copilot**: 120 requisicoes/minuto

Limites adicionais:
- **Auth**: 5 tentativas / 15 minutos (prevencao de brute force)
- **Webhooks**: 10 requisicoes/minuto por IP
- **IA**: 5 requisicoes/minuto por usuario

### Row Level Security (RLS)

Todas as tabelas Supabase possuem RLS ativo. Usuarios so acessam seus proprios dados. Admin tem acesso completo via service role key.

### Validacao

Todas as entradas sao validadas com Zod schemas antes do processamento. Inputs invalidos retornam 400 com mensagens de erro descritivas.

## LGPD (Lei Geral de Protecao de Dados)

A plataforma esta em conformidade com a LGPD (Art. 18):

### Direitos do Titular

- **Acesso aos dados**: `GET /api/user/data-export` - Exporta todos os dados do usuario como JSON
- **Eliminacao de dados**: `DELETE /api/user/data-delete` - Remove todos os dados e a conta do usuario
- **Portabilidade**: O export JSON permite importacao em outros sistemas

### Dados Coletados

- Perfil (nome, email, preferencias)
- Uso de scripts (historico, avaliacoes)
- Leads do pipeline (nome, telefone, estagio)
- Badges e desafios
- Colecoes de scripts
- Historico de geracoes IA
- Agenda de vendas
- Referrals

### Retencao

- Dados sao mantidos enquanto a conta estiver ativa
- Exclusao completa disponivel a qualquer momento pelo usuario
- Logs de webhook sao mantidos por 90 dias para auditoria

## Scripts npm

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de producao
npm run start        # Iniciar servidor de producao
npm run lint         # Lint com ESLint
npm test             # Testes unitarios (Vitest)
npm run test:watch   # Testes em modo watch
npm run test:coverage # Testes com cobertura
npm run test:e2e     # Testes E2E (Playwright)
```

## Contribuicao

1. Crie uma branch: `git checkout -b feature/minha-feature`
2. Faca as alteracoes e adicione testes
3. Execute `npm test` e `npm run lint`
4. Envie um Pull Request

## Licenca

Proprietario - Todos os direitos reservados.
