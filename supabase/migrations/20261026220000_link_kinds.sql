-- Church card sections from the demo: group chats, the church's app, a church tour video.
-- A group chat lets a stranger join, so a group link goes in only with a priest's written OK (safety-and-accounts.md).
alter table public.place_links drop constraint place_links_kind_check;
alter table public.place_links add constraint place_links_kind_check
  check (kind in ('live','facebook','instagram','youtube','x','tiktok','donate','calendar','form','clergy_page','group','app','tour','other'));
