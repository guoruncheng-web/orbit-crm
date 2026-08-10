-- Each demo visitor gets a throwaway organization instead of sharing one
-- account, so nobody can leave the public demo in a broken state for the next
-- person. The flag and index exist to make the reaper's lookup cheap.

ALTER TABLE "organizations" ADD COLUMN "is_demo" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "organizations_is_demo_created_at_idx" ON "organizations"("is_demo", "created_at");
