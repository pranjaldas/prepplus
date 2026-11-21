-- =====================================================================
-- PrepPulse: initial schema, RLS policies and auth trigger
-- Run in the Supabase SQL editor (or via `supabase db push`).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. profiles (extends auth.users)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text not null,
  role        text not null default 'CANDIDATE' check (role in ('ADMIN', 'CANDIDATE')),
  phone       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. exams
-- ---------------------------------------------------------------------
create table if not exists public.exams (
  id                  uuid primary key default gen_random_uuid(),
  exam_code           text not null unique
                        check (exam_code ~ '^[A-Z0-9-]{6,8}$'),
  title               text not null,
  created_by          uuid references public.profiles (id) on delete set null,
  sheet_url           text not null,
  duration_minutes    integer not null check (duration_minutes > 0),
  marks_per_question  numeric not null check (marks_per_question > 0),
  is_negative_marking boolean not null default false,
  negative_mark       numeric not null default 0 check (negative_mark >= 0),
  scheduled_at        timestamptz not null default now(),
  status              text not null default 'active' check (status in ('active', 'archived')),
  created_at          timestamptz not null default now()
);

create index if not exists exams_scheduled_at_idx on public.exams (scheduled_at);

-- ---------------------------------------------------------------------
-- 3. exam_attempts
-- ---------------------------------------------------------------------
create table if not exists public.exam_attempts (
  id                uuid primary key default gen_random_uuid(),
  exam_id           uuid not null references public.exams (id) on delete cascade,
  candidate_id      uuid not null references public.profiles (id) on delete cascade,
  status            text not null default 'in_progress' check (status in ('in_progress', 'submitted')),
  started_at        timestamptz not null default now(),
  submitted_at      timestamptz,
  total_questions   integer,
  right_count       integer,
  wrong_count       integer,
  unanswered_count  integer,
  final_score       numeric,
  -- CRITICAL: a candidate can never take the same exam twice
  constraint exam_attempts_exam_candidate_unique unique (exam_id, candidate_id)
);

create index if not exists exam_attempts_candidate_idx on public.exam_attempts (candidate_id);

-- ---------------------------------------------------------------------
-- 4. candidate_answers
-- ---------------------------------------------------------------------
create table if not exists public.candidate_answers (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null unique references public.exam_attempts (id) on delete cascade,
  answers_json  jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------
-- Helper: is the current user an admin? (security definer avoids RLS recursion)
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

-- ---------------------------------------------------------------------
-- Auth trigger: auto-create a profile row for every new auth user.
-- Role is NEVER taken from user metadata, so sign-ups cannot self-promote.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Row Level Security
--
-- Candidate-side writes (starting/submitting/grading attempts) are done
-- by server actions using the service-role key, which bypasses RLS.
-- Browser clients therefore get read-only access to their own data, so a
-- candidate can never write their own score or read an exam's sheet_url.
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.exams             enable row level security;
alter table public.exam_attempts     enable row level security;
alter table public.candidate_answers enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- exams: admins only (candidates resolve exam codes through the server)
drop policy if exists "exams_admin_select" on public.exams;
create policy "exams_admin_select" on public.exams
  for select to authenticated
  using (public.is_admin());

drop policy if exists "exams_admin_insert" on public.exams;
create policy "exams_admin_insert" on public.exams
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "exams_admin_update" on public.exams;
create policy "exams_admin_update" on public.exams
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "exams_admin_delete" on public.exams;
create policy "exams_admin_delete" on public.exams
  for delete to authenticated
  using (public.is_admin());

-- exam_attempts: read own, admins read all; no client writes
drop policy if exists "attempts_select_own_or_admin" on public.exam_attempts;
create policy "attempts_select_own_or_admin" on public.exam_attempts
  for select to authenticated
  using (candidate_id = auth.uid() or public.is_admin());

-- candidate_answers: read own, admins read all; no client writes
drop policy if exists "answers_select_own_or_admin" on public.candidate_answers;
create policy "answers_select_own_or_admin" on public.candidate_answers
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.exam_attempts a
      where a.id = candidate_answers.attempt_id
        and a.candidate_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Promote your first admin after they register, e.g.:
--   update public.profiles set role = 'ADMIN' where email = 'admin@example.com';
-- ---------------------------------------------------------------------
