# GCP VM Deployment Guide

This document is the authoritative operational reference for deploying Brooks Prequel to a GCP VM using GitHub Actions. For the initial GCP resource provisioning, see `GCP_SETUP_STEP_BY_STEP.md`. Once setup is complete, subsequent deploys are a single `git push`.

---

## Architecture overview

```
GitHub Actions
  │  Service account JSON key (GCP_SA_KEY)
  │
  ├─ Builds backend image  → Artifact Registry
  ├─ Builds web image      → Artifact Registry
  │
  └─ SSH into GCP VM  (ed25519 keypair, GCP_VM_SSH_KEY)
       Docker Compose (docker-compose.prod.yml)
         ├─ postgres   (data volume, healthcheck)
         ├─ backend    (Spring Boot, Flyway migrations)
         ├─ web        (Next.js standalone)
         └─ caddy      (reverse proxy, auto TLS via Let's Encrypt)
```

**One service account:** `brooks-prequel-vm@YOUR_PROJECT.iam.gserviceaccount.com`

- Attached to the VM → VM pulls Docker images using the metadata service token (no key stored on the VM)
- JSON key in `GCP_SA_KEY` → GitHub Actions authenticates, pushes images, reads secrets

---

## Files involved

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | Full CI/CD pipeline triggered on push to `main` |
| `.github/workflows/ci.yml` | Tests and build check on PR |
| `infra/docker-compose.prod.yml` | Production service definitions |
| `infra/Caddyfile.prod` | Caddy reverse proxy config (TLS, routing) |
| `infra/.env.production.example` | Template for the production env payload |
| `infra/postgres/init.sql` | DB extensions (`uuid-ossp`, `pg_trgm`) — runs once on first Postgres boot |
| `infra/scripts/setup-vm.sh` | One-time VM bootstrap (Docker, log rotation, dirs) |
| `infra/scripts/validate-env.sh` | CI env validation run before every build |
| `infra/scripts/diagnostics.sh` | Full dump of logs + state when a deploy fails |

---

## Prerequisites

- GCP project with billing enabled — see `GCP_SETUP_STEP_BY_STEP.md` for all GCP setup steps
- GitHub repository with Actions enabled
- A domain name with DNS you can edit (A record pointing to the VM IP)
- SSH keypair generated locally (`ssh-keygen`) — private key in GitHub, public key on the VM

---

## Step 1 — Provision GCP resources (one time)

Follow `GCP_SETUP_STEP_BY_STEP.md` in full. That document covers:

1. Enabling required APIs via GCP Console
2. Adding `artifactregistry.writer` and `secretmanager.secretAccessor` roles to the `brooks-prequel-vm` service account
3. Generating a JSON key from that service account
4. Generating an SSH keypair and adding the public key to the VM
5. Creating the `brooks-prequel-env` secret in Secret Manager with the production env payload
6. Bootstrapping the VM with Docker via SSH

Come back here once all steps in that document are complete.

---

## Step 2 — Configure GitHub Secrets

Go to: **GitHub → Settings → Secrets and variables → Actions → New repository secret**

| Secret name | Value | Source |
|-------------|-------|--------|
| `GCP_PROJECT_ID` | `brooks-485009` | Your GCP project ID |
| `GCP_REGION` | `us-central1` | Region of your Artifact Registry repository |
| `GCP_ARTIFACT_REPOSITORY` | `brooks-prequel` | Artifact Registry repository name |
| `GCP_ENV_SECRET_NAME` | `brooks-prequel-env` | Secret Manager secret name |
| `GCP_VM_HOST` | VM external IP | GCP Console → Compute Engine → VM instances → External IP |
| `GCP_VM_USER` | `borissolomonia` | Linux username on the VM |
| `GCP_VM_SSH_KEY` | Full private key | Contents of `~/.ssh/brooks-deploy-key` — include `-----BEGIN` and `-----END` lines |
| `GCP_SA_KEY` | Full JSON key file | Contents of the JSON file downloaded in `GCP_SETUP_STEP_BY_STEP.md` Step 3 |

All eight secrets must be present before the first deploy.

---

## Step 3 — Create the production env payload

Copy the example file and fill in every value:

```bash
cp infra/.env.production.example infra/.env.production
```

Open `infra/.env.production` and replace every `replace-me` placeholder. The mandatory keys are validated by `infra/scripts/validate-env.sh` before each build — the deploy fails fast if any are missing.

### Required keys reference

