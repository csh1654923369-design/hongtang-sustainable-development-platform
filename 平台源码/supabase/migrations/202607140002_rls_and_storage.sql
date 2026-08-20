-- 红塘村可持续发展平台：权限、RLS 与私有文件桶

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.generate_issue_code() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

grant usage on schema public to anon, authenticated;
grant usage, select on all sequences in schema public to authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles', 'goals', 'projects', 'project_updates', 'indicators', 'indicator_records',
    'issues', 'issue_history', 'issue_ratings', 'activities', 'activity_registrations',
    'surveys', 'survey_options', 'survey_responses', 'project_follows', 'suggestions',
    'suggestion_supports', 'comments', 'spatial_features', 'research_submissions',
    'review_records', 'media_files', 'notifications', 'audit_logs', 'village_content'
  ]
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('grant all on table public.%I to service_role', table_name);
  end loop;
end;
$$;

-- 对外发布内容：游客只读已发布记录，管理员维护。
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'goals', 'projects', 'project_updates', 'indicators', 'indicator_records',
    'activities', 'surveys', 'survey_options', 'spatial_features', 'village_content'
  ]
  loop
    execute format('grant select on table public.%I to anon, authenticated', table_name);
    execute format('grant insert, update, delete on table public.%I to authenticated', table_name);
    execute format('create policy "Public reads published records" on public.%I for select to anon using (published = true)', table_name);
    execute format('create policy "Members read published records" on public.%I for select to authenticated using (published = true or (select public.is_admin()))', table_name);
    execute format('create policy "Admins insert records" on public.%I for insert to authenticated with check ((select public.is_admin()))', table_name);
    execute format('create policy "Admins update records" on public.%I for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))', table_name);
    execute format('create policy "Admins delete records" on public.%I for delete to authenticated using ((select public.is_admin()))', table_name);
  end loop;
end;
$$;

-- 个人资料：用户只读、修改自己的公开资料；角色只能由服务端管理。
grant select on public.profiles to authenticated;
grant update (display_name, avatar_url, updated_at) on public.profiles to authenticated;

create policy "Members read own profile"
  on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select public.is_admin()));

create policy "Members update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Admins manage profiles"
  on public.profiles for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 问题上报与处理记录。
grant select, insert, update, delete on public.issues to authenticated;
grant select, insert, update, delete on public.issue_history to authenticated;
grant select, insert, update on public.issue_ratings to authenticated;

create policy "Members read visible issues"
  on public.issues for select to authenticated
  using (submitter_id = (select auth.uid()) or is_public or (select public.is_admin()));

create policy "Members submit own issues"
  on public.issues for insert to authenticated
  with check (submitter_id = (select auth.uid()) and status = 'pending');

create policy "Admins update issues"
  on public.issues for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete issues"
  on public.issues for delete to authenticated
  using ((select public.is_admin()));

create policy "Members read visible issue history"
  on public.issue_history for select to authenticated
  using (exists (select 1 from public.issues where issues.id = issue_history.issue_id));

create policy "Admins insert issue history"
  on public.issue_history for insert to authenticated
  with check ((select public.is_admin()));

create policy "Admins update issue history"
  on public.issue_history for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete issue history"
  on public.issue_history for delete to authenticated
  using ((select public.is_admin()));

create policy "Members read own ratings"
  on public.issue_ratings for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Submitters rate completed issues"
  on public.issue_ratings for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.issues
      where issues.id = issue_ratings.issue_id
        and issues.submitter_id = (select auth.uid())
        and issues.status in ('completed', 'rated')
    )
  );

create policy "Submitters update own ratings"
  on public.issue_ratings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 活动、问卷和项目关注均按当前用户隔离。
grant select, insert, delete on public.activity_registrations to authenticated;
grant select, insert, update, delete on public.survey_responses to authenticated;
grant select, insert, delete on public.project_follows to authenticated;

create policy "Members read own registrations"
  on public.activity_registrations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members register themselves"
  on public.activity_registrations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.activities where activities.id = activity_registrations.activity_id and activities.status = 'open')
  );

create policy "Members cancel own registrations"
  on public.activity_registrations for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members read own survey responses"
  on public.survey_responses for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members submit own survey responses"
  on public.survey_responses for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.surveys where surveys.id = survey_responses.survey_id and surveys.status = 'open')
  );

create policy "Members update own survey responses"
  on public.survey_responses for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Admins delete survey responses"
  on public.survey_responses for delete to authenticated
  using ((select public.is_admin()));

create policy "Members read own follows"
  on public.project_follows for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members follow projects"
  on public.project_follows for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members unfollow projects"
  on public.project_follows for delete to authenticated
  using (user_id = (select auth.uid()));

