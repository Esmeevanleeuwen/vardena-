-- Additive discovery features. Existing content and publication times stay intact.
alter table public.posts add column search_document tsvector generated always as (
  to_tsvector('dutch', title || ' ' || subject_name || ' ' || body)
) stored;
create index posts_search_document_idx on public.posts using gin(search_document) where status = 'published';

create table public.vardena_bookmarks (
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index vardena_bookmarks_recent_idx on public.vardena_bookmarks(user_id, created_at desc, post_id);
create index vardena_bookmarks_post_idx on public.vardena_bookmarks(post_id);
alter table public.vardena_bookmarks enable row level security;
revoke all on public.vardena_bookmarks from anon, authenticated;
grant select, delete on public.vardena_bookmarks to authenticated;
grant insert(user_id, post_id) on public.vardena_bookmarks to authenticated;
grant all on public.vardena_bookmarks to service_role;
create policy bookmarks_read_own on public.vardena_bookmarks for select to authenticated using (user_id = (select auth.uid()));
create policy bookmarks_insert_own on public.vardena_bookmarks for insert to authenticated with check (
  user_id = (select auth.uid()) and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy bookmarks_delete_own on public.vardena_bookmarks for delete to authenticated using (user_id = (select auth.uid()));

create table public.vardena_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.vardena_members(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 2 and 1200),
  status text not null default 'published' check(status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);
create index vardena_comments_post_recent_idx on public.vardena_comments(post_id, created_at desc, id desc) where status = 'published';
create index vardena_comments_post_idx on public.vardena_comments(post_id);
create index vardena_comments_author_idx on public.vardena_comments(author_id);
alter table public.vardena_comments enable row level security;
revoke all on public.vardena_comments from anon, authenticated;
grant select on public.vardena_comments to anon, authenticated;
grant insert(id, post_id, author_id, body), delete on public.vardena_comments to authenticated;
grant all on public.vardena_comments to service_role;
create policy comments_public_read on public.vardena_comments for select to anon, authenticated using (
  status = 'published' and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy comments_insert_own on public.vardena_comments for insert to authenticated with check (
  author_id = (select auth.uid()) and status = 'published' and exists(select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy comments_delete_own on public.vardena_comments for delete to authenticated using (author_id = (select auth.uid()));
create view public.vardena_comment_stats with (security_invoker = true) as
  select post_id, count(*)::integer as comments from public.vardena_comments where status = 'published' group by post_id;
grant select on public.vardena_comment_stats to anon, authenticated;
create or replace view public.vardena_popular_posts with (security_invoker = true) as
  select p.id, p.organization_id, p.created_at,
    coalesce(s.likes, 0) as likes, coalesce(s.dislikes, 0) as dislikes,
    coalesce(s.likes, 0) - coalesce(s.dislikes, 0) as score,
    p.kind, p.category, p.updated_at, p.search_document, coalesce(c.comments, 0) as comments
  from public.posts p left join public.vardena_post_stats s on s.post_id = p.id
  left join public.vardena_comment_stats c on c.post_id = p.id
  where p.status = 'published';
grant select on public.vardena_popular_posts to anon, authenticated;
notify pgrst, 'reload schema';
