# Auth0 Explained for Brooks

This file explains how Auth0 works in the Brooks project in plain language, but with enough depth that after reading it you should understand the real flow used by a professional web app.

It is based on the setup in `AUTH0_SETUP.md`:
- Frontend: Next.js with `@auth0/nextjs-auth0`
- Backend: Spring Boot Resource Server
- Auth provider: Auth0

---

## 1. Big Picture.

Auth0 is a **trusted identity service**

Instead of building login, password reset, Google login, sessions, and token security yourself, you let Auth0 do that hard work.

In Brooks, there are 4 main players:

1. **User**
   The person using the app.
2. **Browser + Next.js app**
   The website the user opens.
3. **Auth0**
   The company/service that proves who the user is.
4. **Spring Boot backend**
   The API server that protects data and business logic.

Think of it like an airport:

- The **user** is the traveler.
- **Auth0** is passport control.
- The **Next.js app** is the airline desk.
- The **backend API** is the gate agent checking whether the traveler is allowed through.

Auth0's job is to say:

"Yes, this user is really who they claim to be, and here is a signed token proving it."

The backend's job is to say:

"I trust Auth0, so if this token is real and meant for me, I will allow the request."

---

## 2. What Problem Auth0 Solves

Without Auth0, you would need to build and secure:

- sign up
- login
- password hashing
- password reset
- session management
- Google / social login
- multi-factor authentication
- token creation
- token signature validation
- account lockout / abuse protection

That is a lot of security-critical work. Most teams prefer to outsource identity to a provider that specializes in it.

---

## 3. The Exact Brooks Architecture

The flow in this project is:

```text
User
  ->
Browser
  ->
Next.js app
  ->
Auth0
  ->
Next.js app
  ->
Spring Boot backend
```

Important detail:

This project is **not** using a pure browser-only SPA auth flow.

It uses `@auth0/nextjs-auth0`, which means:

- login starts from Next.js routes like `/api/auth/login`
- Auth0 sends the user back to `/api/auth/callback`
- the Next.js server handles token exchange
- the session is stored using an encrypted cookie

This is why the web app needs things like:

- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`

A browser-only SPA usually would not use them in the same way.

---

## 4. The Three Things People Usually Confuse

There are 3 ideas that beginners mix up:

### 4.1 Identity

Identity answers:

"Who is this user?"

Example:

- user id: `auth0|abc123`
- email: `alex@example.com`
- name: `Alex`

### 4.2 Authentication

Authentication answers:

"Did this user prove who they are?"

Example:

- user entered password
- or used Google login
- Auth0 verified it

### 4.3 Authorization

Authorization answers:

"What is this authenticated user allowed to do?"

Example:

- can read trips
- can create bookings
- can delete listings

Auth0 helps with all three, but in different ways.

---

## 5. What a Token Is

A token is a **signed proof card**.

Imagine a concert wristband:

- the guard does not know you personally
- but they trust the official event organizer
- if the wristband is real and has the right markings, you get in

A JWT access token works similarly.

It contains claims such as:

- who the user is
- who issued the token
- which API it is for
- when it expires
- what permissions it has

Example shape:

```json
{
  "iss": "https://dev-xxxxx.us.auth0.com/",
  "sub": "auth0|123456",
  "aud": "https://api.brooks-prequel.com",
  "permissions": ["read:trips", "create:bookings"],
  "exp": 1760000000
}
```

The backend should **not** trust random tokens.
It trusts only tokens that:

- were issued by the expected Auth0 tenant
- have a valid signature
- are not expired
- are meant for this API

---

## 6. Full Login Flow, Step by Step

This is the most important section.

### Step 1: User clicks Login

The browser goes to:

```text
/api/auth/login
```

That route is handled by `@auth0/nextjs-auth0`.

### Step 2: Next.js redirects the user to Auth0

The user is sent to Auth0's hosted login page.

This is good because:

- passwords are handled by Auth0, not your app
- Google login is handled by Auth0
- login UI and security rules are centralized

### Step 3: User signs in

The user might:

- type email and password
- click Google login
- pass MFA if enabled

Auth0 verifies the user.

### Step 4: Auth0 redirects back to your app

After successful login, Auth0 redirects the browser to:

```text
http://localhost:3000/api/auth/callback
```

or the production callback URL.

### Step 5: Next.js exchanges the authorization code for tokens

This is a server-side step.

Auth0 sends back a temporary code, not the final tokens directly.
Then the Next.js server uses:

- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

to securely ask Auth0 for the real tokens.

This is like:

- Auth0 gives you a claim ticket
- the Next.js server takes the claim ticket to the secure counter
- the secure counter gives back the actual package

### Step 6: Next.js stores a session

The SDK creates a session cookie so the user stays logged in.

That session cookie is protected using:

```text
AUTH0_SECRET
```

### Step 7: User uses the app

Now the website knows the user is logged in.

When the app needs backend data, it sends a bearer token to the backend.

### Step 8: Backend validates the access token

The backend checks:

- who issued the token
- whether the signature is valid
- whether the token is expired
- whether the token audience matches this API
- whether required permissions exist

If all checks pass, the backend allows the request.

If not, the backend returns `401` or `403`.

---

## 7. Real Life Example of the Full Flow

Imagine Maya opens Brooks and wants to save a trip.

1. Maya clicks **Login**
2. Brooks sends Maya to Auth0
3. Maya signs in with Google
4. Auth0 says, "Maya is verified"
5. Auth0 sends Maya back to Brooks
6. Brooks creates a safe session cookie
7. Maya clicks **Save trip**
8. The frontend sends a request to the backend with a bearer token
9. The backend checks:
   - Was this token really signed by Auth0?
   - Is it expired?
   - Is it meant for the Brooks API?
   - Does Maya have permission to do this?
10. If yes, the trip is saved

That is the whole system in one story.

---

## 8. Why There Are Two Sides: Frontend and Backend

The frontend and backend do different jobs.

### Frontend responsibilities

- start login
- receive user session
- know whether the user is logged in
- call the backend with tokens

### Backend responsibilities

- protect data
- verify tokens
- reject fake or wrong tokens
- enforce permissions

The frontend should never be the final security gate.
The backend is the real gatekeeper.

Why?

Because frontend code runs in the user's environment and can be inspected or manipulated.
Backend code runs on your server and decides what is truly allowed.

---

## 9. Every Auth0 Variable, Explained

This section matters a lot. A professional needs to know not just the name, but **why the variable exists**.

---

## 10. `AUTH0_DOMAIN`

Example:

```text
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
```

### What it is

This is your Auth0 tenant's domain.

It tells your app:

"Which Auth0 account should I talk to?"

### Why it is needed

Because your app must know:

- where to send users for login
- where to exchange codes for tokens
- where to fetch public keys for token validation

### Where it is used

- frontend references your Auth0 tenant
- backend uses it to build the JWKS URL

Example backend use:

```text
https://dev-xxxxx.us.auth0.com/.well-known/jwks.json
```

### Teenager explanation

It is Auth0's address.
If you mail the wrong house, you get the wrong result.

---

## 11. `AUTH0_CLIENT_ID`

Example:

```text
AUTH0_CLIENT_ID=abc123
```

### What it is

This identifies your application to Auth0.

It answers:

"Which app is asking?"

### Why it is needed

Auth0 might manage many apps. It needs to know whether the request is coming from:

- Brooks web app
- Brooks admin panel
- Brooks mobile app

Each app can have its own login settings and redirect URLs.

### Is it secret?

No. The client id is an identifier, not a password.

### Teenager explanation

It is like your student number.
It tells the school who you are, but it is not your password.

---

## 12. `AUTH0_CLIENT_SECRET`

Example:

```text
AUTH0_CLIENT_SECRET=super-secret-value
```

### What it is

This is the confidential password for your server-side Auth0 application.

### Why it is needed

In this project, Next.js performs a **server-side code exchange**.
That means the server proves to Auth0:

"I am really the registered Brooks web app."

It does that using:

- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`

### Why it must stay secret

If someone steals this, they may impersonate your app in certain flows.

### Where it belongs

- server environment only
- never commit it to git
- never expose it with `NEXT_PUBLIC_`

### Teenager explanation

`AUTH0_CLIENT_ID` is your username.
`AUTH0_CLIENT_SECRET` is your password.

