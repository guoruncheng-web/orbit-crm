# Supabase notes

Supabase is used here as a managed PostgreSQL instance, nothing more. The schema
is owned by Prisma Migrate (`backend/nest/prisma/migrations`), not by the
Supabase dashboard or its SQL editor.

## Connection strings

Supabase exposes three endpoints for the same database, and picking the wrong
one is the most common way this stack breaks in production.

| Endpoint | Host | Port | Use it for |
| --- | --- | --- | --- |
| Direct | `db.<ref>.supabase.co` | 5432 | Nothing here — it resolves to IPv6 only, and Vercel functions cannot reach it |
| Session pooler | `aws-1-<region>.pooler.supabase.com` | 5432 | `DIRECT_URL` — migrations, which need advisory locks and DDL |
| Transaction pooler | `aws-1-<region>.pooler.supabase.com` | 6543 | `DATABASE_URL` — the running API |

The API must use the transaction pooler because every serverless invocation can
open its own connection. Postgres runs out of connection slots long before the
traffic gets interesting, and PgBouncer is what stands between the two. Append
`?pgbouncer=true&connection_limit=1` so Prisma disables prepared statements,
which transaction-mode pooling cannot support.

## Row Level Security

RLS is deliberately **not** enabled on these tables. It protects clients that
talk to Postgres directly using a Supabase-issued JWT. In this project the
browser only ever talks to the NestJS API, which holds the database credentials
and derives `organization_id` from its own signed token — see
`backend/nest/src/customers/customers.service.ts`, where every query is anchored
on it.

`rls-example.sql` shows the policies that would be needed if a client ever did
query Supabase directly. It is reference material, not part of the migration
history.
