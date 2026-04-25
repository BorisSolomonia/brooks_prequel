# Production Setup Guide

Complete checklist for configuring external services before the first deployment to `brooksweb.uk`.

---

## Part 1 — Auth0.

You are using the existing tenant: **`dev-4zduxht0r6gq1f7f.us.auth0.com`**

You need to create two new resources inside it specifically for production: a **Regular Web Application** and an **API**.

---

### 1A — Create the production Application

1. Go to [manage.auth0.com](https://manage.auth0.com) and log in
2. In the top-left, confirm the tenant is `dev-4zduxht0r6gq1f7f`
3. Left menu → **Applications → Applications** → **Create Application**
4. Fill in:
   - **Name:** `Brooks Prequel Production`
   - **Application type:** Regular Web Application
5. Click **Create**
6. The **Settings** tab opens — configure these fields:

| Field | Value |
|-------|-------|
| **Allowed Callback URLs** | `https://brooksweb.uk/api/auth/callback` |
| **Allowed Logout URLs** | `https://brooksweb.uk` |
| **Allowed Web Origins** | `https://brooksweb.uk` |
| **Allowed Origins (CORS)** | `https://brooksweb.uk` |

7. Scroll down → **Save Changes**
8. Stay on the Settings tab — copy these two values into `infra/.env.production`:

| Auth0 field | Env variable |
|-------------|-------------|
| **Client ID** | `AUTH0_CLIENT_ID` and `NEXT_PUBLIC_AUTH0_CLIENT_ID` |
| **Client Secret** | `AUTH0_CLIENT_SECRET` |

> Both `AUTH0_CLIENT_ID` and `NEXT_PUBLIC_AUTH0_CLIENT_ID` must have the **same value**.

---

### 1B — Create the production API

1. Left menu → **Applications → APIs** → **Create API**
2. Fill in:
   - **Name:** `Brooks Prequel Production API`
   - **Identifier:** `https://api.brooksweb.uk`
   - **Signing Algorithm:** RS256
3. Click **Create**
4. Copy the **Identifier** into `infra/.env.production`:

| Auth0 field | Env variable |
|-------------|-------------|
| **Identifier** | `AUTH0_AUDIENCE` and `NEXT_PUBLIC_AUTH0_AUDIENCE` |

> Both `AUTH0_AUDIENCE` and `NEXT_PUBLIC_AUTH0_AUDIENCE` must have the **same value**.

**Important:** The identifier `https://api.brooksweb.uk` is just a unique string — it does not need to resolve to a real URL. Do not change it after first use, as it is embedded in all JWT tokens.

---

### 1C — Generate AUTH0_SECRET

This is a random secret used by the Next.js Auth0 SDK to encrypt session cookies. It is not related to Auth0's own credentials.

Run on your local machine (Git Bash, WSL, or Mac/Linux terminal):

```bash
openssl rand -hex 32
```

Paste the output (64 hex characters) into `AUTH0_SECRET` in `infra/.env.production`.

> Do not reuse the local dev value (`8cc4e28a...`). Generate a fresh one for production.

---

### 1D — Verify the cross-field rules

`validate-env.sh` enforces these cross-field checks before every deploy. Confirm they hold in your `.env.production`:

| Rule | What to check |
|------|---------------|
| `AUTH0_DOMAIN == NEXT_PUBLIC_AUTH0_DOMAIN` | Both must be `dev-4zduxht0r6gq1f7f.us.auth0.com` |
| `AUTH0_AUDIENCE == NEXT_PUBLIC_AUTH0_AUDIENCE` | Both must be `https://api.brooksweb.uk` |
| `AUTH0_BASE_URL == FRONTEND_BASE_URL` | Both must be `https://brooksweb.uk` |
| `AUTH0_ISSUER_BASE_URL` host == `AUTH0_DOMAIN` | `https://dev-4zduxht0r6gq1f7f.us.auth0.com` — the host part must equal `dev-4zduxht0r6gq1f7f.us.auth0.com` |
| `AUTH0_CLIENT_ID == NEXT_PUBLIC_AUTH0_CLIENT_ID` | Same client ID in both fields |

---

## Part 2 — GCP Cloud Storage

The backend stores all uploaded media (guide cover images, place photos, creator avatars) in a GCS bucket. The bucket must exist and the VM service account must have write access.

---

### 2A — Create the Cloud Storage bucket

1. GCP Console → left menu → **Cloud Storage → Buckets**
2. Click **Create**
3. Fill in:
   - **Name:** `brooks-media`
   - **Location type:** Region
   - **Region:** same as your VM (e.g. `us-central1`)
   - **Storage class:** Standard
   - **Access control:** Fine-grained (recommended) or Uniform
4. Click **Create**

> If a bucket named `brooks-media` already exists in your project, skip creation.

---

### 2B — Grant the VM service account access to the bucket

The VM service account (`brooks-prequel-vm@brooks-485009.iam.gserviceaccount.com`) handles all GCS operations at runtime. It needs write access to the bucket.

1. In Cloud Storage, click on the **`brooks-media`** bucket
2. Click the **Permissions** tab
3. Click **Grant Access**
4. Fill in:
   - **New principals:** `brooks-prequel-vm@brooks-485009.iam.gserviceaccount.com`
   - **Role:** `Storage Object Admin`
5. Click **Save**

> `Storage Object Admin` allows the backend to create, read, update, and delete objects inside the bucket.

Without this step, media uploads will fail with a 403 Forbidden error from GCS, even though the VM can pull Docker images and read secrets.

---

### 2C — Verify

1. Cloud Storage → Buckets → click `brooks-media` → Permissions tab
2. Confirm `brooks-prequel-vm@brooks-485009.iam.gserviceaccount.com` appears with role `Storage Object Admin`

---

## Part 3 — Cloudflare DNS

Your domain `brooksweb.uk` is managed through Cloudflare. Two important points:

---

### 3A — Add the A record

1. Log into [dash.cloudflare.com](https://dash.cloudflare.com) → select `brooksweb.uk`
2. Left menu → **DNS → Records**
3. Click **Add record**
4. Fill in:
   - **Type:** A
   - **Name:** `@` (for the root `brooksweb.uk`)
   - **IPv4 address:** your GCP VM external IP
   - **TTL:** Auto
5. Click **Save**

---

### 3B — Set proxy mode to DNS Only

> **Critical:** Caddy handles TLS (Let's Encrypt) automatically. Cloudflare's proxy must be **off** for this to work.

In the DNS record you just created, the **Proxy status** toggle must show:
- **Grey cloud icon = DNS Only** ← correct
- ~~Orange cloud icon = Proxied~~ ← will break Caddy TLS

**Why:** When Cloudflare proxies traffic, it terminates TLS at Cloudflare's edge. Caddy never sees the raw ACME challenge from Let's Encrypt on port 80, so certificate issuance fails.

If you want Cloudflare proxy benefits (DDoS protection, CDN) in the future, switch to using a Cloudflare Origin Certificate in Caddy instead of Let's Encrypt — that is a separate setup.

---

### 3C — Verify DNS propagation before first deploy

After adding the DNS record, wait 2–5 minutes then verify:

```bash
# On your local machine (Windows: Git Bash / WSL)
nslookup brooksweb.uk
```

The output should show your VM's IP address. The first deploy will fail if DNS has not propagated, because Caddy cannot obtain a TLS certificate without a valid DNS → IP resolution.

---

## Part 4 — Generate secure secrets

Two secrets need fresh random values — do not reuse local dev values.

```bash
# AUTH0_SECRET (32 bytes = 64 hex chars)
openssl rand -hex 32

# AI_KEY_ENCRYPTION_SECRET (32 bytes = 64 hex chars)
openssl rand -hex 32
```

Run each command once and paste the output into the corresponding variable in `infra/.env.production`.

---

## Part 5 — Final .env.production checklist

Before uploading to Secret Manager, confirm every item:

### Values to replace (no real placeholder acceptable)

| Variable | Source |
|----------|--------|
| `LETSENCRYPT_EMAIL` | Your email address |
| `DB_PASSWORD` | Strong random password (e.g. `openssl rand -base64 24`) |
| `AUTH0_CLIENT_ID` | Auth0 dashboard → Brooks Prequel Production → Client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 dashboard → Brooks Prequel Production → Client Secret |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Same as `AUTH0_CLIENT_ID` |
| `AUTH0_SECRET` | `openssl rand -hex 32` |
| `AI_KEY_ENCRYPTION_SECRET` | `openssl rand -hex 32` |
| `UNIPAY_MERCHANT_ID` | Unipay dashboard |
| `UNIPAY_SECRET_KEY` | Unipay dashboard |
| `ADMIN_EMAILS` | Your email address |

### Values pre-filled (verify they are correct)

| Variable | Expected value |
|----------|---------------|
| `DOMAIN` | `brooksweb.uk` |
| `APP_BASE_URL` | `https://brooksweb.uk` |
| `FRONTEND_BASE_URL` | `https://brooksweb.uk` |
| `CORS_ALLOWED_ORIGINS` | `https://brooksweb.uk` |
| `AUTH0_DOMAIN` | `dev-4zduxht0r6gq1f7f.us.auth0.com` |
| `AUTH0_AUDIENCE` | `https://api.brooksweb.uk` |
| `AUTH0_BASE_URL` | `https://brooksweb.uk` |
| `AUTH0_ISSUER_BASE_URL` | `https://dev-4zduxht0r6gq1f7f.us.auth0.com` |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | `dev-4zduxht0r6gq1f7f.us.auth0.com` |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | `https://api.brooksweb.uk` |
| `NEXT_PUBLIC_MAPBOX_PUBLIC_TOKEN` | `pk.eyJ1IjoiYm9yaXNzb2xvbW9uaWEi...` |
| `GCS_BUCKET` | `brooks-media` |
| `GCS_CREDENTIALS_JSON` | *(empty)* |
| `SEED_EXAMPLE_ENABLED` | `false` |

---

## Part 6 — Upload to Secret Manager

Once `infra/.env.production` is complete:

1. GCP Console → **Security → Secret Manager**
2. Click **`brooks-prequel-env`**
3. Click **+ New Version**
4. Click **Upload file** → select `infra/.env.production`
5. Click **Add New Version**

Then trigger the deployment: push to `main` or **GitHub → Actions → Deploy → Run workflow**.

---

## Summary of Auth0 values for .env.production

After completing Part 1, your Auth0 section should look like this:

```
AUTH0_DOMAIN=dev-4zduxht0r6gq1f7f.us.auth0.com
AUTH0_AUDIENCE=https://api.brooksweb.uk
AUTH0_SECRET=<64-hex-chars from openssl>
AUTH0_BASE_URL=https://brooksweb.uk
AUTH0_ISSUER_BASE_URL=https://dev-4zduxht0r6gq1f7f.us.auth0.com
AUTH0_CLIENT_ID=<from Auth0 Brooks Prequel Production app>
AUTH0_CLIENT_SECRET=<from Auth0 Brooks Prequel Production app>

NEXT_PUBLIC_AUTH0_DOMAIN=dev-4zduxht0r6gq1f7f.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<same as AUTH0_CLIENT_ID>
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.brooksweb.uk
```
