# U6 — Central material library and publication

Status: isolated implementation for review. Live deployment remains disabled. No hosted database migration, Storage bucket, Edge Function or real learner assignment was created during implementation.

## Review the workflow

Serve the repository and open `platform/admin/preview.html`, then choose **Material library**. The public preview contains synthetic records in memory. Use **New material**, enter a title, choose **Text lesson** or **Excel SUM example**, preview it, and save a draft. Review the saved version before publishing, then select learners/profile groups and save assignments. Try exclusions, a new draft version and archive. Publishing alone grants no learner access. The preview does not upload personal files; real file handling requires the approved backend.

Imported JSON is validated before filling the editor and again by PostgreSQL when saving. Unknown identity, role, recipient and publication fields are rejected. Import never publishes or assigns. Content/code previews use text nodes and never execute imported scripts, formulas or HTML. Published payloads and file bytes are immutable through the API; a new version starts as a separate draft with no assignments. Existing assignments stay pinned to the old version. Archiving immediately denies subsequent protected reads of that version, including existing assignments; it retains records, audit and files for recovery.

Material types: examples, explanations, guided exercises, practice, quizzes, tutorial files, answer sheets, projects, datasets and code examples. Profiles/groups remain central; no Excel-specific administration is added.

## Import contract

`schema.json` is the complete data-only shape mirrored in the server migration. The importer accepts one material per UTF-8 JSON file, up to 256 KiB:

```json
{
  "schema_version": 1,
  "section_id": "office.excel",
  "title": "Track stock for a Manila shipment",
  "material_type": "practice",
  "content": {
    "format": "document",
    "blocks": [{"kind": "paragraph", "text": "Add the quantities of the three products."}]
  }
}
```

Formats:

| Format | Content |
| --- | --- |
| `document` | 1–60 paragraph, code or question blocks. Questions have 2–8 distinct choices, with no embedded answer field. Code remains inert text. |
| `bundle` | A validated U4 concept/scenario/dataset/lesson bundle. Current capabilities are explanatory text and the existing Excel three-row SUM contract. |
| `dataset` | A validated U4 typed dataset, up to 200 rows and 16 columns. |
| `attachment` | Exactly `{"format":"attachment"}`. Save first, then upload a file through the private service. No URLs, paths or file bytes belong in imported JSON. |

Keep answer keys in separate `answer_sheet` materials, including separate solution workbooks. A practice workbook containing a Solutions tab would reveal those answers when downloaded; it must not be used as a substitute for the release rule. The updated Prompt Studio describes the document/attachment JSON contract and separate solution files. The administrator still reviews accuracy, labeling and any personal data; schema checks cannot identify semantic answer leakage in prose.

## Authorization and revisions

`cp_materials`, `cp_material_versions` and `cp_material_assignments` have RLS and no direct client write grants. Administrator RPCs recheck `auth.uid()` membership after the shared mutation lock and audit successful draft/version/publication/archive/assignment/file changes. Saves, transitions and assignments require the expected revision. Conflicts retain unsaved UI inputs and require reload; writes are not automatically retried.

Learner visibility requires all of: active membership, section permission, a published version and an effective individual or current profile-group assignment. Explicit learner exclusions override group/individual grants. Answer sheets additionally require `release_answers`. Profile group changes and revocations are evaluated on every protected request; no role or permission is trusted from JSON, localStorage or an editable JWT claim. Learners cannot enumerate other recipients or the admin library.

`cp_learner_materials(section)` lists authorized versions; `cp_read_material(version_id)` returns one authorized payload. `learner.mjs` adds owner/ticket checks and the U4 adapter. Its stable per-version logical assignment keeps progress identities independent of which group supplied the grant. These adapters are not connected to existing Excel lessons yet; U7 does that.

## Private attachment delivery

The migration creates a **private** `cp-materials` bucket with a 10 MiB limit and octet-stream objects. A conflicting existing public/bucket configuration aborts the migration. Restrictive policies deny direct `anon`/`authenticated` access to this bucket and its objects, even if another permissive Storage policy is broad. Other buckets are unaffected. Ordinary clients, including the administrator frontend, cannot upload directly or mint signed URLs. The service credential exists only in the server environment.

