# Excel UI-2 — navigation corrections

## Current acceptance checkpoint — 2026-11-28 (Japan)

Reviewed main `cb451135ecaea1d78cde20fb735040ccc418332a`. The historical UI phase notes below
describe their original candidate status; this record supersedes their
outstanding status wording where evidence now exists.

- UI-3 #133, illustrated launcher #146, F5B #144, mobile Apply-layout feedback
  [#149](https://github.com/Celeritas7/Commonplace/pull/149) and F5C charts/reports
  [#152](https://github.com/Celeritas7/Commonplace/pull/152) are merged. The
  F5C final [foundation CI run](https://github.com/Celeritas7/Commonplace/actions/runs/46111216047)
  passed. Native Section 6 workbooks remain F5D; charts/reports are available
  in the bounded browser simulator, not as native workbook files.
- User-reported UI-V3 launcher PASS: workbook symbol, six illustrated cards,
  compact approved layout, four icon tabs, opening the PivotTable page, and
  no horizontal overlap/overflow.
- User-reported #149 Apply-layout retest PASS: missing-field warning;
  Destination / None / Sum of Amount / All statuses; 9,200 JPY total;
  Clear PivotTable. Record this as the narrow retest of the reported issue.
  Refresh captures valid current source for the already-applied layout; pending
  selector changes require Apply Layout. Failed refresh retains the last valid
  PivotTable. No engine change is needed for this wording clarification.
- Device, OS/browser, installed context, tested origin and source revision were
  not supplied for either report. Do not extend these passes to E3/R1 physical
  iPad cold reopen/offline recovery, physical F5C chart touch/readability, native
  Excel, hosted activation or G0. Those remain separate acceptance sessions,
  with PASS/FAIL/NOT TESTED and actual environment/revision recorded. Preserve
  existing installations, website data, records and offline packs.
- For the merged curriculum/test-gate evidence and next-phase boundaries see
  [current development checkpoint](CURRICULUM.md#current-development-checkpoint--2026-11-28-japan).

Follow-up to the merged UI-1 launcher (PR #127). This change is confined to the
personal study preview. It does not change the curriculum, exercise engine,
assessment storage, account permissions or synchronization.

- Homepage mode selections create a same-document history entry. Reload,
  Back/Forward, direct fragments and restored pages use the URL as their
  source of truth. Unknown fragments show Learn; existing non-mode fragments
  are not overwritten on initial load.
- Existing Section 1 applied-example label is retained, with a link to the
  selector. Section 2 now shows the active example and its units beside the
  workbook buttons, with a link to its existing selector. Selection/reset
  behavior is unchanged, and switching is explicitly described as a reset.
- Section 1 has a top Excel Study return link. Section 2 already has a top
  learning-path link. Both offer contextual returns to Practice and Workbooks.
- F2 PR #128 is a separate concurrent curriculum change. UI-2 deliberately
  leaves the shared launcher card inventory, its original browser test and
  Section 2's top navigation line untouched to avoid the known overlapping
  edits. Reconcile against latest main before merging either PR. A common
  breadcrumb style for all released lesson pages can be finished in UI-3.

Regression tests: platform/tests/browser/excel-ui-navigation.spec.mjs.
UI-3 will handle sticky-bar anchor clearance, narrow layout, text readability
and physical iPad verification. No hosting or production changes.

## UI-3 — responsive polish

The approved desktop launcher and all current learning links are retained.
On viewports at or below 720 CSS pixels, hide only the decorative worksheet
example so the study controls appear sooner. At 420 pixels and below, modes
use a two-column layout with comfortable touch targets. Secondary labels are
larger, and launcher padding accounts for safe-area insets.

Section 1 measures the actual sticky reading bar height and sets document
scroll padding; the initial value is available before the lesson content is
parsed. ResizeObserver tracks layout changes, with a resize fallback. No
scrolling is forced on resize, no user state is cleared, and the CSS fallback
applies without JavaScript. Section 2 has a small fragment offset.

Released Sections 1 and 2 use a consistent breadcrumb with an explicit current
page; the Section 2 adjacent-lesson link remains separate. Existing practice
and workbook destinations and UI-2 URL behavior remain unchanged. Future
Sections 3/4 in open curriculum PR #128 are not introduced by UI-3. When
reconciling those branches, preserve their next/previous links and apply the
same breadcrumb pattern to newly released pages.

Regression coverage: platform/tests/browser/excel-ui-responsive.spec.mjs.
Browser viewport checks do not replace a physical iPad Safari/Home Screen
acceptance run. No production deployment, storage, permissions or engine changes.

## UI-4 — curriculum integration acceptance

UI-1 through UI-3 are merged. This integration brings latest main into the
existing curriculum PR #128, preserving the four-section launcher inventory
from that branch and the approved main launcher styles and tab history. The
Section 2 adjacent links are retained; Sections 3 and 4 adopt the same
breadcrumb, contextual return links, and active workbook example label.
Changing the example retains the original worksheet-reset behavior. No
curriculum, engine, workbook bytes, or record model is changed by this UI
integration. Existing UI-2/UI-3 tests remain in the merged tree. A new
browser regression covers the new pages, workbook context and downloads.
Physical iPad acceptance and hosted deployment checks are still outstanding.

## UI-V1 — approved visual homepage

The approved standalone mobile design is integrated into the personal Excel
launcher, rather than copied with preview-only absolute URLs or JS-generated
cards. The Excel-inspired workbook illustration and the seven topic symbols
are inline SVG. The four icon-and-label study tabs use the existing IDs, hrefs,
keyboard and browser-history behavior. Learn cards use one short skill line;
Practice and Workbooks retain the original shortcut labels and destinations.
Planned content remains non-interactive and the Section 6 limitations remain
explicit in the workbook and roadmap notes.

The 390px layout follows the reviewed preview: compact green header, visible
workbook symbol, four tabs in one row, and illustrated horizontal lesson cards
in one column. Desktop uses two card columns and retains the existing
illustrative worksheet alongside the workbook identity. Small readability and
touch-target adjustments (including 44px breadcrumb links) are intentional.
All six available sections and five workbook sets are taken from main at
649d666470579e3043d5568c1db7888a8dfe8343. The separately developing F5B #144
will update the Section 6 content; preserve those new links and roadmap facts
when reconciling the homepage. Do not replace the curriculum from a stale preview.

The existing login gate, 29 navigation destinations and homepage tab script
are unchanged. No additional external art, fonts, framework, runtime storage,
service worker, or database changes. Native link navigation remains available
without JavaScript. The browser regression covers visible local illustrations,
viewport fit, touch targets, compact mobile cards, keyboard and mode behavior
and static links. Physical device acceptance of this new visual revision and
post-merge deployment checks remain pending.

## UI-V2 — F5B integration

Preserve the merged UI-V1 illustrations, layout, access gate, static links and
mode-history behavior while incorporating the F5B curriculum branch in PR #144.
Section 6 advertises PivotTables in addition to conditional summaries and
provides a separate PivotTable practice shortcut. Native Section 6 workbooks,
charts and reports remain planned; the existing five workbook sets are unchanged.
The existing F5B launcher regression also verifies the illustrated mobile header,
mode icons, Section 6 artwork, roadmap and workbook boundaries before opening the
PivotTable lesson. No exercise, grading, workbook-generation, database or access
changes are introduced by this UI reconciliation. Full CI on the combined commit
and physical-device acceptance of the new visual revision remain required.

## F5B mobile Apply layout follow-up

UI-V3 physical review reported that the illustrated launcher was accepted, but
the PivotTable Apply layout action appeared not to work. The exact device
failure has not been reproduced. The existing source has a verified feedback
placement problem: Rows and Values start unselected and invalid layouts
are rejected, but operation messages appear after the result/submit controls.
Keep the exercise's field-selection task and move layout, refresh and clear
feedback immediately after their buttons. Explain required selections and
conflicting fields, distinguish no pivot from a retained prior pivot, and
mark invalid selectors. Submission grading feedback remains separate. The
engine, grading, source snapshot, workbook outputs and account/record paths
are unchanged. Add a touch-enabled 390px browser regression for missing
fields, valid layout, conflict, recovery and clear. Real-device retest remains
required before closing the reported issue.
