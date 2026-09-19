-- Vardena organizations: independent of other apps in this shared project.
create schema if not exists vardena_private;
revoke all on schema vardena_private from public, anon, authenticated;
grant usage on schema vardena_private to authenticated;

create table public.vardena_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{2,49}$' and slug not in ('nieuw','groep')),
  name text not null check (char_length(btrim(name)) between 2 and 80),
  summary text not null check (char_length(btrim(summary)) between 10 and 280),
  mission text not null check (char_length(btrim(mission)) between 20 and 3000),
  positions text not null check (char_length(btrim(positions)) between 20 and 6000),
  approach text not null check (char_length(btrim(approach)) between 20 and 3000),
  manifesto text not null default '' check (char_length(manifesto) <= 15000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index vardena_org_creator_idx on public.vardena_organizations(created_by);

create table public.vardena_org_members (
  org_id uuid not null references public.vardena_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  role text not null default 'member' check (role in ('owner','admin','member')),
  status text not null default 'pending' check (status in ('pending','active','rejected')),
  created_at timestamptz not null default now(),
  primary key (org_id,user_id),
  check (role = 'member' or status = 'active')
);
create unique index vardena_org_single_owner_idx on public.vardena_org_members(org_id) where role='owner';
create index vardena_org_members_user_idx on public.vardena_org_members(user_id,status,org_id);
create index vardena_org_members_status_idx on public.vardena_org_members(org_id,status,created_at desc);

-- This lookup breaks recursive membership RLS. It only returns the caller's role,
-- lives outside exposed schemas, has a fixed search_path and no anonymous grant.
create function vardena_private.org_role(p_org uuid) returns text
language sql stable security definer set search_path = '' as $$
  select m.role from public.vardena_org_members m
  where auth.uid() is not null and m.org_id=p_org and m.user_id=auth.uid() and m.status='active'
$$;
revoke all on function vardena_private.org_role(uuid) from public,anon,authenticated;
grant execute on function vardena_private.org_role(uuid) to authenticated;

-- Org creation and ownership are atomic; clients cannot appoint another owner.
create function vardena_private.initialize_organization() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or new.created_by <> auth.uid() then
    raise exception 'Only the authenticated creator can create an organization' using errcode='42501';
  end if;
  insert into public.vardena_org_members(org_id,user_id,display_name,role,status)
  values(new.id,new.created_by,coalesce(
    (select m.display_name from public.vardena_members m where m.id=auth.uid()),
    (select p.display_name from public.profiles p where p.id=auth.uid()),'Oprichter'),'owner','active');
  return new;
end $$;
revoke all on function vardena_private.initialize_organization() from public,anon,authenticated;
create trigger vardena_initialize_organization after insert on public.vardena_organizations
for each row execute function vardena_private.initialize_organization();

create function vardena_private.touch_organization() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin new.updated_at=now(); return new; end $$;
revoke all on function vardena_private.touch_organization() from public,anon,authenticated;
create trigger vardena_touch_organization before update on public.vardena_organizations
for each row execute function vardena_private.touch_organization();

alter table public.vardena_organizations enable row level security;
alter table public.vardena_org_members enable row level security;
create policy org_public_read on public.vardena_organizations for select to anon,authenticated using(true);
create policy org_create on public.vardena_organizations for insert to authenticated
with check(created_by=(select auth.uid()));
create policy org_edit on public.vardena_organizations for update to authenticated
using(vardena_private.org_role(id) in ('owner','admin'))
with check(vardena_private.org_role(id) in ('owner','admin'));
create policy org_members_read on public.vardena_org_members for select to authenticated
using(user_id=(select auth.uid()) or (status='active' and vardena_private.org_role(org_id) is not null)
  or vardena_private.org_role(org_id) in ('owner','admin'));
create policy org_members_apply on public.vardena_org_members for insert to authenticated
with check(user_id=(select auth.uid()) and role='member' and status='pending');
create policy org_members_manage on public.vardena_org_members for update to authenticated
using((vardena_private.org_role(org_id)='owner' and role<>'owner')
  or (vardena_private.org_role(org_id)='admin' and role='member'))
with check((vardena_private.org_role(org_id)='owner' and role<>'owner')
  or (vardena_private.org_role(org_id)='admin' and role='member'));
create policy org_members_leave on public.vardena_org_members for delete to authenticated
using(role<>'owner' and (user_id=(select auth.uid()) or vardena_private.org_role(org_id)='owner'
  or (vardena_private.org_role(org_id)='admin' and role='member')));
revoke all on public.vardena_organizations,public.vardena_org_members from public,anon,authenticated;
grant select on public.vardena_organizations to anon,authenticated;
grant insert(slug,name,summary,mission,positions,approach,manifesto,created_by) on public.vardena_organizations to authenticated;
grant update(name,summary,mission,positions,approach,manifesto) on public.vardena_organizations to authenticated;
grant select,delete on public.vardena_org_members to authenticated;
grant insert(org_id,user_id,display_name) on public.vardena_org_members to authenticated;
grant update(role,status) on public.vardena_org_members to authenticated;
grant all on public.vardena_organizations,public.vardena_org_members to service_role;

create table public.vardena_org_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.vardena_organizations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check(char_length(btrim(body)) between 1 and 3000),
  created_at timestamptz not null default now()
);
create index vardena_org_messages_recent_idx on public.vardena_org_messages(org_id,created_at desc,id desc);
create index vardena_org_messages_sender_idx on public.vardena_org_messages(sender_id);
alter table public.vardena_org_messages enable row level security;
create policy org_chat_read on public.vardena_org_messages for select to authenticated
using(vardena_private.org_role(org_id) is not null);
create policy org_chat_send on public.vardena_org_messages for insert to authenticated
with check(sender_id=(select auth.uid()) and vardena_private.org_role(org_id) is not null);
revoke all on public.vardena_org_messages from public,anon,authenticated;
grant select on public.vardena_org_messages to authenticated;
grant insert(org_id,sender_id,body) on public.vardena_org_messages to authenticated;
grant all on public.vardena_org_messages to service_role;