The `material-files` Edge Function verifies the JWT with `getUser()`. Uploads require an admin RPC before reading bytes, structural inspection, another serialized admin check, a new server-generated path, a non-overwriting upload and a service-only validation receipt. A nonce rejects stale/replaced uploads. Publication requires a validated receipt and no pending upload. Downloads fetch through a fresh authorized RPC, verify byte count/hash, then recheck permission before returning a no-store attachment with nosniff and a restrictive CSP. No permanent public or bearer download URL is created.

Supported files are ASCII-named `.xlsx`, `.pdf`, `.png`, `.jpg`, `.jpeg` and UTF-8 `.txt`. Workbook checks reject macros, embedded executables, external relationships, dangerous/network formulas, malformed XML, traversal and excessive ZIP expansion. PDF inspection rejects encryption, scripts, forms, actions, links and embedded files. Image checks bound dimensions and container structure. HTML/SVG, macro workbooks and arbitrary archives are rejected. Code examples belong in inert document blocks or TXT downloads. Some complex otherwise legitimate documents will be rejected by these conservative rules; export a simpler static document.

These are format/active-content checks, not antivirus certification or a guarantee about external PDF/Excel viewer vulnerabilities. Files are never embedded in the app. Set and verify Edge request/memory/CPU limits and evaluate additional malware scanning for the deployment's threat model before accepting untrusted-source uploads at scale. All bytes remain private drafts until human review.

Definitively rejected upload finalizations remove the newly uploaded object. An ambiguous/lost finalization response retains private bytes because the database may already have committed a reference. Reload the draft to reconcile before retrying. An operator can identify abandoned paths from upload-begin audit events; do not delete objects still referenced by any version. Old files are retained deliberately; automatic garbage collection is not implemented.

## Deployment, backup and acceptance gates

1. Complete U1's backend/origin decision, verified owner bootstrap, recoverable database/auth/Storage backups and restore rehearsal. Keep safe device study exports. Review bucket and effective role privileges in the target; `cp_private` must not be an exposed API schema.
2. Apply the U6 migration only to the approved disposable full Supabase staging target first. The repository has no migration-on-push hook. It expects the existing U1–U3 tables and Supabase Storage metadata schema. The new tables are additive; no existing study state is copied or deleted.
3. Deploy `platform/supabase/functions/material-files/index.ts` with its adjacent Deno config. Supply server environment `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and exact HTTPS `COMMONPLACE_APP_ORIGIN`. Keep secrets out of the repository/browser. Test the target's gateway JWT handling and CORS with its actual keys. No wildcard origin or cross-origin redirect is accepted by the handler.
4. Run Supabase security/performance advisors and real signed-JWT tests for anonymous, A, B, admin and revoked accounts. Verify direct object URLs, signed-URL creation, bucket listing, GraphQL/REST/RPC, upload replacement and unauthorized Origin requests. Test concurrent saves/uploads/archives and downloads interrupted by revocation. PGlite verifies PostgreSQL policies with a deliberately broad Storage fixture; it does not emulate the Storage HTTP service or GoTrue.
5. Verify allowed files from real Excel/PDF exports, rejected active/malformed files, tampered bytes, storage failure and ambiguous finalize recovery. Check browser downloads on physical iPad/Safari and Android. Administrative actions require online authorization; private-material offline packs are U8 work.
6. Only after acceptance, provide the reviewed deployment client module and enable the existing boundary. The legacy static site and existing public repository files do not become private. Do not invite learners to restricted static URLs.

Local evidence: Node/PostgreSQL authorization tests, file-validator/service tests with synthetic clients, learner-adapter tests and browser workflows. Deno 2.9.6 type-checks the function entry and runs the file tests against `npm ci`'s locked dependencies (`--node-modules-dir=manual`); CI repeats those checks. The per-function Deno config pins the direct npm imports. Before deployment, verify the full dependency graph bundled by the target CLI/runtime matches the reviewed package lock; a full Supabase Edge bundle was not deployed here. The CLI advisor attempt could not connect to a full local Supabase stack (`127.0.0.1:54322`); advisor and hosted-service acceptance are still pending. No production target was used as a substitute.

Rollback before activation: revert the code. After a staged pilot, disable the new route/function and preserve material versions, assignments, files, audit and legacy progress. Reconcile ambiguous uploads; do not drop tables/buckets or ask users to clear website data. Revocation cannot recall disconnected or already downloaded/exported copies, and cannot retract bytes already sent by an authorized request.

Primary references rechecked for this implementation: [Supabase changelog](https://supabase.com/changelog.md), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [private/public bucket behavior](https://supabase.com/docs/guides/storage/buckets/fundamentals).
