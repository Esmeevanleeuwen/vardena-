-- Add Vardena posts to a project that already owns public.profiles.
-- Do not replace shared profiles, their policies, or the auth signup trigger.
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  subject_name text not null check (char_length(btrim(subject_name)) between 2 and 120),
  title text not null check (char_length(btrim(title)) between 5 and 140),
  body text not null check (char_length(btrim(body)) between 20 and 3000),
  category text not null check (category in ('politiek','media','bedrijfsleven','overig')),
  source_url text not null check (char_length(source_url) <= 2048 and source_url ~ '^https://[^[:space:]/?#]+([/?#][^[:space:]]*)?$'),
  status text not null default 'published' check (status in ('published','hidden','under_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists posts_author_id_idx on public.posts (author_id);
create index if not exists posts_published_created_at_idx on public.posts (created_at desc) where status = 'published';

alter table public.posts enable row level security;

-- Also safe when applied after the standalone Vardena bootstrap migration.
drop policy if exists "Published posts are publicly readable" on public.posts;
create policy "Published posts are publicly readable"
on public.posts for select to anon, authenticated
using (status = 'published' or (select auth.uid()) = author_id);

drop policy if exists "Users create their own posts" on public.posts;
create policy "Users create their own posts"
on public.posts for insert to authenticated
with check ((select auth.uid()) = author_id and status = 'published');

drop policy if exists "Authors update their own posts" on public.posts;
create policy "Authors update their own posts"
on public.posts for update to authenticated
using ((select auth.uid()) = author_id and status = 'published')
with check ((select auth.uid()) = author_id and status = 'published');

drop policy if exists "Authors delete their own posts" on public.posts;
create policy "Authors delete their own posts"
on public.posts for delete to authenticated
using ((select auth.uid()) = author_id);

-- Override any broad default table grants; clients cannot set moderation status.
revoke all on public.posts from public, anon, authenticated;
grant usage on schema public to anon, authenticated;
grant select on public.posts to anon, authenticated;
grant insert (author_id, subject_name, title, body, category, source_url) on public.posts to authenticated;
grant update (subject_name, title, body, category, source_url) on public.posts to authenticated;
grant delete on public.posts to authenticated;
grant all on public.posts to service_role;

notify pgrst, 'reload schema';
