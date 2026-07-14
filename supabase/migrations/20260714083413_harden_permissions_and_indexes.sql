-- 将 SECURITY DEFINER 权限函数移出 Data API 暴露的 public schema。
create schema if not exists private;

revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

alter function public.is_admin() set schema private;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated, service_role;

alter default privileges in schema private
  revoke execute on functions from public, anon;

-- 合并同一角色、同一操作上的 permissive policies，减少重复策略计算。
drop policy "Members update own profile" on public.profiles;
drop policy "Admins manage profiles" on public.profiles;

create policy "Members or admins update profiles"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

drop policy "Members submit research" on public.research_submissions;
drop policy "Members revise pending research" on public.research_submissions;
drop policy "Admins manage research" on public.research_submissions;

create policy "Members or admins insert research"
  on public.research_submissions for insert to authenticated
  with check (
    (submitter_id = (select auth.uid()) and status = 'pending')
    or (select private.is_admin())
  );

create policy "Members or admins update research"
  on public.research_submissions for update to authenticated
  using (
    (submitter_id = (select auth.uid()) and status in ('pending', 'revision'))
    or (select private.is_admin())
  )
  with check (
    (submitter_id = (select auth.uid()) and status in ('pending', 'revision'))
    or (select private.is_admin())
  );

create policy "Admins delete research"
  on public.research_submissions for delete to authenticated
  using ((select private.is_admin()));

-- 为外键补充覆盖索引。可空外键使用部分索引，减少无效索引项。
create index activities_goal_id_idx
  on public.activities(goal_id)
  where goal_id is not null;

create index audit_logs_actor_id_idx
  on public.audit_logs(actor_id)
  where actor_id is not null;

create index comments_author_id_idx on public.comments(author_id);
create index indicators_goal_id_idx on public.indicators(goal_id);

create index issue_history_operator_id_idx
  on public.issue_history(operator_id)
  where operator_id is not null;

create index issue_ratings_user_id_idx on public.issue_ratings(user_id);

create index issues_goal_id_idx
  on public.issues(goal_id)
  where goal_id is not null;

create index media_files_issue_id_idx
  on public.media_files(issue_id)
  where issue_id is not null;

create index media_files_owner_id_idx on public.media_files(owner_id);

create index media_files_research_submission_id_idx
  on public.media_files(research_submission_id)
  where research_submission_id is not null;

create index project_follows_user_id_idx on public.project_follows(user_id);
create index projects_goal_id_idx on public.projects(goal_id);
create index review_records_reviewer_id_idx on public.review_records(reviewer_id);
create index review_records_submission_id_idx on public.review_records(submission_id);

create index spatial_features_goal_id_idx
  on public.spatial_features(goal_id)
  where goal_id is not null;

create index suggestion_supports_user_id_idx on public.suggestion_supports(user_id);
create index suggestions_author_id_idx on public.suggestions(author_id);
create index survey_options_survey_id_idx on public.survey_options(survey_id);