---

## 13. `AUTH0_SECRET`

Example generation:

```bash
openssl rand -hex 32
```

### What it is

A long random secret used by `@auth0/nextjs-auth0` to protect session data, especially cookies.

### Why it must be generated

Because secrets must be:

- hard to guess
- unique to your app
- not shared publicly

If you typed something weak like:

```text
AUTH0_SECRET=brooks123
```

that would be insecure.

### What it actually does

It helps the SDK encrypt and/or sign the session cookie.

That matters because the cookie may contain important session information.
You do not want users to:

- read it easily
- forge it
- tamper with it

### Real life analogy

Imagine you keep user session details in a locked box.
`AUTH0_SECRET` is the key material used to lock and seal that box.

### What happens if it is missing

The SDK cannot safely create or read the session.
Login usually fails with errors like `"secret" is required`.

### What happens if you change it

Existing sessions often become invalid because the server can no longer read old cookies created with the previous secret.

### Teenager explanation

This is the secret recipe used to lock your login cookie.
Without it, the app cannot safely remember who you are.

---

## 14. `AUTH0_BASE_URL`

Example:

```text
AUTH0_BASE_URL=http://localhost:3000
```

### What it is

This is the base URL of your Next.js app.

### Why it is needed

The SDK needs to know your app's public address so it can correctly build login, callback, and logout URLs.

### Example

If your app lives at:

```text
http://localhost:3000
```

then callback becomes:

```text
http://localhost:3000/api/auth/callback
```

### Teenager explanation

This is your website's home address.
Auth0 needs to know where to send the user back after login.

---

## 15. `AUTH0_ISSUER_BASE_URL`

Example:

```text
AUTH0_ISSUER_BASE_URL=https://dev-xxxxx.us.auth0.com
```

### What it is

The base URL of the Auth0 issuer that creates the tokens.

### Why it is needed

The SDK needs to know which identity provider issued the tokens and where auth endpoints live.

### Relationship to `AUTH0_DOMAIN`

They refer to the same tenant, but in different formats:

- `AUTH0_DOMAIN` is usually just `dev-xxxxx.us.auth0.com`
- `AUTH0_ISSUER_BASE_URL` is `https://dev-xxxxx.us.auth0.com`

### Teenager explanation

If `AUTH0_DOMAIN` is the building name, `AUTH0_ISSUER_BASE_URL` is the full address with the street format included.

---

## 16. `AUTH0_AUDIENCE`

Example:

```text
AUTH0_AUDIENCE=https://api.brooks-prequel.com
```

### What it is

This is the identifier for the API.

It answers:

"Who is this token meant for?"

### Why it is needed

A token should not be accepted by every API in the world.
It should be meant for a specific API.

The backend checks:

"Does the token say it is for me?"

If the answer is no, the backend rejects it.

### Important detail

It often looks like a URL, but it does **not** need to be a real website.
It is mainly a unique identifier string.

### Teenager explanation

It is the name written on the invitation card.
If the invitation says it is for another party, you do not get in.

---

## 17. `NEXT_PUBLIC_AUTH0_DOMAIN`

### What it is

A frontend-exposed version of the Auth0 domain.

### Why it is needed

Anything starting with `NEXT_PUBLIC_` can be used in browser-side code.

Some client-side code may need to know which Auth0 tenant the app belongs to.

### Is it secret?

No.

### Rule

If a value is secret, it must **not** use `NEXT_PUBLIC_`.

---

## 18. `NEXT_PUBLIC_AUTH0_CLIENT_ID`

### What it is

A frontend-visible copy of the client id.

### Why it is needed

Client-side code may need to know which Auth0 application it belongs to.

### Is it secret?

No.

It identifies the app. It does not prove ownership by itself.

---

## 19. `NEXT_PUBLIC_AUTH0_AUDIENCE`

### What it is

A frontend-visible copy of the API audience value.

### Why it is needed

The frontend needs to ask for a token meant for the correct API.

If the frontend asks for the wrong audience:

- Auth0 may issue the wrong token
- or the backend may reject the token

### Teenager explanation

When asking for a pass, the frontend has to say which door the pass is for.

---

