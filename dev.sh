#!/usr/bin/env bash
# Starts the birthday-list project for local development.
# Usage: bash dev.sh [--reset]
set -e

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()   { echo -e "${GREEN}[dev]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; exit 1; }

RESET=false
for arg in "$@"; do [ "$arg" = "--reset" ] && RESET=true; done

# ── Prerequisites ─────────────────────────────────────────────────────────────
command -v node   >/dev/null 2>&1 || error "node not found. Install Node >= 22."
command -v pnpm   >/dev/null 2>&1 || error "pnpm not found. Run: npm i -g pnpm"
command -v docker >/dev/null 2>&1 || error "docker not found. Install Docker Desktop."

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[ "$NODE_MAJOR" -ge 22 ] || error "Node >= 22 required (found $(node -v))."

# ── .env.local ────────────────────────────────────────────────────────────────
if [ ! -f .env.local ]; then
  warn ".env.local ausente — copiando de .env.example..."
  cp .env.example .env.local
  warn "Edite .env.local se necessario antes de continuar."
fi

# ── Dependencies ──────────────────────────────────────────────────────────────
log "Instalando dependencias..."
pnpm install --frozen-lockfile

# ── Postgres ──────────────────────────────────────────────────────────────────
if $RESET; then
  warn "Flag --reset: derrubando volumes do Postgres..."
  docker compose down -v postgres 2>/dev/null || true
fi

log "Subindo Postgres via Docker..."
docker compose up -d postgres

log "Aguardando Postgres ficar pronto..."
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U birthday >/dev/null 2>&1 && break
  sleep 1
  [ "$i" -eq 30 ] && error "Postgres nao ficou pronto em 30s. Verifique: docker compose logs postgres"
done

# ── DB schema ─────────────────────────────────────────────────────────────────
log "Aplicando schema no banco..."
pnpm --filter @workspace/db run push

# ── Dev servers ───────────────────────────────────────────────────────────────
log "Iniciando servidores de desenvolvimento..."

trap 'log "Encerrando..."; kill $API_PID $WEB_PID 2>/dev/null; exit 0' SIGINT SIGTERM

pnpm run dev:api &
API_PID=$!

pnpm run dev:web &
WEB_PID=$!

echo ""
log "API:   http://localhost:3000"
log "Web:   http://localhost:5173"
log "Admin: http://localhost:5173/admin"
log "Senha: admin123  (de .env.local → ADMIN_PASSWORD)"
echo ""
log "Pressione Ctrl+C para parar."

wait $API_PID $WEB_PID
