# Auth0 Configuration Guide for Brooks

This guide covers how to set up Auth0 for the Brooks travel-guide marketplace. Brooks uses:
- **Frontend:** `@auth0/nextjs-auth0` v3 (server-side SDK for Next.js App Router)
- **Backend:** Spring Boot OAuth2 Resource Server (JWT validation via Auth0 JWKS).

---

## Architecture Overview

```
User Browser
    |
    v
Next.js App (port 3000)
    |-- @auth0/nextjs-auth0 handles login/logout/callback server-side
    |-- Sessions encrypted with AUTH0_SECRET
    |-- API route: /api/auth/[auth0]/route.ts
    |
    v
Spring Boot Backend (port 8080)
    |-- Receives JWT in Authorization: Bearer header
    |-- Validates signature via Auth0 JWKS endpoint
    |-- Validates audience claim
    |-- Extracts user subject (sub) from token
```

**Key difference from SPA approach:** The `@auth0/nextjs-auth0` SDK handles the OAuth flow server-side (via API routes), not client-side. This means:
- You need an `AUTH0_SECRET` to encrypt the session cookie
- You need `AUTH0_CLIENT_SECRET` (unlike a pure SPA)
- Login/logout/callback are handled by `/api/auth/[auth0]` API routes

---

## Step 1: Create an Auth0 Account

1. Go to https://auth0.com and sign up (free tier is sufficient)
2. Choose your region (closest to your users)
3. Complete the onboarding

---

## Step 2: Create an Auth0 Application (for Next.js)

### 2.1 Create the Application

