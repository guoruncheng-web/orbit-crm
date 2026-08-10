-- Flyway owns the production schema. This file documents optional Supabase RLS.
-- Enable this only when clients query Supabase directly. Orbit CRM routes data through Spring Boot.
alter table public.customers enable row level security;

create policy "members can read organization customers"
on public.customers for select
using (organization_id = (auth.jwt() ->> 'organization_id')::uuid);

