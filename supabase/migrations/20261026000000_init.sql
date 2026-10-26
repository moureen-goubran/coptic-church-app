-- My Coptic Church: database schema, version 1.
-- Public visitors can only READ approved data. Nobody but admins can write, and
-- later clergy can write only rows for their own church (see safety-and-accounts.md).

create extension if not exists pg_cron with schema pg_catalog;

-- ---------- places ----------
create table public.places (
  id             text primary key check (id ~ '^[a-z0-9-]+$'),
  name           text not null,
  name_ar        text,
  type           text not null check (type in ('church','mission','community','monastery','convent','retreat_center','diocese_office','seminary','school')),
  street         text,
  city           text not null,
  city_ar        text,
  state          text not null,
  zip            text,
  country        text not null default 'US' check (country ~ '^[A-Z]{2}$'),
  diocese        text,
  website        text check (website ~ '^https?://'),
  phone          text,
  lat            double precision check (lat between -90 and 90),
  lng            double precision check (lng between -180 and 180),
  location_approx boolean not null default false, -- true = city center only, exact pin not confirmed yet
  verification   text not null default 'unverified' check (verification in ('church_confirmed','known_locally','official_directory','cross_checked','unverified')),
  last_verified  date,
  source_url     text,
  notes          text,              -- admin-only, never shown publicly
  edited_in_app  boolean not null default false, -- true once clergy/admin edit it here; CSV import stops overwriting it
  hidden         boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.places (country, state);

-- ---------- weekly service times ----------
create table public.services (
  id             bigint generated always as identity primary key,
  place_id       text not null references public.places(id) on delete cascade,
  day            smallint not null check (day between 0 and 6), -- 0 = Sunday
  start_time     time not null,
  end_time       time,
  kind           text not null check (kind in ('liturgy','praise','bible','youth','meeting','classes','servants')),
  title_en       text not null,
  title_ar       text,
  room_en        text,
  room_ar        text,
  last_verified  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index on public.services (place_id);

-- ---------- people who can log in (version 2) ----------
-- Accounts are created by invitation only (no public sign-up). Names only, no personal contact info.
create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
create table public.place_editors (
  user_id  uuid not null references auth.users(id) on delete cascade,
  place_id text not null references public.places(id) on delete cascade,
  role     text not null default 'clergy' check (role in ('clergy','servant')),
  approved_by uuid references auth.users(id),
  added_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
create function public.can_edit(p text) returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (select 1 from public.place_editors where user_id = auth.uid() and place_id = p);
$$;

-- ---------- corrections box (private, admin-only) ----------
-- Written only by the submit-correction Edge Function after a bot check. Never public.
create table public.corrections (
  id         bigint generated always as identity primary key,
  place_id   text references public.places(id) on delete set null,
  message    text not null check (char_length(message) between 3 and 1000),
  status     text not null default 'new' check (status in ('new','done','dismissed')),
  created_at timestamptz not null default now()
);
-- Delete corrections after 90 days (safety-and-accounts.md).
select cron.schedule('delete-old-corrections', '0 4 * * *', $$delete from public.corrections where created_at < now() - interval '90 days'$$);

-- ---------- edit history: every change is logged and can be undone ----------
create table public.audit_log (
  id         bigint generated always as identity primary key,
  table_name text not null,
  row_id     text not null,
  action     text not null,
  old_row    jsonb,
  new_row    jsonb,
  user_id    uuid default auth.uid(),
  at         timestamptz not null default now()
);
create function public.log_change() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op in ('UPDATE','INSERT') then new.updated_at := now(); end if;
  insert into public.audit_log (table_name, row_id, action, old_row, new_row)
  values (tg_table_name,
          coalesce((case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end)->>'id', '?'),
          tg_op,
          case when tg_op = 'INSERT' then null else to_jsonb(old) end,
          case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  return case when tg_op = 'DELETE' then old else new end;
end $$;
create trigger places_log before insert or update or delete on public.places for each row execute function public.log_change();
create trigger services_log before insert or update or delete on public.services for each row execute function public.log_change();

-- ---------- row level security ----------
alter table public.places        enable row level security;
alter table public.services      enable row level security;
alter table public.admins        enable row level security;
alter table public.place_editors enable row level security;
alter table public.corrections   enable row level security;
alter table public.audit_log     enable row level security;

-- The public sees places through this view, which leaves out admin notes and hidden rows.
create view public.public_places with (security_invoker = false) as
  select id, name, name_ar, type, street, city, city_ar, state, zip, country, diocese,
         website, phone, lat, lng, location_approx, verification, last_verified
  from public.places where not hidden;

create policy "admins and editors read places"  on public.places   for select using (public.can_edit(id));
create policy "editors update own place"        on public.places   for update using (public.can_edit(id)) with check (public.can_edit(id));
create policy "admins insert places"            on public.places   for insert with check (public.is_admin());
create policy "admins delete places"            on public.places   for delete using (public.is_admin());
create policy "public reads services"           on public.services for select using (exists (select 1 from public.public_places v where v.id = place_id));
create policy "editors write own services"      on public.services for all using (public.can_edit(place_id)) with check (public.can_edit(place_id));
create policy "admins manage admins"            on public.admins   for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage editors"           on public.place_editors for all using (public.is_admin()) with check (public.is_admin());
create policy "editors see own assignments"     on public.place_editors for select using (user_id = auth.uid());
create policy "admins read corrections"         on public.corrections for select using (public.is_admin());
create policy "admins update corrections"       on public.corrections for update using (public.is_admin());
create policy "admins read history"             on public.audit_log for select using (public.is_admin());

revoke all on all tables in schema public from anon, authenticated;
grant select on public.public_places to anon, authenticated;
grant select on public.services to anon, authenticated;
grant select, insert, update, delete on public.places, public.services to authenticated;
grant select, insert, update, delete on public.admins, public.place_editors to authenticated;
grant select, update on public.corrections to authenticated;
grant select on public.audit_log to authenticated;