-- 建议、支持与评论。
grant select on public.suggestions to anon, authenticated;
grant insert, update, delete on public.suggestions to authenticated;
grant select, insert, delete on public.suggestion_supports to authenticated;
grant select on public.comments to anon, authenticated;
grant insert, update, delete on public.comments to authenticated;

create policy "Public reads responded suggestions"
  on public.suggestions for select to anon
  using (status in ('responded', 'discussion', 'adopted'));

create policy "Members read visible suggestions"
  on public.suggestions for select to authenticated
  using (author_id = (select auth.uid()) or status in ('responded', 'discussion', 'adopted') or (select public.is_admin()));

create policy "Members submit suggestions"
  on public.suggestions for insert to authenticated
  with check (author_id = (select auth.uid()) and status = 'pending');

create policy "Admins update suggestions"
  on public.suggestions for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete suggestions"
  on public.suggestions for delete to authenticated
  using ((select public.is_admin()));

create policy "Members read supports"
  on public.suggestion_supports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members support suggestions"
  on public.suggestion_supports for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Members remove own support"
  on public.suggestion_supports for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Public reads public comments"
  on public.comments for select to anon
  using (is_public);

create policy "Members read visible comments"
  on public.comments for select to authenticated
  using (is_public or author_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members submit own comments"
  on public.comments for insert to authenticated
  with check (author_id = (select auth.uid()));

create policy "Members update own comments"
  on public.comments for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));

create policy "Members delete own comments"
  on public.comments for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- 研究资料、审核记录和媒体元数据。
grant select on public.research_submissions to anon, authenticated;
grant insert, update, delete on public.research_submissions to authenticated;
grant select, insert, update, delete on public.review_records to authenticated;
grant select, insert, update, delete on public.media_files to authenticated;

create policy "Public reads approved research"
  on public.research_submissions for select to anon
  using (public_allowed and status = 'approved');

create policy "Members read visible research"
  on public.research_submissions for select to authenticated
  using (submitter_id = (select auth.uid()) or (public_allowed and status = 'approved') or (select public.is_admin()));

create policy "Members submit research"
  on public.research_submissions for insert to authenticated
  with check (submitter_id = (select auth.uid()) and status = 'pending');

create policy "Members revise pending research"
  on public.research_submissions for update to authenticated
  using (submitter_id = (select auth.uid()) and status in ('pending', 'revision'))
  with check (submitter_id = (select auth.uid()) and status in ('pending', 'revision'));

create policy "Admins manage research"
  on public.research_submissions for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Owners read research reviews"
  on public.review_records for select to authenticated
  using (
    reviewer_id = (select auth.uid())
    or exists (
      select 1 from public.research_submissions
      where research_submissions.id = review_records.submission_id
        and research_submissions.submitter_id = (select auth.uid())
    )
    or (select public.is_admin())
  );

create policy "Admins insert research reviews"
  on public.review_records for insert to authenticated
  with check ((select public.is_admin()) and reviewer_id = (select auth.uid()));

create policy "Admins update research reviews"
  on public.review_records for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Admins delete research reviews"
  on public.review_records for delete to authenticated
  using ((select public.is_admin()));

create policy "Owners read media metadata"
  on public.media_files for select to authenticated
  using (owner_id = (select auth.uid()) or public_allowed or (select public.is_admin()));

create policy "Owners insert media metadata"
  on public.media_files for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy "Owners update media metadata"
  on public.media_files for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()))
  with check (owner_id = (select auth.uid()) or (select public.is_admin()));

create policy "Owners delete media metadata"
  on public.media_files for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));

-- 通知与审计。
grant select, update, delete on public.notifications to authenticated;
grant select on public.audit_logs to authenticated;

create policy "Members read own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Members update own notifications"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Members delete own notifications"
  on public.notifications for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins read audit logs"
  on public.audit_logs for select to authenticated
  using ((select public.is_admin()));

-- 文件桶：问题照片和研究资料默认私有；公开媒体只允许管理员写入。
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('issue-media', 'issue-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('research-files', 'research-files', false, 26214400, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/csv']),
  ('public-media', 'public-media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Members upload own private files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('issue-media', 'research-files')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Owners read private files"
  on storage.objects for select to authenticated
  using (
    bucket_id in ('issue-media', 'research-files')
    and (owner_id = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "Owners update private files"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('issue-media', 'research-files')
    and (owner_id = (select auth.uid())::text or (select public.is_admin()))
  )
  with check (
    bucket_id in ('issue-media', 'research-files')
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "Owners delete private files"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('issue-media', 'research-files')
    and (owner_id = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "Admins upload public media"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-media' and (select public.is_admin()));

create policy "Admins update public media"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()))
  with check (bucket_id = 'public-media' and (select public.is_admin()));

create policy "Admins delete public media"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-media' and (select public.is_admin()));
