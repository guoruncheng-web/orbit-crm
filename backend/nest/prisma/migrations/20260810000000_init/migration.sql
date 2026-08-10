-- Orbit CRM initial schema.

CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "company" VARCHAR(160) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "value" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "last_contact" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- Matches the default listing: the caller's organization, newest first.
CREATE INDEX "customers_organization_id_created_at_idx" ON "customers"("organization_id", "created_at" DESC);

-- Matches the status-filtered listing and the dashboard's GROUP BY status.
CREATE INDEX "customers_organization_id_status_idx" ON "customers"("organization_id", "status");

ALTER TABLE "users"
    ADD CONSTRAINT "users_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers"
    ADD CONSTRAINT "customers_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- `status` is a varchar rather than a native enum so that the Spring Boot
-- implementation in ../demo can map it with @Enumerated(EnumType.STRING)
-- against this same table. The constraint keeps the column honest either way.
ALTER TABLE "customers"
    ADD CONSTRAINT "customers_status_check"
    CHECK ("status" IN ('LEAD', 'ACTIVE', 'AT_RISK'));

-- Contract values are never negative; the API validates this too, but a bad
-- migration or a manual UPDATE should not be able to slip past it.
ALTER TABLE "customers"
    ADD CONSTRAINT "customers_value_non_negative"
    CHECK ("value" >= 0);