## 20. Why Some Variables Are Public and Some Are Secret

Safe to expose:

- `AUTH0_CLIENT_ID`
- domain values
- audience values

Must stay secret:

- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`

Simple rule:

- If it identifies something, it is often okay to expose
- If it proves trust or unlocks security, keep it secret

---

## 21. What RBAC Means

RBAC means **Role-Based Access Control**.

It is the permissions system.

Example:

- role: `traveler`
- permissions:
  - `read:trips`
  - `create:bookings`

- role: `admin`
- permissions:
  - `read:trips`
  - `delete:listings`
  - `manage:users`

### Enable RBAC

This tells Auth0:

"Use roles and permissions for this API."

### Add Permissions in the Access Token

This tells Auth0:

"Put the permissions directly inside the token."

Then the backend can read the token and decide what the user can do.

---

## 22. What the Backend Validates

A professional backend does not just read a token and trust it.

It validates several things.

### 22.1 Signature

It checks whether Auth0 really signed the token.

This prevents forged tokens.

### 22.2 Issuer

It checks that the token came from the correct Auth0 tenant.

Usually this is the `iss` claim.

### 22.3 Audience

It checks that the token was meant for this API.

Usually this is the `aud` claim.

### 22.4 Expiration

It checks whether the token is too old.

Usually this is the `exp` claim.

### 22.5 Permissions or scopes

It checks whether the user is allowed to do this exact action.

---

## 23. What JWKS Is

JWKS stands for:

**JSON Web Key Set**

It is a public list of keys published by Auth0.

The backend downloads these public keys from:

```text
https://YOUR_AUTH0_DOMAIN/.well-known/jwks.json
```

Why?

Because Auth0 signs tokens with a private key.
The backend uses the corresponding public key to verify that signature.

Analogy:

- Auth0 seals the envelope with a special stamp
- the backend has the official stamp-check guide
- the backend verifies the seal is genuine

Important:

- Auth0 keeps the private key secret
- the backend only needs the public key

---

## 24. Why the Signing Algorithm Is `RS256`

`RS256` is an asymmetric signing algorithm.

That means:

- Auth0 signs with a private key
- your backend verifies with a public key

This is safer for distributed systems than sharing one common secret everywhere.

Why teams like it:

- backend does not need the signing private key
- public verification is easier and safer
- works well across services

---

## 25. What Callback URL Means

Example:

```text
http://localhost:3000/api/auth/callback
```

This is where Auth0 sends the user after login.

Why it must be registered in Auth0:

To prevent attackers from tricking Auth0 into redirecting users to a malicious site.

Teenager explanation:

It is the approved home address where the user is allowed to be dropped off after passing identity checks.

---

## 26. What Logout URL Means

This is where the user gets sent after logout finishes.

It must also be registered for the same reason:

to prevent unsafe redirects.

---

## 27. What Web Origins Mean

Web origins identify which browser origins are allowed to interact properly with Auth0-related flows.

Example:

```text
http://localhost:3000
```

An origin is:

- scheme
- host
- port

So these are different origins:

- `http://localhost:3000`
- `https://localhost:3000`
- `http://localhost:8080`

---

## 28. Why Refresh Tokens Matter

An access token should expire.
That is good security.

But users do not want to log in every 10 minutes.

A refresh token allows the app to get new access tokens without making the user log in again every time.

Simple analogy:

- access token = today's wristband
- refresh token = permission to get tomorrow's wristband without re-registering from scratch

Refresh tokens are sensitive and must be handled carefully.

---

## 29. Access Token vs Session Cookie

These are not the same thing.

### Session cookie

- helps the Next.js app remember the logged-in user
- usually stored as a secure cookie
- protected with `AUTH0_SECRET`

### Access token

- used when calling the backend API
- sent in `Authorization: Bearer ...`
- validated by Spring Boot

One helps the frontend session.
The other helps the backend trust API requests.

---

## 30. A Real Brooks Example

Imagine Brooks has these actions:

- view public trips
- save a trip
- publish a guide
- delete a listing

Possible rules:

- anyone can view public trips
- logged-in travelers can save trips
- guides can publish a guide
- only admins can delete a listing

Example permission mapping:

