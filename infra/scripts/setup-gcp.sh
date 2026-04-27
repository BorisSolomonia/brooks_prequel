#!/usr/bin/env bash
# One-time GCP provisioning for Brooks Prequel.
# Run from your local machine after setting the required env vars below.
#
# Required env vars (set before running):
#   GCP_PROJECT_ID   — your GCP project ID
#   GITHUB_ORG       — your GitHub username or organisation
#   GITHUB_REPO      — the repository name (e.g. brooks-prequel)
#
# Optional env vars with defaults:
#   GCP_REGION       — default: us-central1
#   GCP_ZONE         — default: us-central1-a
#   VM_MACHINE_TYPE  — default: e2-standard-2
#
# Usage:
#   export GCP_PROJECT_ID=my-project GITHUB_ORG=myorg GITHUB_REPO=brooks-prequel
#   bash infra/scripts/setup-gcp.sh

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
GITHUB_ORG="${GITHUB_ORG:?Set GITHUB_ORG}"
GITHUB_REPO="${GITHUB_REPO:?Set GITHUB_REPO}"

APP="brooks-prequel"
VM_NAME="${APP}-vm"
VM_MACHINE_TYPE="${VM_MACHINE_TYPE:-e2-standard-2}"
MEDIA_BUCKET="${GCS_BUCKET:-}"
AR_REPO="${APP}"
SA_VM="${APP}-vm"
SA_GITHUB="${APP}-ci"
WIF_POOL="${APP}-pool"
WIF_PROVIDER="${APP}-github"
SM_SECRET="${APP}-env"
SSH_KEY_FILE="$(mktemp /tmp/brooks-vm-key.XXXXXX)"

section() { printf '\n\033[1;36m══ %s ══\033[0m\n' "$1"; }
ok()      { printf '\033[0;32m✓ %s\033[0m\n' "$1"; }
info()    { printf '  %s\n' "$1"; }

# ── Preflight ─────────────────────────────────────────────────────────────────
section "Preflight"
command -v gcloud >/dev/null 2>&1 || { echo "ERROR: gcloud not installed"; exit 1; }
gcloud config set project "$PROJECT_ID" --quiet
ok "gcloud project set to $PROJECT_ID"

# ── Enable APIs ───────────────────────────────────────────────────────────────
section "Enabling required APIs"
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="$PROJECT_ID" --quiet
ok "APIs enabled"

# ── Artifact Registry ─────────────────────────────────────────────────────────
section "Artifact Registry"
if gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" --project="$PROJECT_ID" &>/dev/null; then
  ok "Repository $AR_REPO already exists"
else
  gcloud artifacts repositories create "$AR_REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --quiet
  ok "Created Artifact Registry repository $AR_REPO"
fi

# ── VM service account ────────────────────────────────────────────────────────
section "VM service account"
SA_VM_EMAIL="${SA_VM}@${PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$SA_VM_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  ok "SA $SA_VM_EMAIL already exists"
else
  gcloud iam service-accounts create "$SA_VM" \
    --display-name="Brooks Prequel VM" \
    --project="$PROJECT_ID" --quiet
  ok "Created SA $SA_VM_EMAIL"
fi
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_VM_EMAIL}" \
  --role="roles/artifactregistry.reader" --quiet >/dev/null
ok "Granted Artifact Registry reader to VM SA"

if [[ -n "$MEDIA_BUCKET" ]]; then
  if gcloud storage buckets describe "gs://${MEDIA_BUCKET}" --project="$PROJECT_ID" &>/dev/null; then
    gcloud storage buckets add-iam-policy-binding "gs://${MEDIA_BUCKET}" \
      --member="serviceAccount:${SA_VM_EMAIL}" \
      --role="roles/storage.objectAdmin" \
      --project="$PROJECT_ID" --quiet >/dev/null
    ok "Granted Storage object admin on gs://${MEDIA_BUCKET} to VM SA"

    if gcloud storage buckets add-iam-policy-binding "gs://${MEDIA_BUCKET}" \
      --member="allUsers" \
      --role="roles/storage.objectViewer" \
      --project="$PROJECT_ID" --quiet >/dev/null; then
      ok "Granted public object read on gs://${MEDIA_BUCKET}"
    else
      info "Could not grant public read on gs://${MEDIA_BUCKET}; configure allUsers roles/storage.objectViewer manually."
    fi
  else
    info "GCS_BUCKET=${MEDIA_BUCKET} was set, but the bucket was not found; skipping storage IAM grants."
  fi