| Key | Example / notes |
|-----|----------------|
| `DOMAIN` | `app.yourdomain.com` — must match DNS A record pointing to VM IP |
| `LETSENCRYPT_EMAIL` | Your email — Caddy uses this for Let's Encrypt TLS cert notifications |
| `APP_BASE_URL` | `https://app.yourdomain.com` |
| `FRONTEND_BASE_URL` | Same as `APP_BASE_URL` |
| `CORS_ALLOWED_ORIGINS` | Same as `APP_BASE_URL` |
| `DB_NAME` | `brooks` |
| `DB_USERNAME` | `brooks` |
| `DB_PASSWORD` | Strong random string |
| `AUTH0_DOMAIN` | `your-tenant.auth0.com` |
| `AUTH0_AUDIENCE` | `https://api.yourdomain.com` |
| `AUTH0_SECRET` | 32+ random hex chars |
| `AUTH0_BASE_URL` | Same as `FRONTEND_BASE_URL` |
| `AUTH0_ISSUER_BASE_URL` | `https://your-tenant.auth0.com` |
| `AUTH0_CLIENT_ID` | From Auth0 application settings |
| `AUTH0_CLIENT_SECRET` | From Auth0 application settings |
| `NEXT_PUBLIC_API_BASE_URL` | Same as `APP_BASE_URL` (no trailing `/api`) |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Same as `AUTH0_DOMAIN` |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Same as `AUTH0_CLIENT_ID` |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Same as `AUTH0_AUDIENCE` |
| `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN` | Mapbox public token |
| `NEXT_PUBLIC_MAPBOX_STYLE` | e.g. `mapbox://styles/mapbox/dark-v11` |
| `MAP_DEFAULT_LAT` | `41.7151` |
| `MAP_DEFAULT_LNG` | `44.8271` |
| `MAP_DEFAULT_ZOOM` | `10` |
| `UNIPAY_MERCHANT_ID` | From Unipay dashboard |
| `UNIPAY_SECRET_KEY` | From Unipay dashboard |
| `UNIPAY_API_BASE_URL` | `https://checkout.unipay.com` |
| `AI_KEY_ENCRYPTION_SECRET` | 64 hex chars — generate with `openssl rand -hex 32` |
| `BACKEND_HOST` | `backend` (Docker service name) |
| `BACKEND_PORT` | `8080` |
| `WEB_HOST` | `web` (Docker service name) |
| `WEB_PORT` | `3000` |
| `PLATFORM_FEE_PERCENT` | `10` |
| `PLACE_IMAGE_MAX_COUNT` | `4` |
| `MEDIA_MAX_UPLOAD_SIZE_MB` | `10` |
| `SEED_EXAMPLE_ENABLED` | **must be `false`** in production |
| `SPRING_PROFILES_ACTIVE` | `production` |

> **Important:** `NEXT_PUBLIC_*` variables are **baked into the web JavaScript bundle at build time**. Changing them requires a full redeploy — they cannot be updated at runtime.

### Upload to Secret Manager

1. GCP Console → **Security → Secret Manager**
2. Click `brooks-prequel-env`
3. Click **+ New Version**
4. Upload your local `infra/.env.production` file
5. Click **Add New Version**

> **Do not commit `infra/.env.production` to git.** It is in `.gitignore`.

---

## Step 4 — Point DNS

Create an **A record** for your domain pointing to the VM's external IP.

- GCP Console → **Compute Engine → VM instances** → External IP column

> The VM IP is ephemeral by default — if you stop and restart the VM, the IP may change. To avoid this: GCP Console → **VPC network → IP addresses** → find the IP → Reserve static address.

Wait for DNS propagation before the first deploy so Caddy can complete the Let's Encrypt ACME challenge on port 80.

---

## Step 5 — First deployment

Push any commit to `main` or trigger manually:

```
GitHub → Actions → Deploy → Run workflow
```

### What the workflow does

1. **Validate secrets** — checks all eight GitHub secrets are present
2. **Authenticate** — presents `GCP_SA_KEY` JSON key to GCP; obtains an access token for the service account
3. **Fetch env** — pulls `infra/.env.production` content from Secret Manager
4. **Validate env** — `infra/scripts/validate-env.sh` checks all required keys, URL formats, placeholder rejection, and live Auth0 issuer discovery
5. **Build backend image** — `docker build backend/` (Gradle build + JRE runtime); tagged `REGION-docker.pkg.dev/PROJECT/brooks-prequel/brooks-prequel-backend:SHA` and `:latest`
6. **Build web image** — `docker build web/` with `NEXT_PUBLIC_*` vars as `--build-arg`; tagged similarly
7. **Push both images** to Artifact Registry
8. **Upload deployment files** to VM via SCP into `/opt/brooks/`:
   - `.env.runtime` (env + image tags)
   - `infra/docker-compose.prod.yml`
   - `infra/Caddyfile.prod`
   - `infra/postgres/init.sql`
   - `infra/scripts/diagnostics.sh`
   - `infra/scripts/setup-vm.sh`
9. **Deploy on VM** via SSH:
   - Copies `Caddyfile.prod` → `Caddyfile` (active Caddy config)
   - Authenticates Docker to Artifact Registry using the VM's metadata service token
   - Validates the rendered compose config
   - Pulls new images
   - Starts `postgres` — waits up to 2 minutes for its healthcheck to pass
   - Starts `backend` and `web` — waits up to 2 minutes for `/actuator/health` to return 200
   - Starts `caddy` — waits up to 90 seconds for `http://127.0.0.1/health`
10. **Smoke test** — curls the health endpoint and optionally hits `https://DOMAIN`

A full first deploy takes roughly 8–15 minutes (image builds dominate).

---

## Step 6 — Verify the deployment

SSH into the VM:

```bash
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP
```

Check all four containers are running and healthy:

