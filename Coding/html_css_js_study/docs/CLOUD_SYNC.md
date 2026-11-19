# Account sync — Web Studio 1.6

Web Studio uses Commonplace’s existing General_apps Supabase project and sign-in session. Personal study records are owned by the signed-in user, protected by row-level security and uploaded through a revision-checked RPC. This adds account synchronization; it does not complete the planned reliable offline download packs.

## What travels between devices

- Named projects, active HTML/CSS/JavaScript and embedded image data.
- Native lesson notes and bookmarks, reading marks, quiz answers, practice confirmation and reading position.
- Exercise attempts, hints/solution state and the Mistake Bank derived from those attempts. History remains the latest 20 attempts per exercise.
- Original course tracker completion, stars, notes and compatible settings.

Shared `cpx.*` highlights/annotations/resume marks, other Commonplace sections, downloaded lesson assets/packs and authentication data are not in the snapshot. Shared annotations retain their existing separate backup controls. Cloud sync never executes project source or changes the preview sandbox.

## Everyday use

Open **Account sync** beside the local-save status. Saved work uploads after edits, on reconnect, on returning to the app and periodically while it is open. **Sync now** retries immediately. Offline edits remain in the existing local records, so closing and reopening does not discard the queue. Safari can suspend an app in the background: reconnect and keep Web Studio open until it says **Synced to your account**.

On the other device, sign into the same Commonplace account. Incoming work is combined and staged; **Load synced work** saves the reviewed result and reloads the editors. It never replaces the open editor while you are typing. If you edit during a request, the new edit stays pending and is not falsely labelled synced.

The first signed-in use binds this browser’s existing Web Studio work to that account. Changing to another account pauses sync; it never uploads the previous account’s queue into the new one. Sign back into the original account to continue. Local data is not erased on sign-out. Account sync and export/import are separate: JSON backups remain useful independent copies, not a replacement for sync.

## Conflicts and recovery

A saved common baseline enables three-way merging, including unmarking progress and removing bookmarks. Independent project-file edits combine. If the same source file changed on both devices, a separate **(other device)** project retains the competing complete version. Concurrent note text retains both versions. Conflicting quiz progress stays a coherent attempt from the current device and is reported; it is not mixed question by question. Existing compatible extension fields survive.

The server accepts a write only against the revision that was read, with the expected account matching the authenticated request. Contention retries at most three times. Requests and recovery-storage operations have deadlines. Failures show beside the sync controls and leave local records available for study/export. A combined record exceeding 20 projects or the server’s 8 MiB snapshot limit fails visibly rather than dropping work.

Applying incoming data uses the existing scoped import journal and stale-tab checks. Autosave is suspended through the write and reload. The previous snapshot is available from **Projects & backup → Download before-import backup**; interrupted writes use **Recover previous data** or **Keep current saved data**. The next import or cloud apply replaces that one recovery snapshot, so export it if needed. No repair clears website data, downloaded packs or another section’s storage.

The common sync baseline lives in the `commonplace-web-studio-sync` IndexedDB database, separate from the two existing localStorage study records. IndexedDB/storage failure pauses sync rather than treating an unknown baseline as empty. LocalStorage space is temporarily needed for the guarded import journal.

## Device acceptance

1. While connected, open Web Studio, sign in and write a small note. Wait for **Account · synced**.
2. On iPad, use the same account in the Safari tab or Home Screen app where you study. Open **Account sync**, then **Load synced work** when offered. Check the note and your project.
3. Disconnect, edit the note/code, then reconnect with Web Studio open. Wait for synced. On your other device choose **Sync now → Load synced work** and check the edit.
4. For a conflict check, change the same project’s HTML differently on both devices while offline; reconnect both, load merged work, and confirm both versions exist in Projects & backup.

Do not clear website data. Safari and an installed Home Screen app may have separate local storage, so each needs the same sign-in and its own prepared offline downloads. Physical iPad/Home Screen acceptance is still required; automated WebKit testing is not an iPad test.