1. Log in to the [Auth0 Dashboard](https://manage.auth0.com/)
2. Go to **Applications** > **Applications** in the left sidebar
3. Click **Create Application**
4. Configure:
   - **Name:** `Brooks_prequel`
   - **Application Type:** **Regular Web Applications** (NOT Single Page App)
5. Click **Create**

> **Important:** Because `@auth0/nextjs-auth0` handles auth server-side, the application type must be **Regular Web Applications**, not "Single Page Web Applications."

### 2.2 Configure Application Settings

Go to the **Settings** tab and configure:

#### Basic Information

Note these values (you'll need them later):
- **Domain:** e.g., `dev-xxxxx.us.auth0.com`
- **Client ID:** e.g., `abc123...`
- **Client Secret:** e.g., `xyz789...`

#### Application URIs

**Allowed Callback URLs:**
```
http://localhost:3000/api/auth/callback,
https://your-production-domain.com/api/auth/callback
```

**Allowed Logout URLs:**
```
http://localhost:3000,
https://your-production-domain.com
```

**Allowed Web Origins:**
```
http://localhost:3000,
https://your-production-domain.com
```

#### Advanced Settings > Grant Types

Ensure these are checked:
- Authorization Code
- Refresh Token

Click **Save Changes**.

---

## Step 3: Create an Auth0 API (for Spring Boot Backend)

### 3.1 Create the API

1. Go to **Applications** > **APIs**
2. Click **Create API**
3. Configure:
   - **Name:** `Brooks_prequel_API`
   - **Identifier (Audience):** `https://api.brooks-prequel.com` (or your preferred audience URI)
   - **Signing Algorithm:** **RS256** (MUST be RS256 — see "JWE Token Trap" below)
4. Click **Create**

### 3.2 Authorize the Application to Access the API

> **CRITICAL — Do this immediately after creating the API.** Skipping this step causes the "not authorized to access resource server" error described in the Known Issues section below.

1. After creating the API, go to the **Application Access** tab (may also be labeled "Machine to Machine Applications" in older dashboard versions)
2. Find your application (`Brooks_prequel` / your Client ID)
3. Set it to **Authorized**
4. Click **Save** if prompted

**Verify from the Application side too:**
1. Go to **Applications** > **Applications** > click your app
2. Look for an **APIs** tab
3. Confirm the Brooks API shows as **Authorized**

### 3.3 Configure API Settings

Go to the **Settings** tab:

- **Token Expiration (Seconds):** `360000`
- **Allow Offline Access:** Enabled (for refresh tokens)
- **Signing Algorithm:** Must be **RS256** — do NOT change this after creation

Under **RBAC Settings:**
- **Enable RBAC:** On
- **Add Permissions in the Access Token:** On

Click **Save**.

### 3.4 Note the API Identifier

The **Identifier** you set (e.g., `https://api.brooks-prequel.com`) is your **audience** value. This must match **exactly** (no trailing slash, case-sensitive) in both the frontend and backend configuration.

---

## Step 4: Enable Social Login (Optional)

To allow Google login:

1. Go to **Authentication** > **Social**
2. Click **Google / Gmail**
3. Toggle it on
4. For development, Auth0's dev keys work out of the box
5. For production, configure with your own Google OAuth credentials:
   - Create credentials at https://console.cloud.google.com/apis/credentials
   - Set authorized redirect URI to: `https://your-tenant.auth0.com/login/callback`

---

## Step 5: Configure Environment Variables

### 5.1 Generate AUTH0_SECRET

This is a random string used to encrypt the session cookie. Generate one:

```bash
openssl rand -hex 32
```

### 5.2 Local Development (.env file in `infra/`)

Create `infra/.env` with your Auth0 values:

```bash
# Auth0 Configuration
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
AUTH0_CLIENT_ID=your_client_id_from_step_2
AUTH0_CLIENT_SECRET=your_client_secret_from_step_2
AUTH0_AUDIENCE=https://api.brooks-prequel.com
AUTH0_SECRET=your_generated_hex_string_from_step_5_1
```

These are referenced by `docker-compose.local.yml` which passes them to the containers.

### 5.3 How Variables Map to Each Service

#### Next.js Web App

| Environment Variable | Value | Purpose |
|---------------------|-------|---------|
| `AUTH0_SECRET` | Generated hex string (min 32 chars) | Encrypts session cookies |
| `AUTH0_BASE_URL` | `http://localhost:3000` | App's base URL (set in docker-compose) |
| `AUTH0_ISSUER_BASE_URL` | `https://dev-xxxxx.us.auth0.com` | Auth0 tenant URL (set in docker-compose) |
| `AUTH0_CLIENT_ID` | From Auth0 dashboard | Identifies the application |
| `AUTH0_CLIENT_SECRET` | From Auth0 dashboard | Server-side secret for token exchange |
| `AUTH0_AUDIENCE` | `https://api.brooks-prequel.com` | **REQUIRED** — tells SDK to request API-scoped JWT |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | `dev-xxxxx.us.auth0.com` | Client-side domain reference |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Same as AUTH0_CLIENT_ID | Client-side ID reference |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | `https://api.brooks-prequel.com` | API audience for token requests |

The `@auth0/nextjs-auth0` SDK automatically reads `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_ISSUER_BASE_URL`, `AUTH0_CLIENT_ID`, and `AUTH0_CLIENT_SECRET` from environment variables. No code configuration needed.

#### Spring Boot Backend

| Environment Variable | Value | Purpose |
|---------------------|-------|---------|
| `AUTH0_DOMAIN` | `dev-xxxxx.us.auth0.com` | Used to construct JWKS URI for JWT validation |
| `AUTH0_AUDIENCE` | `https://api.brooks-prequel.com` | Validated against `aud` claim in JWT |

The backend reads these in `application.yml`:
```yaml
auth0:
  domain: ${AUTH0_DOMAIN:brooks.auth0.com}
  audience: ${AUTH0_AUDIENCE:https://api.brooks-prequel.com}
```

And uses them in `SecurityConfig.java` to:
1. Build the JWKS URI: `https://{AUTH0_DOMAIN}/.well-known/jwks.json`
2. Validate the audience claim in incoming JWTs

---

## Step 6: Docker Compose Configuration

The `infra/docker-compose.local.yml` web service needs these environment variables:

```yaml
web:
  environment:
    # Required by @auth0/nextjs-auth0 SDK (read automatically)
    - AUTH0_SECRET=${AUTH0_SECRET:-replace-with-a-long-random-string}
    - AUTH0_BASE_URL=http://localhost:3000
    - AUTH0_ISSUER_BASE_URL=https://${AUTH0_DOMAIN:-brooks.auth0.com}
    - AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID:-}
    - AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET:-}
    - AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-https://api.brooks-prequel.com}  # REQUIRED — see "JWE Token Trap"
    # Used by client-side code
    - NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
    - NEXT_PUBLIC_AUTH0_DOMAIN=${AUTH0_DOMAIN:-brooks.auth0.com}
    - NEXT_PUBLIC_AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID:-}
    - NEXT_PUBLIC_AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-https://api.brooks-prequel.com}
```

> **WARNING:** `AUTH0_AUDIENCE` (without `NEXT_PUBLIC_` prefix) is the one the SDK reads server-side. If this is missing, `handleLogin()` won't include the audience in the authorization request, and Auth0 will issue an encrypted JWE token instead of a signed JWT. See the "JWE Token Trap" section in Known Issues.

The backend service needs:
```yaml
backend:
  environment:
    - AUTH0_DOMAIN=${AUTH0_DOMAIN:-brooks.auth0.com}
    - AUTH0_AUDIENCE=${AUTH0_AUDIENCE:-https://api.brooks-prequel.com}
```

---

## Step 7: How Authentication Works

### Login Flow

1. User clicks "Login" on the frontend
2. Browser navigates to `/api/auth/login`
3. `@auth0/nextjs-auth0` redirects to Auth0's Universal Login page
4. User enters credentials (or uses Google login)
5. Auth0 redirects back to `/api/auth/callback`
6. SDK exchanges the authorization code for tokens (server-side)
7. SDK stores the session in an encrypted cookie (`AUTH0_SECRET`)
8. User is redirected to the app, now authenticated

### API Call Flow

1. Frontend makes request to backend API (`/api/...`)
2. Request includes JWT as `Authorization: Bearer <token>` header
3. Spring Boot's `SecurityConfig` intercepts the request
4. `JwtDecoder` fetches Auth0's public keys from JWKS endpoint
5. JWT signature is validated against Auth0's public keys
6. Audience claim is verified to match `AUTH0_AUDIENCE`
7. If valid, request proceeds; if not, 401 is returned

### Logout Flow

1. User clicks "Logout"
2. Browser navigates to `/api/auth/logout`
3. SDK clears the session cookie
4. User is redirected to Auth0's logout endpoint
5. Auth0 redirects back to the app (per Allowed Logout URLs)

---

## Step 8: Testing

### 8.1 Start the Local Stack

```bash
cd infra
docker compose -f docker-compose.local.yml up
```

### 8.2 Verify Backend Health

```bash
curl http://localhost:8080/actuator/health
# Expected: {"status":"UP"}
```

### 8.3 Test Login

1. Open http://localhost:3000 in your browser
2. Navigate to login
3. You should be redirected to Auth0's Universal Login page
4. Sign in with email/password or Google
5. You should be redirected back to the app, authenticated

### 8.4 Verify JWT

After login, check browser dev tools:
1. Open Network tab
2. Find an API request to the backend
3. Check the `Authorization` header for a Bearer token
4. Paste the token into https://jwt.io to inspect claims
5. Verify: `iss` matches your Auth0 domain, `aud` includes your audience

---

## Troubleshooting

### "secret" is required

**Cause:** `AUTH0_SECRET` environment variable is missing or empty.
**Fix:** Set `AUTH0_SECRET` to a random string of at least 32 characters.

### Login handler failed / callback error

**Cause:** `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, or `AUTH0_ISSUER_BASE_URL` is missing.
**Fix:** Ensure all five required env vars are set for the web service.

### "The redirect_uri is not allowed"

**Cause:** The callback URL isn't registered in Auth0.
**Fix:** Add `http://localhost:3000/api/auth/callback` to **Allowed Callback URLs** in Auth0 Application settings.

### CORS errors on API calls

**Cause:** Backend CORS config doesn't include the frontend origin.
**Fix:** Ensure `CORS_ALLOWED_ORIGINS=http://localhost:3000` is set for the backend.

### "Invalid audience" / 401 on API calls

**Cause:** The `aud` claim in the JWT doesn't match what the backend expects.
**Fix:** Ensure `AUTH0_AUDIENCE` is identical in both frontend and backend config. No trailing slashes.

### 401 Unauthorized with "Encrypted JWT rejected: No JWE key selector"

**Cause:** Auth0 issued an encrypted JWE token instead of a signed JWT because the audience was missing from the login request.
**Fix:** See the **"JWE Token Trap"** section under Known Issues above.

### "Client not authorized to access resource server" on login

**Cause:** The Auth0 Application is not authorized to request tokens for the API.
**Fix:** See the **"Client Not Authorized to Access Resource Server"** section under Known Issues above.

### Token validation fails on backend

**Cause:** Backend can't reach Auth0 JWKS endpoint, or domain is wrong.
**Fix:** Verify `AUTH0_DOMAIN` is correct (e.g., `dev-xxxxx.us.auth0.com`, no `https://` prefix).

---

## Known Issues

### The JWE Token Trap (Encrypted Token Instead of Signed JWT)

**Severity:** Critical — breaks ALL authenticated backend API calls with 401 Unauthorized.

**Symptoms:**
- Backend returns `401 Unauthorized` on every protected endpoint
- `WWW-Authenticate` header contains: `Encrypted JWT rejected: No JWE key selector is configured`
- Decoding the token header at https://jwt.io shows `"alg":"dir","enc":"A256GCM"` instead of `"alg":"RS256"`
- Frontend pages load fine (200 OK on localhost:3000), but API data is missing
- The maps page, feed, profile, and any page calling the backend API shows no data

**Root Cause:**
When Auth0 does **not** receive an `audience` parameter during the authorization request, it issues an **opaque/encrypted JWE token** for its own userinfo endpoint — NOT a signed RS256 JWT for your custom API. The Spring Boot backend is configured as a JWT resource server with JWKS-based signature validation and has no JWE decryption capability, so it rejects the token immediately.

**How This Happens (Three Failure Points):**

1. **Missing `AUTH0_AUDIENCE` env var in Docker Compose web container.**
   The `@auth0/nextjs-auth0` SDK reads `AUTH0_AUDIENCE` (server-side, no `NEXT_PUBLIC_` prefix) to automatically include the audience in login requests. Having only `NEXT_PUBLIC_AUTH0_AUDIENCE` is NOT sufficient — that's for client-side code only. If the web container in `docker-compose.local.yml` doesn't pass `AUTH0_AUDIENCE`, the SDK doesn't know which API to request a token for.

2. **Missing `authorizationParams.audience` in `handleLogin()`.**
   Even with the env var, explicitly passing the audience in the login handler (`web/src/app/api/auth/[auth0]/route.ts`) is a required safety net:
   ```typescript
   login: handleLogin({
     returnTo: '/maps',
     authorizationParams: {
       audience: process.env.AUTH0_AUDIENCE,
     },
   }),
   ```
   Without this, the SDK may not include the audience in the Auth0 redirect URL.

3. **Auth0 API not authorized for the Application.**
   Even if the audience is sent correctly, Auth0 will reject the request with `"Client X is not authorized to access resource server Y"` if the Application hasn't been granted access to the API. This must be configured in the Auth0 dashboard (see Step 3.2).

**How to Prevent:**

- ALWAYS include `AUTH0_AUDIENCE` (non-prefixed) in the web container's Docker Compose environment
- ALWAYS pass `authorizationParams.audience` explicitly in `handleLogin()`
- ALWAYS authorize the Application to access the API in the Auth0 dashboard immediately after creating the API
- After ANY Auth0 configuration change, log out and log back in — old session tokens are cached and won't reflect config changes
- Verify tokens after login: decode the token at https://jwt.io and confirm the header shows `"alg":"RS256"` (not `"alg":"dir","enc":"A256GCM"`)

**How to Fix If It Happens:**

1. Verify `AUTH0_AUDIENCE` is set in the web container environment (check `docker-compose.local.yml`)
2. Verify `authorizationParams.audience` is passed in `handleLogin()` in `route.ts`
3. Verify the API exists in Auth0 dashboard (Applications > APIs) with identifier matching `AUTH0_AUDIENCE` exactly
4. Verify the Application is authorized to access the API (API > Application Access tab)
5. Verify the API signing algorithm is RS256 (API > Settings tab)
6. Rebuild containers: `docker compose -f docker-compose.local.yml up --build`
7. Log out completely, clear cookies, then log back in
8. Test with curl: `curl -H "Authorization: Bearer <token>" http://localhost:8080/api/maps/influencers`

---

### "Client Not Authorized to Access Resource Server"

**Severity:** Critical — login itself fails, user cannot authenticate at all.

**Symptoms:**
- Clicking "Sign In" shows "This page isn't working" or a blank error page
- Browser URL contains: `error=invalid_request&error_description=Client%20...%20is%20not%20authorized%20to%20access%20resource%20server`
- The error comes back from Auth0's callback, not from your own app

**Root Cause:**
The Auth0 Application (Regular Web Application) has not been explicitly authorized to request tokens for the API (resource server). This is a dashboard-only configuration step that is easy to miss.

**How to Fix:**

1. Go to Auth0 Dashboard > **Applications** > **APIs** > click your API
2. Go to the **Application Access** tab
3. Find your application and set it to **Authorized**
4. If that doesn't work, **delete the API and recreate it** (Applications > APIs > Settings > Delete, then recreate with the same identifier `https://api.brooks-prequel.com` and RS256 signing)
5. After recreation, verify the Application Access tab shows your app as Authorized
6. Log out, clear cookies, log back in

**How to Prevent:**
- Always complete Step 3.2 (Authorize the Application) immediately after creating the API
- After creating or recreating an API, always verify authorization from BOTH sides:
  - API side: API > Application Access > app is Authorized
  - App side: Applications > your app > APIs tab > API is Authorized

---

## Production Deployment

For production, update these values:

| Variable | Local | Production |
|----------|-------|------------|
| `AUTH0_BASE_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `AUTH0_SECRET` | Dev secret | New, unique secret |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | `https://your-domain.com` |
| `APP_BASE_URL` | `http://localhost:8080` | `https://your-domain.com` |

Update Auth0 dashboard:
- Add production callback URL: `https://your-domain.com/api/auth/callback`
- Add production logout URL: `https://your-domain.com`
- Add production web origin: `https://your-domain.com`

Store all secrets in GCP Secret Manager or secure env files on the VM — never commit them to source.

---

## Auth0 Free Tier Limits

- 7,500 monthly active users
- Unlimited logins
- Social connections (Google, GitHub, etc.)
- Email/password authentication
- JWT tokens
- Custom domains (paid plans only)

Sufficient for initial launch and early growth.

---

## Quick Reference: All Auth0 Environment Variables

```bash
# === Web (Next.js) - Required by @auth0/nextjs-auth0 SDK ===
AUTH0_SECRET=<openssl rand -hex 32>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://dev-xxxxx.us.auth0.com
AUTH0_CLIENT_ID=<from Auth0 dashboard>
AUTH0_CLIENT_SECRET=<from Auth0 dashboard>
AUTH0_AUDIENCE=https://api.brooks-prequel.com          # REQUIRED — without this, Auth0 issues JWE instead of JWT

# === Web (Next.js) - Client-side / NEXT_PUBLIC_ ===
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
NEXT_PUBLIC_AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=<same as AUTH0_CLIENT_ID>
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.brooks-prequel.com

# === Backend (Spring Boot) ===
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
AUTH0_AUDIENCE=https://api.brooks-prequel.com
```
