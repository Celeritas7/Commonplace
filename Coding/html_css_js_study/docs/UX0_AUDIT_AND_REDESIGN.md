# UX-0: Commonplace Web Studio learner-flow audit and redesign proposal

**Status:** Design proposal only — no runtime changes in this PR.  
**Repository baseline:** `main` at `41feea4e3d6ff1fb8dc7e87f6cbd4af5f609fdbb` (2026-11-25).  
**Area:** `Coding/html_css_js_study/`; Web Studio v1.7.4.  
**Evidence:** Source inspection of `index.html`, `studio.css`, `studio.js`, `README.md`, existing sample lessons and the offline acceptance plan. This is not a physical iPad/Android usability test.

## Goal

Make a quiet, lesson-first Web Studio where a learner immediately knows **what to learn, where to practise, what happened after running code, and what to do next**. Follow one consistent journey:

**Continue lesson → Try in editor → Run preview / Check exercise → Return to lesson → Finish check → Next lesson.**

The HTML/CSS/JavaScript editor, notes, bookmarking, named projects, Mistake Bank, account sync, course index and verified offline packs must keep working. No curriculum expansion or platform-wide admin changes belong in the UX project.

## Current architecture and observed friction

| Current behaviour (source-based) | Risk to usability | Proposed response |
| --- | --- | --- |
| Header has separate HTML/CSS/JavaScript tabs **and** Book/Practice/My notes/Course tabs. On narrow screens they become two full-width rows. | Competing navigations consume space before the lesson and make chapter vs destination ambiguous. | One primary destination navigation; chapter picker belongs inside Learn. |
| Opening the app restores an existing `view`, but it has no dedicated "continue learning" overview. The sample library is linked from the reader and outline. | Learners may land in a tool without a visible next action, or may not realise where the three lessons live. | Learn opens with a concise "Continue lesson" summary using existing saved chapter/part; a simple list of three current sample chapters. |
| "Book" (integrated lessons), "3 sample lessons", and "Course" (legacy 453-entry linked tracker) are presented at different levels. | They may appear to be separate versions of the same curriculum. | Label "Lessons" and "Course index · external references" distinctly; do not imply 453 downloadable integrated lessons. |
| Nine lesson-outline controls (eight parts plus finish) render before the main content on compact widths; they are initially collapsed. | Yet another control block occupies the first viewport. | Desktop: persistent outline alongside reader. Phone: compact current-step control that expands on demand. |
| Projects & backup and Mistake Bank are reached through Practice rather than the top-level toolbar. | Saved projects, backups and feedback are harder to find than their importance warrants. | Primary "Projects" destination; "My learning" contains notes/bookmarks and the Mistake Bank; backup remains clearly labelled inside Projects. |
| Practice is a separate view with task, project bar, actions, code/result tab switcher and return buttons; running preview switches to result on compact screens. | The relationship between lesson task, files, preview and feedback can become visually unclear. | Stable task header, prominent **Run preview**, secondary **Check exercise**, explicit mobile Code/Result switch, and visible **Back to lesson**. Preserve the existing real preview/checking engines. |
| Save status and collapsed account sync live above the toolbar; Study offline opens a long in-page panel. | Status is important, but permanent tool rows compete with lesson content. | Compact trustworthy state area with one visible Study offline entry; keep errors, missing packs, recovery and sync conflicts unmistakable. Never fabricate "Ready offline." |

### Existing useful design to retain

- Real, sandboxed HTML/CSS/JavaScript preview and the current checked exercises.
- A single active project shared across the three sample lessons, with explicit file tabs and optional wide-screen all-editors layout.
- Eight reading parts, prediction, one five-question finish check and separate reading/practice completion marks.
- Local-first work, note/bookmark/project recovery, backup import/export and optional account sync.
- Existing sign-in gate and offline verified-pack / previous-revision update safeguards.
- Accessible minimum touch targets, keyboard focus, dark mode, reduced motion and the ability to return to Commonplace/Coding.

## Proposed information architecture

```text
Web Studio
├─ Learn                  DEFAULT: Continue from saved lesson and part
│  ├─ HTML foundations    3 sample chapters, status and current part
│  ├─ CSS styling
│  ├─ JavaScript behaviour
│  └─ Reading outline → Try in editor → Finish check
├─ Practice               Current project, lesson task, code / browser result
│  └─ Run preview → Check exercise → Back to lesson
├─ Projects               Named projects, website export, reviewed backup
├─ My learning            Notes, bookmarks, Mistake Bank, learning status
└─ More                   Course index (external study links), help, offline setup
```

The first implementation should *map these labels onto existing screens and stored views*, rather than invent a new persistence schema. A new Home/Continue view, if introduced, should be computed from `saved.language`, saved part, and saved exercise status. Do not create a second progress truth or rewrite user records.

## Proposed screen flow

**Phone (portrait):**

