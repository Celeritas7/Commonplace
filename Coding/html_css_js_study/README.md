# Web Studio · Commonplace

Web Studio adds an integrated learning book and real HTML/CSS/JavaScript practice to the existing course tracker. Open `index.html` through HTTPS or localhost.

## Start learning

1. Read the HTML chapter's eight parts, including prediction, common mistakes and a practice challenge.
2. Select **Open example**. The relevant file opens with its key expression selected. All three files belong to one project; your edits carry across chapters.
3. Select **Run preview**, then **Return to lesson** to continue reading.
4. Finish the single five-question check (4/5 to pass), test your practice change and mark the lesson read. The reading mark is independent of quiz/practice results.

The integrated curriculum currently has **three original foundation chapters**: HTML elements, CSS spacing and JavaScript events. It does not reproduce the full paid course. **Course index** retains all 35 sections and 453 original entries, their existing Drive/Udemy links, notes and stars. IDs are frozen in `tests/legacy-id-map.json`.

## Saving and backups

- Code, lesson notes, bookmarks, quiz answers and reading marks save locally under `commonplace_web_studio_v1`. There is **no cloud synchronization** for these records.
- The original tracker keeps `commonplace_wdb_v1`. Shared annotation keys and the page URL remain intact. The original tracker DOM precedes the new book to retain text-occurrence anchor ordering.
- Save errors and conflicting edits from another tab appear visibly. Corrupt/unsupported data is never replaced automatically. Keep the tab open and export a backup when saving fails.
- **My notes → Export study backup** includes only this section's new and old raw records plus the current unsaved drafts. It excludes authentication/session data and other sections. A scoped export is also available beneath Course index. The shared all-storage backup menu is hidden here.
- There is no automatic backup import/merge UI in this release; retain the JSON for recovery. Shared annotations retain their own Commonplace controls in Course index.
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

Run `tests/storage.cjs`, `tests/legacy.cjs`, `tests/preview.cjs` and `tests/worker.cjs` with Node. `tests/browser.cjs` uses Playwright Chromium/WebKit and a local HTTP fixture with the gate stubbed **only in tests**. Production authentication is unchanged. `.github/workflows/web-studio.yml` runs these checks.

Physical iPad Safari/Home Screen acceptance remains required. Automated WebKit is not an iPad device test. Full offline acceptance belongs to the later download phase.

## Files

- `index.html`, `studio.css`, `studio.js`: interface and study interactions.
- `studio-lessons.js`: original foundation lessons.
- `studio-store.js`: scoped, recoverable local records.
- `studio-preview.js`, `vendor/acorn.js`: execution and loop guards; license included.
- `legacy-tracker.js`, `data/course-index.js`: original course tracker.
- `sw.js`, `pwa/`: update caching and Home Screen metadata.

Do not reorder legacy course entries: their numeric IDs are order-derived. New teaching content uses explicit stable IDs.
