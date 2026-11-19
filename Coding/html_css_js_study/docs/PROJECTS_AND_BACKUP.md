# Projects and backup

Phase 5 adds named local projects and portable backups to the three-lesson sample app. It does not expand the curriculum or certify reliable offline reopening.

## Projects

Open **Projects & backup** from Practice or My notes. The existing working code becomes **Study project** without a startup migration write. Create from Study card, Blank page or Personal card; duplicate and rename; open an existing project to return to Practice. The current project is saved before switching. All three editors address that active project.

The optional `projects` collection extends `commonplace_web_studio_v1`; the root `project` working copy remains compatible with older cached controllers. On reopening, working-copy edits overlay the active project's saved files. A collection-only record also retains its active files. Lesson IDs, notes, bookmarks, quiz answers, reading marks and exercise history are not tied to project switching and are not reset.

There are at most 20 projects, names of 1–80 characters, and 150,000 characters per source file. A save failure leaves the in-memory work available to Export study backup. Version 1.6 adds account synchronization; see [CLOUD_SYNC.md](CLOUD_SYNC.md).

## Images and website export

**Add local image** accepts PNG, JPEG, GIF or WebP up to 64 KiB and inserts a data-URL image at the end of HTML. File signatures are checked; SVG and other formats are rejected. Embedded images need no later asset request and travel with code, duplication and backups. Edit the generated alt text to describe the image. Large assets and remote file downloads are outside this phase. The HTML source limit still applies after base64 encoding. Saved exercise checks retain their separate 30,000-character submission limit; image-heavy projects can use the ordinary preview.

**Export website** downloads one HTML file containing the HTML fragment, CSS, JavaScript and embedded images. It includes neither learning records nor authentication. CSS and JavaScript text are encoded safely during packaging so Unicode and literal closing tags retain their meaning. Opening the export in a browser runs real JavaScript. The exported website uses normal browser execution, without Web Studio's preview loop guards or network restrictions. External and relative references are not downloaded; warnings flag likely dependencies. This is a single-file export, not a ZIP or a server application.

Physical iPad Files/Safari handling of downloaded HTML still needs device acceptance; a file previewer may differ from opening a page in a full browser.

## Study backup and import

Export includes this section's saved study and legacy course records, the current in-memory drafts, and any retained import recovery records. It excludes other sections, sign-in data and shared `cpx.*` highlights/annotations. Those annotations stay untouched in the current browser; use their existing Commonplace backup controls when transferring them.

Import accepts the existing `commonplace-web-studio-backup` version-1 JSON format, up to 12 MB. It validates raw records and drafts, rejects malformed/unsupported records and unrelated storage keys, and prefers valid current drafts from the backup. Import does not execute project code. Review shows the resulting project/note/attempt counts and conflict policy before any write.

- **Merge:** retain local active code, copy conflicting imported code into another named project, append distinct notes, union bookmarks and completion, and keep local conflicting quiz choices/settings. Compatible unknown fields are retained. Repeated imports deduplicate equivalent project code and attempts. Exercise history remains bounded to the latest 20 attempts per exercise.
- **Replace:** explicitly confirm replacing the records supplied by the backup. A missing/null study or legacy record keeps that local record; it does not mean delete. Other sections, authentication and annotations remain untouched.

The import plan is bound to the exact records reviewed. Another tab's changes cause a visible rejection. The UI suspends autosave through applying and reloading so old in-memory state cannot overwrite the imported result.

Before writing either live record, import saves their originals in `commonplace_web_studio_import_v1`. A failed write rolls back; a failed rollback leaves a recovery lock and the retained originals. **Recover previous data** restores those originals, while refusing to overwrite newer third-party tab changes. **Keep current saved data** validates and retains the current live records and releases that lock without overwriting them. **Download before-import backup** exports the most recent original snapshot. A later import replaces this retained recovery snapshot, so download it if needed.

The journal needs temporary free browser storage. An import may fail for lack of space even when its input file is below 12 MB; no cache or storage clearing is used as a retry strategy. Safari and Home Screen installations may have separate storage. Export from the context holding the work and import into the context where it is needed.

## Validation

Node tests cover project identity, compatibility, duplication, export encoding, backup validation, merge/replace, quota failures, rollback, pending recovery and stale tabs. Chromium/WebKit acceptance covers actual rendering/execution, embedded images, downloaded website/backup files, restored study data, mobile widths and older cached markup. Physical iPad Safari/Home Screen acceptance and verified offline packs remain later phases.
