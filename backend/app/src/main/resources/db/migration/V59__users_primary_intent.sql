-- Self-selected onboarding intent (TRAVELER / CREATOR), chosen once after first sign-in.
-- Nullable: NULL means the user has not chosen yet, which is what triggers the role-selection
-- prompt. Distinct from users.role (system auth role).
ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_intent VARCHAR(20);
