-- Additive migration: existing sourced posts keep their content and attribution.
-- Filename aligned with the version recorded by the connected migration tool.
alter table public.posts
  add column kind text not null default 'post' check (kind in ('post','announcement','photo')),
  add column media_path text,
  add column media_alt text,
  alter column source_url drop not null;
alter table public.posts add constraint posts_source_for_claim check (kind <> 'post' or source_url is not null);
alter table public.posts add constraint posts_photo_shape check (
  (kind='photo' and media_path is not null and media_alt is not null
    and media_path ~ ('^' || author_id::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
    and char_length(trim(media_alt)) between 5 and 300)
  or (kind<>'photo' and media_path is null and media_alt is null)
);
grant insert(kind,media_path,media_alt) on public.posts to authenticated;
-- Media attribution and kind cannot be changed by a direct client UPDATE.
create index posts_feed_kind_date on public.posts(kind,created_at desc,id desc) where status='published';
create index posts_feed_category_date on public.posts(category,created_at desc,id desc) where status='published';
create unique index posts_media_path on public.posts(media_path) where media_path is not null;

create or replace view public.vardena_popular_posts with(security_invoker=true) as
select p.id,p.organization_id,p.created_at,coalesce(s.likes,0) as likes,coalesce(s.dislikes,0) as dislikes,
  coalesce(s.likes,0)-coalesce(s.dislikes,0) as score,p.kind,p.category,p.updated_at
from public.posts p left join public.vardena_post_stats s on s.post_id=p.id where p.status='published';
grant select on public.vardena_popular_posts to anon,authenticated,service_role;

-- A separate, private bucket. No changes to other apps' buckets or policies.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('vardena-post-photos','vardena-post-photos',false,3145728,array['image/jpeg','image/png','image/webp']);
create policy vardena_photo_insert on storage.objects for insert to authenticated
with check (bucket_id='vardena-post-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
  and name ~ ('^' || (select auth.uid())::text || '/[0-9a-f-]{36}\.(jpg|png|webp)$'));
create policy vardena_photo_read on storage.objects for select to anon,authenticated
using (bucket_id='vardena-post-photos' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(select 1 from public.posts p where p.media_path=name and p.status='published')
));
create policy vardena_photo_remove_unused on storage.objects for delete to authenticated
using (bucket_id='vardena-post-photos' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists(select 1 from public.posts p where p.media_path=name));
-- No UPDATE policy: a published photo cannot silently be overwritten.
notify pgrst,'reload schema';
