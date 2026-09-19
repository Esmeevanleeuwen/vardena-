-- Lists are stored atomically in their parent post and inherit its RLS and ownership.
-- Timestamp matches the applied migration in the connected project.
create function public.vardena_valid_people_list(items jsonb) returns boolean
language plpgsql immutable security invoker set search_path = '' as $$
declare item jsonb; field text; ids text[] := '{}';
begin
  if jsonb_typeof(items) is distinct from 'array' or octet_length(items::text) > 100000 then return false; end if;
  if jsonb_array_length(items) not between 1 and 30 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object' then return false; end if;
    foreach field in array array['wikidataId','name','wikipediaUrl','dossier','context','evidence','sourceUrl'] loop
      if jsonb_typeof(item->field) is distinct from 'string' then return false; end if;
    end loop;
    if item->>'wikidataId' !~ '^Q[1-9][0-9]{0,11}$' or (item->>'wikidataId') = any(ids) then return false; end if;
    ids := array_append(ids, item->>'wikidataId');
    if char_length(btrim(item->>'name')) not between 2 and 160
      or char_length(btrim(item->>'dossier')) not between 2 and 160
      or char_length(btrim(item->>'context')) not between 2 and 1000
      or char_length(btrim(item->>'evidence')) not between 2 and 600
      or char_length(item->>'wikipediaUrl') > 2048
      or item->>'wikipediaUrl' !~ '^https://(nl|en)\.wikipedia\.org/wiki/[^[:space:]?#]+$'
      or char_length(item->>'sourceUrl') > 2048
      or ((item->>'sourceUrl') <> '' and item->>'sourceUrl' !~ '^https://[^[:space:]]+$')
      then return false; end if;
  end loop;
  return true;
end $$;
revoke all on function public.vardena_valid_people_list(jsonb) from public;
grant execute on function public.vardena_valid_people_list(jsonb) to authenticated, service_role;
alter table public.posts drop constraint posts_kind_check;
alter table public.posts add constraint posts_kind_check check(kind in ('post','announcement','photo','list'));
alter table public.posts add column people_list jsonb not null default '[]'::jsonb;
alter table public.posts add constraint posts_people_list_shape check (
  (kind = 'list' and public.vardena_valid_people_list(people_list)) or (kind <> 'list' and people_list = '[]'::jsonb)
);
grant insert(people_list) on public.posts to authenticated;
alter table public.posts add column people_search tsvector generated always as (jsonb_to_tsvector('dutch'::regconfig, people_list, '["string"]'::jsonb)) stored;
create index posts_combined_search_idx on public.posts using gin ((search_document || people_search)) where status = 'published';
create or replace view public.vardena_popular_posts with (security_invoker = true) as
  select p.id, p.organization_id, p.created_at,
    coalesce(s.likes, 0) as likes, coalesce(s.dislikes, 0) as dislikes,
    coalesce(s.likes, 0) - coalesce(s.dislikes, 0) as score,
    p.kind, p.category, p.updated_at, p.search_document || p.people_search as search_document, coalesce(c.comments, 0) as comments
  from public.posts p left join public.vardena_post_stats s on s.post_id = p.id
  left join public.vardena_comment_stats c on c.post_id = p.id
  where p.status = 'published';
grant select on public.vardena_popular_posts to anon, authenticated, service_role;
notify pgrst, 'reload schema';