```bash
docker compose \
  --env-file /opt/brooks/.env.runtime \
  -f /opt/brooks/infra/docker-compose.prod.yml \
  ps
```

Expected output:

```
NAME               STATUS          PORTS
brooks-caddy       running         0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
brooks-backend     healthy
brooks-postgres    healthy
brooks-web         running
```

Test endpoints:

```bash
# Caddy health (internal)
curl -fsS http://127.0.0.1/health

# Backend actuator (inside container)
docker exec brooks-backend curl -fsS http://127.0.0.1:8080/actuator/health

# Public site (requires DNS propagated)
curl -IkfsS https://your-domain.com
```

---

## Subsequent deployments

Push to `main`. The workflow runs automatically. Average re-deploy time: **6–10 minutes**.

The deploy is not zero-downtime — `docker compose up -d` replaces containers sequentially. For truly zero-downtime a blue-green setup would be needed; that is out of scope for this single-VM setup.

---

## Updating the production env

1. Edit `infra/.env.production` locally
2. Upload the new version to Secret Manager:
   - GCP Console → **Security → Secret Manager** → `brooks-prequel-env` → **+ New Version** → upload file
3. The next deployment fetches the new version automatically. To apply immediately without a code change, trigger the workflow manually from GitHub Actions.

> Remember: changes to `NEXT_PUBLIC_*` keys require a full image rebuild to take effect.

---

## Failure diagnostics

When a deployment fails, the workflow automatically runs `diagnostics.sh` and dumps output in the GitHub Actions log. Run it manually on the VM:

```bash
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP \
  "bash /opt/brooks/infra/scripts/diagnostics.sh"
```

The script outputs: system info (disk, memory), `docker ps -a`, `docker images`, networks, volumes, full rendered compose config, last 200 log lines from each container, Docker daemon journal.

### Common failure causes

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `postgres failed health check` | Insufficient disk or bad `DB_*` values | SSH in, run `df -h`; verify env vars |
| `backend failed health check` | DB migration failed or missing env var | `docker logs brooks-backend --tail 100` |
| `caddy failed health check` | Port 80/443 blocked or DNS not propagated | Check GCP Console firewall rules; verify DNS |
| `docker login failed` | VM SA missing `artifactregistry.reader` role | Add role in GCP Console → IAM |
| `missing runtime env file` | SCP upload failed | Check VM disk space; re-run workflow |
| `ERROR: missing required env key` | Env payload in Secret Manager is incomplete | Add missing key, upload new version, re-run |
| Auth0 `issuer mismatch` | `AUTH0_ISSUER_BASE_URL` doesn't match live tenant | Fix the value in `.env.production`, re-upload, redeploy |
| Web image build fails | `NEXT_PUBLIC_*` var missing from Secret Manager payload | Add the missing key, re-upload, redeploy |

---

## Rollback

Find the previous image SHA in Artifact Registry:

1. GCP Console → **Artifact Registry → Repositories → brooks-prequel**
2. Click `brooks-prequel-backend` → find the previous digest/tag
3. Copy the full image path with the old SHA

SSH into the VM and pull the old images:

```bash
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP

# On the VM:
cd /opt/brooks
export BROOKS_BACKEND_IMAGE=REGION-docker.pkg.dev/PROJECT/brooks-prequel/brooks-prequel-backend:OLD_SHA
export BROOKS_WEB_IMAGE=REGION-docker.pkg.dev/PROJECT/brooks-prequel/brooks-prequel-web:OLD_SHA

docker compose --env-file .env.runtime \
  -f infra/docker-compose.prod.yml \
  up -d backend web
```

The database schema is managed by Flyway forward-only migrations. Rolling back the app to a version that predates a migration is safe to run but the new schema columns will be ignored by the old code.

---

## Database

- Postgres runs in Docker with a named volume (`brooks-postgres-data`). Data persists across restarts and redeployments.
- `infra/postgres/init.sql` runs **once** on first container boot to install extensions. It does not run again.
- Flyway migrations in `backend/app/src/main/resources/db/migration/` run automatically on every backend startup.

Connect to the database directly (SSH into the VM first):

```bash
docker exec -it brooks-postgres psql -U brooks -d brooks
```

Take a manual backup:

```bash
docker exec brooks-postgres pg_dump -U brooks brooks | gzip > /tmp/brooks-$(date +%Y%m%d).sql.gz
```

---

## VM maintenance

Connect first:
```bash
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP
```

### Restart all services

```bash
docker compose \
  --env-file /opt/brooks/.env.runtime \
  -f /opt/brooks/infra/docker-compose.prod.yml \
  restart
```

### View live logs

```bash
# All services
docker compose --env-file /opt/brooks/.env.runtime -f /opt/brooks/infra/docker-compose.prod.yml logs -f

# One service
docker logs brooks-backend -f --tail 100
```

### Check disk usage

```bash
df -h
docker system df
```

Prune old images if disk is low:

```bash
docker image prune -a --filter "until=72h"
```

### Re-run VM bootstrap (e.g. after OS upgrade)

```bash
bash /opt/brooks/infra/scripts/setup-vm.sh
```