create table public.vardena_org_assignments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.vardena_organizations(id) on delete cascade,
  assignee_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  kind text not null check(kind in ('task','challenge')),
  title text not null check(char_length(btrim(title)) between 3 and 140),
  description text not null default '' check(char_length(description)<=2000),
  due_date date,
  created_at timestamptz not null default now()
);
create index vardena_org_assignments_org_idx on public.vardena_org_assignments(org_id,created_at desc,id desc);
create index vardena_org_assignments_assignee_idx on public.vardena_org_assignments(assignee_id,org_id);
create index vardena_org_assignments_creator_idx on public.vardena_org_assignments(created_by);
alter table public.vardena_org_assignments enable row level security;
create policy org_assignments_read on public.vardena_org_assignments for select to authenticated
using(vardena_private.org_role(org_id) in ('owner','admin')
 or (assignee_id=(select auth.uid()) and vardena_private.org_role(org_id) is not null));
create policy org_assignments_create on public.vardena_org_assignments for insert to authenticated
with check(created_by=(select auth.uid()) and vardena_private.org_role(org_id) in ('owner','admin')
 and exists(select 1 from public.vardena_org_members m where m.org_id=vardena_org_assignments.org_id and m.user_id=assignee_id and m.status='active'));
create policy org_assignments_delete on public.vardena_org_assignments for delete to authenticated
using(vardena_private.org_role(org_id) in ('owner','admin'));
revoke all on public.vardena_org_assignments from public,anon,authenticated;
grant select,delete on public.vardena_org_assignments to authenticated;
grant insert(org_id,assignee_id,created_by,kind,title,description,due_date) on public.vardena_org_assignments to authenticated;
grant all on public.vardena_org_assignments to service_role;

create table public.vardena_org_checklist (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.vardena_org_assignments(id) on delete cascade,
  label text not null check(char_length(btrim(label)) between 1 and 200),
  position smallint not null check(position between 0 and 19),
  completed boolean not null default false,
  unique(assignment_id,position)
);
alter table public.vardena_org_checklist enable row level security;
create policy org_checklist_read on public.vardena_org_checklist for select to authenticated
using(exists(select 1 from public.vardena_org_assignments a where a.id=assignment_id));
create policy org_checklist_create on public.vardena_org_checklist for insert to authenticated
with check(exists(select 1 from public.vardena_org_assignments a where a.id=assignment_id and vardena_private.org_role(a.org_id) in ('owner','admin')) and not completed);
create policy org_checklist_complete on public.vardena_org_checklist for update to authenticated
using(exists(select 1 from public.vardena_org_assignments a where a.id=assignment_id and a.assignee_id=(select auth.uid()) and vardena_private.org_role(a.org_id) is not null))
with check(exists(select 1 from public.vardena_org_assignments a where a.id=assignment_id and a.assignee_id=(select auth.uid()) and vardena_private.org_role(a.org_id) is not null));
revoke all on public.vardena_org_checklist from public,anon,authenticated;
grant select on public.vardena_org_checklist to authenticated;
grant insert(assignment_id,label,position) on public.vardena_org_checklist to authenticated;
grant update(completed) on public.vardena_org_checklist to authenticated;
grant all on public.vardena_org_checklist to service_role;

