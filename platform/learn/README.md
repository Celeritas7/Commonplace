# U7 — Authorized Excel learning integration

Status: implemented behind the existing **disabled** deployment boundary. No hosted authentication, migration, permissions, files or assignments were changed. This is the first section integration; other sections remain on their existing paths. Private offline delivery and cloud synchronization are U8 work.

## Review the learner experience

Serve the repository and open `/platform/learn/preview.html`, or choose **Preview assigned Excel learning** from `/platform/`. The preview uses public synthetic records through the same learner-context, material, profile, worksheet and progress adapters as the live host. It never connects to Supabase and never uses real learner identities. Its work stays in memory and resets when the page reloads. It is not a fallback for failed live access.

1. Excel Study opens directly. No other study section or administration link appears for this sample learner.
2. Expand **Your learning focus** to see the supplied import-export learning profile. Open **Prepare a shipment to Manila** and enter `=SUM(B2:B4)` in B5. Apply it, edit a quantity, and calculate again. Try the existing Ribbon tabs and cell selection.
3. Add a note or bookmark, select another assignment and return. The current material's work is restored for this preview session.
4. Open the quiz, choose responses and mark it as studied. Answers are not embedded in the quiz. An answer-sheet material appears only when the server publishes, assigns and explicitly releases it.
5. Download **Inventory practice file**. This public sample is a small TXT file. Actual assigned XLSX/PDF/image/TXT downloads use the U6 protected service after activation.

## Central and section responsibilities

| Owner | Responsibility |
| --- | --- |
| Central learner host | Verified account context, active membership, allowed navigation, professional profile, published assignments, authorized downloads and owned study records |
| U6 material service | RLS/publication/assignment checks on every protected request; private file integrity and delivery |
| Excel section | Shared Phase A Ribbon and cell navigation, dynamic worksheet from the assigned scenario/dataset, fixed SUM validation and practice feedback |
| Administrator | Review and assign profession-relevant versions and answer sheets; profile changes do not silently replace an assigned lesson |

`Office_work/Excel_study/assigned-lesson.mjs` renders the authorized U4 model using the existing `excel-ribbon.js` and its CSS, without modifying them or the legacy lesson. The same SUM concept can receive different product labels, quantities, currency/units and scenarios. Profile goals/preferences are shown by the central host; this does not automatically translate content or infer new permissions/assignments from a job title.

Only `explanation.text.v1` and `excel.sum.b2-b4.v1` are supported. SUM accepts the explicit B2:B4 expression, bounded finite numeric cells and no arbitrary expressions/evaluation. Ribbon operations remain orientation previews. PR #70 is still open against `feat/excel-study-phase-a` at this checkpoint; none of its unmerged operations are claimed or changed. Review the eventual merged capability changes before extending the adapter. The current static Section 1 lesson, its quiz and `commonplace_excel_preview_v1` remain intact.

The shared reader also displays assigned explanations, inert code, datasets, question blocks, answer sheets and attachments. Quiz responses are saved, not automatically scored: the U6 document contract intentionally has no embedded answer key. An administrator-released answer sheet supplies the comparison. This is not the future full Phase C/D guided engine or independent-practice expansion.

## Authorization and lifecycle

`platform/index.html` and `platform/learn/index.html` use the same opt-in bootstrap. `platform/admin/deployment.mjs` remains `null`. An approved activation must supply a fixed `clientModule` and `projectNamespace`; the client is resolved relative to that shared deployment module and reused by administration and learning. No credentials, project selectors or role flags are read from URLs/localStorage. The learner host adds no OAuth flow, administrator system or email allowlist. It never rewrites the URL or removes authentication callback fragments.

After `auth.getUser()`, the U1 context reads fresh membership and RLS-filtered sections. Only connected, authorized leaves appear; Excel-only learners land directly. Unconnected sections are not redirected to public legacy content. The optional `section` and `material` query parameters are selectors only. Direct material selection must be in the current server list and still pass a fresh `cp_read_material` request. The response's owner, published state, section, version, supported capabilities and attachment metadata are checked before rendering. The lesson is composed from that one fresh response, avoiding a duplicate material download.

