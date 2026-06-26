-- 회생ON Supabase 스키마
-- 적용: Supabase 대시보드 SQL Editor 또는 `supabase db push`
-- 멀티 사무소(테넌트) + 행 수준 보안(RLS) 기반.

create extension if not exists "pgcrypto";

-- 사무소(테넌트)
create table if not exists firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'free',          -- free | pro | team
  seats int not null default 1,
  ai_credits_limit int not null default 50,
  ai_credits_used int not null default 0,
  median_income jsonb,                          -- 가구원수별 기준 중위소득
  living_cost_ratio numeric not null default 0.6,
  created_at timestamptz not null default now()
);

-- 사용자(사무소 멤버) — auth.users 와 연결
create table if not exists members (
  id uuid primary key references auth.users(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  name text,
  role text not null default 'staff',           -- owner | staff
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  kakao_id text,
  rrn_masked text,
  address text,
  job text,
  memo text,
  created_at timestamptz not null default now()
);

create table if not exists cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  client_id uuid not null references clients(id) on delete cascade,
  type text not null,                            -- rehab | bankruptcy
  court text,
  case_no text,
  stage text not null default 'consult',
  status text not null default 'active',
  assignee text,
  income jsonb,                                  -- {monthlyIncome, incomeType, dependents, livingCost}
  plan jsonb,                                    -- {totalMonths, monthlyAmount, startDate}
  tags text[],
  filed_at date,
  opened_at date,
  created_at timestamptz not null default now()
);

create table if not exists creditors (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  name text not null,
  category text,
  principal bigint not null default 0,
  interest bigint not null default 0,
  is_disputed boolean default false
);

create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  category text,
  label text,
  value bigint not null default 0,
  exempt_amount bigint default 0,
  memo text
);

create table if not exists corrections (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  court text,
  case_no text,
  received_at date,
  due_at date,
  items jsonb not null default '[]',
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  type text not null,
  title text,
  status text not null default 'draft',
  content text,
  updated_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  case_id uuid references cases(id) on delete cascade,
  type text not null,
  title text not null,
  date date not null,
  done boolean default false,
  notify_kakao boolean default false,
  notify_email boolean default false,
  memo text
);

create table if not exists billing (
  firm_id uuid primary key references firms(id) on delete cascade,
  customer_key text,
  billing_key text,                              -- 토스 빌링키(정기결제)
  card_company text,
  card_number_masked text,
  plan text,
  next_charge_at date,
  status text default 'none'                     -- none | active | paused | failed
);

-- 행 수준 보안: 같은 사무소 멤버만 접근
alter table firms enable row level security;
alter table members enable row level security;
alter table clients enable row level security;
alter table cases enable row level security;
alter table creditors enable row level security;
alter table assets enable row level security;
alter table corrections enable row level security;
alter table documents enable row level security;
alter table events enable row level security;
alter table billing enable row level security;

create or replace function current_firm() returns uuid language sql stable as $$
  select firm_id from members where id = auth.uid()
$$;

create policy firm_members_read on firms for select using (id = current_firm());
create policy member_self on members for all using (firm_id = current_firm());
create policy clients_tenant on clients for all using (firm_id = current_firm());
create policy cases_tenant on cases for all using (firm_id = current_firm());
create policy events_tenant on events for all using (firm_id = current_firm());
create policy billing_tenant on billing for all using (firm_id = current_firm());
-- 자식 테이블은 사건 소유 사무소로 제한
create policy creditors_tenant on creditors for all using (exists (select 1 from cases c where c.id = creditors.case_id and c.firm_id = current_firm()));
create policy assets_tenant on assets for all using (exists (select 1 from cases c where c.id = assets.case_id and c.firm_id = current_firm()));
create policy corrections_tenant on corrections for all using (exists (select 1 from cases c where c.id = corrections.case_id and c.firm_id = current_firm()));
create policy documents_tenant on documents for all using (exists (select 1 from cases c where c.id = documents.case_id and c.firm_id = current_firm()));

create index if not exists idx_cases_firm on cases(firm_id);
create index if not exists idx_clients_firm on clients(firm_id);
create index if not exists idx_events_firm_date on events(firm_id, date);
