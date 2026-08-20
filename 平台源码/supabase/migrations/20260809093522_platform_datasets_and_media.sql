create table if not exists public.platform_datasets (
  slug text primary key,
  payload jsonb not null,
  is_public boolean not null default false,
  source_version text,
  updated_at timestamptz not null default now()
);

comment on table public.platform_datasets is
  'Versioned public datasets shared by the Hongtang 2D and 3D maps.';

alter table public.platform_datasets enable row level security;

revoke insert, update, delete on table public.platform_datasets from anon, authenticated;
grant select on table public.platform_datasets to anon, authenticated;

drop policy if exists "Public platform datasets are readable" on public.platform_datasets;
create policy "Public platform datasets are readable"
on public.platform_datasets
for select
to anon, authenticated
using (is_public = true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'hongtang-photos',
  'hongtang-photos',
  true,
  10485760,
  array['image/webp']::text[]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
