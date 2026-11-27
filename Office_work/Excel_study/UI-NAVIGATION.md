# Excel UI-2 — navigation corrections

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