```text
Commonplace / Coding / Web Studio
Web Studio                              [Study offline]
[ Learn ] [ Practice ] [ Projects ] [ More ]

Continue learning
HTML foundations             Part 3 of 8
Give your page meaning.         [Continue]

Explore lessons: [ HTML ] [ CSS ] [ JavaScript ]

Current part: 03 · Walk-through
[Read lesson text]
[Try this in the editor]          ← main action
[Previous]                        [Next]
```

**Tablet / desktop:** use a modest-width lesson outline alongside a readable article; in Practice, show the code editor alongside browser result whenever the viewport fits. Avoid a full-screen dashboard before the learner can resume. Use restrained neutral surfaces, readable typography and a limited accent palette, not decorative emoji as the navigation system.

**Return paths:** The editor always offers "Back to [actual lesson part]". Checking exercises must not silently mark a lesson read; quiz pass, visual review, exercise pass and reading marks remain distinct. Notes/bookmarks must retain chapter context.

## Staged implementation (separate PRs)

1. **UX-0 — Audit/design checkpoint (this PR):** agree on information architecture, primary path and non-negotiable compatibility checks before production code changes.
2. **UX-1 — Navigation and Continue experience:** slim the header, remove duplicate navigation layers, surface a reliable continue card and clear names for the three integrated lessons and the original course index. Avoid altering saved keys/lesson IDs.
3. **UX-2 — Lesson ↔ practice continuity:** visually join goal, code, preview, exercise feedback and return path. Keep preview security and grading code untouched wherever possible.
4. **UX-3 — iPad/Android responsive polish:** test phone portrait, tablet portrait/landscape, keyboard interactions, scrolling, tap targets, accessible labels/focus, light/dark and reduced motion. Avoid hiding code behind permanent overlays.
5. **UX-4 — Offline and data regression gate:** regenerate/check the 58-file offline manifest whenever hashed runtime assets change; test mixed revisions, cold offline relaunch, save failures, projects, notes, bookmarks, exercises, backup/recovery, sign-in gate, account sync and legacy tracker IDs. Treat current Phase 5 physical-device acceptance as separate until actually performed.

## Compatibility / safety constraints

**Do not** reorder the original `#legacy-course` DOM ahead of the book: its text-occurrence anchors and 453-entry tracker IDs depend on existing order. Preserve existing `data-view`, `data-screen` and selector contracts until any migration has explicit tests. Preserve the `commonplace_web_studio_v1` and `commonplace_wdb_v1` records, stable lesson IDs `html-elements`, `css-spacing`, `js-events`, and user-edited project files.

Do not change `../../_lib/gate.js`, Google OAuth callbacks, Supabase RLS, Admin Studio roles, parent folder links, or Python's offline implementation as part of visual work. Keep the import-recovery screen reachable even when it locks navigation; do not hide unsaved-change or sync errors behind a cosmetic "saved" indicator. Keep Study offline, repair, update checking, and verified previous-pack fallback reachable from a failed state.

A visual change to `index.html`, `studio.css` or `studio.js` is **also an offline asset release**, not "just CSS." Update generated manifests and tests and use a complete revision with the existing staged-safe update system. Do not clear website storage or force reinstallation for an aesthetic update.

## Acceptance checklist for UX implementation

- [ ] New/returning learner sees a single obvious **Continue** action and correct saved lesson position.
- [ ] Learner can move HTML → CSS → JavaScript and find the current reading part without duplicate competing navigation.
- [ ] Lesson → Practice → Preview / Check → Lesson works in one understandable sequence; unsaved code is not discarded.
- [ ] Named project, notes/bookmarks, Mistake Bank, course index and scoped backups remain discoverable.
- [ ] Source material remains honest: only three integrated sample lessons; original 453-entry index remains an index.
- [ ] Phone 390×844, tablet 768×1024 and 1024×768, desktop 1366×768: no inadvertent horizontal scrolling, controls remain visible and keyboard usable.
- [ ] Accessibility: visible focus, screen-reader labels, 44 px touch controls, contrast and reduced-motion behaviour.
- [ ] Offline: 58 verified files on the current release; old verified pack still works during update; cold reopen, JavaScript preview, saved records and recovery pass.
- [ ] Signed-out and unauthorized users do not gain access; account sync and conflict/recovery behaviour unchanged.
- [ ] Existing Web Studio tests (Node/Python + Chromium/WebKit + combined HTTPS gate/worker) pass, and a human checks Android/iPad in their own installed storage contexts.

## Release gate

[Phase 5 iPad acceptance PR #82](https://github.com/Celeritas7/Commonplace/pull/82) was open at this audit. An automated Chromium/WebKit PASS is not physical iPad acceptance, and the isolated Cloudflare pilot is not a production hosting migration. Ship UX changes only through reviewable PRs, then explicitly confirm the live host and offline behaviour on the actual devices.

**This UX-0 PR changes documentation only. It does not install a redesigned interface in Web Studio.**
