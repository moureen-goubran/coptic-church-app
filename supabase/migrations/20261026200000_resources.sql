-- Coptic Welcome: help for newcomers (interpreters, 211, ESL, college aid) and the walkthrough videos.
-- Only admins add or change these, because every outside link needs an admin's approval
-- (docs/safety-and-accounts.md). Clergy can't, and the public only reads.

create table public.resources (
  id             text primary key check (id ~ '^[a-z0-9-]{2,60}$'),
  sort           int not null default 0,
  kind           text not null check (kind in ('link','video')),
  region         text not null check (region ~ '^([A-Z]{2,3}|ALL)$'), -- a state or province code, US (whole country) or ALL
  title_en       text not null check (char_length(title_en) between 2 and 140),
  title_ar       text check (char_length(title_ar) <= 140),
  body_en        text check (char_length(body_en) <= 400),
  body_ar        text check (char_length(body_ar) <= 400),
  url            text check (url ~ '^https://\S+$'),
  hidden         boolean not null default false,
  edited_in_app  boolean not null default false, -- true once an admin edits it here; the CSV import stops overwriting it
  last_verified  date,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  check (kind = 'video' or url is not null)
);

create function public.mark_edited_in_app() returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null then new.edited_in_app := true; end if;
  return new;
end $$;
create trigger resources_edited before update on public.resources for each row execute function public.mark_edited_in_app();
create trigger resources_log before insert or update or delete on public.resources for each row execute function public.log_change();
alter table public.resources enable row level security;

create policy "public reads resources" on public.resources for select using (not hidden);
create policy "admins read resources"  on public.resources for select using (public.is_admin());
create policy "admins write resources" on public.resources for all using (public.is_admin()) with check (public.is_admin());

revoke all on public.resources from anon, authenticated;
grant select on public.resources to anon, authenticated;
grant insert, update, delete on public.resources to authenticated;
