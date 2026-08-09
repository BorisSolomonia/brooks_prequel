# Performance Profiling

This runbook defines the profiling workflow for Brooks. Profile first, change one variable at a time, and keep production diagnostics bounded.

## Baseline

Record the same workload before and after each change:

- p50, p95, and p99 latency for the affected endpoint
- request rate and error rate
- JVM CPU, heap, GC pause, live threads, and executor queue/active counts
- PostgreSQL query duration, rows scanned, shared-buffer hits, and temporary I/O
- browser LCP, INP, CLS, transferred bytes, and duplicate requests

Use a production-sized anonymized database where possible. Never profile with customer secrets or copy production data into a developer machine.

## Backend: Java Flight Recorder

JFR is built into Java 21 and has low enough overhead for a short production capture. Start a 5-minute recording inside the backend container:

```powershell
docker exec brooks-backend jcmd 1 JFR.start name=bor82 settings=profile duration=5m filename=/tmp/bor82.jfr
```

Copy it out and inspect it with Java Mission Control:

```powershell
docker cp brooks-backend:/tmp/bor82.jfr .\bor82.jfr
```

Focus on hot methods, allocation pressure, monitor contention, socket waits, JDBC calls, and thread-pool saturation. Do not leave continuous `profile` recordings enabled without a retention policy.

For native CPU or allocation flame graphs, use `async-profiler` only in a staging image built for diagnostics. It is not a runtime application dependency.

## Backend: Metrics

Prometheus metrics are available through Spring Boot Actuator. Correlate:

- `http_server_requests_seconds_*`
- `jvm_memory_used_bytes`
- `jvm_gc_pause_seconds_*`
- `jvm_threads_live_threads`
- Hikari active, pending, idle, and timeout metrics
- Spring task-executor active, queued, completed, and rejected work

The AI and notification executors are bounded. Tune `AI_ASYNC_*`, `AI_MAX_CONCURRENT_STREAMS_PER_USER`, and `NOTIFICATION_ASYNC_*` only after observing sustained saturation. Executor maximums must remain below downstream database and provider capacity.

## PostgreSQL

Enable `pg_stat_statements` in a controlled environment and rank queries by total time, mean time, and calls. For a candidate query, capture:

```sql
EXPLAIN (ANALYZE, BUFFERS, WAL, VERBOSE, FORMAT TEXT)
SELECT ...;
```

Check estimated versus actual rows, sequential scans on growing tables, sort spills, nested-loop amplification, and index selectivity. Run `ANALYZE` after loading representative data. Never run `EXPLAIN ANALYZE` for mutating SQL against production.

The guide discovery query must aggregate reviews, purchases, and saves independently. Reintroducing direct joins among these one-to-many tables creates a multiplicative intermediate result.

## Frontend

Use Chrome DevTools Performance and Network panels on a production build, with mobile CPU/network throttling:

```powershell
cd web
npm run build
npm run start
```

Capture landing, map, guide, trip, and creator-profile flows. Inspect long tasks, layout shifts, image decoding, map initialization, duplicate API requests, and hydration cost. Run Lighthouse against the production build, not `next dev`.

React DevTools Profiler is for component render analysis. Record interaction traces and verify that fixes reduce committed render time rather than merely moving work.

For bundle analysis, add `@next/bundle-analyzer` only in a dedicated diagnostics change. Do not add it to the production dependency graph without an explicit bundle-size investigation.

## Load Tests

Exercise search and AI admission separately. A valid load test has a warm-up period, fixed dataset, explicit arrival rate, bounded duration, and captured server/database metrics. Stop when error rate rises, queues remain saturated, or database pending connections increase continuously.

Required assertions:

- search latency does not grow multiplicatively with reviews, purchases, and saves
- a user cannot hold more than the configured number of AI streams
- executor rejection returns HTTP 429 instead of consuming the common pool
- duplicate simultaneous frontend GETs with the same token and URL share one request
- mutations invalidate in-flight GET coalescing before subsequent reads

## Change Gate

A performance change is accepted only when:

1. The baseline and changed trace use the same workload and data volume.
2. Correctness tests pass.
3. p95 improves or resource usage falls without degrading error rate or p99 materially.
4. No queue, connection pool, or downstream service becomes the new bottleneck.
5. The result and rollback condition are recorded in the relevant issue.