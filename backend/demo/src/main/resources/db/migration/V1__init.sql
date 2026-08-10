create table organizations (
    id uuid primary key,
    name varchar(120) not null,
    created_at timestamptz not null default now()
);

create table customers (
    id uuid primary key,
    organization_id uuid not null references organizations(id) on delete cascade,
    name varchar(120) not null,
    company varchar(160) not null,
    email varchar(255) not null,
    status varchar(24) not null,
    value numeric(12, 2) not null default 0,
    last_contact date not null,
    created_at timestamptz not null default now()
);

create index idx_customers_org_created on customers (organization_id, created_at desc);
create index idx_customers_org_status on customers (organization_id, status);

insert into organizations (id, name)
values ('11111111-1111-1111-1111-111111111111', 'Acme Studio');

insert into customers (id, organization_id, name, company, email, status, value, last_contact) values
('21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Olivia Martin', 'Northstar Labs', 'olivia@northstar.example', 'ACTIVE', 18400, '2026-08-08'),
('21111111-1111-1111-1111-111111111112', '11111111-1111-1111-1111-111111111111', 'Jackson Lee', 'Vertex Health', 'jackson@vertex.example', 'LEAD', 12600, '2026-08-06'),
('21111111-1111-1111-1111-111111111113', '11111111-1111-1111-1111-111111111111', 'Sophia Turner', 'Halo Commerce', 'sophia@halo.example', 'ACTIVE', 24200, '2026-08-04'),
('21111111-1111-1111-1111-111111111114', '11111111-1111-1111-1111-111111111111', 'Ethan Wright', 'Form & Field', 'ethan@formfield.example', 'AT_RISK', 7800, '2026-07-29'),
('21111111-1111-1111-1111-111111111115', '11111111-1111-1111-1111-111111111111', 'Mia Chen', 'Sora Finance', 'mia@sora.example', 'LEAD', 9600, '2026-07-25');

