-- Weekly Focus: export your cloud boards as a backup file for the offline build.
--
-- 1. Supabase dashboard -> SQL Editor -> New query. Paste this whole file.
-- 2. Put your sign-in email on the line marked EMAIL below.
-- 3. Run. The result is one row with one cell called "backup".
-- 4. Copy that cell's value, paste it into a new text file, save it as backup.json.
-- 5. In the offline app: tap "On this device" -> Import backup... -> pick backup.json.
--
-- Read-only: it only SELECTs. It includes every board, its inventory, all entries
-- (The Five, notes, chats, wishlist, timeline...) and focus groups.

with me as (
  select id from auth.users
  where email = 'you@example.com'          -- EMAIL: your sign-in email
),
boards as (
  select board_id from public.weekly_focus_inventory where user_id = (select id from me)
  union
  select board_id from public.weekly_focus_entries   where user_id = (select id from me)
)
select jsonb_build_object(
  'app', 'weekly-focus',
  'kind', 'backup',
  'v', 1,
  'exported_at', now(),
  'boards', coalesce(jsonb_object_agg(b.board_id, jsonb_build_object(
    'v', 1,
    'inventory', coalesce((
      select jsonb_build_object('apps', i.apps, 'study', i.study, 'office', i.office, 'updated_at', i.updated_at)
      from public.weekly_focus_inventory i
      where i.user_id = (select id from me) and i.board_id = b.board_id
    ), jsonb_build_object('apps', '[]'::jsonb, 'study', '[]'::jsonb, 'office', '[]'::jsonb)),
    'entries', (
      select coalesce(jsonb_object_agg(e.item_key, e.payload), '{}'::jsonb)
      from public.weekly_focus_entries e
      where e.user_id = (select id from me) and e.board_id = b.board_id
    ),
    'groups', (
      select coalesce(jsonb_agg(to_jsonb(g) - 'user_id' - 'board_id' - 'created_at' order by g.ord), '[]'::jsonb)
      from public.weekly_focus_groups g
      where g.user_id = (select id from me) and g.board_id = b.board_id
    ),
    'groupMap', (
      select coalesce(jsonb_object_agg(x.item_key, x.gids), '{}'::jsonb)
      from (
        select ga.item_key, jsonb_agg(ga.group_id) as gids
        from public.weekly_focus_group_apps ga
        where ga.user_id = (select id from me) and ga.board_id = b.board_id
        group by ga.item_key
      ) x
    )
  )), '{}'::jsonb)
) as backup
from boards b;
