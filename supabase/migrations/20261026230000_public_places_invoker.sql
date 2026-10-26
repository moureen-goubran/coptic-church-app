-- Supabase's security advisor flags views that run with their owner's rights (SECURITY DEFINER).
-- public_places now runs with the visitor's own rights. Visitors may read only the public columns
-- of places that aren't hidden: admin notes, source links and edit flags stay unreadable.
alter view public.public_places set (security_invoker = true);

revoke select on public.places from anon, authenticated;
grant select (id, name, name_ar, type, street, city, city_ar, state, zip, country, diocese,
              website, phone, lat, lng, location_approx, verification, last_verified, hidden)
  on public.places to anon, authenticated;

create policy "public reads visible places" on public.places for select to anon, authenticated using (not hidden);