There is no signed/public file URL in the view. A file click rechecks its material and invokes the U6 service with the current authenticated client. A late response after account change or disposal cannot create a download. Temporary Blob URLs are revoked on view changes/disposal and shortly after use. Already downloaded bytes cannot be recalled.

Real account changes and signout abort the context ticket and clear all private views. Same-owner token refreshes retain current work. Offline, page-hide and visibility transitions clear the private view; returning online/visible, focusing the window or explicitly refreshing requires fresh authorization. Delayed profile/catalogue/material/file results cannot repopulate the old account. Revocations are enforced by the server on subsequent protected requests and reflected when the host refreshes; this is not a push revocation channel or a claim to erase bytes already delivered.

Imported content is rendered with text nodes. No lesson-provided HTML, scripts, URLs or formulas execute. Public sample code is a separate import graph; the live bootstrap never imports it. A failure leaves the host closed with a refresh message rather than opening public samples, unauthorized sections or cached private content.

## Progress and preservation

Live study records use the U1 fixed project namespace and verified account UUID. Bundle progress uses the U4 content-version identity; document/file records use the immutable material-version UUID and version. Individual/group assignment paths do not change progress identity. A new published version starts separate progress. Worksheet drafts/completion, quiz responses, notes and bookmarks save on interaction under that identity. Reset affects only the selected worksheet attempt.

`account-store.get()` reads one owned record with ticket and identity checks; unrelated invalid records are not enumerated. Restored records are validated before use. An unreadable existing record is kept and disables new saves for that material, with a visible message. Quota/storage failures leave the current UI available and report that changes were not saved. No legacy state is adopted, rewritten, deleted or silently uploaded. The existing U1 backup contract continues to include these owned records.

These records are local study state, **not server-certified completion or cloud progress**. There are no writes to `cp_study_state` yet; its conflict protocol belongs to U8. Local storage namespaces prevent accidental cross-account display, not deliberate inspection by another person using developer tools on the same device. Existing offline coding/language PWAs are unchanged. This new assigned workspace requires online authorization and does not register a service worker, cache private materials or implement an offline lease. Do not clear website data to install or test it.

## Acceptance and deployment gates

Automated coverage includes strict catalogue/file manifests, SUM capability boundaries, versioned progress, same-owner refresh, A/B isolation and stale results, quiz responses/answer visibility, authorized download handoff, revoked/direct-URL/offline failures, callback preservation, inert text and narrow layouts. Existing platform SQL tests and the legacy Excel regression still run. Browser fixtures model a server and do not prove hosted Supabase behavior.

Before activation, retain the U0/U1/U6 backup/restore and isolated-backend/origin gates. Test this exact client with real A/B/admin/revoked JWTs and the private Storage service, including permissions changed in another tab, downloads interrupted by revocation, expired sessions, account switching and iPad Home Screen Google callbacks. Verify the configured deployment namespace stays stable. Test actual XLSX/PDF downloads and foreground/back-forward lifecycle on physical iPad/Safari and Android. U8 must implement and validate owned offline packs, cross-tab coordination and conflict-safe cloud sync before offering assigned study offline.

Rollback before activation: revert the code. After an approved pilot, disable the deployment boundary/route and retain the new study records, material versions, assignments and files. No table drops, token copying or clearing devices is required.

## U8 follow-on

The [offline and synchronization adapter](../offline/README.md) now extends this host when explicitly enabled in deployment configuration. It adds signed saved packs, offline reopening, account-scoped IndexedDB progress, CAS synchronization, conflicts and backup recovery. The original U7 preview remains an in-memory online example; use `offline-preview.html` to review U8 with synthetic persistent data. Live activation remains disabled.
