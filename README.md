# Orbit CRM

A multi-tenant CRM workspace. Sign up, and you get an organization of your own;
every customer, metric and chart you see afterwards belongs to it and to nobody
else.

Built as a portfolio piece to show a complete slice of product work — schema,
API, authentication, UI and deployment — rather than a single layer in
isolation.

**[Open the live demo →](https://orbit-crm-web-xi.vercel.app)**

Press **Explore the demo** and you get a private workspace of your own, filled
with a year of sample accounts. Delete things, rename things, break it however
you like — it belongs to you alone and the next visitor still lands on a
complete dashboard. Open it in two browsers at once to watch the tenant
boundary do its job.

- App — https://orbit-crm-web-xi.vercel.app
- API docs (Swagger) — https://orbit-crm-api.vercel.app/api/docs
- Health check — https://orbit-crm-api.vercel.app/api/health

## What it does

- **Email and password authentication.** Registering creates an organization and
  its first user in one transaction; signing in returns a JWT.
- **A throwaway workspace per demo visitor.** `POST /api/demo/session` mints a
  private tenant, seeds it with a year of sample accounts and signs the visitor
  in. Sandboxes are reaped after a day.
- **Customer management.** Create, list, search, filter by pipeline status,
  change status inline, delete. Search matches name, company and email.
- **Server-side pagination.** The table pages through the API rather than
  filtering an array it already downloaded.
- **A dashboard computed from real rows.** Pipeline value, customer count,
  active accounts, conversion rate, status breakdown, and a trailing
  twelve-month revenue chart — all aggregated in Postgres, none of it hard-coded.
- **Tenant isolation enforced in the data layer.** Every query is anchored on the
  `organization_id` taken from the signed token. There is no request header a
  client could edit to read someone else's data.
- **Interactive API documentation** generated from the code at `/api/docs`.

## Architecture

```
Browser ──▶ Next.js (Vercel)  ──▶ NestJS API (Vercel Functions) ──▶ Postgres (Supabase)
             React 19               JWT auth, Prisma                 transaction pooler
             TanStack Query         class-validator                  Prisma Migrate
             Recharts               OpenAPI
```

The browser never talks to Postgres. Database credentials live only in the API's
environment, and the frontend bundle carries nothing but the public API URL.

### Repository layout

```
frontend/       Next.js 15 app — dashboard, auth screen, API client
backend/nest/   NestJS 11 API — the deployed backend
backend/demo/   Spring Boot implementation of the same endpoints (see below)
supabase/       Connection and RLS notes
```

### Why there are two backends

The API was first written in Spring Boot and later reimplemented in NestJS,
which is what actually ships. Both target the same tables, so `backend/demo` is
kept as a working reference rather than deleted — `docker compose --profile java
up` runs it on port 8081 against the same database.

The Java version predates authentication: it trusts an `X-Organization-Id`
request header, which any client could set to any value. The NestJS version
takes the organization from a signed token instead. That difference is the point
of keeping both.

## Design decisions worth calling out

**Status is a `varchar` with a `CHECK` constraint, not a Postgres enum.** A
native enum would be tidier, but adding a value to one requires a migration that
cannot run inside a transaction, and it complicates the JPA mapping in the Java
implementation. The check constraint gets the same guarantee at the database
level.

**Cross-tenant writes use `updateMany`/`deleteMany`.** Loading a row and then
comparing its `organizationId` in application code works until someone forgets
the comparison. Putting `organizationId` in the `WHERE` clause makes a
cross-tenant write return "0 rows affected" instead of relying on a check that
can be omitted. See `backend/nest/src/customers/customers.service.ts`.

**The API connects through PgBouncer.** Each serverless invocation can open its
own connection, so `DATABASE_URL` points at Supabase's transaction pooler while
`DIRECT_URL` points at the session pooler for migrations. Supabase's direct host
resolves to IPv6 only and is unreachable from Vercel. Details in
`supabase/README.md`.

**Demo visitors get a tenant each, not a shared login.** A single public demo
account is one visitor away from being emptied out, and whoever arrives next
judges the work by the wreckage. Minting a throwaway tenant per visitor costs
one insert and turns the problem into a feature: the isolation the API claims is
something you can check yourself by opening the demo in two browsers. Expired
sandboxes are deleted inline on the next demo request rather than by a schedule,
because the Hobby plan allows one cron trigger a day and the delete is a single
indexed statement.

**A daily cron keeps the database awake.** Supabase pauses a free project after
seven days without activity, which would leave a public demo answering 500s to
whoever opened it first. `backend/nest/vercel.json` schedules a daily request to
`/api/health`, which runs `select 1` and resets that timer. Vercel only runs
crons against production deployments, and the Hobby plan caps them at one
trigger per day — which is exactly what this needs.

**The JWT is stored in `localStorage`.** This keeps the frontend a static bundle
that can call an API on a different domain. An httpOnly cookie resists XSS
better and is the right choice when the API and the site share a registrable
domain — a deliberate trade-off, not an oversight.

## Running it locally

With Docker:

```bash
cp .env.example .env
docker compose up --build
```

Without Docker, against any Postgres instance:

```bash
cd backend/nest
cp .env.example .env          # fill in DATABASE_URL, DIRECT_URL, JWT_SECRET
npm install
npx prisma migrate deploy
npm run seed                  # optional demo workspace
npm run dev                   # http://localhost:8080/api

cd ../../frontend
cp .env.example .env.local
npm install
npm run dev                   # http://localhost:3000
```

The seed script creates a workspace of 28 customers spread across the last
twelve months, so the revenue chart has a real shape on first run.

## Tests

```bash
cd backend/nest
npm run test:e2e
```

The suite registers two workspaces and asserts the boundary between them: no
listing leak, no cross-tenant status change, no cross-tenant delete, no
dashboard aggregate crossing the line, and a rejected request when the bearer
token is missing. It also opens two demo sandboxes at once to confirm that what
one visitor deletes stays visible to the other, and that a token outliving its
workspace is rejected rather than silently showing an empty dashboard.

## API

`GET /api/docs` serves Swagger UI. Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/demo/session` | Mint a seeded sandbox workspace and sign into it |
| `POST` | `/api/auth/register` | Create an organization and its first user |
| `POST` | `/api/auth/login` | Exchange credentials for a bearer token |
| `GET` | `/api/auth/me` | Return the current principal |
| `GET` | `/api/customers` | Page through customers (`q`, `status`, `page`, `size`) |
| `POST` | `/api/customers` | Create a customer |
| `PATCH` | `/api/customers/:id/status` | Move a customer to another status |
| `DELETE` | `/api/customers/:id` | Delete a customer |
| `GET` | `/api/dashboard/summary` | Metrics, status breakdown, trailing revenue |
| `GET` | `/api/health` | Liveness probe that round-trips the database |

Everything except `/demo/session`, `/auth/register`, `/auth/login` and `/health`
requires `Authorization: Bearer <token>`.
