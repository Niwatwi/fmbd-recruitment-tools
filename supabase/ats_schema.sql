create extension if not exists pgcrypto;

create or replace function public.ats_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.ats_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'recruiter')),
  created_at timestamptz not null default now()
);

create or replace function public.ats_has_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ats_user_roles
    where user_id = auth.uid()
      and role = any(required_roles)
  );
$$;

create table if not exists public.ats_jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text not null unique,
  title text not null,
  department text,
  location text,
  employment_type text,
  headcount integer not null default 1 check (headcount > 0),
  hiring_manager_email text,
  recruiter_email text,
  status text not null default 'open' check (status in ('open', 'on_hold', 'closed', 'cancelled')),
  public_application_token_hash text unique,
  public_application_enabled boolean not null default false,
  open_date date,
  close_date date,
  description text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ats_jobs
  add column if not exists public_application_token_hash text unique,
  add column if not exists public_application_enabled boolean not null default false;

create table if not exists public.ats_candidates (
  id uuid primary key default gen_random_uuid(),
  candidate_code text not null unique,
  full_name text not null,
  email text,
  phone text,
  location text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  primary_source text,
  source_detail text,
  consent_status text not null default 'not_recorded'
    check (consent_status in ('not_recorded', 'consented', 'withdrawn')),
  consent_date date,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ats_candidates_email_lower_uidx
  on public.ats_candidates (lower(email))
  where email is not null and email <> '';

create table if not exists public.ats_applications (
  id uuid primary key default gen_random_uuid(),
  application_code text not null unique,
  candidate_id uuid not null references public.ats_candidates(id) on delete cascade,
  job_id uuid not null references public.ats_jobs(id) on delete restrict,
  stage text not null default 'new_applicant'
    check (stage in ('new_applicant', 'screening', 'interview', 'assessment', 'offer', 'hired', 'rejected', 'withdrawn')),
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'declined')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  source text,
  owner_email text,
  applied_at timestamptz not null default now(),
  next_action_at timestamptz,
  rejection_reason text,
  notes text,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ats_applications
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'declined')),
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists ats_applications_job_stage_idx
  on public.ats_applications (job_id, stage, applied_at desc);
create index if not exists ats_applications_candidate_idx
  on public.ats_applications (candidate_id);
create index if not exists ats_applications_next_action_idx
  on public.ats_applications (next_action_at)
  where next_action_at is not null;

create table if not exists public.ats_interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.ats_applications(id) on delete cascade,
  interview_type text not null default 'video',
  starts_at timestamptz not null,
  duration_minutes integer not null default 60 check (duration_minutes between 15 and 480),
  interviewer_email text,
  location_or_link text,
  invitation_sent_at timestamptz,
  invitation_email_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  feedback text,
  score numeric(3, 1) check (score between 1 and 5),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ats_interviews
  add column if not exists invitation_sent_at timestamptz,
  add column if not exists invitation_email_id text;

create index if not exists ats_interviews_schedule_idx
  on public.ats_interviews (starts_at, status);

