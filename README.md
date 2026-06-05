# Birthday List — Convite de Aniversário Infantil

Plataforma completa para convites de aniversário infantil com confirmação de presença online, painel administrativo e suporte a múltiplos temas visuais.

## Funcionalidades

- **Convite digital temático** com imagem, contagem regressiva e música de fundo
- **Confirmação de presença (RSVP)** — nome do responsável, criança, adultos, crianças, status e observações
- **Lista de confirmados** pública com estatísticas em tempo real
- **Mapa integrado** com botões para Google Maps e Waze
- **Playlist do Spotify** embutida
- **Galeria de fotos** com lightbox
- **QR Code** para compartilhamento do convite
- **Painel admin** — editar configurações do evento, gerenciar convidados, enviar lembretes via WhatsApp (Meta Cloud API) e galeria de fotos
- **Temas visuais** trocados pelo admin sem redeploy

## Temas disponíveis

| Tema | Emoji | Tema | Emoji |
|---|---|---|---|
| Minecraft | ⚔️ | Super Mario | 🍄 |
| Princesas | 👸 | Futebol | ⚽ |
| Homem Aranha | 🕷️ | Roblox | 🎮 |
| Sonic | ⚡ | Dinossauro | 🦕 |
| Sereia | 🧜‍♀️ | Unicórnio | 🦄 |
| Astronauta | 🚀 | Pokémon | ⚡ |
| Frozen | ❄️ | Safari | 🦁 |

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | pnpm workspaces |
| Linguagem | TypeScript 5.9 |
| Runtime | Node.js 24 |
| Frontend | React + Vite + Tailwind CSS |
| Animações | Framer Motion, canvas-confetti |
| Backend | Express 5 |
| Banco de dados | PostgreSQL + Drizzle ORM |
| Validação | Zod |
| API client | React Query + Orval (gerado do OpenAPI) |

## Estrutura do projeto

```
birthday-list/
├── artifacts/
│   ├── api-server/          # Express 5 — API REST
│   └── birthday-invite/     # React — frontend do convite
├── lib/
│   ├── api-spec/            # Spec OpenAPI 3.1 + config Orval
│   ├── api-client-react/    # Hooks React Query gerados
│   ├── api-zod/             # Schemas Zod gerados
│   └── db/                  # Drizzle ORM — schema e conexão PostgreSQL
├── data/
│   └── invite-templates/    # JSONs de exemplo para geração de imagens por IA
│       └── minecraft-bento.json
├── scripts/                 # Scripts utilitários TypeScript
├── pnpm-workspace.yaml
└── package.json
```

## Instalação

```bash
# Requer Node.js 24+ e pnpm
pnpm install
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz com:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
ADMIN_PASSWORD=sua-senha-admin
PORT=3000
```

Variáveis opcionais para WhatsApp (Meta Cloud API):

```env
WHATSAPP_PHONE_ID=
WHATSAPP_TOKEN=
```

## Desenvolvimento

```bash
# Iniciar API
pnpm --filter @workspace/api-server run dev

# Iniciar frontend
pnpm --filter @workspace/birthday-invite run dev

# Rodar migrations do banco
pnpm --filter @workspace/db run push

# Regenerar client/schemas a partir do OpenAPI
pnpm --filter @workspace/api-spec run codegen

# Typecheck geral
pnpm run typecheck
```

## Build para produção

```bash
pnpm run build
# Gera: artifacts/api-server/dist/index.cjs
```

## Templates de imagem para IA

A pasta `data/invite-templates/` contém JSONs com especificações visuais para solicitar imagens de convite a ferramentas de IA (ex: Midjourney, DALL-E, Stable Diffusion).

Cada arquivo descreve tema, paleta de cores, elementos decorativos, layout e conteúdo do convite para uma criança específica. Para criar um novo convite basta duplicar e adaptar o arquivo:

```
data/invite-templates/
├── minecraft-bento.json     # Tema Minecraft — Bento, 5 anos
├── {tema}-{nome}.json       # Adicione novos aqui
```

## API — endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/event-config` | Configuração pública do evento |
| GET | `/api/guests` | Lista de convidados (paginada) |
| POST | `/api/guests` | Confirmar presença |
| GET | `/api/stats` | Estatísticas públicas |
| GET | `/api/photos` | Fotos da galeria |
| POST | `/api/admin/login` | Login do admin |
| PUT | `/api/event-config` | Atualizar evento (admin) |
| POST | `/api/admin/send-whatsapp` | Enviar lembrete WhatsApp (admin) |

Spec completa em [`lib/api-spec/openapi.yaml`](lib/api-spec/openapi.yaml).
