# GCP VM Deployment

This repo now includes a production deployment path for a GCP VM using:
- Docker Compose
- GitHub Actions
- Artifact Registry
- Secret Manager
- Caddy with direct Let's Encrypt TLS
- Postgres created automatically on the VM in Docker

## Files
- `.github/workflows/deploy.yml`
- `infra/docker-compose.prod.yml`
- `infra/Caddyfile.prod`
- `infra/.env.production.example`
- `infra/scripts/validate-env.sh`
- `infra/scripts/diagnostics.sh`
- `infra/scripts/setup-vm.sh`

## Required GCP resources
- Artifact Registry Docker repository
- One Linux VM with a static external IP
- VM service account with `roles/artifactregistry.reader`
- Secret Manager secret containing the production env payload
- Workload Identity Federation for GitHub Actions

## Required GitHub secrets / vars
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT`
- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GCP_ARTIFACT_REPOSITORY`
- `GCP_ENV_SECRET_NAME`
- `GCP_VM_HOST`
- `GCP_VM_USER`
- `GCP_VM_SSH_KEY`

## First-time VM setup
Run on the VM:

```bash
chmod +x /opt/brooks/infra/scripts/setup-vm.sh
/opt/brooks/infra/scripts/setup-vm.sh
```

## Production env payload
Use `infra/.env.production.example` as the schema reference.

Store the real values in Secret Manager. Do not commit them into the repo.

## Automatic database creation
The production stack creates Postgres automatically:
- Docker Compose starts `postgres`
- `POSTGRES_DB` creates the application DB on first boot
- `infra/postgres/init.sql` applies DB-level extensions on first initialization
- Spring Boot Flyway migrations create and evolve the schema automatically

## Failure diagnostics
On deployment failure the workflow dumps:
- compose config and compose status
- container inspections
- recent logs from `postgres`, `backend`, `web`, `caddy`
- docker service logs
- disk and memory usage

You can also run on the VM:

```bash
chmod +x /opt/brooks/infra/scripts/diagnostics.sh
/opt/brooks/infra/scripts/diagnostics.sh
```
