-- Workroom tenant schema.
-- The mobile app uses the anon key and the signed-in user. It never uses a service role.
-- Active organization is part of the security boundary: policies read public.active_orgs,
-- which only switch_organization can change, and only to an org the user belongs to.

create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null check (kind in ('agency', 'client')),
  parent_org_id uuid references public.organizations (id),
  brand_color text not null default '#9A4518',
  tagline text not null default '',
  mark text not null default 'W',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  title text not null default '',
  created_at timestamptz not null default now()
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('agency_owner', 'agency_member', 'client_admin', 'client_member')),
  unique (org_id, user_id)
);

create table public.active_orgs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_org_id uuid not null,
  agency_org_id uuid not null,
  name text not null,
  summary text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'wrapped')),
  updated_at timestamptz not null default now(),
  constraint projects_client_org_id_fkey foreign key (client_org_id) references public.organizations (id),
  constraint projects_agency_org_id_fkey foreign key (agency_org_id) references public.organizations (id)
);

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  detail text not null default '',
  due_on date not null,
  status text not null check (status in ('upcoming', 'active', 'done')),
  sort integer not null default 0
);

create table public.deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  milestone_id uuid not null references public.milestones (id),
  title text not null,
  kind text not null check (kind in ('image', 'file')),
  status text not null check (status in ('draft', 'in_review', 'approved', 'changes_requested')),
  visibility text not null check (visibility in ('client', 'internal')),
  version integer not null default 1,
  file_name text not null,
  preview_key text not null default 'lookbook-cover',
  file_preview_text text,
  page_count integer,
  updated_at timestamptz not null default now()
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references public.deliverables (id) on delete cascade,
  author_id uuid not null,
  body text not null,
  visibility text not null check (visibility in ('client', 'internal')),
  kind text not null check (kind in ('note', 'approval', 'change_request')),
  created_at timestamptz not null default now(),
  constraint comments_author_id_fkey foreign key (author_id) references public.profiles (id)
);

