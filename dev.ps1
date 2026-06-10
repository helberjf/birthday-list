# Starts the birthday-list project for local development (Windows PowerShell).
# Usage: .\dev.ps1 [-Reset]
param([switch]$Reset)

$ErrorActionPreference = 'Stop'

function log   { param($m) Write-Host "[dev]  $m" -ForegroundColor Green }
function warn  { param($m) Write-Host "[warn] $m" -ForegroundColor Yellow }
function abort { param($m) Write-Host "[error] $m" -ForegroundColor Red; exit 1 }

# ── Prerequisites ─────────────────────────────────────────────────────────────
if (-not (Get-Command node   -ErrorAction SilentlyContinue)) { abort "node nao encontrado. Instale Node >= 22." }
if (-not (Get-Command pnpm   -ErrorAction SilentlyContinue)) { abort "pnpm nao encontrado. Execute: npm i -g pnpm" }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { abort "docker nao encontrado. Instale o Docker Desktop." }

$nodeMajor = [int]((node -v) -replace 'v','').Split('.')[0]
if ($nodeMajor -lt 22) { abort "Node >= 22 necessario (encontrado $(node -v))." }

# ── .env.local ────────────────────────────────────────────────────────────────
if (-not (Test-Path '.env.local')) {
  warn ".env.local ausente — copiando de .env.example..."
  Copy-Item '.env.example' '.env.local'
  warn "Edite .env.local se necessario antes de continuar."
}

# ── Dependencies ──────────────────────────────────────────────────────────────
log "Instalando dependencias..."
pnpm install --frozen-lockfile
if (-not $?) { abort "pnpm install falhou." }

# ── Postgres ──────────────────────────────────────────────────────────────────
if ($Reset) {
  warn "Flag -Reset: derrubando volumes do Postgres..."
  docker compose down -v postgres 2>$null
}

log "Subindo Postgres via Docker..."
docker compose up -d postgres
if (-not $?) { abort "docker compose up falhou." }

log "Aguardando Postgres ficar pronto..."
$ready = $false
for ($i = 1; $i -le 30; $i++) {
  $out = docker compose exec -T postgres pg_isready -U birthday 2>$null
  if ($LASTEXITCODE -eq 0) { $ready = $true; break }
  Start-Sleep -Seconds 1
}
if (-not $ready) { abort "Postgres nao ficou pronto em 30s. Verifique: docker compose logs postgres" }

# ── DB schema ─────────────────────────────────────────────────────────────────
log "Aplicando schema no banco..."
pnpm --filter @workspace/db run push
if (-not $?) { abort "db push falhou." }

# ── Dev servers ───────────────────────────────────────────────────────────────
log "Iniciando servidores de desenvolvimento..."
Write-Host ""

$apiJob = Start-Job -ScriptBlock { Set-Location $using:PWD; pnpm run dev:api }
$webJob = Start-Job -ScriptBlock { Set-Location $using:PWD; pnpm run dev:web }

log "API:   http://localhost:3000"
log "Web:   http://localhost:5173"
log "Admin: http://localhost:5173/admin"
log "Senha: admin123  (de .env.local -> ADMIN_PASSWORD)"
Write-Host ""
log "Pressione Ctrl+C para parar. (ou feche esta janela)"

try {
  while ($true) {
    Receive-Job $apiJob, $webJob
    Start-Sleep -Milliseconds 500
  }
} finally {
  log "Encerrando jobs..."
  Stop-Job $apiJob, $webJob -ErrorAction SilentlyContinue
  Remove-Job $apiJob, $webJob -Force -ErrorAction SilentlyContinue
}
