#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env.production}"

if [[ ! -f "$env_file" ]]; then
  echo "ERROR: env file not found: $env_file"
  exit 1
fi

log() {
  printf '[validate-env] %s\n' "$1"
}

get_env() {
  local key="$1"
  grep -E "^${key}=" "$env_file" | head -n 1 | cut -d'=' -f2- || true
}

require_key() {
  local key="$1"
  local value
  value="$(get_env "$key")"
  if [[ -z "$value" ]]; then
    echo "ERROR: missing required env key: $key"
    exit 1
  fi
}

require_integer() {
  local key="$1"
  local value
  value="$(get_env "$key")"
  [[ "$value" =~ ^-?[0-9]+$ ]] || {
    echo "ERROR: $key must be an integer"
    exit 1
  }
}

require_url() {
  local key="$1"
  local value
  value="$(get_env "$key")"
  [[ "$value" =~ ^https://[^[:space:]]+$ ]] || {
    echo "ERROR: $key must be an https URL"
    exit 1
  }
}

reject_placeholder() {
  local key="$1"
  local value
  value="$(get_env "$key")"
  if printf '%s' "$value" | grep -Eqi 'replace-me|replace-with|example\.com|localhost|127\.0\.0\.1|changeme|your-|<'; then
    echo "ERROR: $key still contains a placeholder or local-only value"
    exit 1
  fi
}

required_keys=(
  DOMAIN
  LETSENCRYPT_EMAIL
  APP_BASE_URL
  FRONTEND_BASE_URL
  CORS_ALLOWED_ORIGINS
  DB_NAME
  DB_USERNAME
  DB_PASSWORD
  AUTH0_DOMAIN
  AUTH0_AUDIENCE
  AUTH0_SECRET
  AUTH0_BASE_URL
  AUTH0_ISSUER_BASE_URL
  AUTH0_CLIENT_ID
  AUTH0_CLIENT_SECRET
  NEXT_PUBLIC_API_BASE_URL
  NEXT_PUBLIC_AUTH0_DOMAIN
  NEXT_PUBLIC_AUTH0_CLIENT_ID
  NEXT_PUBLIC_AUTH0_AUDIENCE
  AI_KEY_ENCRYPTION_SECRET
  BOG_IPAY_CLIENT_ID
  BOG_IPAY_SECRET_KEY
  BOG_IPAY_BASE_URL
  BACKEND_HOST
  BACKEND_PORT
  WEB_HOST
  WEB_PORT
)

for key in "${required_keys[@]}"; do
  require_key "$key"
done

require_integer BACKEND_PORT
require_integer WEB_PORT
require_integer MAP_DEFAULT_ZOOM
require_integer PLATFORM_FEE_PERCENT
require_integer PLACE_IMAGE_MAX_COUNT
require_integer MEDIA_MAX_UPLOAD_SIZE_MB

require_url APP_BASE_URL
require_url FRONTEND_BASE_URL
require_url AUTH0_BASE_URL
require_url AUTH0_ISSUER_BASE_URL
require_url NEXT_PUBLIC_API_BASE_URL
require_url AUTH0_AUDIENCE
require_url BOG_IPAY_BASE_URL

for key in DOMAIN LETSENCRYPT_EMAIL DB_NAME DB_USERNAME DB_PASSWORD AUTH0_DOMAIN AUTH0_AUDIENCE AUTH0_SECRET AUTH0_CLIENT_ID AUTH0_CLIENT_SECRET NEXT_PUBLIC_AUTH0_DOMAIN NEXT_PUBLIC_AUTH0_CLIENT_ID NEXT_PUBLIC_AUTH0_AUDIENCE NEXT_PUBLIC_API_BASE_URL AI_KEY_ENCRYPTION_SECRET ADMIN_EMAILS BOG_IPAY_CLIENT_ID BOG_IPAY_SECRET_KEY; do
  reject_placeholder "$key"
done

[[ "$(get_env AUTH0_DOMAIN)" == "$(get_env NEXT_PUBLIC_AUTH0_DOMAIN)" ]] || {
  echo "ERROR: NEXT_PUBLIC_AUTH0_DOMAIN must match AUTH0_DOMAIN"
  exit 1
}

[[ "$(get_env AUTH0_CLIENT_ID)" == "$(get_env NEXT_PUBLIC_AUTH0_CLIENT_ID)" ]] || {
  echo "ERROR: NEXT_PUBLIC_AUTH0_CLIENT_ID must match AUTH0_CLIENT_ID"
  exit 1
}

[[ "$(get_env AUTH0_AUDIENCE)" == "$(get_env NEXT_PUBLIC_AUTH0_AUDIENCE)" ]] || {
  echo "ERROR: NEXT_PUBLIC_AUTH0_AUDIENCE must match AUTH0_AUDIENCE"
  exit 1
}

[[ "$(get_env AUTH0_BASE_URL)" == "$(get_env FRONTEND_BASE_URL)" ]] || {
  echo "ERROR: AUTH0_BASE_URL must match FRONTEND_BASE_URL"
  exit 1
}

issuer_base="$(get_env AUTH0_ISSUER_BASE_URL)"
[[ "$issuer_base" =~ ^https://[^/]+/?$ ]] || {
  echo "ERROR: AUTH0_ISSUER_BASE_URL must be a bare issuer URL"
  exit 1
}

issuer_host="${issuer_base#https://}"
issuer_host="${issuer_host%/}"
[[ "$issuer_host" == "$(get_env AUTH0_DOMAIN)" ]] || {
  echo "ERROR: AUTH0_ISSUER_BASE_URL host must match AUTH0_DOMAIN"
  exit 1
}

api_base="$(get_env NEXT_PUBLIC_API_BASE_URL)"
[[ "$api_base" =~ /api/?$ ]] && {
  echo "ERROR: NEXT_PUBLIC_API_BASE_URL should be the site origin, not the /api path"
  exit 1
}

[[ "$(get_env SEED_EXAMPLE_ENABLED)" != "true" ]] || {
  echo "ERROR: SEED_EXAMPLE_ENABLED must be false in production"
  exit 1
}

if command -v python3 >/dev/null 2>&1; then
  log "Checking Auth0 issuer discovery"
  tmp_openid="$(mktemp)"
  trap 'rm -f "$tmp_openid"' EXIT
  curl -fsS --max-time 20 "${issuer_base%/}/.well-known/openid-configuration" > "$tmp_openid" || {
    echo "ERROR: failed to fetch Auth0 openid-configuration"
    exit 1
  }
  python3 - "$issuer_base" "$tmp_openid" <<'PY'
import json
import sys

issuer = sys.argv[1].rstrip("/")
path = sys.argv[2]
with open(path, "r", encoding="utf-8") as fh:
    data = json.load(fh)
found = str(data.get("issuer", "")).rstrip("/")
if found != issuer:
    raise SystemExit(f"ERROR: Auth0 issuer mismatch: expected {issuer}, got {found}")
PY
fi

log "Env validation passed for $env_file"