create table public.threads (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  subject text not null,
  visibility text not null check (visibility in ('client', 'internal')),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads (id) on delete cascade,
  author_id uuid not null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_author_id_fkey foreign key (author_id) references public.profiles (id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id),
  title text not null,
  body text not null,
  href text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.subscriptions (
  org_id uuid primary key references public.organizations (id) on delete cascade,
  plan text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled')),
  seat_count integer not null,
  renews_on date not null,
  price_id text not null
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create index projects_client_idx on public.projects (client_org_id);
create index projects_agency_idx on public.projects (agency_org_id);
create index deliverables_project_idx on public.deliverables (project_id, status);
create index notifications_user_idx on public.notifications (user_id, org_id, created_at desc);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, title)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'member'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'title', '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.active_org_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select org_id from public.active_orgs where user_id = auth.uid()
$$;

create or replace function public.active_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.memberships m
  where m.user_id = auth.uid()
    and m.org_id = public.active_org_id()
$$;

create or replace function public.is_agency_context()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.active_role() in ('agency_owner', 'agency_member')
$$;

create or replace function public.switch_organization(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  if not exists (
    select 1 from public.memberships
    where user_id = auth.uid() and org_id = p_org_id
  ) then
    raise exception 'forbidden';
  end if;
  insert into public.active_orgs (user_id, org_id)
  values (auth.uid(), p_org_id)
  on conflict (user_id) do update set org_id = excluded.org_id;
end;
$$;

create or replace function public.decide_deliverable(
  p_deliverable_id uuid,
  p_decision text,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.active_role();
  v_user uuid := auth.uid();
  v_project public.projects%rowtype;
  v_deliverable public.deliverables%rowtype;
  v_body text := nullif(btrim(coalesce(p_comment, '')), '');
  v_client_name text;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;
  if v_role not in ('client_admin', 'client_member') then
    raise exception 'forbidden';
  end if;
  if p_decision not in ('approve', 'request_changes') then
    raise exception 'invalid';
  end if;

  select * into v_deliverable from public.deliverables where id = p_deliverable_id;
  if not found then
    raise exception 'not_found';
  end if;
  select * into v_project from public.projects where id = v_deliverable.project_id;
  if v_project.client_org_id is distinct from public.active_org_id()
     or v_deliverable.visibility <> 'client'
     or v_deliverable.status = 'draft' then
    raise exception 'not_found';
  end if;
  if p_decision = 'approve' and v_deliverable.status = 'approved' then
    raise exception 'invalid';
  end if;
  if p_decision = 'request_changes' and (v_body is null or char_length(v_body) > 2000) then
    raise exception 'invalid';
  end if;
  if v_body is not null and char_length(v_body) > 2000 then
    raise exception 'invalid';
  end if;

  update public.deliverables
    set status = case when p_decision = 'approve' then 'approved' else 'changes_requested' end,
        updated_at = now()
    where id = p_deliverable_id;
  update public.projects set updated_at = now() where id = v_project.id;

  if v_body is not null then
    insert into public.comments (deliverable_id, author_id, body, visibility, kind)
    values (
      p_deliverable_id,
      v_user,
      v_body,
      'client',
      case when p_decision = 'approve' then 'approval' else 'change_request' end
    );
  end if;

  select name into v_client_name from public.organizations where id = v_project.client_org_id;
  insert into public.notifications (user_id, org_id, title, body, href)
  select
    m.user_id,
    v_project.agency_org_id,
    case
      when p_decision = 'approve' then v_client_name || ' approved ' || v_deliverable.title
      else v_client_name || ' requested changes'
    end,
    coalesce(v_body, 'Approved version ' || v_deliverable.version::text),
    '/review/' || p_deliverable_id::text
  from public.memberships m
  where m.org_id = v_project.agency_org_id
    and m.role in ('agency_owner', 'agency_member');
end;
$$;

create or replace function public.add_deliverable_note(
  p_deliverable_id uuid,
  p_body text,
  p_visibility text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.active_role();
  v_user uuid := auth.uid();
  v_project public.projects%rowtype;
  v_deliverable public.deliverables%rowtype;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_author text;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;
  if p_visibility not in ('client', 'internal') then
    raise exception 'invalid';
  end if;
  if v_body is null or char_length(v_body) > 2000 then
    raise exception 'invalid';
  end if;
  if p_visibility = 'internal' and v_role not in ('agency_owner', 'agency_member') then
    raise exception 'forbidden';
  end if;

  select * into v_deliverable from public.deliverables where id = p_deliverable_id;
  if not found then
    raise exception 'not_found';
  end if;
  select * into v_project from public.projects where id = v_deliverable.project_id;
  if public.is_agency_context() then
    if v_project.agency_org_id is distinct from public.active_org_id() then
      raise exception 'not_found';
    end if;
  else
    if v_project.client_org_id is distinct from public.active_org_id()
       or v_deliverable.visibility <> 'client'
       or v_deliverable.status = 'draft' then
      raise exception 'not_found';
    end if;
  end if;

  insert into public.comments (deliverable_id, author_id, body, visibility, kind)
  values (p_deliverable_id, v_user, v_body, p_visibility, 'note');
  update public.deliverables set updated_at = now() where id = p_deliverable_id;
  update public.projects set updated_at = now() where id = v_project.id;
  select full_name into v_author from public.profiles where id = v_user;

  if p_visibility = 'internal' then
    insert into public.notifications (user_id, org_id, title, body, href)
    select m.user_id, v_project.agency_org_id, 'Internal note on ' || v_deliverable.title, v_body, '/review/' || p_deliverable_id::text
    from public.memberships m
    where m.org_id = v_project.agency_org_id
      and m.role in ('agency_owner', 'agency_member')
      and m.user_id <> v_user;
  elsif v_role in ('agency_owner', 'agency_member') then
    insert into public.notifications (user_id, org_id, title, body, href)
    select m.user_id, v_project.client_org_id, v_author || ' replied on ' || v_deliverable.title, v_body, '/review/' || p_deliverable_id::text
    from public.memberships m
    where m.org_id = v_project.client_org_id
      and m.role in ('client_admin', 'client_member')
      and m.user_id <> v_user;
  else
    insert into public.notifications (user_id, org_id, title, body, href)
    select m.user_id, v_project.agency_org_id, v_author || ' replied on ' || v_deliverable.title, v_body, '/review/' || p_deliverable_id::text
    from public.memberships m
    where m.org_id = v_project.agency_org_id
      and m.role in ('agency_owner', 'agency_member');
  end if;
end;
$$;

create or replace function public.post_message(p_thread_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.active_role();
  v_user uuid := auth.uid();
  v_thread public.threads%rowtype;
  v_project public.projects%rowtype;
  v_body text := nullif(btrim(coalesce(p_body, '')), '');
  v_author text;
begin
  if v_user is null then
    raise exception 'unauthenticated';
  end if;
  if v_body is null or char_length(v_body) > 2000 then
    raise exception 'invalid';
  end if;
  select * into v_thread from public.threads where id = p_thread_id;
  if not found then
    raise exception 'not_found';
  end if;
  select * into v_project from public.projects where id = v_thread.project_id;
  if public.is_agency_context() then
    if v_project.agency_org_id is distinct from public.active_org_id() then
      raise exception 'not_found';
    end if;
  else
    if v_project.client_org_id is distinct from public.active_org_id() or v_thread.visibility <> 'client' then
      raise exception 'not_found';
    end if;
  end if;

  insert into public.messages (thread_id, author_id, body)
  values (p_thread_id, v_user, v_body);
  update public.threads set updated_at = now() where id = p_thread_id;
  update public.projects set updated_at = now() where id = v_project.id;
  select full_name into v_author from public.profiles where id = v_user;

  if v_thread.visibility = 'internal' then
    insert into public.notifications (user_id, org_id, title, body, href)
    select m.user_id, v_project.agency_org_id, 'Studio note on ' || v_project.name, v_body, '/thread/' || p_thread_id::text
    from public.memberships m
    where m.org_id = v_project.agency_org_id
      and m.role in ('agency_owner', 'agency_member')
      and m.user_id <> v_user;
  elsif v_role in ('agency_owner', 'agency_member') then
    insert into public.notifications (user_id, org_id, title, body, href)
    select m.user_id, v_project.client_org_id, v_author || ' wrote on ' || v_project.name, v_body, '/thread/' || p_thread_id::text
    from public.memberships m
    where m.org_id = v_project.client_org_id
      and m.role in ('client_admin', 'client_member')
      and m.user_id <> v_user;
  else
    insert into public.notifications (user_id, org_id, title, body, href)
    select m.user_id, v_project.agency_org_id, v_author || ' wrote on ' || v_project.name, v_body, '/thread/' || p_thread_id::text
    from public.memberships m
    where m.org_id = v_project.agency_org_id
      and m.role in ('agency_owner', 'agency_member');
  end if;
end;
$$;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
    set read = true
    where id = p_id
      and user_id = auth.uid()
      and org_id = public.active_org_id();
  if not found then
    raise exception 'not_found';
  end if;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
    set read = true
    where user_id = auth.uid()
      and org_id = public.active_org_id();
end;
$$;

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or nullif(btrim(p_token), '') is null then
    raise exception 'invalid';
  end if;
  insert into public.push_tokens (user_id, token, platform)
  values (auth.uid(), btrim(p_token), coalesce(nullif(btrim(p_platform), ''), 'unknown'))
  on conflict (user_id, token) do nothing;
end;
$$;

create or replace function public.send_test_notification()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
begin
  if auth.uid() is null or public.active_org_id() is null then
    raise exception 'unauthenticated';
  end if;
  insert into public.notifications (id, user_id, org_id, title, body, href)
  values (
    v_id,
    auth.uid(),
    public.active_org_id(),
    'Test alert',
    'This stayed on the device. A phone build also schedules it with Expo Notifications.',
    '/alerts'
  );
  return v_id;
end;
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.memberships enable row level security;
alter table public.active_orgs enable row level security;
alter table public.projects enable row level security;
alter table public.milestones enable row level security;
alter table public.deliverables enable row level security;
alter table public.comments enable row level security;
alter table public.threads enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;
alter table public.push_tokens enable row level security;

create policy organizations_select on public.organizations
for select to authenticated
using (
  exists (
    select 1 from public.memberships m
    where m.org_id = organizations.id and m.user_id = auth.uid()
  )
  or (
    public.is_agency_context()
    and parent_org_id = public.active_org_id()
  )
);

create policy profiles_select on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid() and theirs.user_id = profiles.id
  )
);

create policy memberships_select on public.memberships
for select to authenticated
using (user_id = auth.uid());

create policy active_orgs_select on public.active_orgs
for select to authenticated
using (user_id = auth.uid());

create policy projects_select on public.projects
for select to authenticated
using (
  (not public.is_agency_context() and client_org_id = public.active_org_id())
  or (public.is_agency_context() and agency_org_id = public.active_org_id())
);

create policy milestones_select on public.milestones
for select to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = milestones.project_id
      and (
        (not public.is_agency_context() and p.client_org_id = public.active_org_id())
        or (public.is_agency_context() and p.agency_org_id = public.active_org_id())
      )
  )
);

create policy deliverables_select on public.deliverables
for select to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = deliverables.project_id
      and (
        (
          not public.is_agency_context()
          and p.client_org_id = public.active_org_id()
          and deliverables.visibility = 'client'
          and deliverables.status <> 'draft'
        )
        or (public.is_agency_context() and p.agency_org_id = public.active_org_id())
      )
  )
);

