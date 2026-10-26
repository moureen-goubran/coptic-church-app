-- Church details: parking, email, logo, clergy, and outside links (live stream, social media,
-- giving, calendar, church forms). Same rules as the rest: the public only reads, clergy
-- edit only their own church, and every change is logged.
-- New outside links stay hidden until an admin approves them (safety-and-accounts.md).

create table public.place_details (
  id             bigint generated always as identity primary key,
  place_id       text not null unique references public.places(id) on delete cascade,
  email          text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  parking_en     text,
  parking_ar     text,
  clergy_note_en text,
  clergy_note_ar text,
  logo           text check (logo ~ '^/logos/[a-z0-9-]+\.(webp|png)$'), -- only images we host ourselves
  logo_dark      boolean not null default false,                         -- logo needs a dark background
  last_verified  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Clergy as listed publicly by their own church. Phone and email only when the church publishes them.
create table public.clergy (
  id            bigint generated always as identity primary key,
  place_id      text not null references public.places(id) on delete cascade,
  sort          smallint not null default 0,
  name_en       text not null,
  name_ar       text,
  phone         text,
  email         text check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  last_verified date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.clergy (place_id);

create table public.place_links (
  id            bigint generated always as identity primary key,
  place_id      text not null references public.places(id) on delete cascade,
  kind          text not null check (kind in ('live','facebook','instagram','youtube','x','tiktok','donate','calendar','form','clergy_page','other')),
  url           text not null check (url ~ '^https://[^\s]+$'),
  label_en      text,
  label_ar      text,
  approved      boolean not null default false,
  approved_by   uuid references auth.users(id),
  approved_at   timestamptz,
  last_verified date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.place_links (place_id);

-- Only admins can approve. A clergy member's new or changed link goes back to "waiting".
-- (The CSV import runs without a signed-in user, so its admin-checked links keep their approval.)
create function public.guard_link_approval() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' or new.url is distinct from old.url or new.approved is distinct from old.approved then
      new.approved := false; new.approved_by := null; new.approved_at := null;
    end if;
  elsif new.approved and (tg_op = 'INSERT' or not old.approved) then
    new.approved_by := auth.uid(); new.approved_at := now();
  end if;
  return new;
end $$;
create trigger place_links_guard before insert or update on public.place_links for each row execute function public.guard_link_approval();

create trigger place_details_log before insert or update or delete on public.place_details for each row execute function public.log_change();
create trigger clergy_log        before insert or update or delete on public.clergy        for each row execute function public.log_change();
create trigger place_links_log   before insert or update or delete on public.place_links   for each row execute function public.log_change();

alter table public.place_details enable row level security;
alter table public.clergy        enable row level security;
alter table public.place_links   enable row level security;

create policy "public reads details"       on public.place_details for select using (exists (select 1 from public.public_places v where v.id = place_id));
create policy "editors write own details"  on public.place_details for all using (public.can_edit(place_id)) with check (public.can_edit(place_id));
create policy "public reads clergy"        on public.clergy        for select using (exists (select 1 from public.public_places v where v.id = place_id));
create policy "editors write own clergy"   on public.clergy        for all using (public.can_edit(place_id)) with check (public.can_edit(place_id));
create policy "public reads approved links" on public.place_links  for select using (approved and exists (select 1 from public.public_places v where v.id = place_id));
create policy "editors read own links"     on public.place_links   for select using (public.can_edit(place_id));
create policy "editors write own links"    on public.place_links   for all using (public.can_edit(place_id)) with check (public.can_edit(place_id));

revoke all on public.place_details, public.clergy, public.place_links from anon, authenticated;
grant select on public.place_details, public.clergy, public.place_links to anon, authenticated;
grant insert, update, delete on public.place_details, public.clergy, public.place_links to authenticated;
