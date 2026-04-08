-- supabase/migrations/012_collaboration_phase4.sql
-- Phase 4: Feedback, Notes, and Activity Timeline

-- ===========================
-- Enum: activity_event_type
-- ===========================
create type public.activity_event_type as enum (
  'candidate_created',
  'candidate_imported',
  'stage_changed',
  'candidate_rejected',
  'owner_changed',
  'feedback_added',
  'feedback_updated',
  'feedback_deleted',
  'note_added',
  'note_updated',
  'note_deleted',
  'email_sent',
  'email_received',
  'email_replied'
);

-- ===========================
-- Table: stage_ratings
-- One shared rating per (enterprise_id, candidate_id, pipeline_stage_id)
-- Any team member can set or overwrite it (last write wins)
-- ===========================
create table public.stage_ratings (
  id                uuid primary key default gen_random_uuid(),
  enterprise_id     uuid not null references public.enterprises(id) on delete cascade,
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  pipeline_stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  rating            int not null check (rating between 1 and 5),
  updated_by        uuid references auth.users(id) on delete set null,
  updated_at        timestamptz not null default now(),
  unique (enterprise_id, candidate_id, pipeline_stage_id)
);

create index stage_ratings_enterprise_id_idx on public.stage_ratings(enterprise_id);
create index stage_ratings_candidate_id_idx on public.stage_ratings(candidate_id);

alter table public.stage_ratings enable row level security;

create policy "members can select own enterprise stage ratings"
  on public.stage_ratings for select
  using (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can insert stage ratings"
  on public.stage_ratings for insert
  with check (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can update stage ratings"
  on public.stage_ratings for update
  using (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can delete stage ratings"
  on public.stage_ratings for delete
  using (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

-- ===========================
-- Table: feedback_comments
-- One comment per (enterprise_id, candidate_id, pipeline_stage_id, user_id)
-- Each team member owns their own comment
-- user_name stored as snapshot at write time
-- ===========================
create table public.feedback_comments (
  id                uuid primary key default gen_random_uuid(),
  enterprise_id     uuid not null references public.enterprises(id) on delete cascade,
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  pipeline_stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  user_name         text not null,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (enterprise_id, candidate_id, pipeline_stage_id, user_id)
);

create index feedback_comments_enterprise_id_idx on public.feedback_comments(enterprise_id);
create index feedback_comments_candidate_id_idx on public.feedback_comments(candidate_id);

alter table public.feedback_comments enable row level security;

create policy "members can select own enterprise feedback comments"
  on public.feedback_comments for select
  using (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can insert own feedback comments"
  on public.feedback_comments for insert
  with check (
    user_id = auth.uid()
    and enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can update own feedback comments"
  on public.feedback_comments for update
  using (user_id = auth.uid());

create policy "members can delete own feedback comments"
  on public.feedback_comments for delete
  using (user_id = auth.uid());

-- ===========================
-- Table: candidate_notes
-- Multiple notes per user per (candidate, stage)
-- user_name stored as snapshot at write time
-- ===========================
create table public.candidate_notes (
  id                uuid primary key default gen_random_uuid(),
  enterprise_id     uuid not null references public.enterprises(id) on delete cascade,
  candidate_id      uuid not null references public.candidates(id) on delete cascade,
  pipeline_stage_id uuid not null references public.pipeline_stages(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  user_name         text not null,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index candidate_notes_enterprise_id_idx on public.candidate_notes(enterprise_id);
create index candidate_notes_candidate_id_idx on public.candidate_notes(candidate_id);

alter table public.candidate_notes enable row level security;

create policy "members can select own enterprise notes"
  on public.candidate_notes for select
  using (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can insert own notes"
  on public.candidate_notes for insert
  with check (
    user_id = auth.uid()
    and enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );

create policy "members can update own notes"
  on public.candidate_notes for update
  using (user_id = auth.uid());

create policy "members can delete own notes"
  on public.candidate_notes for delete
  using (user_id = auth.uid());

-- ===========================
-- Table: activity_timeline
-- Immutable event log — no UPDATE or DELETE policies
-- SELECT restricted to admins and owners only
-- ===========================
create table public.activity_timeline (
  id             uuid primary key default gen_random_uuid(),
  enterprise_id  uuid not null references public.enterprises(id) on delete cascade,
  candidate_id   uuid not null references public.candidates(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  event_type     public.activity_event_type not null,
  actor_id       uuid references auth.users(id) on delete set null,
  actor_name     text not null,
  description    text not null,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index activity_timeline_enterprise_id_idx on public.activity_timeline(enterprise_id);
create index activity_timeline_candidate_id_idx on public.activity_timeline(candidate_id);
create index activity_timeline_created_at_idx on public.activity_timeline(created_at desc);

alter table public.activity_timeline enable row level security;

create policy "admins and owners can select activity timeline"
  on public.activity_timeline for select
  using (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
        and role in ('admin', 'owner')
    )
  );

create policy "members can insert activity timeline events"
  on public.activity_timeline for insert
  with check (
    enterprise_id in (
      select enterprise_id from public.enterprise_members
      where user_id = auth.uid()
    )
  );
