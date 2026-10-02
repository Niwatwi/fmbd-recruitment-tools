# ATS Setup and Import Guide

## 1. Create the ATS tables

In the Supabase SQL Editor, run `supabase/ats_schema.sql`. The migration is repeatable and creates ATS tables separately from the existing `data_app` workforce table.

## 2. Grant the first admin role

Replace the email below with an existing Supabase Auth user's email and run this statement from the SQL Editor:

```sql
insert into public.ats_user_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) = lower('your-admin@company.com')
on conflict (user_id) do update set role = excluded.role;
```

Grant a recruiter role the same way, changing `'admin'` to `'recruiter'`. ATS tables are readable and writable only by users assigned one of these roles. The first admin assignment must be made by a trusted database administrator because no app role exists yet.

## 3. Import in dependency order

1. Jobs: `public/templates/ats-jobs-template.csv`
2. Candidate profiles: `public/templates/ats-candidates-template.csv`
3. Applications: `public/templates/ats-applications-template.csv`

Use UTF-8 CSV or Excel. Preserve all `*_code` columns as text. Codes are case-insensitive in the importer and should remain stable once shared between files.

## 4. Public application links and review

After running the updated schema, open an open requisition in the ATS and choose **Generate link**. The app stores only a SHA-256 hash of the random token. Copy the link immediately; generating another link rotates the token and invalidates the previous URL.

The public form submits through `ats_submit_public_application`, which accepts only an enabled, open requisition, requires privacy consent, rejects duplicate applications to the same job, and creates an admin inbox notification. Applicants cannot select or change their review status. Recruiters approve or decline from the ATS; approval moves the application to Screening.

## 5. Interview invitation email

The ATS records interview times even when outbound email is not configured. To send invitations automatically, set `RESEND_API_KEY` and `RESEND_FROM_EMAIL` on the server/deployment environment using `.env.example` as a guide. Verify the sender domain with Resend first. Never prefix these values with `NEXT_PUBLIC_` or expose them in browser code. Without these values, the appointment is saved and the admin receives an explicit email-not-sent message.

The public form captures a candidate's privacy consent date. Before production, link the form to Riverpro's approved privacy notice and confirm retention, access, and deletion procedures under applicable privacy law.

## Jobs template

Required: `job_code`, `title`.

Optional: `department`, `location`, `employment_type`, `headcount`, `hiring_manager_email`, `recruiter_email`, `status`, `open_date`, `close_date`, `description`.

`status`: `open`, `on_hold`, `closed`, `cancelled`. `employment_type`: `Full-time`, `Part-time`, `Contract`, `Temporary`, `Internship`.

## Candidate profile template

Required: `candidate_code`, `full_name`.

Optional: `email`, `phone`, `location`, `linkedin_url`, `portfolio_url`, `resume_url`, `primary_source`, `source_detail`, `consent_status`, `consent_date`.

`consent_status`: `not_recorded`, `consented`, `withdrawn`. Email addresses must not be duplicated across different candidate codes. Record consent only after the applicable privacy notice and lawful basis have been confirmed.

## Application template

Required: `application_code`, `candidate_code`, `job_code`.

Optional: `stage`, `source`, `owner_email`, `applied_at`, `next_action_at`, `notes`.

`stage`: `new_applicant`, `screening`, `interview`, `assessment`, `offer`, `hired`, `rejected`, `withdrawn`. Datetimes should use ISO 8601, for example `2026-10-02T09:00:00+07:00`. Candidate and job codes must already exist.

Interviews and offers are created from the application detail workflow so scheduling, approvals, and activity history stay linked to the application. Restrict admin access, compensation, CV links, and interview feedback according to company policy and applicable privacy law.