create policy comments_select on public.comments
for select to authenticated
using (
  exists (
    select 1
    from public.deliverables d
    join public.projects p on p.id = d.project_id
    where d.id = comments.deliverable_id
      and (
        (
          not public.is_agency_context()
          and p.client_org_id = public.active_org_id()
          and d.visibility = 'client'
          and d.status <> 'draft'
          and comments.visibility = 'client'
        )
        or (public.is_agency_context() and p.agency_org_id = public.active_org_id())
      )
  )
);

create policy threads_select on public.threads
for select to authenticated
using (
  exists (
    select 1 from public.projects p
    where p.id = threads.project_id
      and (
        (
          not public.is_agency_context()
          and p.client_org_id = public.active_org_id()
          and threads.visibility = 'client'
        )
        or (public.is_agency_context() and p.agency_org_id = public.active_org_id())
      )
  )
);

create policy messages_select on public.messages
for select to authenticated
using (
  exists (
    select 1
    from public.threads t
    join public.projects p on p.id = t.project_id
    where t.id = messages.thread_id
      and (
        (
          not public.is_agency_context()
          and p.client_org_id = public.active_org_id()
          and t.visibility = 'client'
        )
        or (public.is_agency_context() and p.agency_org_id = public.active_org_id())
      )
  )
);

