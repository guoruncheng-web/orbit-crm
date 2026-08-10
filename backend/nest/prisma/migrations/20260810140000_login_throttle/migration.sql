-- Brute-force protection for sign-in.
--
-- The counter lives in the database rather than in process memory: the API runs
-- as serverless functions, so consecutive attempts can land on different
-- instances and an in-memory counter would reset itself for free.

ALTER TABLE "users" ADD COLUMN "failed_logins" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "users" ADD COLUMN "locked_until" TIMESTAMPTZ(6);
