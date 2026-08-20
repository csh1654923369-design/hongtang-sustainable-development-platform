-- 红塘村可持续发展平台：首版领域模型
-- 业务表全部位于 public schema，并在下一份迁移中启用 RLS。

create extension if not exists pgcrypto with schema extensions;

create type public.app_role as enum ('resident', 'collaborator', 'admin');
create type public.issue_status as enum ('pending', 'accepted', 'assigned', 'processing', 'completed', 'rated', 'rejected');
create type public.project_status as enum ('planning', 'discussion', 'active', 'completed', 'maintenance');
create type public.review_status as enum ('pending', 'approved', 'revision', 'duplicate', 'rejected');
create type public.map_feature_type as enum ('issue', 'project', 'completed-action', 'public-service', 'ecology', 'culture', 'research-photo', 'building', 'road', 'water');
create type public.activity_status as enum ('open', 'full', 'ended');
create type public.survey_status as enum ('open', 'closed');
create type public.survey_type as enum ('single', 'multiple', 'mixed');
create type public.suggestion_status as enum ('pending', 'responded', 'discussion', 'adopted', 'declined');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  role public.app_role not null default 'resident',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goals (
  id text primary key,
  sort_order integer not null check (sort_order > 0),
  title text not null,
  short_title text not null,
  description text not null,
  meaning text not null default '',
  status_label text not null default '持续推进',
  color text not null default '#2F6B4F',
  icon text not null default 'Leaf',
  sdg_tags text[] not null default '{}',
  challenges text[] not null default '{}',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id text primary key,
  slug text not null unique,
  title text not null,
  summary text not null,
  background text not null default '',
  goal_id text not null references public.goals(id) on delete restrict,
  status public.project_status not null default 'planning',
  progress smallint not null default 0 check (progress between 0 and 100),
  location text not null default '',
  lead text not null default '',
  start_date date,
  recruiting boolean not null default false,
  project_type text not null default '',
  budget_label text not null default '待确认',
  participants text[] not null default '{}',
  accent text not null default '#2F6B4F',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_updates (
  id uuid primary key default gen_random_uuid(),
  project_id text not null references public.projects(id) on delete cascade,
  update_date date not null default current_date,
  title text not null,
  content text not null,
  stage text not null default '',
  author_name text not null default '平台项目组',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.indicators (
  id text primary key,
  goal_id text not null references public.goals(id) on delete cascade,
  name text not null,
  value numeric not null default 0,
  unit text not null default '',
  target numeric not null default 0,
  trend text not null default 'stable' check (trend in ('up', 'down', 'stable')),
  change_label text not null default '',
  source text not null default '待核实',
  completeness smallint not null default 0 check (completeness between 0 and 100),
  definition text not null default '',
  method text not null default '',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.indicator_records (
  id uuid primary key default gen_random_uuid(),
  indicator_id text not null references public.indicators(id) on delete cascade,
  period text not null,
  value numeric not null,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (indicator_id, period)
);

create sequence public.issue_code_seq start with 1;

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  code text unique,
  submitter_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (char_length(title) between 2 and 120),
  description text not null check (char_length(description) between 5 and 3000),
  issue_type text not null,
  location text not null,
  longitude numeric(10, 7) check (longitude between -180 and 180),
  latitude numeric(10, 7) check (latitude between -90 and 90),
  status public.issue_status not null default 'pending',
  urgent boolean not null default false,
  affects_daily_life boolean not null default false,
  public_name boolean not null default false,
  is_public boolean not null default false,
  assignee text,
  result text,
  goal_id text references public.goals(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  is_demo boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.issue_history (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  status public.issue_status not null,
  title text not null,
  description text not null default '',
  operator_id uuid references public.profiles(id) on delete set null,
  operator_name text not null default '平台',
  created_at timestamptz not null default now()
);

create table public.issue_ratings (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null unique references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id text primary key,
  title text not null,
  description text not null,
  activity_date date not null,
  start_time time,
  end_time time,
  location text not null,
  capacity integer not null check (capacity > 0),
  status public.activity_status not null default 'open',
  goal_id text references public.goals(id) on delete set null,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_registrations (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  contact_phone text,
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (activity_id, user_id)
);

create table public.surveys (
  id text primary key,
  title text not null,
  description text not null default '',
  survey_type public.survey_type not null default 'single',
  status public.survey_status not null default 'open',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.survey_options (
  id text primary key,
  survey_id text not null references public.surveys(id) on delete cascade,
  label text not null,
  sort_order integer not null default 0,
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id text not null references public.surveys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  option_ids text[] not null default '{}',
  response_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_id, user_id)
);

create table public.project_follows (
  project_id text not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  project_id text references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  content text not null check (char_length(content) between 5 and 3000),
  status public.suggestion_status not null default 'pending',
  response text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suggestion_supports (
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null,
  target_type text not null check (target_type in ('issue', 'project', 'suggestion', 'research')),
  target_id text not null,
  content text not null check (char_length(content) between 1 and 2000),
  is_public boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.spatial_features (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  feature_type public.map_feature_type not null,
  status_label text not null default '',
  location text not null,
  description text not null default '',
  longitude numeric(10, 7) not null check (longitude between -180 and 180),
  latitude numeric(10, 7) not null check (latitude between -90 and 90),
  geojson jsonb not null default '{}'::jsonb,
  goal_id text references public.goals(id) on delete set null,
  public_participation boolean not null default false,
  linked_type text,
  linked_id text,
  image_label text not null default '',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.research_submissions (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  submission_type text not null,
  survey_date date,
  researchers text not null,
  location text not null default '',
  description text not null,
  source text not null,
  public_allowed boolean not null default false,
  status public.review_status not null default 'pending',
  review_note text,
  feature_type public.map_feature_type,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_records (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.research_submissions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  status public.review_status not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table public.media_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  bucket_id text not null,
  object_path text not null,
  file_name text not null,
  media_type text not null,
  issue_id uuid references public.issues(id) on delete cascade,
  research_submission_id uuid references public.research_submissions(id) on delete cascade,
  public_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (bucket_id, object_path)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  content text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.village_content (
  id text primary key,
  title text not null,
  summary text not null default '',
  body jsonb not null default '{}'::jsonb,
  source_note text not null default '待核实',
  published boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'goals', 'projects', 'project_updates', 'indicators',
    'indicator_records', 'issues', 'issue_ratings', 'activities', 'surveys',
    'survey_options', 'survey_responses', 'suggestions', 'comments',
    'spatial_features', 'research_submissions', 'village_content'
  ]
  loop
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
  end loop;
end;
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '新用户'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.generate_issue_code()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.code is null then
    new.code := format(
      'HT-%s-%s',
      extract(year from current_date)::integer,
      lpad(nextval('public.issue_code_seq')::text, 4, '0')
    );
  end if;
  return new;
end;
$$;

create trigger set_issue_code
  before insert on public.issues
  for each row execute function public.generate_issue_code();

create index issues_submitter_idx on public.issues(submitter_id, submitted_at desc);
create index issues_status_idx on public.issues(status, updated_at desc);
create index issues_project_idx on public.issues(project_id) where project_id is not null;
create index issue_history_issue_idx on public.issue_history(issue_id, created_at);
create index project_updates_project_idx on public.project_updates(project_id, update_date desc);
create index activity_registrations_user_idx on public.activity_registrations(user_id, created_at desc);
create index survey_responses_user_idx on public.survey_responses(user_id, created_at desc);
create index suggestions_project_idx on public.suggestions(project_id, created_at desc);
create index comments_target_idx on public.comments(target_type, target_id, created_at);
create index spatial_features_type_idx on public.spatial_features(feature_type, published);
create index research_submissions_submitter_idx on public.research_submissions(submitter_id, created_at desc);
create index notifications_user_idx on public.notifications(user_id, read_at, created_at desc);
create index audit_logs_created_idx on public.audit_logs(created_at desc);
