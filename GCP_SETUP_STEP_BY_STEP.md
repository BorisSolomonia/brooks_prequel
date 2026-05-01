# GCP Setup: Step-by-Step Console Guide

This guide covers every GCP resource you need to deploy Brooks Prequel. All GCP steps use the browser-based **Google Cloud Console** — no `gcloud` CLI required. VM operations use plain **SSH**.

The VM already exists. This guide focuses on updating the service account, generating keys, and wiring everything to GitHub Actions.

---

## What you will have when done

```
One service account: brooks-prequel-vm@YOUR_PROJECT.iam.gserviceaccount.com
  ├── Attached to the VM   → VM pulls Docker images via metadata service (no key stored on VM)
  └── JSON key → GCP_SA_KEY  → GitHub Actions pushes images + reads env secrets

SSH keypair (ed25519):
  ├── Private key → GCP_VM_SSH_KEY  → GitHub Actions SSHes into the VM
  └── Public key → VM authorized_keys
```

**Eight GitHub secrets total.** No Workload Identity Federation. No separate CI service account.

---

## Step 1 — Enable required APIs

> Skip any API that is already enabled.

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and select your project from the top bar.
2. In the left menu: **APIs & Services → Library**
3. Search for and **Enable** each of the following:

| API name to search | What it does |
|--------------------|-------------|
| `Artifact Registry API` | Stores Docker images |
| `Compute Engine API` | Manages the VM |
| `Secret Manager API` | Stores the production env payload |
| `Cloud IAM API` | Manages service account permissions |

For each: search → click the result → click the blue **Enable** button. If the button says "Manage", it is already enabled.

---

## Step 2 — Grant the service account the roles it needs

The existing service account `brooks-prequel-vm` currently has only `roles/artifactregistry.reader`. You need to add two more roles so that the same account can be used by GitHub Actions to push images and read secrets.

### 2A — Add roles via IAM

1. Left menu: **IAM & Admin → IAM**
2. Find the row for `brooks-prequel-vm@YOUR_PROJECT.iam.gserviceaccount.com`
3. Click the **pencil icon** (Edit principal) on that row
4. In the panel that opens, click **+ Add another role**
5. In the role search box, type `Artifact Registry Writer` → select **Artifact Registry Writer**
6. Click **+ Add another role** again
7. Type `Secret Manager Secret Accessor` → select **Secret Manager Secret Accessor**
8. Click **Save**

After saving, the service account has three roles:

| Role | Purpose |
|------|---------|
| `roles/artifactregistry.reader` | VM pulls images at runtime (already existed) |
| `roles/artifactregistry.writer` | GitHub Actions pushes new images after each build |
| `roles/secretmanager.secretAccessor` | GitHub Actions reads the production env from Secret Manager |

> The reader and writer roles overlap — having both is harmless. If you want to clean up, you can remove reader since writer includes read access.

### 2B — Verify the roles (optional)

1. Left menu: **IAM & Admin → Service Accounts**
2. Click `brooks-prequel-vm@...`
3. Click the **Permissions** tab
4. Confirm the three roles appear in the list

---

## Step 3 — Generate a JSON key for the service account

This key is what GitHub Actions presents to GCP to prove its identity. It goes into the `GCP_SA_KEY` GitHub secret.

1. Left menu: **IAM & Admin → Service Accounts**
2. Click `brooks-prequel-vm@YOUR_PROJECT.iam.gserviceaccount.com`
3. Click the **Keys** tab
4. Click **Add Key → Create new key**
5. Select **JSON** → click **Create**
6. The browser downloads a file like `YOUR_PROJECT-abc123.json`

Open the file — it looks like:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN RSA PRIVATE KEY-----\n...",
  "client_email": "brooks-prequel-vm@your-project-id.iam.gserviceaccount.com",
  ...
}
```

You will paste the **entire contents of this file** into the GitHub secret `GCP_SA_KEY` in Step 6.

> **Keep this file secure. Do not commit it to git. Delete it from your machine after pasting into GitHub.**

---

## Step 4 — Generate the SSH keypair for GitHub Actions

This is the only step that requires a terminal on your local machine (Windows: Git Bash or WSL; Mac/Linux: Terminal). No `gcloud` needed — just `ssh-keygen` which ships with every OS.

```bash
ssh-keygen -t ed25519 -f ~/.ssh/brooks-deploy-key -N "" -C "github-actions"
```

Flags explained:
- `-t ed25519` — modern elliptic-curve algorithm
- `-f ~/.ssh/brooks-deploy-key` — where to save the two files
- `-N ""` — no passphrase (required for automated use)
- `-C "github-actions"` — label embedded in the public key

Two files are created:

| File | Contents | Destination |
|------|----------|-------------|
| `~/.ssh/brooks-deploy-key` | **Private key** | GitHub secret `GCP_VM_SSH_KEY` |
| `~/.ssh/brooks-deploy-key.pub` | Public key | VM's `~/.ssh/authorized_keys` |

Print the private key to copy it to GitHub later:
```bash
cat ~/.ssh/brooks-deploy-key
```

Print the public key to add to the VM in the next step:
```bash
cat ~/.ssh/brooks-deploy-key.pub
```

The public key is a single long line like:
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... github-actions
```

