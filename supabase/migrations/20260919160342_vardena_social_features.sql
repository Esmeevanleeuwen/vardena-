-- Vardena-only social profiles. Shared account profiles keep their existing privacy rules.
create table public.vardena_members (
  id uuid primary key references public.profiles(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 280),
  created_at timestamptz not null default now()
);
alter table public.vardena_members enable row level security;
create policy members_read on public.vardena_members for select to anon, authenticated using (true);
create policy members_insert on public.vardena_members for insert to authenticated with check ((select auth.uid()) = id);
create policy members_update on public.vardena_members for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke all on public.vardena_members from public, anon, authenticated;
grant select on public.vardena_members to anon, authenticated;
grant insert (id, username, display_name, bio), update (id, username, display_name, bio) on public.vardena_members to authenticated;
grant all on public.vardena_members to service_role;

create table public.vardena_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  value smallint not null check (value in (-1,1)),
  primary key (post_id, user_id)
);
create index vardena_reactions_user_idx on public.vardena_reactions(user_id);
alter table public.vardena_reactions enable row level security;
create policy reactions_read on public.vardena_reactions for select to anon, authenticated
using (exists (select 1 from public.posts p where p.id=post_id and p.status='published'));
create policy reactions_insert on public.vardena_reactions for insert to authenticated
with check ((select auth.uid())=user_id and exists (select 1 from public.posts p where p.id=post_id and p.status='published'));
create policy reactions_update on public.vardena_reactions for update to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id and exists (select 1 from public.posts p where p.id=post_id and p.status='published'));
create policy reactions_delete on public.vardena_reactions for delete to authenticated using ((select auth.uid())=user_id);
revoke all on public.vardena_reactions from public, anon, authenticated;
grant select (post_id, value) on public.vardena_reactions to anon;
grant select, insert, update, delete on public.vardena_reactions to authenticated;
grant all on public.vardena_reactions to service_role;
create view public.vardena_post_stats with (security_invoker=true) as
select post_id, count(*) filter (where value=1)::int as likes, count(*) filter (where value=-1)::int as dislikes
from public.vardena_reactions group by post_id;
revoke all on public.vardena_post_stats from public, anon, authenticated;
grant select on public.vardena_post_stats to anon, authenticated, service_role;

create table public.vardena_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.vardena_members(id) on delete cascade,
  recipient_id uuid not null references public.vardena_members(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 3000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index vardena_messages_sender_idx on public.vardena_messages(sender_id,recipient_id,created_at desc,id desc);
create index vardena_messages_recipient_idx on public.vardena_messages(recipient_id,sender_id,created_at desc,id desc);
create index vardena_messages_unread_idx on public.vardena_messages(recipient_id) where read_at is null;
alter table public.vardena_messages enable row level security;
create policy messages_read on public.vardena_messages for select to authenticated
using ((select auth.uid())=sender_id or (select auth.uid())=recipient_id);
create policy messages_send on public.vardena_messages for insert to authenticated
with check ((select auth.uid())=sender_id and sender_id<>recipient_id);
create policy messages_mark_read on public.vardena_messages for update to authenticated
using ((select auth.uid())=recipient_id) with check ((select auth.uid())=recipient_id);
revoke all on public.vardena_messages from public, anon, authenticated;
grant select on public.vardena_messages to authenticated;
grant insert (sender_id,recipient_id,body) on public.vardena_messages to authenticated;
grant update (read_at) on public.vardena_messages to authenticated;
grant all on public.vardena_messages to service_role;

create view public.vardena_conversations with (security_invoker=true) as
select distinct on (peer_id) peer_id, id, sender_id, body, created_at,
  (count(*) filter (where recipient_id=(select auth.uid()) and read_at is null) over (partition by peer_id))::int as unread_count
from (
  select m.*, case when sender_id=(select auth.uid()) then recipient_id else sender_id end as peer_id
  from public.vardena_messages m
  where sender_id=(select auth.uid()) or recipient_id=(select auth.uid())
) visible_messages
order by peer_id,created_at desc,id desc;
revoke all on public.vardena_conversations from public, anon, authenticated;
grant select on public.vardena_conversations to authenticated, service_role;
notify pgrst, 'reload schema';
