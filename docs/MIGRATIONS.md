# Database Migrations

Flyway-managed. Migrations live in `backend/app/src/main/resources/db/migration/` and run on
backend startup. Schema validation (`spring.jpa.hibernate.ddl-auto: validate`) catches drift
between entities and the latest migration.

## Conventions

- Filename: `V<n>__<lower_snake_case>.sql`. Sequential, gap-tolerant.
- One concern per migration. Never mix DDL and DML except where data backfill is essential
  to the DDL change.
- Migrations must be **idempotent only when explicitly designed to be** (e.g. additive
  `ALTER TABLE … IF NOT EXISTS`); Flyway records checksums, so changing a migration after
  it has been applied is forbidden.
- Use Flyway repeatables (`R__`) for views and stored procedures, never for table changes.

## Historical migrations that need care

### V10 — `rename_stripe_to_unipay`
Original Stripe-shaped purchase columns were renamed to Unipay shape. Superseded by V32 once
the project switched to Bank of Georgia iPay. Still applied to fresh DBs to keep the migration
sequence linear, but the downstream V32 effectively reverses and rewrites the column shape.

### V32 — `bog_ipay_purchase_columns`
Renames the Unipay-shaped columns to BOG iPay shape (`bog_order_id`, `bog_payment_hash`,
`bog_ipay_payment_id`, `bog_transaction_id`). Idempotent — guards check for both old and new
column names.

### V33 — `purchases_gel_default_and_wipe` ⚠️ DESTRUCTIVE
**This migration `TRUNCATE`s `purchases` and `creator_earnings`.** It was applied to all
environments at a time when no real purchases existed; the rationale was that the legacy rows
were Stripe/Unipay-shaped and could not be cleanly mapped onto the BOG iPay column set.

**Operational rules:**
- This migration must **never** be re-run against a database that contains real purchase
  rows. Flyway's checksum tracking prevents accidental re-execution against an environment
  that has already applied V33.
- For **fresh database rebuilds in production-like environments that contain restored
  purchase data**, baseline past V33 (`flyway baseline -baselineVersion=33`) instead of
  letting V33 run. Confirm with the on-call engineer before any baseline.
- Any future migration that needs to change purchase column types must use additive +
  copy-then-drop steps, not `TRUNCATE`.

If a future `V<n>` is needed that touches `purchases`, prefer:

```sql
ALTER TABLE purchases ADD COLUMN <new_col> <type>;
UPDATE purchases SET <new_col> = <expression>;
ALTER TABLE purchases DROP COLUMN <old_col>;
```

— not a destructive TRUNCATE.