---

## Step 5 — Add the SSH public key to the VM

You need the public key in `/home/borissolomonia/.ssh/authorized_keys` on the VM.

### Option A — Via GCP Console VM editor (simplest, no prior SSH needed)

1. Left menu: **Compute Engine → VM instances**
2. Click `brooks-prequel-vm`
3. Click **Edit** at the top of the page
4. Scroll down to the **SSH Keys** section
5. Click **+ Add item**
6. Paste the full content of `~/.ssh/brooks-deploy-key.pub` into the text field
7. Click **Save**

GCP adds this key to the VM's metadata and makes it available system-wide. GitHub Actions can then SSH in using the matching private key.

### Option B — Via GCP browser terminal (if you cannot edit VM metadata)

1. Left menu: **Compute Engine → VM instances**
2. Click the **SSH** button next to `brooks-prequel-vm` — a browser terminal opens
3. Inside the browser terminal, run:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI...your-full-public-key... github-actions" \
  >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Replace the `ssh-ed25519 AAAA...` line with the full output of `cat ~/.ssh/brooks-deploy-key.pub` from your local machine.

### Verify the key works

From your local machine:
```bash
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP
```

If you connect without a password prompt, the key is working correctly.

---

## Step 6 — Create or update the Secret Manager secret

The production environment variables are stored as a single secret in Secret Manager. GitHub Actions fetches this on every deploy.

### If the secret does not yet exist

