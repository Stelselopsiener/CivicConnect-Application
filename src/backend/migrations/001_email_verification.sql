-- Apply to the EXISTING team schema after backup; the ZIP contains no base schema.
-- The table name used by the supplied backend and PED §8.3 is verification_token.
-- Inspect diagnostic triggers first: they MUST exclude password_hash and token_hash.
BEGIN;
ALTER TABLE verification_token
  ADD COLUMN IF NOT EXISTS issued_at timestamptz NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts BETWEEN 0 AND 5);
-- Fails safely if case-insensitive duplicates exist; resolve those before applying.
CREATE UNIQUE INDEX IF NOT EXISTS user_email_lower_unique ON "user" (LOWER(email));
CREATE INDEX IF NOT EXISTS verification_token_user_issued ON verification_token (user_id, issued_at DESC);
COMMIT;
-- Old long-token emails are incompatible. Request a new six-digit code after deploying.


--MIGHT REMOVE LATER 