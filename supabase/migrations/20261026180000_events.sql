-- Events: everything that isn't a weekly service time.
--   * Special dates: a one-off event on a date (a vespers, a retreat, a meeting). Clergy add these later.
--   * Also offered: a ministry the church runs but hasn't published a day or time for (date is empty).
-- Same rules as the rest: the public only reads, clergy edit only their own church, every change is logged.
-- No outside links and no free-text descriptions: titles only, so nothing personal can slip in.

create table public.events (
  id            bigint generated always as identity primary key,
  place_id      text not null references public.places(id) on delete cascade,
  date          date,                 -- empty = "also offered", no published date or time
  end_date      date,                 -- for events over several days (a retreat or convention)
  start_time    time,
  end_time      time,
  kind          text not null check (kind in ('liturgy','praise','bible','youth','meeting','classes','servants','retreat','social')),
  title_en      text not null check (char_length(title_en) between 2 and 140),
  title_ar      text check (char_length(title_ar) <= 140),
  room_en       text check (char_length(room_en) <= 80),
  room_ar       text check (char_length(room_ar) <= 80),
  last_verified date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (date is not null or (start_time is null and end_date is null)),
  check (end_date is null or end_date >= date),
  check (end_time is null or start_time is not null)
);
create index on public.events (place_id);
create index on public.events (date);

create trigger events_log before insert or update or delete on public.events for each row execute function public.log_change();
alter table public.events enable row level security;

-- The public sees upcoming and undated events only; past ones drop off the day after they end.
create policy "public reads upcoming events" on public.events for select
  using ((date is null or coalesce(end_date, date) >= current_date - 1) and exists (select 1 from public.public_places v where v.id = place_id));
create policy "editors read own events"      on public.events for select using (public.can_edit(place_id));
create policy "editors write own events"     on public.events for all using (public.can_edit(place_id)) with check (public.can_edit(place_id));

revoke all on public.events from anon, authenticated;
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