- `read:public-trips`
- `save:trips`
- `publish:guides`
- `delete:listings`

When Priya logs in:

- Auth0 authenticates Priya
- the frontend gets session state
- the backend receives a token
- the backend checks Priya's permissions

If Priya is a traveler but not an admin:

- save trip = allowed
- delete listing = denied

This is how identity and permissions come together.

---

## 31. Common Failure Cases and What They Really Mean

### "secret is required"

Meaning:

The Next.js Auth0 SDK cannot protect the session cookie because `AUTH0_SECRET` is missing.

### "Invalid audience"

Meaning:

The token says it is for one API, but your backend expected a different API identifier.

### "The redirect_uri is not allowed"

Meaning:

The callback URL sent during login is not in Auth0's allowed list.

### Token validation fails

Meaning:

The backend could not verify the token because:

- domain is wrong
- issuer is wrong
- JWKS could not be reached
- signature is invalid
- token is expired

### User is logged in on frontend but backend returns 401

Meaning:

The frontend session exists, but the API token being sent is missing, wrong, expired, or meant for the wrong audience.

This is a very common beginner confusion.

---

## 32. Mental Model: One Request from Start to Finish

Here is the clean professional mental model:

1. The user wants access.
2. The app sends the user to Auth0.
3. Auth0 verifies identity.
4. Auth0 issues trusted tokens.
5. Next.js stores session information safely.
6. The frontend calls the backend with an access token.
7. The backend validates the token cryptographically.
8. The backend checks audience and permissions.
9. The backend allows or denies the action.

If you can explain those 9 steps clearly, you understand the system.

---

## 33. The Minimum You Must Never Forget

If you remember only a few things, remember these:

1. Auth0 proves identity; your backend still decides authorization.
2. `AUTH0_CLIENT_SECRET` and `AUTH0_SECRET` are sensitive and must never be public.
3. `AUTH0_AUDIENCE` must match between Auth0, frontend, and backend.
4. The backend must validate signature, issuer, audience, and expiration.
5. The frontend being "logged in" does not automatically mean the backend will accept the request.

---

## 34. Professional Summary

Brooks uses Auth0 as the identity provider, Next.js as the application layer that manages the browser session, and Spring Boot as the protected API.

The login flow works by redirecting the user to Auth0, receiving a callback in Next.js, exchanging an authorization code for tokens server-side, storing session state in a protected cookie, and then using access tokens for backend API calls.

The backend does not trust the frontend directly. It trusts only valid Auth0-issued tokens that:

- have a valid signature
- come from the expected issuer
- target the expected audience
- are not expired
- contain the required permissions

That is the professional-grade auth model behind this project.

---

## 35. Brooks Variable Cheat Sheet

```bash
# Auth0 tenant address used by backend and app integration
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com

# Public application identifier
AUTH0_CLIENT_ID=your_app_client_id

# Secret proof that your server-side app is the real registered app
AUTH0_CLIENT_SECRET=your_app_client_secret

# Secret used by Next.js Auth0 SDK to protect session cookies
AUTH0_SECRET=generated_random_value

# Base URL of your Next.js app
AUTH0_BASE_URL=http://localhost:3000

# Full issuer URL of your Auth0 tenant
AUTH0_ISSUER_BASE_URL=https://dev-xxxxx.us.auth0.com

# API identifier; tells Auth0 and backend which API the token is for
AUTH0_AUDIENCE=https://api.brooks-prequel.com

# Frontend-visible references
NEXT_PUBLIC_AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
NEXT_PUBLIC_AUTH0_CLIENT_ID=your_app_client_id
NEXT_PUBLIC_AUTH0_AUDIENCE=https://api.brooks-prequel.com
```

---

## 36. Final Test for Yourself

If you can answer these without guessing, you understand the flow:

1. Why does Next.js need `AUTH0_CLIENT_SECRET` in this project?
2. Why must `AUTH0_SECRET` be random and private?
3. Why does the backend care about `AUTH0_AUDIENCE`?
4. Why can the frontend be logged in while the backend still returns `401`?
5. Why is `RS256` used with JWKS?
6. Why do callback URLs have to be registered in Auth0?

If you can explain those clearly, you are no longer just following setup steps. You understand the architecture.
