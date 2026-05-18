-- Tarkana Workstream 01 RLS policy draft.
-- Apply after Drizzle creates the base tables and after Supabase Auth is enabled.
-- This file intentionally keeps challenge mutations server-controlled; direct browser
-- writes to sensitive challenge tables should remain disabled unless a later plan adds
-- narrowly scoped policies.

alter table public.users_profile enable row level security;
alter table public.categories enable row level security;
alter table public.question_rules enable row level security;
alter table public.challenge_configs enable row level security;
alter table public.challenge_sessions enable row level security;
alter table public.session_questions enable row level security;
alter table public.session_answers enable row level security;
alter table public.admin_audit_log enable row level security;

create or replace function public.tarkana_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.users_profile
		where id = auth.uid()
			and role = 'admin'
	);
$$;

drop policy if exists "profiles own read" on public.users_profile;
create policy "profiles own read"
on public.users_profile
for select
to authenticated
using (id = auth.uid() or public.tarkana_is_admin());

drop policy if exists "profiles own limited update" on public.users_profile;
create policy "profiles own limited update"
on public.users_profile
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

revoke update on public.users_profile from authenticated;
grant update (display_name) on public.users_profile to authenticated;

drop policy if exists "categories admin manage" on public.categories;
create policy "categories admin manage"
on public.categories
for all
to authenticated
using (public.tarkana_is_admin())
with check (public.tarkana_is_admin());

drop policy if exists "categories authenticated read active" on public.categories;
create policy "categories authenticated read active"
on public.categories
for select
to authenticated
using (is_active = true or public.tarkana_is_admin());

drop policy if exists "question rules admin manage" on public.question_rules;
create policy "question rules admin manage"
on public.question_rules
for all
to authenticated
using (public.tarkana_is_admin())
with check (public.tarkana_is_admin());

drop policy if exists "question rules authenticated read active" on public.question_rules;
create policy "question rules authenticated read active"
on public.question_rules
for select
to authenticated
using (is_active = true or public.tarkana_is_admin());

drop policy if exists "challenge configs admin manage" on public.challenge_configs;
create policy "challenge configs admin manage"
on public.challenge_configs
for all
to authenticated
using (public.tarkana_is_admin())
with check (public.tarkana_is_admin());

drop policy if exists "challenge configs authenticated read active" on public.challenge_configs;
create policy "challenge configs authenticated read active"
on public.challenge_configs
for select
to authenticated
using (is_active = true or public.tarkana_is_admin());

drop policy if exists "sessions own read" on public.challenge_sessions;
create policy "sessions own read"
on public.challenge_sessions
for select
to authenticated
using (user_id = auth.uid() or public.tarkana_is_admin());

drop policy if exists "session questions own session read" on public.session_questions;
create policy "session questions own session read"
on public.session_questions
for select
to authenticated
using (
	exists (
		select 1
		from public.challenge_sessions
		where challenge_sessions.id = session_questions.session_id
			and (challenge_sessions.user_id = auth.uid() or public.tarkana_is_admin())
	)
);

drop policy if exists "answers own read" on public.session_answers;
create policy "answers own read"
on public.session_answers
for select
to authenticated
using (user_id = auth.uid() or public.tarkana_is_admin());

drop policy if exists "admin audit admin read" on public.admin_audit_log;
create policy "admin audit admin read"
on public.admin_audit_log
for select
to authenticated
using (public.tarkana_is_admin());

-- Server-side SvelteKit routes should perform inserts/updates for:
-- challenge_sessions, session_questions, session_answers, rating/rank changes,
-- and admin_audit_log. If using the Supabase service role for server writes,
-- keep the service role key server-only and never expose it to browser code.
