# Web Studio · Commonplace

Web Studio adds an integrated learning book and real HTML/CSS/JavaScript practice to the existing course tracker. Open `index.html` through HTTPS or localhost.

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

- Code, lesson notes, bookmarks, quiz answers, reading marks and exercise history save locally under `commonplace_web_studio_v1`. There is **no cloud synchronization** for these records.
- The original tracker keeps `commonplace_wdb_v1`. Shared annotation keys and the page URL remain intact. The original tracker DOM precedes the new book to retain text-occurrence anchor ordering.
- Save errors and conflicting edits from another tab appear visibly. Corrupt/unsupported data is never replaced automatically. Keep the tab open and export a backup when saving fails.
- **My notes → Export study backup** includes only this section's new and old raw records plus the current unsaved drafts. It excludes authentication/session data and other sections. A scoped export is also available beneath Course index. The shared all-storage backup menu is hidden here.
- **Projects & backup → Choose a study backup** validates a scoped JSON file and previews **Merge** or **Replace**. Merge keeps local code and retains conflicting imported projects as separate copies; it appends distinct notes and combines bookmarks. Replace asks for confirmation. Missing records remain unchanged.
- Import retains the previous saved records before writing, checks both writes, and rolls back a failed import. **Download before-import backup** retains the most recent pre-import copy. If rollback cannot finish, **Recover previous data** or explicitly **Keep current saved data** resolves it. Do not clear website data.
- Shared highlights/annotations remain untouched on this device, but are outside this scoped backup; use their existing Commonplace controls in Course index to transfer them.
- Restoring starter code asks first and affects only the three project files. Lesson notes and study progress remain.

The folder bar links directly to **Commonplace** and **Coding**, including when this section is opened from an installed app without browser history. **Course** has a top **Back to Web Studio** button. Parent links save the current study state before leaving; a failed save lets you cancel departure.

On phones, chapter/view tabs use equal touch targets, the contents summary shows the current part, and Next/Previous bring the new heading into view. Opening Practice does not automatically open the on-screen keyboard. Portrait layouts use Code/Browser result switching. Landscape iPad and desktop place the editor beside the result. Wide desktop adds **All three editors**.

## Execution limits

The workspace executes real HTML/CSS/DOM JavaScript in an iframe with `allow-scripts` and without `allow-same-origin`. The preview cannot read parent study or login storage. Put JavaScript in `script.js`; embedded HTML scripts/handlers, external assets/services, imports and dynamic eval/Function execution are blocked. Console messages and errors appear in the workspace.

The bundled Acorn parser adds checks to loops/functions. Ordinary infinite loops and recursion stop with an execution error. Stop/re-run replaces the result. Extremely expensive native browser operations cannot be guaranteed preemptible: this is a learning workspace, not a hostile-code execution service.

## Offline and updates

**Study offline** explains the current limitation: verified downloadable packs, resumable download progress and safe pack repair are **not implemented in this release**. Keep internet available when opening the app. The worker has a small shell cache and bounded network-first updates; this does not certify offline readiness. Activation clears no caches, study data or packs.

Use **Study offline → Check for app updates → Reload app** while connected. Reload is blocked if the current study draft cannot be saved. The old v1 cache remains a fallback; other sections are untouched.

On iPad, open in Safari and choose **Share → Add to Home Screen**. Safari and the installed app may have separate storage. Study, save and eventually prepare downloads in the same browser/app context. Drive books, Udemy and initial sign-in remain online features.

## Validation

Run `tests/storage.cjs`, `tests/legacy.cjs`, `tests/preview.cjs`, `tests/worker.cjs`, `tests/projects.cjs` and `tests/backup.cjs` with Node. `tests/browser.cjs` uses Playwright Chromium/WebKit and a local HTTP fixture with the gate stubbed **only in tests**. Production authentication is unchanged. `.github/workflows/web-studio.yml` runs these checks.

Physical iPad Safari/Home Screen acceptance remains required. Automated WebKit is not an iPad device test. Full offline acceptance belongs to the later download phase.

## Files

- `index.html`, `studio.css`, `studio.js`: interface and study interactions.
- `studio-lessons.js`: original foundation lessons.
- `studio-exercises.js`, `studio-practice.js`: exercise definitions, feedback, hints and local attempt/Mistake Bank UI.
- `studio-store.js`: scoped local records, reviewed import and recovery journal.
- `studio-projects.js`, `studio-project-ui.js`: named projects, embedded images, website export and backup controls.
- `studio-preview.js`, `vendor/acorn.js`: execution and loop guards; license included.
- `legacy-tracker.js`, `data/course-index.js`: original course tracker.
- `sw.js`, `pwa/`: update caching and Home Screen metadata.

Do not reorder legacy course entries: their numeric IDs are order-derived. New teaching content uses explicit stable IDs.
