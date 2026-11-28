# Web Studio · Commonplace (v1.8.0)

Web Studio adds an integrated learning book and real HTML/CSS/JavaScript practice to the existing course tracker. Open the [hosted app](https://celeritas7.github.io/Commonplace/Coding/html_css_js_study/index.html) through HTTPS; localhost is for development.

The three-lesson sample app includes checked exercises, projects and backups, account sync, and verified offline downloads. **UX-1** introduces one primary Learn / Practice / Projects / My learning navigation bar, a Continue learning card reflecting the saved chapter/part, and the contextual HTML/CSS/JavaScript selector inside Learn. **More** separates the original 453-entry linked course index from the three integrated offline lessons. **Phase 5 physical iPad acceptance is pending**: follow the [current v1.7.4 acceptance checklist and deployment gate](docs/PHASE5_IPAD_ACCEPTANCE.md). The older [Phase 7 validation report](docs/PHASE7_VALIDATION.md) preserves the historical v1.7.1 checkpoint. The full learning book remains deferred.

## Start learning

1. Read the HTML chapter's eight parts, including prediction, common mistakes and a practice challenge.
2. Select **Open practice**. The relevant file opens with its key expression selected. All three files belong to the active project; your edits carry across chapters.
3. Use **Check exercise** for expected/observed feedback, or **Run preview** to inspect the page yourself. Hints and a possible solution are available. Select **Return to lesson** to continue reading.
4. Finish the single five-question check (4/5 to pass), test your practice change and mark the lesson read. The reading mark is independent of quiz/practice results.

Select **3 sample lessons** in the book header to see the review sequence, saved place and separate reading/quiz/visual-review/exercise status. Source notes are collapsed inside each chapter.

The integrated curriculum currently has **three source-aligned sample chapters with original explanations and exercises**: HTML elements, CSS spacing and JavaScript events. Selected HTML/CSS material has been reviewed against the Drive study books; the JavaScript bridge follows the course outline with browser APIs checked against MDN. See [sample sources and scope](docs/SAMPLE_LESSONS.md). The full learning book is deferred. It does not reproduce the full paid course. **Course index** retains all 35 sections and 453 original entries, their existing Drive/Udemy links, notes and stars. IDs are frozen in `tests/legacy-id-map.json`.

## Exercises and feedback

Each sample has one checked exercise: build an HTML reading card, set CSS spacing and corners, or make a JavaScript counter increase by two. Checks inspect the rendered DOM, computed styles and real button clicks. Run preview alone and the visual-review checkbox do not award automatic passes.

Failed checks enter **Mistake Bank**; a later passing check resolves them. **Attempt history** keeps the latest 20 submissions per exercise with code and feedback. Loading starter code or restoring an attempt asks before replacing the shared project. Hints and solution viewing are recorded as help. See [exercise scope and limits](docs/EXERCISES.md).

## Projects and portable websites

Open **Projects & backup** from Practice or My notes. Your existing working page becomes **Study project**. Create from the Study card, Blank page or Personal card template, duplicate, rename and switch between up to 20 local projects. Switching keeps the previous code; lesson and exercise records stay with the learning book.

**Add local image** embeds a PNG/JPEG/GIF/WebP of at most 64 KiB into `index.html`. Each code file remains limited to 150,000 characters. **Export website** downloads one standalone HTML file containing the three source files and embedded images, without learning records or credentials. External and relative dependencies are not fetched. See [projects, backups and recovery](docs/PROJECTS_AND_BACKUP.md).

## Saving and backups

- Code, lesson notes, bookmarks, quiz answers, reading marks and exercise history save locally under `commonplace_web_studio_v1`. These records, named projects and the original course tracker also participate in [account sync](docs/CLOUD_SYNC.md) through the existing Commonplace sign-in. Offline edits stay local until this app is open, connected and signed in; check **Account sync** for success or errors. Incoming work waits for **Load synced work** before replacing the open workspace.
- The original tracker keeps `commonplace_wdb_v1`. Shared annotation keys and the page URL remain intact. The original tracker DOM precedes the new book to retain text-occurrence anchor ordering.
- Save errors and conflicting edits from another tab appear visibly. Corrupt/unsupported data is never replaced automatically. Keep the tab open and export a backup when saving fails.
- **My notes → Export study backup** includes only this section's new and old raw records plus the current unsaved drafts. It excludes authentication/session data and other sections. A scoped export is also available beneath Course index. The shared all-storage backup menu is hidden here.
- **Projects & backup → Choose a study backup** validates a scoped JSON file and previews **Merge** or **Replace**. Merge keeps local code and retains conflicting imported projects as separate copies; it appends distinct notes and combines bookmarks. Replace asks for confirmation. Missing records remain unchanged.
- Import retains the previous saved records before writing, checks both writes, and rolls back a failed import. **Download before-import backup** retains the most recent pre-import copy. If rollback cannot finish, **Recover previous data** or explicitly **Keep current saved data** resolves it. Do not clear website data.
- Shared highlights/annotations remain untouched on this device, but are outside this scoped backup; use their existing Commonplace controls in Course index to transfer them.
- Restoring starter code asks first and affects only the three project files. Lesson notes and study progress remain.

The folder bar links directly to **Commonplace** and **Coding**, including when this section is opened from an installed app without browser history. **Course** has a top **Back to Web Studio** button. Parent links save the current study state before leaving; a failed save lets you cancel departure.

On phones, the primary navigation has four study destinations plus a More menu. Chapter switching sits inside Learn instead of in a second permanent global tab row. Continue learning uses the existing saved chapter and part without creating or resetting progress. The contents summary shows the current part, and Next/Previous bring the new heading into view. Opening Practice does not automatically open the on-screen keyboard. Portrait layouts use Code/Browser result switching. Landscape iPad and desktop place the editor beside the result. Wide desktop adds **All three editors**.

## Execution limits

The workspace executes real HTML/CSS/DOM JavaScript in an iframe with `allow-scripts` and without `allow-same-origin`. The preview cannot read parent study or login storage. Put JavaScript in `script.js`; embedded HTML scripts/handlers, external assets/services, imports and dynamic eval/Function execution are blocked. Console messages and errors appear in the workspace.

The bundled Acorn parser adds checks to loops/functions. Ordinary infinite loops and recursion stop with an execution error. Stop/re-run replaces the result. Extremely expensive native browser operations cannot be guaranteed preemptible: this is a learning workspace, not a hostile-code execution service.

## Startup recovery (v1.7.3)

The main lesson/editor startup now has a separate watchdog from **Study offline** download verification. A healthy initialization explicitly acknowledges rendered learning content and editor/preview controls. If a required script is missing, the app throws before initialization, or the startup stalls, a self-contained recovery panel provides Retry, Repair offline setup and the offline launcher even when `studio.js` is unavailable. It keeps the existing Commonplace sign-in gate in front of recovery and never displays raw exceptions, tokens, URLs or local study contents. No local records or caches are cleared.

The recovery panel does not prove offline iPad acceptance. It only appears after the HTML shell itself has loaded. See [offline startup recovery](docs/OFFLINE_STUDY.md#if-the-study-interface-does-not-start) and run `tests/startup.cjs` plus `tests/startup-browser.cjs` alongside the existing workflow.

## Safe offline updates (v1.7.4)

**Study offline** now distinguishes the verified previous complete pack from an incomplete newer download. It shows the saved revision and the pending update revision rather than calling both "not ready." A previously saved pack is offered only after its bytes pass verification again; missing or corrupted files are never described as available. Existing code, notes, bookmarks, session and sync records are untouched.

The **Check for app updates** action refreshes the worker and verifies the pack. **Reload app** is blocked if the replacement pack is missing or incomplete; after the new pack verifies, it saves current work and checks again before reloading. Already-open pages continue using their earlier complete revision until a deliberate reload. See [safe update procedure](docs/OFFLINE_STUDY.md#updates-and-repair). A verified download still does not prove a physical iPad cold reopen; that remains a device acceptance step.

## Offline and updates

**Study offline** explicitly downloads the lessons, exercises, editor/preview, fonts, icons and supporting scripts. The panel shows total bytes, remaining bytes, progress and useful errors. Completed, unchanged files are reused after an interrupted download or update. **Ready offline** appears only after required saved files pass byte-length and SHA-256 checks. Worker installation does not download the larger study pack.

Choose **Back to study** at the panel heading or **Start studying** after verification to reveal the selected lesson/workspace. Learning tabs also dismiss the panel. Hiding the controls keeps an active download running while the app remains open.

Use **Study offline → Updates and repair → Check for app updates → Reload app** while connected. Reload is blocked if the current study draft cannot be saved. Then check/download the updated pack; the previous complete pack stays available during an incomplete update. Section-only repair preserves saved study records, downloaded packs and other Commonplace sections. See [offline preparation, repair and limitations](docs/OFFLINE_STUDY.md).

On iPad, open the [offline launcher](offline.html) in regular Safari and choose **Share → Add to Home Screen** if desired. Sign in and prepare downloads inside the browser or installed app where you will study; their storage may differ. Drive books, Udemy, external links, parent Commonplace folders, new sign-in and account sync require internet. Shared highlights/annotations and downloaded packs remain local and are outside account sync.

## Validation

[The Web Studio workflow](../../.github/workflows/web-studio.yml) runs the generated-manifest check, Node/Python contracts and Chromium/WebKit learning, projects/backup, sync and real service-worker suites. Coverage includes fresh preparation, interrupted resume, corrupted files, old-cache updates, offline cold reopening, code execution and preservation of saved records. The learning suite uses a stubbed login gate; the offline suite uses localhost, where the shared gate bypasses sign-in. Sync uses fixture accounts, not production account writes. Those results do not establish physical Google sign-in or cross-device acceptance.

See [Phase 7 validation](docs/PHASE7_VALIDATION.md) for the exact evidence, additional authentication checks and the device checklist. Physical iPad Safari and Home Screen acceptance remain pending and must be recorded separately; desktop WebKit and simulated phone widths are not physical-device tests.

## Files

- `index.html`, `studio.css`, `studio.js`: interface and study interactions.
- `studio-lessons.js`: original foundation lessons.
- `studio-exercises.js`, `studio-practice.js`: exercise definitions, feedback, hints and local attempt/Mistake Bank UI.
- `studio-store.js`: scoped local records, reviewed import and recovery journal.
- `studio-projects.js`, `studio-project-ui.js`: named projects, embedded images, website export and backup controls.
- `studio-preview.js`, `vendor/acorn.js`: execution and loop guards; license included.
- `legacy-tracker.js`, `data/course-index.js`: original course tracker.
- `offline.js`, `sw.js`, `offline-assets.json`, `tools/build-offline.py`: explicit pack preparation, verification and updates.
- `offline-repair.html`, `pwa/`: scoped repair and Home Screen metadata.
- `studio-sync.js`, `studio-sync-merge.js`, `studio-cloud.js`, `sql/`: account sync, conflict handling and database setup.

Do not reorder legacy course entries: their numeric IDs are order-derived. New teaching content uses explicit stable IDs.
