-- Every pending migration in this folder, concatenated in one script.
-- Supabase Dashboard -> SQL Editor, project mbqkkwpiogyopfvlolgf.
-- Safe to re-run.
--
-- Probed 2026-09-07: item_movements and the visit_enquiries columns are already
-- live; every other column below is still missing from the database.


-- ============================================================
-- add-batch-fee-fields.sql
-- ============================================================
-- Fee discount and remark on a batch.
-- Run once in the Supabase SQL editor. Safe to re-run.
alter table public.batches
  add column if not exists "feeDiscount" double precision not null default 0,
  add column if not exists "remark" text;


-- ============================================================
-- add-batch-instructor.sql
-- ============================================================
-- The teacher who takes a batch.
--
-- Instructor used to be picked per timing slot, which meant the same name had
-- to be re-entered for every day of the week and nothing tied a teacher to the
-- batch itself. It is now chosen once, when the course is assigned to the
-- batch, and lives here.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
alter table public.batches
  add column if not exists "instructor" text;


-- ============================================================
-- add-batch-timing-class-fields.sql
-- ============================================================
-- Live classes have no table of their own: the ViewLiveClasses / LiveClassSetup
-- screens treat one weekly `batch_timings` slot as one class. The columns below
-- are the parts of that UI the base table cannot store -- without them a class
-- cannot be titled, given a meeting link, or cancelled, and `getLiveClasses`
-- falls back to deriving everything from the slot's day and time.
--
-- Run this in the Supabase SQL editor. It is safe to re-run.

alter table public.batch_timings
  add column if not exists "title" text,
  add column if not exists "platform" text,
  add column if not exists "meetingLink" text,
  add column if not exists "meetingId" text,
  add column if not exists "description" text,
  add column if not exists "status" text not null default 'scheduled',
  add column if not exists "recorded" boolean not null default false;


-- ============================================================
-- add-item-movement.sql
-- ============================================================
-- Run these in Supabase Dashboard → SQL Editor
-- Project: mbqkkwpiogyopfvlolgf

