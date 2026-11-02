# Weekly Focus — offline build

A copy of Weekly Focus (v97) that needs no internet, no account and no Supabase.
Everything is saved in the browser you open it in.

## Run it
Pick one:
- **Double-click `index.html`.** Works straight from disk in Chrome and Edge.
- **Double-click `run-weekly-focus-offline.bat`** (Windows). Serves this folder on http://localhost:5071/.
  Served over http the app also installs as a home-screen app and keeps working with no network.
- **Host the folder anywhere static** (GitHub Pages, a USB stick plus any static server). Open it once
  online; after that the service worker serves it offline.

## Your data
- Each board is one `localStorage` key: `wfo:board:<name>`. All keys start with `wfo:`, so the offline
  and online builds never touch each other's data, even on the same site.
- Data stays in that one browser on that one device. Clearing the site's data deletes it.
- Tap the green **On this device** pill (top right) to:
  - **Export backup (.json)** — every board in one file. Do this regularly.
  - **Import backup…** — boards in the file replace boards with the same name; other boards are kept.
    This is also how you move boards to another device.
  - **Keep my data** — the app asks the browser not to clear your boards on its own (low disk etc.).
    Works when opened over http (the `.bat` / localhost); not available when opened straight from a file.
  - **Backup reminder** — after 7 days without a backup: *Remind me* (banner, default), *Download
    automatically* (saves the .json to Downloads on next open), or *Off*.

## Bring your boards over from the cloud version
1. Open `export-for-offline.sql`, put your sign-in email on the `EMAIL` line.
2. Run it in Supabase → SQL Editor. It only reads.
3. Copy the single `backup` cell into a file named `backup.json`.
4. In the offline app: **On this device → Import backup…** → pick `backup.json`.

## What is different from the online build
| Feature | Offline build |
|---|---|
| Sign-in, Vault PIN | Removed. Nothing is behind a login, so the `@vault` chats folder is not locked. |
| Cloud sync between devices | Removed. Use Export / Import instead. |
| Akatsuki (Cost requests, ¥ badges, Roadmap tasks and banner) | Removed. |
| Command Centre study nudge bridge | Removed. |
| Weather and train-delay cards | Kept. They show "Offline" without a connection. Train times are built in and always work. |
| Everything else (Today, Calendar, Routines, Week, Chats, Life, boards, focus groups, print) | Same as v97. |

## How it was made
`js/weekly-focus-app.js` is the v97 file with an offline switch added. `js/config.js` sets
`offline: true`. With the switch off the file behaves exactly like the online one, so future app
versions can be brought over by re-applying the `OFFLINE` blocks (search the file for `OFFLINE`).
The other files are v97 copies with the Supabase script, login, Akatsuki and bridge scripts removed.
