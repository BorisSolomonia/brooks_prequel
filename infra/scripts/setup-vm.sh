#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="${APP_ROOT:-/opt/brooks}"
APP_USER="${APP_USER:-$USER}"
APP_GROUP="${APP_GROUP:-$USER}"

section() {
  printf '\n[setup-vm] %s\n' "$1"
}

section "Updating apt metadata"
sudo apt-get update

section "Installing Docker engine and compose plugin if missing"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

section "Installing utilities"
sudo apt-get install -y jq curl wget vim git htop

section "Enabling Docker"
sudo systemctl enable docker
sudo systemctl restart docker

section "Adding deploy user to docker group"
sudo usermod -aG docker "$APP_USER" || true

section "Preparing directories"
sudo mkdir -p "$APP_ROOT/infra/postgres" "$APP_ROOT/infra/scripts"
sudo chown -R "$APP_USER:$APP_GROUP" "$APP_ROOT"

section "Configuring firewall"
if command -v ufw >/dev/null 2>&1; then
  sudo ufw allow 22/tcp || true
  sudo ufw allow 80/tcp || true
  sudo ufw allow 443/tcp || true
  sudo ufw --force enable || true
fi

section "Configuring Docker log rotation"
sudo mkdir -p /etc/docker
cat <<'EOF' | sudo tee /etc/docker/daemon.json >/dev/null
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
EOF
sudo systemctl restart docker

section "VM bootstrap complete"
echo "Next:"
echo "  1. Ensure DNS points DOMAIN to this VM."
echo "  2. Attach Artifact Registry read permissions to the VM service account."
echo "  3. Put the production env payload in Secret Manager."
echo "  4. Let GitHub Actions deploy into $APP_ROOT."
