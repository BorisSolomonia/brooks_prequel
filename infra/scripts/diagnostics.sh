#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-/opt/brooks/.env.runtime}"
compose_file="${2:-/opt/brooks/infra/docker-compose.prod.yml}"

print_section() {
  printf '\n========== %s ==========\n' "$1"
}

docker_cmd() {
  if docker info >/dev/null 2>&1; then
    docker "$@"
  else
    sudo docker "$@"
  fi
}

compose_cmd() {
  if docker info >/dev/null 2>&1; then
    docker compose --env-file "$env_file" -f "$compose_file" "$@"
  else
    sudo docker compose --env-file "$env_file" -f "$compose_file" "$@"
  fi
}

dump_logs() {
  local container="$1"
  print_section "logs:${container}"
  docker_cmd logs "$container" --tail 200 2>&1 || true
}

print_section "system"
date -u || true
hostname || true
whoami || true
pwd || true
df -h || true
free -m || true
uptime || true

print_section "docker-ps"
docker_cmd ps -a || true

print_section "docker-images"
docker_cmd images || true

print_section "docker-networks"
docker_cmd network ls || true

print_section "docker-volumes"
docker_cmd volume ls || true

print_section "compose-config"
compose_cmd config || true

print_section "compose-ps"
compose_cmd ps || true

print_section "docker-service"
journalctl -u docker --no-pager -n 200 || true

for container in brooks-postgres brooks-backend brooks-web brooks-caddy; do
  print_section "inspect:${container}"
  docker_cmd inspect "$container" 2>&1 || true
  dump_logs "$container"
done