create table if not exists public.ats_notifications (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.ats_applications(id) on delete cascade,
  event_type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ats_notifications_unread_idx
  on public.ats_notifications (created_at desc)
  where read_at is null;

create table if not exists public.ats_offers (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.ats_applications(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending_approval', 'sent', 'accepted', 'declined', 'withdrawn', 'expired')),
  job_title text,
  salary_amount numeric(12, 2) check (salary_amount >= 0),
  salary_period text not null default 'monthly'
    check (salary_period in ('hourly', 'monthly', 'yearly')),
  currency_code char(3) not null default 'THB',
  sent_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  expires_at timestamptz,
  responded_at timestamptz,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ats_activity (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.ats_applications(id) on delete cascade,
  candidate_id uuid references public.ats_candidates(id) on delete cascade,
  job_id uuid references public.ats_jobs(id) on delete cascade,
  event_type text not null,
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  actor_id uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (application_id is not null or candidate_id is not null or job_id is not null)
);

create index if not exists ats_activity_application_idx
  on public.ats_activity (application_id, created_at desc);

create or replace function public.ats_get_public_job(
  p_job_code text,
  p_token text
)
returns table (
  job_code text,
  title text,
  department text,
  location text,
  employment_type text,
  close_date date
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select j.job_code, j.title, j.department, j.location, j.employment_type, j.close_date
  from public.ats_jobs j
  where j.job_code = upper(trim(p_job_code))
    and j.status = 'open'
    and j.public_application_enabled
    and (j.close_date is null or j.close_date >= current_date)
    and j.public_application_token_hash = encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
  limit 1;
$$;

create or replace function public.ats_submit_public_application(
  p_job_code text,
  p_token text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_location text,
  p_linkedin_url text,
  p_resume_url text,
  p_privacy_consent boolean,
  p_website text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  selected_job public.ats_jobs%rowtype;
  selected_candidate_id uuid;
  new_application_id uuid;
  new_candidate_code text;
  new_application_code text;
  normalized_email text;
begin
  if coalesce(trim(p_website), '') <> '' then
    raise exception 'Application could not be accepted';
  end if;

  if length(coalesce(p_token, '')) < 48 then
    raise exception 'This application link is invalid or expired';
  end if;

  select * into selected_job
  from public.ats_jobs j
  where j.job_code = upper(trim(p_job_code))
    and j.status = 'open'
    and j.public_application_enabled
    and (j.close_date is null or j.close_date >= current_date)
    and j.public_application_token_hash = encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'This application link is invalid or expired';
  end if;

  if coalesce(trim(p_full_name), '') = '' or length(trim(p_full_name)) > 160 then
    raise exception 'Enter a valid full name';
  end if;

  normalized_email := lower(trim(coalesce(p_email, '')));
  if length(normalized_email) > 254 or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address';
  end if;

  if length(coalesce(p_phone, '')) > 40
    or length(coalesce(p_location, '')) > 120
    or length(coalesce(p_linkedin_url, '')) > 500
    or length(coalesce(p_resume_url, '')) > 1000 then
    raise exception 'One or more application fields exceed the allowed length';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(normalized_email || selected_job.id::text, 0)
  );

  if not coalesce(p_privacy_consent, false) then
    raise exception 'Privacy consent is required to submit an application';
  end if;

  if coalesce(trim(p_linkedin_url), '') <> '' and trim(p_linkedin_url) !~ '^https://[^[:space:]]+$' then
    raise exception 'LinkedIn URL must start with https://';
  end if;

  if coalesce(trim(p_resume_url), '') <> '' and trim(p_resume_url) !~ '^https://[^[:space:]]+$' then
    raise exception 'Resume URL must start with https://';
  end if;

  select c.id into selected_candidate_id
  from public.ats_candidates c
  where lower(c.email) = normalized_email
  for update;

  if selected_candidate_id is null then
    new_candidate_code := 'CAN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
    insert into public.ats_candidates (
      candidate_code, full_name, email, phone, location, linkedin_url,
      resume_url, primary_source, consent_status, consent_date
    ) values (
      new_candidate_code, trim(p_full_name), normalized_email,
      nullif(trim(coalesce(p_phone, '')), ''),
      nullif(trim(coalesce(p_location, '')), ''),
      nullif(trim(coalesce(p_linkedin_url, '')), ''),
      nullif(trim(coalesce(p_resume_url, '')), ''),
      'Careers application link', 'consented', current_date
    ) returning id into selected_candidate_id;
  else
    if exists (
      select 1 from public.ats_candidates c
      where c.id = selected_candidate_id and c.consent_status = 'withdrawn'
    ) then
      raise exception 'Contact the recruitment team to reapply';
    end if;

    update public.ats_candidates c set
      full_name = trim(p_full_name),
      phone = coalesce(nullif(trim(coalesce(p_phone, '')), ''), c.phone),
      location = coalesce(nullif(trim(coalesce(p_location, '')), ''), c.location),
      linkedin_url = coalesce(nullif(trim(coalesce(p_linkedin_url, '')), ''), c.linkedin_url),
      resume_url = coalesce(nullif(trim(coalesce(p_resume_url, '')), ''), c.resume_url),
      consent_status = 'consented',
      consent_date = current_date
    where c.id = selected_candidate_id;
  end if;

  if exists (
    select 1 from public.ats_applications a
    where a.candidate_id = selected_candidate_id
      and a.job_id = selected_job.id
      and a.stage <> 'withdrawn'
  ) then
    raise exception 'An application for this role already exists';
  end if;

  new_application_code := 'APP-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.ats_applications (
    application_code, candidate_id, job_id, stage, review_status,
    source, owner_email
  ) values (
    new_application_code, selected_candidate_id, selected_job.id,
    'new_applicant', 'pending', 'Careers application link', selected_job.recruiter_email
  ) returning id into new_application_id;

  insert into public.ats_activity (
    application_id, candidate_id, job_id, event_type, summary
  ) values (
    new_application_id, selected_candidate_id, selected_job.id,
    'public_application_submitted', 'ผู้สมัครส่งใบสมัครผ่านหน้า Careers'
  );

  insert into public.ats_notifications (
    application_id, event_type, title, message
  ) values (
    new_application_id,
    'application_submitted',
    'ใบสมัครใหม่รอการตรวจสอบ',
    trim(p_full_name) || ' สมัครตำแหน่ง ' || selected_job.title
  );

  return jsonb_build_object(
    'application_code', new_application_code,
    'job_title', selected_job.title
  );
end;
$$;

alter table public.ats_user_roles enable row level security;

drop policy if exists ats_user_roles_read_self on public.ats_user_roles;
create policy ats_user_roles_read_self on public.ats_user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.ats_has_role(array['admin']));

drop policy if exists ats_user_roles_admin_manage on public.ats_user_roles;
create policy ats_user_roles_admin_manage on public.ats_user_roles
  for all to authenticated
  using (public.ats_has_role(array['admin']))
  with check (public.ats_has_role(array['admin']));

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ats_jobs', 'ats_candidates', 'ats_applications',
    'ats_interviews', 'ats_offers', 'ats_activity', 'ats_notifications'
  ] LOOP
    EXECUTE format('alter table public.%I enable row level security', table_name);
    EXECUTE format('drop policy if exists %I on public.%I', table_name || '_authenticated_access', table_name);
    EXECUTE format('drop policy if exists %I on public.%I', table_name || '_recruiter_access', table_name);
    EXECUTE format(
      'create policy %I on public.%I for all to authenticated using (public.ats_has_role(array[''admin'', ''recruiter''])) with check (public.ats_has_role(array[''admin'', ''recruiter'']))',
      table_name || '_recruiter_access', table_name
    );
  END LOOP;
END;
$$;

grant select, insert, update, delete on public.ats_user_roles to authenticated;
revoke all on function public.ats_has_role(text[]) from public;
grant execute on function public.ats_has_role(text[]) to authenticated;

grant select, insert, update, delete on
  public.ats_jobs,
  public.ats_candidates,
  public.ats_applications,
  public.ats_interviews,
  public.ats_offers,
  public.ats_activity,
  public.ats_notifications
  to authenticated;

revoke all on function public.ats_get_public_job(text, text) from public;
grant execute on function public.ats_get_public_job(text, text) to anon, authenticated;
revoke all on function public.ats_submit_public_application(text, text, text, text, text, text, text, text, boolean, text) from public;
grant execute on function public.ats_submit_public_application(text, text, text, text, text, text, text, text, boolean, text) to anon, authenticated;

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'ats_jobs', 'ats_candidates', 'ats_applications', 'ats_interviews', 'ats_offers'
  ] LOOP
    EXECUTE format('drop trigger if exists %I on public.%I', table_name || '_set_updated_at', table_name);
    EXECUTE format(
      'create trigger %I before update on public.%I for each row execute function public.ats_set_updated_at()',
      table_name || '_set_updated_at', table_name
    );
  END LOOP;
END;
$$;