fi

# ── GCE VM ────────────────────────────────────────────────────────────────────
section "Compute VM"
if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" &>/dev/null; then
  ok "VM $VM_NAME already exists"
  VM_IP="$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
else
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type="$VM_MACHINE_TYPE" \
    --image-family=ubuntu-2204-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=40GB \
    --boot-disk-type=pd-balanced \
    --service-account="$SA_VM_EMAIL" \
    --scopes=cloud-platform \
    --tags=http-server,https-server \
    --project="$PROJECT_ID" --quiet
  ok "VM $VM_NAME created"
  VM_IP="$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --project="$PROJECT_ID" --format='get(networkInterfaces[0].accessConfigs[0].natIP)')"
fi
info "VM external IP: $VM_IP"

# ── Firewall ──────────────────────────────────────────────────────────────────
section "Firewall rules"
gcloud compute firewall-rules create allow-http --allow=tcp:80 --target-tags=http-server \
  --project="$PROJECT_ID" --quiet 2>/dev/null || true
gcloud compute firewall-rules create allow-https --allow=tcp:443 --target-tags=https-server \
  --project="$PROJECT_ID" --quiet 2>/dev/null || true
ok "Firewall rules for 80/443 present"

# ── SSH key for GitHub Actions ────────────────────────────────────────────────
section "SSH key pair"
ssh-keygen -t ed25519 -f "$SSH_KEY_FILE" -N "" -C "github-actions@brooks-prequel" -q
SSH_PUB="$(cat "${SSH_KEY_FILE}.pub")"
SSH_PRIV="$(cat "$SSH_KEY_FILE")"

# Add public key to VM metadata
DEPLOY_USER="${APP}-deploy"
gcloud compute instances add-metadata "$VM_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --metadata="ssh-keys=${DEPLOY_USER}:${SSH_PUB}" --quiet
ok "SSH public key added to VM for user $DEPLOY_USER"
info "The private key will be shown in the GitHub Secrets section below."
rm -f "$SSH_KEY_FILE" "${SSH_KEY_FILE}.pub"

# ── GitHub Actions service account + WIF ─────────────────────────────────────
section "GitHub Actions service account"
SA_GITHUB_EMAIL="${SA_GITHUB}@${PROJECT_ID}.iam.gserviceaccount.com"
if gcloud iam service-accounts describe "$SA_GITHUB_EMAIL" --project="$PROJECT_ID" &>/dev/null; then
  ok "SA $SA_GITHUB_EMAIL already exists"
else
  gcloud iam service-accounts create "$SA_GITHUB" \
    --display-name="Brooks Prequel GitHub CI" \
    --project="$PROJECT_ID" --quiet
  ok "Created SA $SA_GITHUB_EMAIL"
fi
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_GITHUB_EMAIL}" \
  --role="roles/artifactregistry.writer" --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_GITHUB_EMAIL}" \
  --role="roles/secretmanager.secretAccessor" --quiet >/dev/null
ok "Granted AR writer + Secret Manager accessor to GitHub SA"

section "Workload Identity Federation"
WIF_POOL_FULL="projects/$(gcloud projects describe "$PROJECT_ID" --format='get(projectNumber)')/locations/global/workloadIdentityPools/${WIF_POOL}"

if gcloud iam workload-identity-pools describe "$WIF_POOL" \
  --location=global --project="$PROJECT_ID" &>/dev/null; then
  ok "WIF pool $WIF_POOL already exists"
else
  gcloud iam workload-identity-pools create "$WIF_POOL" \
    --location=global \
    --display-name="Brooks Prequel GitHub Pool" \
    --project="$PROJECT_ID" --quiet
  ok "Created WIF pool"
fi

