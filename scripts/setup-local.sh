#!/usr/bin/env bash
# =============================================================================
# scripts/setup-local.sh — Configuración completa del entorno local Ziriuz v2
#
# Uso: bash scripts/setup-local.sh
#
# Qué hace este script:
#   1. Verifica pre-requisitos (Docker, Node)
#   2. Genera par de claves RSA para JWT (desarrollo)
#   3. Crea .env.local con todos los valores necesarios
#   4. Inicia los servicios Docker (MySQL, Redis, Adminer, Mailpit)
#   5. Espera a que MySQL esté listo
#   6. Crea el schema en BD con prisma db push
#   7. Ejecuta el seed con usuarios y datos de prueba
#   8. Abre URLs de los servicios
# =============================================================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# ── Colores ────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}ℹ${NC}  $1"; }
success() { echo -e "${GREEN}✓${NC}  $1"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $1"; }
error()   { echo -e "${RED}✗${NC}  $1"; exit 1; }
step()    { echo -e "\n${BOLD}$1${NC}"; }

# =============================================================================
# PASO 1: Pre-requisitos
# =============================================================================
step "Paso 1/7 — Verificando pre-requisitos"

command -v docker  >/dev/null 2>&1 || error "Docker no está instalado. Instálalo en https://docs.docker.com/get-docker/"
command -v node    >/dev/null 2>&1 || error "Node.js no está instalado."
command -v npm     >/dev/null 2>&1 || error "npm no está instalado."

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
[[ $NODE_MAJOR -ge 18 ]] || error "Se requiere Node.js 18 o superior (actual: $(node -v))"

docker info >/dev/null 2>&1 || error "Docker no está corriendo. Ábrelo e intenta de nuevo."

success "Docker $(docker --version | cut -d' ' -f3 | tr -d ',')"
success "Node.js $(node -v)"
success "npm $(npm -v)"

# =============================================================================
# PASO 2: Instalar dependencias npm
# =============================================================================
step "Paso 2/7 — Instalando dependencias npm"

if [[ ! -d node_modules ]]; then
  npm install
  success "Dependencias instaladas"
else
  success "node_modules ya existe — omitiendo npm install"
fi

# =============================================================================
# PASO 3: Generar .env.local
# =============================================================================
step "Paso 3/7 — Generando .env.local"

if [[ -f .env.local ]]; then
  warn ".env.local ya existe. Se omite la generación (bórralo para regenerar)."
else
  # Generar AUTH_SECRET aleatorio
  AUTH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

  # Generar par de claves RSA para JWT (solo desarrollo)
  info "Generando par de claves RSA (JWT)..."
  if command -v openssl >/dev/null 2>&1; then
    TMPDIR_KEYS=$(mktemp -d)
    openssl genrsa -out "$TMPDIR_KEYS/private.pem" 2048 2>/dev/null
    openssl rsa -in "$TMPDIR_KEYS/private.pem" -pubout -out "$TMPDIR_KEYS/public.pem" 2>/dev/null
    PRIVATE_KEY=$(cat "$TMPDIR_KEYS/private.pem" | awk '{printf "%s\\n", $0}')
    PUBLIC_KEY=$(cat "$TMPDIR_KEYS/public.pem"  | awk '{printf "%s\\n", $0}')
    rm -rf "$TMPDIR_KEYS"
    success "Claves RSA generadas con openssl"
  else
    # Fallback: clave de desarrollo pre-generada (NUNCA usar en producción)
    warn "openssl no disponible — usando claves de desarrollo hardcoded (solo para local)"
    PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4PAtIKqrNwKjhRa21JNWX/LHZS9\nenO5x2V0OBBBkA6mkgL3iVbfBa8PYpnKqYB+kFAjumvGTpLhSNuQGnEeWWdJWHGI\nfXvkDliaxMKsOy9UQ9Cp6kVuSQVS70pz8nOfpEFa4cNKbSCbY0uJCU8J2KS1nXZ8\nYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAABAAECggEBAKn+AAAAAAAAAA==\n-----END RSA PRIVATE KEY-----"
    PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xHn/ygWe\np4PAtIKqrNwKjhRa21JNWX/LHZs9enO5x2V0OBBBkA6mkgL3iVbfBa8PYpnKqYB+\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAwIDAQAB\n-----END PUBLIC KEY-----"
  fi

  cat > .env.local << EOF
# =============================================================================
# .env.local — Desarrollo local (generado automáticamente por setup-local.sh)
# NUNCA commitear este archivo al repositorio.
# =============================================================================

# ── Base de datos (Docker MySQL en puerto 3307) ───────────────────────────
DATABASE_URL="mysql://ziriuz:ziriuz_dev@localhost:3307/ziriuz"

# ── NextAuth.js v5 ────────────────────────────────────────────────────────
AUTH_SECRET="${AUTH_SECRET}"
AUTH_URL="http://localhost:3000"

# ── JWT RS256 ─────────────────────────────────────────────────────────────
AUTH_PRIVATE_KEY="${PRIVATE_KEY}"
AUTH_PUBLIC_KEY="${PUBLIC_KEY}"

# ── Redis (Docker Redis en puerto 6380) ───────────────────────────────────
REDIS_URL="redis://localhost:6380"

# ── Email (Mailpit local — captura todos los emails sin enviar) ───────────
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="Ziriuz Local <noreply@ziriuz.local>"

# ── App ───────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_NAME="Ziriuz"
NODE_ENV="development"
EOF

  success ".env.local creado"
fi

# =============================================================================
# PASO 4: Iniciar servicios Docker
# =============================================================================
step "Paso 4/7 — Iniciando servicios Docker"

docker compose up -d
success "Contenedores iniciados"

# =============================================================================
# PASO 5: Esperar a MySQL
# =============================================================================
step "Paso 5/7 — Esperando a que MySQL esté listo"

MAX_WAIT=60
COUNTER=0
echo -n "   Conectando"
until docker compose exec mysql mysqladmin ping -h localhost -u ziriuz -pziriuz_dev --silent 2>/dev/null; do
  if [[ $COUNTER -ge $MAX_WAIT ]]; then
    echo ""
    error "MySQL no respondió en ${MAX_WAIT}s. Revisa: docker compose logs mysql"
  fi
  echo -n "."
  sleep 2
  COUNTER=$((COUNTER + 2))
done
echo ""
success "MySQL listo (${COUNTER}s)"

# =============================================================================
# PASO 6: Crear schema en BD
# =============================================================================
step "Paso 6/7 — Creando schema en base de datos"

# Usar db push para crear todas las tablas del schema.prisma en una BD nueva
DATABASE_URL="mysql://ziriuz:ziriuz_dev@localhost:3307/ziriuz" \
  npx prisma db push --accept-data-loss 2>&1 | tail -5
success "Schema aplicado"

# =============================================================================
# PASO 7: Seed de datos
# =============================================================================
step "Paso 7/7 — Cargando datos de prueba"

DATABASE_URL="mysql://ziriuz:ziriuz_dev@localhost:3307/ziriuz" \
  npm run db:seed

# =============================================================================
# ¡Listo!
# =============================================================================
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║           ✅  Entorno local listo                            ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Aplicación:${NC}    npm run dev  →  http://localhost:3000"
echo -e "  ${BOLD}BD Browser:${NC}    http://localhost:8080  (usuario: ziriuz / pass: ziriuz_dev)"
echo -e "  ${BOLD}Emails:${NC}        http://localhost:8025  (captura todos los emails)"
echo ""
echo -e "  ${BOLD}Usuarios QA (contraseña: Ziriuz2024!):${NC}"
echo -e "    admin.qa        → Administrador (acceso total)"
echo -e "    analista.qa     → Analista"
echo -e "    tecnico.qa      → Técnico"
echo -e "    coordinador.qa  → Coordinador"
echo -e "    comercial.qa    → Comercial"
echo ""
echo -e "  ${BOLD}Comandos útiles:${NC}"
echo -e "    docker compose logs -f       → ver logs de Docker"
echo -e "    docker compose down          → detener servicios"
echo -e "    npm run db:studio            → Prisma Studio"
echo -e "    npm run test                 → tests unitarios"
echo ""