-- ============================================
-- Table: item_movements
-- ============================================
create table if not exists public.item_movements (
  id text primary key,
  direction text not null,
  item text not null,
  item_id text,
  category text,
  quantity integer default 0,
  party text,
  department text,
  status text,
  courier text,
  tracking text,
  notes text,
  dispatch_date date,
  receive_date date,
  branch_id text references public.branches(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.item_movements enable row level security;

drop policy if exists "Allow public read" on public.item_movements;
create policy "Allow public read" on public.item_movements
  for select using (true);

drop policy if exists "Allow public insert" on public.item_movements;
create policy "Allow public insert" on public.item_movements
  for insert with check (true);

drop policy if exists "Allow public update" on public.item_movements;
create policy "Allow public update" on public.item_movements
  for update using (true);

drop policy if exists "Allow public delete" on public.item_movements;
create policy "Allow public delete" on public.item_movements
  for delete using (true);

-- ============================================
-- Table: visit_enquiries (add new columns)
-- ============================================
alter table if exists public.visit_enquiries
  add column if not exists whatsapp_number text,
  add column if not exists source text,
  add column if not exists registration_date date,
  add column if not exists call_type text,
  add column if not exists check_in timestamp with time zone,
  add column if not exists check_out timestamp with time zone;


-- ============================================================
-- add-notice-meeting-fields.sql
-- ============================================================
-- Meeting details on a branch notice.
-- Run once in the Supabase SQL editor. Safe to re-run.
alter table public.branch_notices
  add column if not exists "meetingTime" timestamptz,
  add column if not exists "meetingLink" text;


-- ============================================================
-- add-online-exam-fields.sql
-- ============================================================
-- The Create Online Exam screen collects a description, an end time, a duration,
-- a question count, negative marking and the proctoring toggles. None of those
-- columns exist on `exams`, so every one of those inputs was silently discarded
-- on save. `createExam`/`updateExam` retry without them until this has been run.
--
-- Run this in the Supabase SQL editor. It is safe to re-run.

alter table public.exams
  add column if not exists "description" text,
  add column if not exists "endDate" timestamptz,
  add column if not exists "duration" integer,
  add column if not exists "totalQuestions" integer,
  add column if not exists "negativeMarking" numeric,
  add column if not exists "shuffleQuestions" boolean not null default true,
  add column if not exists "shuffleOptions" boolean not null default true,
  add column if not exists "preventTabSwitch" boolean not null default false,
  add column if not exists "fullScreen" boolean not null default false,
  add column if not exists "webcam" boolean not null default false,
  add column if not exists "showResult" boolean not null default true,
  add column if not exists "showAnswers" boolean not null default false,
  add column if not exists "allowReview" boolean not null default true,
  add column if not exists "autoSubmit" boolean not null default true;


-- ============================================================
-- add-portal-settings.sql
-- ============================================================
-- Portal and payment feature columns on branches.
--
-- These shipped in the branch settings UI before this file was ever run, so
-- every Create Branch attempt failed with PGRST204 ("Could not find the
-- 'onlineFeePayment' column of 'branches' in the schema cache"). That left the
-- organisation with zero branches, which in turn emptied every branch dropdown
-- in the app and disabled every branch-gated form.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
--
-- NOTE: createBranch/updateBranch now retry without these columns on PGRST204,
-- so branch creation works even before this is run - but the three toggles are
-- silently dropped until it is.
alter table public.branches
  add column if not exists "onlineFeePayment" boolean not null default false,
  add column if not exists "studentPortal" boolean not null default false,
  add column if not exists "parentPortal" boolean not null default false;


-- ============================================================
-- add-student-fee-fields.sql
-- ============================================================
-- Columns the student + fee screens write but the live database never got.
-- Probed against the live PostgREST endpoint, not backend/prisma/schema.prisma
-- (which does not match the live database).
-- Run once in the Supabase SQL editor. Safe to re-run.

-- Students -------------------------------------------------------------------
-- The online-admission review screen records a decision note and a list of
-- documents it asked the applicant to re-upload. The admission form collects
-- guardian / emergency / previous-school details. None of these existed, so the
-- writes failed with PGRST204 and the reviewer's decision was lost on reload.
alter table public.students
  add column if not exists "decisionNote" text,
  add column if not exists "requestedDocuments" text,
  add column if not exists "documents" jsonb,
  add column if not exists "guardianName" text,
  add column if not exists "guardianPhone" text,
  add column if not exists "emergencyName" text,
  add column if not exists "emergencyPhone" text,
  add column if not exists "previousSchool" text,
  add column if not exists "previousClass" text,
  add column if not exists "alternatePhone" text,
  add column if not exists "rollNo" text,
  add column if not exists "feeGroupId" text;

-- Fee invoices ---------------------------------------------------------------
-- Discounts and late fees are shown and edited in Fee Allocation / Due Fee
-- Collection but had nowhere to be stored.
alter table public.fee_invoices
  add column if not exists "discount" numeric(12, 2) not null default 0,
  add column if not exists "lateFee" numeric(12, 2) not null default 0,
  add column if not exists "notes" text;

-- Fee payments ---------------------------------------------------------------
-- Fee Allocation attaches a free-text note to a payment (e.g. "Allocation
-- adjustment"); there was no column for it.
alter table public.fee_payments
  add column if not exists "note" text;

-- NOTE: the application code degrades gracefully if this migration has not been
-- run: every write that touches these columns retries without them on PGRST204.


-- ============================================================
-- add-website-settings-fields.sql
-- ============================================================
-- The Branch > Website Settings screen edits branding, contact details, social
-- links, the public-portal toggles and the domain lifecycle dates. `branch_settings`
-- only had columns for the seven SEO/domain fields, so everything else was typed
-- in and thrown away on save. `updateBranchSettings` drops whatever is still
-- missing and tells the user, so the screen works before and after this runs.
--
-- Run this in the Supabase SQL editor. It is safe to re-run.

alter table public.branch_settings
  -- Branding. Images are stored as data URLs by the uploader.
  add column if not exists "logo" text,
  add column if not exists "favicon" text,
  add column if not exists "banner" text,
  add column if not exists "bannerTitle" text,
  add column if not exists "bannerSubtitle" text,

  -- Domain
  add column if not exists "wwwRedirect" boolean not null default true,
  add column if not exists "registrationDate" date,
  add column if not exists "expiryDate" date,
  add column if not exists "renewalDate" date,

  -- Public contact details
  add column if not exists "email" text,
  add column if not exists "phone" text,
  add column if not exists "address" text,

  -- Public feature toggles
  add column if not exists "onlineAdmissions" boolean not null default true,
  add column if not exists "onlineFees" boolean not null default true,
  add column if not exists "studentPortal" boolean not null default true,
  add column if not exists "parentPortal" boolean not null default false,

  -- Social links
  add column if not exists "facebook" text,
  add column if not exists "twitter" text,
  add column if not exists "instagram" text,
  add column if not exists "linkedin" text,
  add column if not exists "youtube" text,
  add column if not exists "whatsapp" text;


-- ============================================================
-- course-category-free-text.sql
-- ============================================================
-- Let a course category be typed, not only picked.
--
-- `courses.category` is the enum `CourseCategory`, so anything outside its
-- seven members is rejected by Postgres with 22P02. Converting the column to
-- text keeps every existing value exactly as it is - the enum labels are just
-- read back as strings - while letting a branch name a category the enum never
-- anticipated.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'courses'
      and column_name = 'category' and data_type = 'USER-DEFINED'
  ) then
    -- The default is enum-typed too, so it has to come off before the cast.
    alter table public.courses alter column "category" drop default;
    alter table public.courses alter column "category" type text using "category"::text;
    alter table public.courses alter column "category" set default 'COMPUTER';
  end if;
end $$;

-- The type itself is left in place: dropping it would fail if anything else
-- still references it, and an unused type costs nothing.


-- Make PostgREST pick up the new columns immediately.
notify pgrst, 'reload schema';