if gcloud iam workload-identity-pools providers describe "$WIF_PROVIDER" \
  --workload-identity-pool="$WIF_POOL" \
  --location=global --project="$PROJECT_ID" &>/dev/null; then
  ok "WIF provider $WIF_PROVIDER already exists"
else
  gcloud iam workload-identity-pools providers create-oidc "$WIF_PROVIDER" \
    --workload-identity-pool="$WIF_POOL" \
    --location=global \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
    --attribute-condition="assertion.repository=='${GITHUB_ORG}/${GITHUB_REPO}'" \
    --project="$PROJECT_ID" --quiet
  ok "Created WIF OIDC provider"
fi

gcloud iam service-accounts add-iam-policy-binding "$SA_GITHUB_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WIF_POOL_FULL}/attribute.repository/${GITHUB_ORG}/${GITHUB_REPO}" \
  --project="$PROJECT_ID" --quiet >/dev/null
ok "Bound GitHub repo to SA via WIF"

WIF_PROVIDER_FULL="${WIF_POOL_FULL}/providers/${WIF_PROVIDER}"

# ── Secret Manager — env file placeholder ────────────────────────────────────
section "Secret Manager"
if gcloud secrets describe "$SM_SECRET" --project="$PROJECT_ID" &>/dev/null; then
  ok "Secret $SM_SECRET already exists — skipping creation (update it manually)"
else
  printf '# Replace this placeholder with your real .env.production content\nDOMAIN=replace-me\n' \
    | gcloud secrets create "$SM_SECRET" \
        --replication-policy=automatic \
        --project="$PROJECT_ID" \
        --data-file=- --quiet
  ok "Created secret $SM_SECRET (placeholder — replace with real values)"
  info "Run: gcloud secrets versions add $SM_SECRET --data-file=infra/.env.production --project=$PROJECT_ID"
fi

# ── VM bootstrap ──────────────────────────────────────────────────────────────
section "VM bootstrap"
info "Running setup-vm.sh on the VM via gcloud SSH..."
gcloud compute ssh "$VM_NAME" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --command="bash -s" \
  --ssh-flag="-o StrictHostKeyChecking=no" \
  -- < "$(dirname "$0")/setup-vm.sh"
ok "VM bootstrap complete"

# ── Summary ───────────────────────────────────────────────────────────────────
section "GitHub Secrets to configure"
printf '\nGo to: https://github.com/%s/%s/settings/secrets/actions\n' "$GITHUB_ORG" "$GITHUB_REPO"
printf 'Add these repository secrets:\n\n'
printf '  %-40s %s\n' "GCP_PROJECT_ID"                  "$PROJECT_ID"
printf '  %-40s %s\n' "GCP_REGION"                      "$REGION"
printf '  %-40s %s\n' "GCP_ARTIFACT_REPOSITORY"         "$AR_REPO"
printf '  %-40s %s\n' "GCP_ENV_SECRET_NAME"             "$SM_SECRET"
printf '  %-40s %s\n' "GCP_VM_HOST"                     "$VM_IP"
printf '  %-40s %s\n' "GCP_VM_USER"                     "$DEPLOY_USER"
printf '  %-40s %s\n' "GCP_SERVICE_ACCOUNT"             "$SA_GITHUB_EMAIL"
printf '  %-40s %s\n' "GCP_WORKLOAD_IDENTITY_PROVIDER"  "$WIF_PROVIDER_FULL"
printf '  %-40s %s\n' "GCP_VM_SSH_KEY"                  "(see below)"

printf '\n\033[1;33mGCP_VM_SSH_KEY value (copy the entire block):\033[0m\n'
printf '%s\n' "$SSH_PRIV"

printf '\n\033[1;33mNext steps:\033[0m\n'
printf '  1. Copy the SSH private key above into the GCP_VM_SSH_KEY secret.\n'
printf '  2. Fill in infra/.env.production (use infra/.env.production.example as a template).\n'
printf '  3. Upload the real env to Secret Manager:\n'
printf '       gcloud secrets versions add %s --data-file=infra/.env.production --project=%s\n' "$SM_SECRET" "$PROJECT_ID"
printf '  4. Point your domain DNS A record to: %s\n' "$VM_IP"
printf '  5. Push to main (or run Actions → Deploy manually) to deploy.\n'
