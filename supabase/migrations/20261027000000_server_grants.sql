-- The report box's server function saves reports and looks up church names with the server key.
-- Say so explicitly instead of relying on Supabase's default grants.
grant select, insert on public.corrections to service_role;
grant select on public.places to service_role;
