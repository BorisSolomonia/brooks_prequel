# Brooks — Due Diligence Q&A (200 Questions)

> Investor- and auditor-grade stress test of the Brooks business model and technical
> architecture. Tailored to Brooks specifically: a creator-driven travel-guide
> marketplace combining social discovery, version-locked itinerary commerce, and
> map/calendar execution, with location-based ("geofenced") memories, a Java/Spring
> modular monolith, a Next.js web app wrapped as an Android Capacitor WebView,
> PostgreSQL + Flyway, Auth0, Bank of Georgia iPay (GEL only), Mapbox (Leaflet raster
> tiles), Google Maps Places, and GCS media.
>
> **Purpose:** these are the *questions* a tough YC partner, Tier-1 VC, or technical
> auditor would ask. Answers are intentionally omitted — this document exists to force
> the team to have crisp, evidence-backed answers ready. Treat every unanswered
> question as a risk.
>
> - **Part 1 — Business Model:** exactly 100 questions (numbered 1–100).
> - **Part 2 — Technical & Architecture:** exactly 100 questions (numbered 1–100).
>
> _Last generated: 2026-06-14._

---

## Part 1 — The Business Model (100 Questions)

### 1. Market Size & Problem (Q1–Q17)

1. What is the genuine bottom-up TAM/SAM/SOM for a *paid* creator-driven travel-guide marketplace, and how much of it is reachable while Bank of Georgia iPay (GEL only) is the sole payment rail?
2. Is Brooks a painkiller or a vitamin? Travelers already assemble itineraries for free from blogs, Google Maps lists, Reddit, and TikTok — what acute, recurring pain justifies a paid purchase?
3. What hard evidence (not surveys) shows travelers will pay for a *static, version-locked* itinerary rather than consume equivalent free UGC?
4. Trips are infrequent (1–3 times/year for most people). How do you build a venture-scale business on such a low natural purchase frequency per user?
5. Is the geofenced "memory" feature a real market or a novelty? What proof exists that location-locked memories drive retention or revenue rather than a one-time gimmick?
6. How large is the overlap between people who want to *buy* guides and people who want to *create and sell* them — and does serving both audiences dilute focus and messaging?
7. What is the wedge — the single narrow use case and user segment you dominate first — and why that one?
8. Why now? What platform, behavioral, or regulatory shift makes this the right moment versus five years ago when Google Trips, Sygic Travel, and others tried and failed?
9. Several itinerary-commerce and creator-travel startups have died (e.g., Google Trips shutdown, Thatch, various "buy a creator's itinerary" plays). What specifically is different here, and what did they get wrong that you've solved?
10. Is the initial market Georgia/Caucasus (implied by GEL-only iPay and Georgian localization), and if so, is that market large enough to reach default-alive, or is it merely a test bed?
11. What is the realistic ceiling on average guide price (in GEL/USD), and does that price ceiling cap the entire model's revenue potential?
12. How seasonal is demand, and how do you survive cash-flow troughs in off-peak travel months?
13. What percentage of the "travel content" market is actually transactional versus advertising/affiliate-funded, and are you fighting against the dominant free-with-ads model?
14. Who is the ideal customer profile (ICP) for the *buyer*, and how many of them exist who will pay more than once?
15. What is the ideal creator profile, how many can realistically earn meaningful income, and what happens to the marketplace if the top 1% of creators leave?
16. How do you defend the assumption that travelers trust an individual creator's paid guide over free, crowd-validated sources like Google reviews?
17. If the memory feature and the guide marketplace are conceptually separate products bolted together, which one is the real business, and is the other a distraction?

### 2. Defensibility & The Moat (Q18–Q34)

