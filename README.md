# Birthday List - Convite de aniversario infantil

Webapp para vender convites digitais personalizados de festa infantil, com RSVP, painel admin, fotos, lembretes e catalogo de temas.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Monorepo | pnpm workspaces |
| Frontend | React + Vite + Tailwind CSS |
| Backend | Express 5 |
| Banco padrao | PostgreSQL + Drizzle |
| Banco opcional | Firebase Firestore via REST |
| Validacao | Zod |
| API client | React Query + Orval |

## Requisitos

- [Node.js](https://nodejs.org/) >= 22
- [pnpm](https://pnpm.io/) >= 9 (`npm i -g pnpm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Rodar localmente (script automatico)

### Linux / macOS / Git Bash / WSL

```bash
bash dev.sh
```

Para resetar o banco do zero:

```bash
bash dev.sh --reset
```

### Windows (PowerShell)

```powershell
.\dev.ps1
```

Para resetar o banco do zero:

```powershell
.\dev.ps1 -Reset
```

Os scripts fazem automaticamente:

1. Verificam pre-requisitos (Node >= 22, pnpm, Docker)
1. Copiam `.env.example` -> `.env.local` se nao existir
1. Instalam dependencias (`pnpm install`)
1. Sobem o Postgres via Docker
1. Aplicam o schema no banco (`db push`)
1. Iniciam API (porta 3000) e frontend (porta 5173) em paralelo

URLs apos subir:

| URL | Descricao |
| --- | --- |
| `http://localhost:5173` | Frontend |
| `http://localhost:5173/admin` | Painel admin |
| `http://localhost:3000/api` | API REST |

Senha admin padrao: `admin123` (variavel `ADMIN_PASSWORD` em `.env.local`)

## Rodar localmente (passo a passo manual)

1. Instale dependencias:

```bash
pnpm install
```

1. Copie as variaveis de ambiente:

```bash
cp .env.example .env.local
```

1. Suba o Postgres:

```bash
docker compose up -d postgres
```

1. Crie/atualize as tabelas:

```bash
pnpm --filter @workspace/db run push
```

1. Inicie a API e o frontend (em terminais separados):

```bash
pnpm run dev:api   # porta 3000
pnpm run dev:web   # porta 5173
```

## Deploy no Vercel com Firebase (recomendado)

### 1. Crie o projeto no Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com) e crie um projeto.
1. Ative o **Firestore Database** (modo producao ou teste).
1. Va em **Project Settings > Service Accounts > Generate new private key** e baixe o JSON.

### 2. Configure as variaveis no Vercel

No dashboard do seu projeto Vercel, va em **Settings > Environment Variables** e adicione:

| Variavel | Valor |
| --- | --- |
| `DATABASE_PROVIDER` | `firebase` |
| `FIREBASE_PROJECT_ID` | ID do seu projeto Firebase |
| `FIREBASE_DATABASE_ID` | `(default)` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Conteudo do JSON da service account |
| `JWT_SECRET` | String longa e aleatoria |
| `ADMIN_PASSWORD` | Senha do painel admin |
| `ALLOWED_ORIGINS` | `https://seuapp.vercel.app` |

Referencia completa em `.env.vercel.example`.

### 3. Conecte o repositorio e faça deploy

```bash
# via Vercel CLI
npx vercel --prod
```

Ou conecte o repositorio pelo dashboard da Vercel — o build roda automaticamente a cada push na branch `main`.

O arquivo `vercel.json` ja esta configurado com:

- Build: `pnpm run build:vercel`
- Output: `artifacts/birthday-invite/dist/public`
- Rewrites: `/api/*` → serverless function, `/admin/*` → SPA

## Deploy em VPS com Docker

1. Copie o exemplo de variaveis:

```bash
cp .env.vps.example .env
```

1. Edite `.env` e troque principalmente:

```text
POSTGRES_PASSWORD
JWT_SECRET
ADMIN_PASSWORD
ALLOWED_ORIGINS
```

1. Suba app + Postgres:

```bash
docker compose up -d --build
```

O container do app roda `drizzle push` na inicializacao, serve o frontend buildado e expoe tudo em:

```text
http://SEU_IP:3000
```

Em producao, coloque Nginx/Caddy/Traefik na frente para HTTPS e dominio.

## Firebase como opcao (desenvolvimento local)

Postgres e o padrao. Para usar Firebase, copie:

```bash
cp .env.firebase.example .env.local
```

E deixe:

```env
DATABASE_PROVIDER=firebase
```

Para emulator local, mantenha:

```env
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
```

Para Firebase real, remova `FIRESTORE_EMULATOR_HOST` e configure `FIREBASE_SERVICE_ACCOUNT_JSON` ou `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

## Scripts uteis

```bash
pnpm run dev:api
pnpm run dev:web
pnpm --filter @workspace/db run push
pnpm run typecheck
pnpm run build
pnpm --filter @workspace/api-spec run codegen
```

## Endpoints principais

| Metodo | Rota | Descricao |
| --- | --- | --- |
| GET | `/api/event-config` | Configuracao publica do evento |
| GET | `/api/themes` | Temas ativos |
| GET | `/api/guests` | Lista de convidados |
| POST | `/api/guests` | Confirmar presenca |
| GET | `/api/stats` | Estatisticas publicas |
| GET | `/api/photos` | Fotos da galeria |
| POST | `/api/admin/login` | Login do admin |
| PUT | `/api/event-config` | Atualizar evento |
| GET/POST/PATCH/DELETE | `/api/admin/themes` | CRUD de temas |

Spec completa em `lib/api-spec/openapi.yaml`.
