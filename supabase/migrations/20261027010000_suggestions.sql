-- Suggestions from the "Suggest an Event" form, kept in the database as well as emailed to the owner.
-- Private: only the submit-correction server function writes them and only admins read them.
-- Nothing here is ever shown in the app; an approved event is added to data/events.csv by hand.

-- A church someone says is missing from the app (typed in on the form).
create table public.church_suggestions (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 3 and 140),
  city       text not null check (char_length(city) between 2 and 80),
  state      text check (char_length(state) <= 40),
  status     text not null default 'new' check (status in ('new','added','dismissed')),
  place_id   text references public.places(id) on delete set null, -- the church it became, once added
  created_at timestamptz not null default now()
);

create table public.event_suggestions (
  id                   bigint generated always as identity primary key,
  place_id             text references public.places(id) on delete set null,
  church_suggestion_id bigint references public.church_suggestions(id) on delete set null,
  kind                 text not null check (kind in ('liturgy','praise','bible','youth','meeting','classes','servants','retreat','social','other')),
  other_text           text check (char_length(other_text) <= 120), -- what it is, when the kind is "other"
  date                 date,
  start_time           time,
  details              text check (char_length(details) <= 1000),
  status               text not null default 'new' check (status in ('new','approved','dismissed')),
  created_at           timestamptz not null default now(),
  check (place_id is not null or church_suggestion_id is not null),
  check (kind <> 'other' or other_text is not null)
);
create index on public.event_suggestions (status, created_at);

alter table public.church_suggestions enable row level security;
alter table public.event_suggestions  enable row level security;
create policy "admins read church suggestions"   on public.church_suggestions for select using (public.is_admin());
create policy "admins update church suggestions" on public.church_suggestions for update using (public.is_admin());
create policy "admins read event suggestions"    on public.event_suggestions  for select using (public.is_admin());
create policy "admins update event suggestions"  on public.event_suggestions  for update using (public.is_admin());

revoke all on public.church_suggestions, public.event_suggestions from anon, authenticated;
grant select, update on public.church_suggestions, public.event_suggestions to authenticated;
grant select, insert on public.church_suggestions, public.event_suggestions to service_role;

-- Free-text details are cleared after 90 days, like the corrections box (safety-and-accounts.md).
-- The rest (which church, what kind, when) stays as a record.
select cron.schedule('clear-old-suggestion-details', '15 4 * * *', $$update public.event_suggestions set details = null where details is not null and created_at < now() - interval '90 days'$$);