create policy notifications_select on public.notifications
for select to authenticated
using (user_id = auth.uid() and org_id = public.active_org_id());

create policy subscriptions_select on public.subscriptions
for select to authenticated
using (
  org_id = public.active_org_id()
  and exists (
    select 1 from public.memberships m
    where m.org_id = subscriptions.org_id and m.user_id = auth.uid()
  )
);

create policy push_tokens_select on public.push_tokens
for select to authenticated
using (user_id = auth.uid());

revoke all on table public.organizations from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.memberships from anon, authenticated;
revoke all on table public.active_orgs from anon, authenticated;
revoke all on table public.projects from anon, authenticated;
revoke all on table public.milestones from anon, authenticated;
revoke all on table public.deliverables from anon, authenticated;
revoke all on table public.comments from anon, authenticated;
revoke all on table public.threads from anon, authenticated;
revoke all on table public.messages from anon, authenticated;
revoke all on table public.notifications from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.push_tokens from anon, authenticated;

grant select on table public.organizations to authenticated;
grant select on table public.profiles to authenticated;
grant select on table public.memberships to authenticated;
grant select on table public.active_orgs to authenticated;
grant select on table public.projects to authenticated;
grant select on table public.milestones to authenticated;
grant select on table public.deliverables to authenticated;
grant select on table public.comments to authenticated;
grant select on table public.threads to authenticated;
grant select on table public.messages to authenticated;
grant select on table public.notifications to authenticated;
grant select on table public.subscriptions to authenticated;
grant select on table public.push_tokens to authenticated;

grant execute on function public.switch_organization(uuid) to authenticated;
grant execute on function public.decide_deliverable(uuid, text, text) to authenticated;
grant execute on function public.add_deliverable_note(uuid, text, text) to authenticated;
grant execute on function public.post_message(uuid, text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.send_test_notification() to authenticated;
