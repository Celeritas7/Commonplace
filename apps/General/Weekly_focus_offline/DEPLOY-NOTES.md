# v100 — account-safe sign-out + "which account am I?" (local only, not deployed)

Copy over `Weekly_focus/`, then reload twice:
- `js/weekly-focus-app.js`
- `sw.js` (cache → `weekly-focus-v100`)

## Why
Vault + apps showed empty with a green "Synced" pill. "Synced" only means signed in with nothing queued — it says nothing about rows coming back. Every query is scoped by `board_id` **and** the signed-in `user_id` (RLS), so a session under a different account (e.g. "Continue with Google" with a different email than your magic-link one) returns zero rows. Nothing is deleted; the data is under the original account.

## What changed
1. **`resetBoardState()`** — the reset that `switchBoard` already did, now shared. Runs on `SIGNED_OUT`, on the Cloud-panel **Sign out** button, and whenever the signed-in `user.id` changes. Fixes a real leak: before, the old account's `entries`/`state`/`meta` (incl. `meta.cvault`) stayed in memory, and `cloudPullEntries` would have seeded them into the next account's empty board.
2. **Synced pill tooltip** — hover/long-press shows `Board my_week · you@example.com`.
3. **Cloud panel summary** — when the board is empty for this account it says so and tells you to sign back in with the email that holds the data.

## Recover your data (no code)
Tap **Synced** → read the email → **Sign out** → sign in with the **email code** using your original address.

## Check
After sign-out, `document.querySelectorAll(".chat-fcard").length` on Chats should be 1 (just the Vault card, empty) and `JSON.stringify(__wfSb && (await __wfSb.auth.getSession()).data.session)` → `"null"`.
