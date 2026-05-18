# Google Cloud Storage Setup for Brooks Media

The Brooks backend needs a GCS bucket to store user-uploaded media:
profile pictures, memory photos, memory voice notes. Without GCS
credentials, the backend falls back to local-disk storage at
`/var/lib/brooks/media/` — which fails on most deployment environments
because the path doesn't exist or the JVM process can't write there.

~15 minutes total, done once per environment (dev/staging/prod).

---

## Step 1 — Create the GCS bucket

1. Open <https://console.cloud.google.com/storage/browser>
2. Click **Create**
3. Bucket name: `brooks-media` (or any name — note it for step 4)
4. Location type: **Region**, pick the region closest to your users
5. Storage class: **Standard**
6. Access control: **Uniform**
7. Public access prevention: **Enforce public access prevention** (Brooks
   serves media via signed URLs through the backend, not direct public
   GCS URLs)
8. Click **Create**

## Step 2 — Create a service account with bucket access

1. Open <https://console.cloud.google.com/iam-admin/serviceaccounts>
2. Click **Create service account**
3. Name: `brooks-media-rw`
4. Description: `Read/write access to brooks-media bucket`
5. Click **Create and continue**
6. Grant role: **Storage Object Admin** (allows create/read/delete on
   objects within the bucket — does NOT grant bucket admin)
7. Click **Continue** → **Done**

## Step 3 — Generate a key for the service account

1. From the service accounts list, click the email of `brooks-media-rw`
2. **Keys** tab → **Add key** → **Create new key**
3. Type: **JSON**
4. Click **Create** — the JSON file downloads

## Step 4 — Configure the backend

The backend reads three environment variables (or application.yml
properties) to connect to GCS:

| Var name             | Value                                          |
|----------------------|------------------------------------------------|
| `GCS_BUCKET_NAME`    | `brooks-media` (or whatever you named it)      |
| `GCS_CREDENTIALS_JSON` | Full JSON contents from step 3 (one line)    |
| `APP_BASE_URL`       | e.g. `https://brooksweb.uk` (for signed URLs)  |

**Option A — env vars (recommended for prod):**

On your deploy server (Cloud Run / Kubernetes / VM):

```
GCS_BUCKET_NAME=brooks-media
GCS_CREDENTIALS_JSON='<paste-entire-JSON-on-one-line>'
APP_BASE_URL=https://brooksweb.uk
```

For the JSON, escape any internal newlines OR base64-encode and decode
on startup — depends on your env-var injection mechanism. On Cloud Run
the simplest path is to mount the JSON as a secret file and set
`brooks.media.credentials-path=/run/secrets/gcs.json` instead.

**Option B — local dev only:**

In `backend/app/src/main/resources/application-local.yml`, add:

```yaml
brooks:
  media:
    bucket: brooks-media
    credentials-json: |
      {
        "type": "service_account",
        "project_id": "...",
        "private_key_id": "...",
        "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
        "client_email": "brooks-media-rw@...",
        ...
      }
```

Then run with `--spring.profiles.active=local`. **NEVER commit this file
with real credentials in it.** Brooks's `.gitignore` already excludes
`application-local.yml`.

## Step 5 — Verify

Start (or redeploy) the backend. The first time someone uploads a
profile picture or memory photo, you should NO longer see the
`Could not save media locally` error. Instead the response includes a
URL like `https://storage.googleapis.com/brooks-media/profiles/...`.

If you still get the local-save error, the backend's `credentialsJson`
property is still blank — re-check env var injection.

---

## Cost note

Brooks's expected media volume (a few MB per user) is well within GCS's
free tier (~5 GB / month). Past that, Standard storage costs $0.020
per GB per month. Bandwidth is the main cost: $0.12/GB egress to
internet — budget a few dollars per active user per month at scale.
