alter table public.users_profile
	add column if not exists avatar_url text;
