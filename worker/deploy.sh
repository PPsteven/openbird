#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "OpenBird Deployment Script"
echo "=========================="
echo ""

# === 1. Check prerequisites ===
if ! command -v wrangler &> /dev/null; then
  echo -e "${RED}Error: wrangler not found. Install with: npm install -g wrangler${NC}"
  exit 1
fi

echo -n "Checking wrangler login status... "
if ! wrangler whoami &> /dev/null; then
  echo -e "${RED}failed${NC}"
  echo -e "${RED}Error: wrangler not logged in. Run: wrangler login${NC}"
  exit 1
fi
echo -e "${GREEN}OK${NC}"

# === 2. Load .env ===
if [ ! -f .env ]; then
  echo -e "${RED}Error: .env file not found.${NC}"
  echo "Copy .env.example to .env and set your OPENBIRD_DOMAIN:"
  echo "  cp .env.example .env"
  exit 1
fi

source .env

if [ -z "${OPENBIRD_DOMAIN:-}" ]; then
  echo -e "${RED}Error: OPENBIRD_DOMAIN not set in .env${NC}"
  exit 1
fi

echo -e "Domain: ${GREEN}${OPENBIRD_DOMAIN}${NC}"

# === 3. Detect domain type ===
IS_WORKERS_DEV=false
if [[ "$OPENBIRD_DOMAIN" == *".workers.dev" ]]; then
  IS_WORKERS_DEV=true
  echo -e "${YELLOW}workers.dev domain detected, skipping custom domain route${NC}"
fi

# === 4. Create KV namespaces ===
echo ""
echo "Setting up KV namespaces..."

create_or_get_kv() {
  local name="$1"
  local id

  id=$(wrangler kv namespace create "$name" 2>&1 | grep -oE 'id = "[^"]+"' | head -1 | cut -d'"' -f2 || true)

  if [ -z "$id" ]; then
    echo -e "${YELLOW}  $name may already exist, fetching ID...${NC}"
    id=$(wrangler kv namespace list 2>/dev/null | grep -B1 '"title": "'"$name"'"' | grep '"id"' | grep -oE '[a-f0-9]{32}' | head -1 || true)
    if [ -z "$id" ]; then
      echo -e "${RED}  Failed to create or find $name KV namespace${NC}"
      exit 1
    fi
  fi

  echo "$id"
}

USERS_KV_ID=$(create_or_get_kv "OPENBIRD_USERS")
echo -e "  OPENBIRD_USERS: ${GREEN}${USERS_KV_ID}${NC}"

DOCS_KV_ID=$(create_or_get_kv "OPENBIRD_DOCS")
echo -e "  OPENBIRD_DOCS: ${GREEN}${DOCS_KV_ID}${NC}"

# === 5. Create R2 buckets ===
echo ""
echo "Setting up R2 buckets..."

wrangler r2 bucket create openbird-pages 2>/dev/null && echo -e "  openbird-pages: ${GREEN}created${NC}" || echo -e "  openbird-pages: ${YELLOW}already exists${NC}"
wrangler r2 bucket create openbird-images 2>/dev/null && echo -e "  openbird-images: ${GREEN}created${NC}" || echo -e "  openbird-images: ${YELLOW}already exists${NC}"

# === 6. Render wrangler.toml ===
echo ""
echo "Generating wrangler.toml..."

cp wrangler.toml.template wrangler.toml

if [ "$(uname)" = "Darwin" ]; then
  sed -i '' "s|{{OPENBIRD_DOMAIN}}|${OPENBIRD_DOMAIN}|g" wrangler.toml
  sed -i '' "s|{{OPENBIRD_USERS_KV_ID}}|${USERS_KV_ID}|g" wrangler.toml
  sed -i '' "s|{{OPENBIRD_DOCS_KV_ID}}|${DOCS_KV_ID}|g" wrangler.toml
else
  sed -i "s|{{OPENBIRD_DOMAIN}}|${OPENBIRD_DOMAIN}|g" wrangler.toml
  sed -i "s|{{OPENBIRD_USERS_KV_ID}}|${USERS_KV_ID}|g" wrangler.toml
  sed -i "s|{{OPENBIRD_DOCS_KV_ID}}|${DOCS_KV_ID}|g" wrangler.toml
fi

if [ "$IS_WORKERS_DEV" = true ]; then
  echo -e "${YELLOW}Removing routes section for workers.dev domain...${NC}"
  if [ "$(uname)" = "Darwin" ]; then
    sed -i '' '/^routes = \[$/,/^\]$/d' wrangler.toml
  else
    sed -i '/^routes = \[$/,/^\]$/d' wrangler.toml
  fi
fi

echo -e "  ${GREEN}wrangler.toml generated${NC}"

# === 7. Deploy ===
echo ""
echo "Deploying Worker..."
wrangler deploy

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "Your OpenBird instance: https://${OPENBIRD_DOMAIN}"
echo ""
echo "Next steps:"
echo "  1. Set API URL:  export OPENBIRD_API_URL=https://${OPENBIRD_DOMAIN}"
echo "  2. Install CLI:  cd ../cli && npm link"
echo "  3. Login:        openbird login"
echo "  4. Publish:      openbird publish your-file.md"