1. Left menu: **Security → Secret Manager**
   (If you don't see Security in the menu, search for "Secret Manager" in the top search bar)
2. Click **+ Create Secret**
3. Fill in:
   - **Name:** `brooks-prequel-env`
   - **Secret value:** click **Upload file** → select your local `infra/.env.production` file
   - **Replication policy:** Automatic (default)
4. Click **Create Secret**

### If the secret already exists and you need to update it

1. Left menu: **Security → Secret Manager**
2. Click `brooks-prequel-env`
3. Click **+ New Version**
4. Click **Upload file** → select your updated `infra/.env.production`
5. Click **Add New Version**

### What goes inside `.env.production`

Copy `infra/.env.production.example` and fill in all values. The minimum required keys are:

```
DOMAIN=app.yourdomain.com
LETSENCRYPT_EMAIL=placeholder
APP_BASE_URL=https://app.yourdomain.com
FRONTEND_BASE_URL=https://app.yourdomain.com
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com
DB_NAME=brooks
DB_USERNAME=brooks
DB_PASSWORD=<strong-random-string>
AUTH0_DOMAIN=your-tenant.auth0.com
AUTH0_AUDIENCE=https://api.yourdomain.com
AUTH0_SECRET=<32+-hex-chars>
AUTH0_BASE_URL=https://app.yourdomain.com
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=<from Auth0>
AUTH0_CLIENT_SECRET=<from Auth0>
NEXT_PUBLIC_API_BASE_URL=https://app.yourdomain.com
NEXT_PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<from Auth0>
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.yourdomain.com
NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN=<mapbox token>
NEXT_PUBLIC_MAPBOX_STYLE=mapbox://styles/mapbox/dark-v11
BOG_IPAY_CLIENT_ID=<from Bank of Georgia businessonline.ge>
BOG_IPAY_SECRET_KEY=<from Bank of Georgia businessonline.ge>
BOG_IPAY_BASE_URL=https://ipay.ge/opay/api/v1
AI_KEY_ENCRYPTION_SECRET=<64 hex chars: openssl rand -hex 32>
BACKEND_HOST=backend
BACKEND_PORT=8080
WEB_HOST=web
WEB_PORT=3000
SEED_EXAMPLE_ENABLED=false
SPRING_PROFILES_ACTIVE=production
```

> **Do not commit `infra/.env.production` to git.** It is in `.gitignore`.

---

## Step 7 — Get the VM's external IP

You need this for DNS and the `GCP_VM_HOST` secret.

1. Left menu: **Compute Engine → VM instances**
2. Find `brooks-prequel-vm` — the **External IP** column shows the address
3. Copy it

> If the IP is ephemeral (no lock icon), it may change if you stop/start the VM. To make it permanent:
> - Left menu: **VPC network → IP addresses**
> - Find the IP in use by the VM → click the three-dot menu → **Reserve static address**

---

## Step 8 — Configure GitHub Secrets

Go to your repository on GitHub:
**Settings → Secrets and variables → Actions → New repository secret**

Create each of these eight secrets:

| Secret name | Value | Where to get it |
|-------------|-------|----------------|
| `GCP_PROJECT_ID` | `brooks-485009` | GCP Console → project selector dropdown |
| `GCP_REGION` | `us-central1` | The region your Artifact Registry repository is in |
| `GCP_ARTIFACT_REPOSITORY` | `brooks-prequel` | Artifact Registry → Repositories → name column |
| `GCP_ENV_SECRET_NAME` | `brooks-prequel-env` | The secret name from Step 6 |
| `GCP_VM_HOST` | VM external IP | From Step 7 |
| `GCP_VM_USER` | `borissolomonia` | Your Linux username on the VM |
| `GCP_VM_SSH_KEY` | Full contents of `~/.ssh/brooks-deploy-key` | From Step 4 — include the `-----BEGIN` and `-----END` lines |
| `GCP_SA_KEY` | Full contents of the downloaded JSON key file | From Step 3 — paste the entire JSON |

All eight must be present before the first deploy.

---

## Step 9 — Bootstrap the VM

The VM needs Docker installed before the first deploy. Connect via SSH and run the bootstrap script:

```bash
# Connect to the VM
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP

# Inside the VM — run the setup script
bash /opt/brooks/infra/scripts/setup-vm.sh
```

If `/opt/brooks/infra/scripts/setup-vm.sh` is not yet on the VM (first time), upload it first from your local machine:

```bash
# From local machine — upload the script
scp -i ~/.ssh/brooks-deploy-key \
  infra/scripts/setup-vm.sh \
  borissolomonia@YOUR_VM_IP:/tmp/setup-vm.sh

# Connect and run it
ssh -i ~/.ssh/brooks-deploy-key borissolomonia@YOUR_VM_IP \
  "bash /tmp/setup-vm.sh"
```

The script installs Docker, Docker Compose plugin, sets up log rotation, and creates `/opt/brooks`.

---

## Step 10 — Point DNS to the VM

Create an **A record** for your domain pointing to the VM's external IP (from Step 7).

- Host: `app` (for `app.yourdomain.com`) or `@` (for the root domain)
- Type: `A`
- Value: the VM external IP
- TTL: 300 (5 minutes for fast propagation)

Caddy automatically obtains a TLS certificate from Let's Encrypt on the first request. For this to work, **DNS must be propagated and ports 80 and 443 must be open** on the VM before the first deploy.

Check firewall rules are in place:
1. Left menu: **VPC network → Firewall**
2. Confirm rules exist that allow:
   - TCP port 80 for tag `http-server`
   - TCP port 443 for tag `https-server`

If missing, create them:
1. Click **Create Firewall Rule**
2. For port 80: name `allow-http`, targets `http-server`, TCP port `80`, source `0.0.0.0/0`
3. Repeat for port 443: name `allow-https`, targets `https-server`, TCP port `443`

---

## Step 11 — First deploy

Push to `main` or trigger manually:

**GitHub → Actions → Deploy → Run workflow**

Watch the logs. A successful first deploy takes 8–15 minutes (image builds included).

---

## Final checklist

Before pushing to `main`, confirm every item:

- [ ] Artifact Registry API, Compute Engine API, Secret Manager API, Cloud IAM API enabled
- [ ] `brooks-prequel-vm` SA has `artifactregistry.writer` + `secretmanager.secretAccessor` roles
- [ ] JSON key downloaded and pasted into `GCP_SA_KEY` GitHub secret
- [ ] SSH keypair generated — private key in `GCP_VM_SSH_KEY`, public key on the VM
- [ ] SSH connection from local machine works: `ssh -i ~/.ssh/brooks-deploy-key borissolomonia@VM_IP`
- [ ] `brooks-prequel-env` secret exists in Secret Manager and is populated
- [ ] All eight GitHub secrets are set
- [ ] DNS A record points to VM IP and has propagated
- [ ] Ports 80 and 443 are open in GCP firewall
- [ ] VM bootstrap completed (Docker installed)