-- A single transaction creates an assignment and all its checklist items.
-- SECURITY INVOKER keeps every insert subject to the caller's grants and RLS.
create function public.vardena_create_assignment(p_org uuid,p_assignee uuid,p_title text,p_description text,p_kind text,p_due date,p_steps text[])
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_step text; v_position integer:=0;
begin
  if auth.uid() is null or coalesce(array_length(p_steps,1),0) not between 1 and 20 then
    raise exception 'Provide 1 to 20 checklist items' using errcode='22023';
  end if;
  insert into public.vardena_org_assignments(org_id,assignee_id,created_by,title,description,kind,due_date)
    values(p_org,p_assignee,auth.uid(),btrim(p_title),btrim(p_description),p_kind,p_due) returning id into v_id;
  foreach v_step in array p_steps loop
    insert into public.vardena_org_checklist(assignment_id,label,position) values(v_id,btrim(v_step),v_position);
    v_position:=v_position+1;
  end loop;
  return v_id;
end $$;
revoke all on function public.vardena_create_assignment(uuid,uuid,text,text,text,date,text[]) from public,anon,authenticated;
grant execute on function public.vardena_create_assignment(uuid,uuid,text,text,text,date,text[]) to authenticated;

create table public.vardena_org_likes (
  org_id uuid not null references public.vardena_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key(org_id,user_id)
);
create index vardena_org_likes_user_idx on public.vardena_org_likes(user_id);
alter table public.vardena_org_likes enable row level security;
create policy org_likes_read on public.vardena_org_likes for select to anon,authenticated using(true);
create policy org_likes_create on public.vardena_org_likes for insert to authenticated with check(user_id=(select auth.uid()));
create policy org_likes_delete on public.vardena_org_likes for delete to authenticated using(user_id=(select auth.uid()));
revoke all on public.vardena_org_likes from public,anon,authenticated;
grant select(org_id) on public.vardena_org_likes to anon;
grant select,insert,delete on public.vardena_org_likes to authenticated;
grant all on public.vardena_org_likes to service_role;
create view public.vardena_org_like_stats with(security_invoker=true) as
select org_id,count(*)::int as likes from public.vardena_org_likes group by org_id;
revoke all on public.vardena_org_like_stats from public,anon,authenticated;
grant select on public.vardena_org_like_stats to anon,authenticated,service_role;

alter table public.posts add column organization_id uuid references public.vardena_organizations(id) on delete restrict;
create index posts_org_created_idx on public.posts(organization_id,created_at desc,id desc) where organization_id is not null;
grant insert(organization_id) on public.posts to authenticated;
-- Restrictive policies add organization checks to the existing author policies.
-- The organization identity is immutable after publication (no UPDATE grant).
create policy org_posts_insert on public.posts as restrictive for insert to authenticated
with check(organization_id is null or vardena_private.org_role(organization_id) in ('owner','admin'));
create policy org_posts_update on public.posts as restrictive for update to authenticated
using(organization_id is null or vardena_private.org_role(organization_id) in ('owner','admin'))
with check(organization_id is null or vardena_private.org_role(organization_id) in ('owner','admin'));
create policy org_posts_delete on public.posts as restrictive for delete to authenticated
using(organization_id is null or vardena_private.org_role(organization_id) in ('owner','admin'));

create view public.vardena_popular_posts with(security_invoker=true) as
select p.id,p.organization_id,p.created_at,coalesce(s.likes,0) as likes,coalesce(s.dislikes,0) as dislikes,
  coalesce(s.likes,0)-coalesce(s.dislikes,0) as score
from public.posts p left join public.vardena_post_stats s on s.post_id=p.id where p.status='published';
revoke all on public.vardena_popular_posts from public,anon,authenticated;
grant select on public.vardena_popular_posts to anon,authenticated,service_role;
create view public.vardena_org_post_stats with(security_invoker=true) as
select organization_id,count(*)::int as posts,coalesce(sum(likes),0)::int as likes,coalesce(sum(dislikes),0)::int as dislikes
from public.vardena_popular_posts where organization_id is not null group by organization_id;
revoke all on public.vardena_org_post_stats from public,anon,authenticated;
grant select on public.vardena_org_post_stats to anon,authenticated,service_role;
notify pgrst,'reload schema';
