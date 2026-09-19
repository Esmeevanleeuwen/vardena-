create schema if not exists private;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(display_name) between 2 and 80),
  created_at timestamptz not null default now()
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_name text not null check (char_length(subject_name) between 2 and 120),
  title text not null check (char_length(title) between 5 and 140),
  body text not null check (char_length(body) between 20 and 3000),
  category text not null check (category in ('politiek','media','bedrijfsleven','overig')),
  source_url text not null check (source_url ~ '^https://'),
  status text not null default 'published' check (status in ('published','hidden','under_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_created_at_idx on public.posts (created_at desc);
create index posts_author_id_idx on public.posts (author_id);
create index posts_status_idx on public.posts (status);

alter table public.profiles enable row level security;
alter table public.posts enable row level security;

create policy "Profiles are publicly readable" on public.profiles for select to anon,authenticated using (true);
create policy "Users update their own profile" on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy "Published posts are publicly readable" on public.posts for select to anon,authenticated using (status='published' or (select auth.uid())=author_id);
create policy "Users create their own posts" on public.posts for insert to authenticated with check ((select auth.uid())=author_id and status='published');
create policy "Authors update their own posts" on public.posts for update to authenticated using ((select auth.uid())=author_id) with check ((select auth.uid())=author_id);
create policy "Authors delete their own posts" on public.posts for delete to authenticated using ((select auth.uid())=author_id);

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
declare requested_username text;
begin
  requested_username:=lower(regexp_replace(coalesce(new.raw_user_meta_data->>'username',''),'[^a-zA-Z0-9_]','','g'));
  insert into public.profiles(id,username,display_name)
  values(new.id,case when char_length(requested_username)>=3 then requested_username else 'lid_'||substr(new.id::text,1,8) end,coalesce(nullif(new.raw_user_meta_data->>'display_name',''),'Vardena-lid'));
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure private.handle_new_user();

grant usage on schema public to anon,authenticated;
grant select on public.profiles to anon,authenticated;
grant select on public.posts to anon,authenticated;
grant insert,update,delete on public.posts to authenticated;
grant update on public.profiles to authenticated;
