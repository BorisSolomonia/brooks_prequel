# Infrastructure Notes

## Reverse proxy

Caddy 2 (Alpine variant) terminates TLS, serves the headers in `infra/Caddyfile.prod`, and
reverse-proxies to the backend (Spring Boot, port 8080) and the web app (Next.js, port 3000).

### Security headers (in production)

Caddyfile.prod sets:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy` — `'self'`-default plus Mapbox + Auth0 + GCS sources
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
- Strips `Server` header

### TODO — Rate limiting

Caddy's rate-limit functionality lives in the **third-party**
[`caddyserver/rate-limit`](https://github.com/mholt/caddy-ratelimit) module. The standard
`caddy:2-alpine` image does **not** include it. To enable rate limiting we have two options:

1. **Custom Caddy build via xcaddy** — replace the base image with one that includes the module.
   In `infra/Dockerfile.caddy` (to be created):

   ```dockerfile
   FROM caddy:2-builder AS builder
   RUN xcaddy build --with github.com/mholt/caddy-ratelimit
   FROM caddy:2-alpine
   COPY --from=builder /usr/bin/caddy /usr/bin/caddy
   ```

   Then in `Caddyfile.prod` add (inside the `{$DOMAIN}` site block):

   ```
   @authpath path /api/auth/*
   rate_limit @authpath {
     zone auth_burst 60r/m
   }
   @webhook path /api/webhooks/bog-ipay
   rate_limit @webhook {
     zone webhook 30r/m
   }
   ```

2. **App-layer rate limiting** — add a Spring filter using Bucket4j or Resilience4j with a
   Redis-backed bucket store. We already provision Redis in compose (`docker-compose.yml`),
   so the infrastructure is in place.

Picking option 1 keeps rate limiting at the edge (cheap, doesn't burn JVM cycles) and is the
recommended path. Option 2 is a fallback if we end up needing per-user (rather than per-IP)
limits.

Until either is shipped, the BOG iPay webhook is protected by signature verification only,
and the auth callback by Auth0's own rate limiting on `/oauth/token` requests upstream.

## Docker Compose

`infra/docker-compose.yml` runs the production-shaped stack. Every service has:
- a `restart: unless-stopped` policy
- a `healthcheck:` so Compose can wait for `condition: service_healthy` dependencies
- `mem_limit` / `cpus` to bound runaway resource use

`infra/docker-compose.local.yml` is the local-dev variant — relax these caps if you need to
run heavy load tests locally.

## Database

PostgreSQL 16. Migrations live in `backend/app/src/main/resources/db/migration/` and are
managed by Flyway. See `docs/MIGRATIONS.md` for migration history (especially the
historical-destructive V33).

### Postgres tuning

A custom `infra/postgres/postgresql.conf` is mounted into the container with values sized
for our 1 GB Postgres container on a single-VM deploy:

- `shared_buffers = 256MB` — ~25% of container memory, the standard rule.
- `effective_cache_size = 768MB` — what the planner assumes the OS page cache can hold.
- `work_mem = 16MB` — per sort/hash op; with `maximumPoolSize=20` Hikari and ~3 ops per
  query, peak ≈ 1 GB total work_mem usage in worst case (acceptable).
- `random_page_cost = 1.1` — SSD on GCP `pd-balanced`; default `4.0` is for spinning rust.
- `pg_stat_statements` extension is enabled — query top-N by mean exec time with:
  `SELECT query, mean_exec_time, calls FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 20;`

If you bump the Postgres `mem_limit` in compose, scale `shared_buffers`/`effective_cache_size`
proportionally.

## Redis

**Removed from compose** — was provisioned but never used in application logic. Re-add when
we actually adopt it for one of: rate-limit (see "Rate limiting" above), distributed cache
(when going multi-replica — currently we use Caffeine in-process), or session store. The
disk-volume-less compose service definition is small enough that re-adding it later is a
one-paragraph change.
