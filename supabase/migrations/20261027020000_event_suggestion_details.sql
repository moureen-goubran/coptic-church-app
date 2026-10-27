-- "Suggest an Event" now asks whether it repeats, the end time, and who is speaking or leading (optional).
alter table public.event_suggestions
  add column repeat   text not null default 'once' check (repeat in ('once','weekly','biweekly','monthly')),
  add column end_time time,
  add column speaker  text check (char_length(speaker) <= 120);