18. What stops Google Maps or Instagram from cloning the location-locked "Time Capsule" memory feature in a single sprint, given they already own the map, the social graph, and the location permissions?
19. Your own rules forbid forking/cloning of guides. What is the actual technical or legal moat preventing a competitor from letting users copy your creators' itineraries wholesale?
20. Itinerary content is trivially scrapeable once purchased (it's just text, places, and times). How do you prevent a buyer from reselling or publishing a guide's contents for free?
21. The "preview shows only title + day count + place count" rule protects pre-purchase IP — but post-purchase there's no DRM. How material is leakage to unit economics?
22. What is your data moat? What proprietary dataset compounds over time that a new entrant cannot buy or rebuild?
23. Network effects: are they real and two-sided, or is this a thin marketplace where buyers and creators don't actually make each other more valuable?
24. If a top creator builds an audience on Brooks and then links their followers to a direct Stripe/Gumroad checkout, what stops disintermediation (the classic marketplace leakage problem)?
25. Why would a creator with an existing Instagram/YouTube following choose Brooks over selling a PDF or Notion doc directly to their followers at 0% take rate?
26. What is your defensibility against horizontal platforms (Substack, Patreon, Gumroad) adding "sell your travel guide" as a template?
27. Switching costs for buyers are near zero (a guide is a one-time consumable). What creates lock-in or repeat behavior?
28. The brand. Is "Brooks" a recognizable, defensible brand, or interchangeable with a dozen other travel apps?
29. How defensible is the curation/ranking algorithm (regional rankings weighting purchases 2× followers) once competitors observe and copy the formula?
30. Does the geofenced memory create a true reason to return to a physical place, and is that behavior frequent enough to anchor a habit loop?
31. What prevents a well-funded incumbent from simply acquiring your top creators with guaranteed minimums?
32. Is there any regulatory, licensing, or exclusive-supply moat (e.g., exclusive creator contracts), or is all supply non-exclusive and poachable?
33. What is your defensibility on the map layer specifically — you don't own the map (Mapbox/Google), so what's proprietary about the map experience?
34. If your entire moat is "execution speed and taste," how do you convince an investor that's durable against a team with 10× the capital?

### 3. Go-To-Market (GTM) & Acquisition (Q35–Q51)

35. How do you solve the two-sided cold-start: you need creators to attract buyers and buyers to attract creators — which side do you subsidize first, and at what cost?
36. What is your blended CAC for a *paying buyer* today, and what is the payback period given low purchase frequency?
37. What is your CAC for a *creator who actually publishes and sells* (not just signs up), and how does it compare to LTV?
38. Since any signed-in user can create and sell with no approval gate, how do you prevent a flood of low-quality guides that destroy buyer trust and search relevance?
39. What is your primary acquisition channel, and is it defensible or rented (e.g., dependent on Instagram/TikTok algorithms that can change overnight)?
40. What is the viral coefficient of the memory-sharing feature (shared link / "unlock at the spot"), and is it actually driving net-new user acquisition or just re-engaging existing users?
41. The shared-memory "unlock at the location" flow requires the recipient to physically travel to a GPS point. Isn't that an extremely high-friction sharing mechanism that throttles virality?
42. How do you acquire creators who already have an audience versus growing creators from zero — and which is your actual supply strategy?
43. What is your content-seeding strategy to avoid an empty marketplace, and how much of current supply is seeded/synthetic (e.g., `SEED_EXAMPLE_*` creators) versus organic?
44. What is your conversion funnel from anonymous map browser → signed-in user → first purchase, and where is the biggest drop-off?
45. What is your organic/SEO strategy given the app is a Capacitor WebView loading a remote site, and how much of discovery depends on app-store ranking versus web search?
46. App-store discovery: what is your ASO plan, and how do you compete for "travel guide" keywords against TripAdvisor, Google, and Airbnb Experiences?
47. What is your referral/incentive design, and have you modeled the cost of incentives against fraud (self-referral, fake purchases)?
48. How do you geographically expand beyond the initial GEL/Georgia market when your payment rail (BOG iPay) is country-specific?
49. What is the sales motion for high-value creators — self-serve only, or do you need a BD team, and is that scalable?
50. What share of installs come from paid versus organic today, and what happens to growth if you turn paid spend to zero?
51. How do you re-engage a buyer between trips (months of dormancy) without becoming spam, and what is your D30/D90 retention by cohort?

### 4. Unit Economics & Monetization (Q52–Q68)

52. What is the gross margin on a purchased guide after the platform fee (default 10%, ceiling-division), payment processing (BOG iPay), GCS storage, and Mapbox/Places API cost attributable to that sale?
53. The platform fee is 10% and configurable. Is 10% enough to ever be profitable after payment fees, infra, and support, and what's the path to a healthier take rate without losing creators?
54. What is buyer LTV given trips are infrequent, guides are one-time consumables, and there is no subscription — and does LTV exceed CAC with margin to spare?
55. How do you monetize the large population of *unauthenticated* users browsing the public map and search, who never sign in or pay?
56. What is the realistic repeat-purchase rate, and what is your strategy if it turns out most buyers purchase exactly once?
57. Payment processing economics: what does BOG iPay charge per transaction, and how does that erode margin on low-priced guides (e.g., a 10-GEL guide)?
58. The effective-price logic supports creator-set sale prices. Do discounts trigger a race to the bottom that compresses both creator earnings and your fee?
59. What is the refund/chargeback rate, who eats refunds (you or the creator), and how is that reserved for? (Note V33 wipes purchases — how do real refunds reconcile?)
60. Free guides, gifts, and creator self-copies bypass the `purchases` table entirely. What fraction of "transactions" are non-revenue, and does that inflate vanity GMV metrics?
61. Is there any recurring revenue line at all (subscriptions, creator pro tools, featured placement), and if not, why will revenue be predictable enough to forecast?
62. "Commercial places" require creator-side paid inclusion (not yet built). How large is that B2B revenue opportunity, and is it a conflict of interest with editorial trust?
63. What is the contribution margin per active creator, and how concentrated is revenue (what % comes from the top 10 creators — i.e., key-person/key-creator risk)?
64. How do FX and GEL volatility affect take rate and creator payouts, and are you exposed to currency risk on the balance sheet?
65. What is your payout schedule and float (`PAYOUT_SCHEDULE_CRON`), and do you earn or owe on the working-capital timing between buyer charge and creator payout?
66. What is the support cost per transaction (disputes, "I can't access my guide," payment failures), and does it scale sub-linearly with GMV?
67. What is the all-in cost to serve one map session (Mapbox tile loads + Places validation + GCS image bandwidth), and is any of that recouped from non-paying users?
68. At what GMV/volume does the business reach default-alive, and what are the three assumptions in that model most likely to be wrong?

### 5. Regulatory & Privacy — Crucial (Q69–Q85)

69. The core feature collects and stores precise user GPS coordinates (memories, geofenced reveals). What is your lawful basis under GDPR Art. 6, and is location treated with the heightened care it requires?
70. Do you ever use *background* geolocation, and if so, how do you comply with GDPR/CCPA, Apple App Store §5.1.1, and Google Play's background-location policy (which requires a declared, reviewed justification)?
71. Where exactly is precise location data stored, for how long, and what is the documented retention/deletion policy when a user deletes a memory or their account?
72. Shared memories expose one user's location/content to others. What is the consent model, and can a recipient's presence at a location be inferred and logged without their explicit consent?
73. Are you a data controller or processor for creator and buyer data, and do you have a Data Processing Agreement framework, a DPO (if required), and Records of Processing (Art. 30)?
74. GDPR data-subject rights: can you actually fulfill access, rectification, erasure, and portability requests across `users`, `user_profiles`, `memories`, `purchases`, `guide_purchases`, audit events, and GCS objects within 30 days?
75. CCPA/CPRA: do you "sell" or "share" personal information (e.g., to Mapbox/Google/analytics), and is a "Do Not Sell/Share" mechanism implemented?
76. How is consent captured and versioned for location tracking, and can you produce an auditable consent record per user (you have a `terms_acceptance` table — does it cover location specifically)?
77. Children/minors: how do you prevent under-13 (COPPA) / under-16 (GDPR) users from creating location-tagged memories, given there's no approval gate to create content?
78. Payment/PCI: BOG iPay is redirect-based hosted checkout — confirm you never touch PAN data and your PCI scope is SAQ-A. What evidence supports that scope claim?
79. Tax/VAT: who is the merchant of record on a guide sale — Brooks or the creator — and who is liable for VAT/sales-tax collection across jurisdictions?
80. Creator income reporting: are you obligated to issue tax forms (1099/local equivalents) to creators, and is that operationalized?
81. Content liability: creators publish places, opening hours, and safety advice. What is your liability if a buyer is harmed following a guide (e.g., an unsafe "secret" location)?
82. UGC moderation: with no approval gate, how do you handle illegal content, defamation, IP-infringing photos, or doxxing via memories tied to private addresses?
83. Right-to-be-forgotten vs. immutability: your rule says deleted guides remain accessible to past purchasers. How do you reconcile that with a creator's erasure request?
84. Cross-border transfer: data flows to GCS, Auth0, Mapbox, and Google (likely US). What transfer mechanism (SCCs/adequacy) covers EU/Georgian personal data leaving its origin?
85. Insurance and incident response: do you carry cyber/privacy liability insurance, and do you have a documented, tested breach-notification process (72-hour GDPR clock)?

### 6. Team & Execution (Q86–Q100)

86. What is the founder-market fit story — why is this team uniquely positioned to win travel + creator commerce + geolocation versus a generalist team?
87. The codebase shows one dominant committer pattern. What is the bus factor, and what happens to the company if the lead engineer is unavailable for a month?
88. Is this a single-engineer/AI-assisted build? If so, how do you convince investors the velocity is sustainable and the code is maintainable by a future team?
89. What are the named operational blind spots — areas no one on the team currently owns (e.g., growth, payments ops, trust & safety, legal)?
90. How do you split time between building features and the unglamorous work (support, fraud, payouts, compliance) that a marketplace actually requires?
!!!91. What is the hiring plan for the next 12 months, and which is the first hire that most reduces risk?
92. What is the decision-making and prioritization process — how was the bet to build geofenced memories (a hard feature) justified over deepening the core marketplace?
93. The project has visibly pivoted (Stripe → UniPay → BOG iPay; timeline UI built then reverted). What does this churn say about product conviction and roadmap discipline?
94. How do you measure success week over week — what are the three north-star and guardrail metrics the team actually watches?
95. What is the burn rate and runway, and what specific milestone does the next raise need to hit to be fundable?
96. What is the equity/cap-table situation, and are there any dead equity, advisor-heavy, or founder-departure risks?
97. Trust & safety at scale: who owns moderation, dispute resolution, and creator-fraud detection, and is that a person or a hope?
98. How do you retain top creators against competitors and against their own incentive to disintermediate — is there a creator-success function?
99. What is the single biggest reason this company fails in 18 months, in the founders' own honest words, and what is being done about it today?
100. If you had to cut the product to one feature to reach default-alive, which would it be — the guide marketplace or geofenced memories — and does the team agree?

---

## Part 2 — Technical & Architecture (100 Questions)

### 1. System Architecture & Scalability (Q1–Q18)

1. The system is a Spring Boot modular monolith on a single PostgreSQL instance. If a viral guide drives 100× traffic, what is the *exact first component* to fail — DB connections, the single app process, GCS bandwidth, or Mapbox quota?
2. There is one PostgreSQL database for all modules. What is your read-scaling story (read replicas, connection pooling/PgBouncer), and at what QPS does the single primary become the bottleneck?
3. The Android app is a Capacitor WebView that loads the live site (`server.url: https://brooksweb.uk`) over the network on every cold start. How does origin/CDN capacity hold up under a viral spike when every app open is a full web fetch?
4. How does the DB handle concurrent junction-table writes for multi-recipient memory shares and unlocks — what isolation level, and where are the lost-update or deadlock risks?
5. Denormalized counters (follower_count, guide_count, purchase_count) are maintained atomically. Under high concurrency, how do you guarantee they don't drift, and how do you reconcile if they do?
6. The two purchase aggregates (`purchases` vs `guide_purchases`) are bridged by an async `PurchaseCompletedEvent`. What happens if the listener fails or the process dies mid-event — can a buyer pay and never receive access?
7. The payment→access bridge is an in-process Spring event (not a durable queue). Is there any outbox/retry guarantee, or is exactly-once delivery assumed but not enforced?
8. The feed/story query was recently capped (`feed-story-cap`). What is the pagination and fan-out strategy for the social feed at 10k+ follows, and does it degrade to a full scan?
9. Search is Postgres full-text. At what corpus size does FTS relevance/latency break down, and what's the migration path (Elastic/OpenSearch/pgvector)?
10. Regional rankings are computed on a schedule (`RANKING_REFRESH_CRON`). How fresh are rankings, and what's the compute cost as creators/guides grow 100×?
11. The map influencer-pins query uses a per-creator LATERAL subquery (up to ~500 creators) behind a cache. What's the cache invalidation strategy, and what happens on a cold cache during a traffic spike?
12. Redis is provisioned but "not used in application logic yet." What is actually caching today, and is the app one viral moment away from needing a cache it hasn't integrated?
13. There is a single app process (Docker Compose + Caddy on a GCP VM). What is the horizontal-scaling and zero-downtime-deploy story — can you run N instances, and is anything in-memory that breaks when you do?
14. Session/auth state: Auth0 with a custom Capacitor deep-link flow and cookie jars. Does anything about that flow assume a single instance or sticky sessions?
15. What is the largest table projected to be (`memories`, `guide_trip_items`, `audit_events`), and what's the partitioning/archival plan before it hurts query planning?
16. Materialized trip items (`guide_trip_items`) are written per purchase. For a guide with hundreds of places bought by thousands of users, what's the write amplification and storage growth?
17. What is the failure mode if Mapbox, Google Places, Auth0, or BOG iPay is down — does the app degrade gracefully or hard-fail, and which of these is a hard single point of failure?
18. Is there any rate limiting / abuse protection at the API gateway (Caddy) layer, or can a single client exhaust DB connections or third-party quotas?

### 2. Infrastructure & Cloud Optimization (Q19–Q35)

19. What is the current monthly cloud burn rate, broken down by GCP VM, GCS, egress, Mapbox, Google Places, and Auth0, and which line grows fastest with usage?
20. You run on a single GCP VM with Docker Compose. What is the disaster-recovery RPO/RTO if that VM is lost, and is the deployment reproducible from infrastructure-as-code?
21. Vendor lock-in: how coupled are you to GCP (GCS, VM, project), Auth0, Mapbox, and BOG iPay, and what is the realistic switching cost/time for each?
22. Mapbox billing: raster tiles via Leaflet are billed per tile request. What prevents a catastrophic billing spike from an aggressive scraper or a runaway client loop loading tiles?
23. Google Places API is used for place validation. What is the per-call cost, is it cached/debounced, and what stops a fat-fingered loop from generating a five-figure bill overnight?
24. Are there hard budget alerts and quota caps configured on Mapbox and Google APIs, or only soft monitoring after the fact?
25. GCS media: what's the storage + egress cost trajectory as place images (max 4/place) and memory photos accumulate, and is there lifecycle/cold-storage tiering?
26. Image delivery: are images served through a CDN with caching, or directly from GCS/`next/image` on the origin VM (a bandwidth and CPU bottleneck)?
27. The DB runs in a container per `docker-compose`. Is production Postgres self-managed in Docker or a managed service (Cloud SQL)? If self-managed, who handles backups, failover, and patching?
28. What is the backup strategy for PostgreSQL (frequency, retention, encryption, tested restores), and when was the last successful restore drill?
29. What is the single-VM's headroom (CPU/RAM) today, and at what utilization does it tip over — is there autoscaling or is scaling a manual VM resize?
30. Caddy terminates TLS and reverse-proxies. Is it a single instance, and is it a single point of failure for the entire product?
31. Secrets management: env vars in `.env` on the VM versus a secret manager — how are `BOG_IPAY_SECRET_KEY`, `AUTH0_CLIENT_SECRET`, and `GCS_CREDENTIALS_JSON` stored, rotated, and access-controlled?
32. What observability exists — metrics, traces, structured logs, alerting — and could you detect a 3 a.m. payment-webhook failure before customers complain?
33. What is the cost and latency impact of the WebView loading the remote site every cold start versus a cached/bundled shell, and has that been quantified?
34. Egress/data-transfer costs: with map tiles, images, and API responses, what's the egress bill trajectory, and is anything compressed (you enable gzip/zstd at Caddy)?
35. Is there any staging environment that mirrors production, or do migrations and deploys go straight to the single prod VM?

### 3. Data Security & Vulnerabilities (Q36–Q52)

36. How is sensitive location data (user coordinates in `memories`, profile lat/lng) encrypted at rest, and is it stored as plaintext columns in Postgres?
37. Is data encrypted in transit on every hop — client→Caddy, Caddy→app, app→Postgres, app→GCS — or is internal traffic (e.g., app↔DB in the Docker network) unencrypted?
38. If an API token or service-account key (`GCS_CREDENTIALS_JSON`, BOG secret) is exposed, what is the blast radius, and is there key rotation + short-lived credentials?
39. Authorization: every controller takes the Auth0 subject. Is object-level authorization enforced everywhere (can user A fetch user B's trip/memory/purchase by guessing a UUID)?
40. The BOG iPay callback is verified via RSA signature + a defense-in-depth Payment Details re-fetch. What stops a replayed or forged webhook from marking an unpaid order COMPLETED?
41. The webhook is idempotent via atomic SQL update. Has that been tested under concurrent duplicate callbacks, and what proves no double-credit/double-payout?
42. The geofenced memory "reveal" checks server-side proximity. Can a client spoof GPS coordinates to unlock a memory without being at the location, and is that exploit acceptable?
43. Preview leakage: the preview endpoint must return only title + counts. Is there any code path (API, search, cache, snapshot JSON) that leaks itinerary details pre-purchase?
44. Media access control: are GCS objects public-read by URL (guessable/enumerable), or are private memory photos protected by signed URLs with expiry?
45. The `next/image` remotePatterns are scoped to the configured bucket. Is there any SSRF/proxy-abuse vector through the image optimizer or geocoding endpoints?
46. SQL injection: there are native queries (LATERAL pins, aggregates). Are all parameterized, and is there any string-concatenated SQL anywhere?
47. CSP allows `'unsafe-inline'` on script-src (documented Next.js fallback). What's the XSS exposure, and what's the plan to ship nonce-based CSP?
48. What is the account-takeover story — Auth0 MFA availability, the custom Capacitor cookie-jar flow, and the deep-link OAuth callback (`uk.brooksweb.app://`) — can the callback be intercepted by a malicious app?
49. Rate limiting / brute force / enumeration protection on auth, checkout, follow, and memory-unlock endpoints — what exists?
50. PII inventory: do you have a complete map of where personal + location data lives (DB columns, GCS, logs, third parties), and do logs accidentally capture coordinates or tokens?
51. Dependency/supply-chain security: is there SCA (Dependabot/Snyk), SBOM, and a process for the Spring/Next/Leaflet/Capacitor dependency tree, including the Android native layer?
52. Has there ever been a third-party penetration test or security audit, and if not, what's the most likely vulnerability class you'd expect it to find first?

### 4. Code Quality & Technical Debt (Q53–Q68)

53. What is the actual automated test coverage, backend and frontend? (Docs admit "thin but not absent" backend tests and *no* frontend tests.) Quantify it.
54. The money path is the riskiest code. What is `PurchaseService` / `BogIpayClient` test coverage specifically, and are there integration tests for the full pay→webhook→access flow?
55. Frontend has zero tests. How do you safely refactor a 1500-line component like `MapsExperience.tsx` without a regression suite?
56. The custom timeline itinerary UI (BOR-62) was built and then fully reverted. What does that round-trip reveal about design validation discipline and wasted effort, and what debt remains?
57. The two-aggregate purchase model (`purchases` vs `guide_purchases`, joined by `(buyer_id, guide_id, version)` with no FK) is subtle. How is that invariant tested and guarded against drift?
58. There are 60+ Flyway migrations including destructive ones (V33 wipes purchases; V10→V32 payment-column renames). How do you guarantee migration safety against a production snapshot with real data?
59. What is the cyclomatic complexity / size of the largest components and services, and which files are the known "no one wants to touch this" hotspots?
60. i18n: dictionaries were recently code-split and the non-English files "ship empty until approved." What is the real localization completeness, and how many user-facing strings are untranslated?
61. How much logic is duplicated between the web app and the (reserved-but-empty) `mobile/` React Native workspace, and what's the plan to avoid a fork?
62. The Android app is a remote-URL WebView. How much of the "app" is actually native, and what's the debt risk of OAuth/payment flows that depend on fragile WebView+CustomTab+deep-link plumbing?
63. Error handling: is there a consistent strategy, or are failures (e.g., the payment event listener, third-party timeouts) swallowed/logged-and-forgotten in places?
64. Type/contract safety between the Java DTOs and the TypeScript types — are they hand-synced (drift risk) or generated from a shared schema/OpenAPI?
65. What is the dead-code / feature-flag situation (e.g., reverted features, `SEED_EXAMPLE_*`, unused Redis), and how much is shipped-but-inactive?
66. Database indexing: several FK and hot-path indexes were added reactively (V41, V61, V62). What's the process — are slow queries caught proactively, or only after a production incident?
67. What coding standards, linting, and review process exist, and given the apparent single-author velocity, who actually reviews changes before they hit `main`?
68. What is the documented architecture decision record (ADR) trail for the big bets (modular monolith, remote-WebView app, BOG iPay, geofencing), or is the rationale only in people's heads?

### 5. CI/CD & DevOps (Q69–Q84)

69. Deploys auto-trigger on push to `main` (GitHub Actions). What gates a deploy — do tests/lint *block* the deploy, or can a red build still ship to production?
70. What is the rollback strategy if a deploy breaks map rendering or checkout? Is it one-command/instant, or a manual scramble on the VM?
71. Flyway runs migrations on app startup. What happens to availability if a migration is slow or fails mid-deploy on the single prod instance?
72. Is there a blue/green or canary mechanism, or does every deploy briefly take the single app process down?
73. What is the deployment frequency, lead time for changes, change-failure rate, and MTTR (the DORA metrics)?
74. How are secrets injected into CI and the VM, and could a malicious PR or compromised Action exfiltrate `BOG_IPAY_SECRET_KEY` or `GCS_CREDENTIALS_JSON`?
75. The Android app loads a remote URL, so a web deploy instantly changes the live app with no app-store review. What's the safeguard against shipping a broken build straight to all mobile users?
76. Conversely, native changes (Capacitor config, plugins, deep-link scheme) require an APK release. What's the mobile release/QA pipeline, and how do you avoid web/native version skew?
77. Is there automated testing in CI for the payment webhook, auth flow, and migrations, or is verification manual/post-hoc?
78. Database migrations and the destructive ones (V33) — is there a guard that prevents accidentally running a wipe against prod, and who can trigger it?
79. What monitoring/alerting fires on a failed deploy, a spiking error rate, or a payment-webhook backlog, and who is on call?
80. How are feature rollouts controlled — are there feature flags, or is everything all-or-nothing on merge to `main`?
81. Backups before destructive migrations/deploys: is a verified snapshot taken automatically pre-deploy, or is recovery best-effort?
82. What is the branch protection and access model on the repo — can anyone force-push `main`, and is signing/review enforced?
83. Build reproducibility: is the Docker image pinned/deterministic, and can you rebuild the exact production artifact for any past commit?
84. Is there any load/performance testing in the pipeline, or is the first real load test going to be an actual viral event in production?

### 6. Mobile Performance (Q85–Q100)

85. Geofenced proximity alerts: how do you detect a user nearing a memory location without draining battery — true OS geofencing APIs, or foreground GPS polling that the OS will throttle?
86. How do you mitigate background-OS battery throttling and Doze mode (Android) / background-location limits (iOS) when monitoring proximity?
87. The app is an Android System WebView loading a remote site. What are the cold-start numbers (TTI, LCP) on a mid-range device on 4G, and how do they compare to a native app?
88. There is no service worker / offline cache (deferred). What is the experience on a flaky connection or offline — exactly when a traveler abroad needs the guide most?
89. Mapbox is rendered via Leaflet raster tiles (chosen over mapbox-gl to avoid WebView GPU OOM). What's the scroll/zoom performance and data cost of raster tiles on mobile versus vector?
90. Memory/RAM: `largeHeap=true` is set. What's the peak memory of the map + image galleries in the WebView, and how close is it to OOM on low-end (2–3 GB RAM) devices?
91. Image payloads: client-side compression exists (BOR-60). What's the typical memory-photo upload size on a slow mobile uplink, and does it block the UI?
92. The 1.5s fixed splash was changed to hide on hydration. What's the real perceived startup time now, and is there still a blank-WebView flash on slow networks?
93. How does the app behave on poor connectivity for the *payment* redirect flow (WebView → BOG hosted page → callback) — what happens if the network drops mid-checkout?
94. Location permission UX: how do you handle a user who denies location (the app's core memory feature depends on it), and what's the degraded experience?
95. Push notifications (FCM) for memory shares — what's the delivery reliability, and does the notification flow work when the app has been killed?
96. Deep-link reliability: the OAuth callback relies on Android App Links + a custom scheme. What's the failure rate of that handoff across OEM browsers and Android versions?
97. What's the APK size and its trajectory (splash assets alone are ~1.1 MB), and does install size hurt conversion in low-bandwidth target markets?
98. WebView fragmentation: behavior depends on the device's Chromium WebView version. How do you test across the long tail of Android WebView versions and OEM skins?
99. Battery/data transparency: can you quantify the battery and data cost of a typical 30-minute "follow the guide on the map" session, and is it acceptable to a roaming traveler?
100. What is the single biggest mobile-performance risk that would cause a 1-star review at scale, and what is being done to prevent it before launch?

---

*End of document — 100 business + 100 technical = 200 questions.*
