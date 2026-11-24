# U3 — Reusable professional learning profiles

Status: isolated implementation for review, built on merged U2 (`11c5f9f`, PR #74). Live activation remains disabled. No hosted schema, auth settings, existing progress, Excel material or offline pack was changed.

## Review

Serve the repository locally and open `/platform/admin/preview.html`. Select **Sample learner → Professional profile**. Apply the import-export beginner template, review/edit its fields and save. Create a profile group, check its membership and save the profile again. Switch back to **Study access** to confirm the learner still has Excel only. The preview uses in-memory synthetic records and resets on browser reload; it creates no account and sends nothing externally.

The template captures the supplied sales/brokerage strengths, second-hand goods trade from Japan to the Philippines, JPY/PHP, beginner Excel and the nine learning objectives. Preferred language remains unspecified. It contains no login email, name, UUID, account status or permissions and is never auto-assigned. The administrator applies it explicitly to a selected learner, then edits as needed.

## Shared profile schema

All fields are optional. Unknown keys are rejected by both the JavaScript validator and database constraint.

| Key | Meaning | Shape |
| --- | --- | --- |
| `background` | Professional background | Text |
| `occupation` | Current occupation | Text |
| `industry` | Industry | Text |
| `responsibilities` | Work responsibilities | List |
| `existing_knowledge` | Existing knowledge and strengths | Text |
| `learning_objectives` | Learning objectives | List |
| `preferred_language` | Preferred learning language | Text |
| `countries_markets` | Relevant countries and markets | List |
| `currencies_units` | Currencies and units | List |
| `difficulty` | Preferred difficulty | Empty, beginner, intermediate, advanced or mixed |
| `scenarios` | Professional scenarios | List |
| `additional_requirements` | Additional learning requirements | Text |

Text fields allow up to 2,000 Unicode characters. Lists allow up to 20 strings of 300 characters each. The complete JSON document is bounded at 32 KiB; the database checks its canonical JSON representation, so its byte limit is authoritative. These fields are learning context, never executable HTML/code or authorization instructions. Keep additional needs in `additional_requirements`; schema evolution must be reviewed rather than accepting arbitrary properties.

## Data and authorization

- `cp_learning_profiles`: one profile per verified membership UUID, independent profile revision, updated timestamp. Active learners can SELECT their own row only; administrators can read profiles. Suspended/revoked learners cannot read even their saved row. Client writes and ownership reassignment are denied.
- `cp_profile_groups`: reusable name/description with unique normalized names and independent revision. Administrator-only read/write operations.
- `cp_profile_group_members`: administrator-managed grouping, never a section grant. Learners cannot enumerate groups or group members. Removal from a group does not delete a profile.
- `cp_admin_profile(target)`: admin-only current profile, revision string, selected group IDs and group catalogue. It rejects non-learner targets.
- `cp_admin_save_profile(target, expected_revision, new_profile, group_ids)`: checks fresh administrator authority, valid learner target, profile schema and group IDs. Saves profile and memberships atomically under the existing administration lock. Stale revisions fail without overwriting saved work.
- `cp_admin_save_profile_group(target, expected_revision, new_name, new_description)`: creates or edits a group with conflict detection. Empty/oversized/duplicate names are rejected. Group deletion/archiving is not included; later assignment semantics must be settled first.

All new tables enable RLS and revoke inherited API write privileges. Definer RPCs are needed for controlled admin writes and admin-only metadata; each has an empty search path, explicit grants and an `auth.uid()`-backed database role check. Private helper execution is revoked from API roles. Audit events record actor, target, revision/group counts and action; they deliberately do not duplicate professional free text into the audit log. No new email lookup or invitation mechanism is added in U3.

Profile changes and group memberships cannot update `cp_memberships` roles/status or `cp_section_grants`. Parent/section access rules from U1/U2 remain authoritative. Future group material assignments must still require active membership, section permission, published content and assignment/release authorization.

## Section and prompt adapters

`lib/learner-profile.mjs` provides `readLearnerProfile(client, context)` for later section adapters. It accepts the U1 account context/ticket, reads the current owner's RLS-protected profile, passes its abort signal and rejects late results after an account change. The returned `{version: 1, profile}` contains only validated learning context. This read helper is not a synchronization engine and is not connected to existing section startup. A missing/inaccessible row yields an empty profile; the host must separately maintain fresh active membership/section authorization.

`lib/learning-profile.mjs` provides validation, field definitions, the reusable template and `promptProfile(profile)`. The prompt-facing helper accepts only the profile schema, rejects identity/role fields and removes recognizable email addresses, UUIDs, HTTP(S) links, Supabase keys and JWT-like strings from free text. It never receives a membership or authentication envelope. This is a defensive projection for U5, **not guaranteed anonymization**: names, phone numbers, employer details, other credential formats and indirect identifiers can remain in free text. U5 must show the output for human review before external copy and must never attach account/session metadata. No prompt generator, AI request or external send is implemented here.

## UI behavior and preservation

Professional profile is a separate view beside Study access in the central Admin Studio. No Excel-specific administration was introduced. Leaving a dirty profile, applying the template or discarding pending group details requires an explicit confirmation. Failed/stale profile saves retain the draft; stale profile submission is blocked until reload. Account changes dispose the editor and discard late responses. Profile/group data is held in memory only; it is not added to legacy backups, localStorage, service worker caches or offline queues. Administrative actions require the U2 online API adapter.

## Verification and remaining release gates

Local evidence: **40 Node/PostgreSQL checks and 10 browser tests passed** across U1–U3. New coverage includes:

- Anonymous/learner rejection for all profile/group RPCs and direct writes.
- A/B profile isolation, inactive-user denial and immutable ownership.
- Invalid identity/privilege fields, wrong types, excess lengths/lists and invalid group IDs rejected without partial saves.
- Stale profile/group writes, duplicate group names, group removal and unchanged section access.
- Template reuse without identity or permission data, prompt projection and stale learner-context responses.
- UI template/save/reload, group membership, validation without data loss, mobile width, stale-profile draft preservation and disposal during a pending read.

PostgreSQL tests use PGlite plus auth role fixtures; browser tests use the same temporary Chromium 133 override documented in U2. CI runs the normal Playwright browser. Physical iPad/Safari tests, full Supabase Auth/PostgREST/Storage tests, concurrent multi-session testing, restored backups and the isolated deployment target decision remain release prerequisites. Tests do not establish live production readiness.

Apply migrations in order only after target approval and backup verification. No production migration ran during this phase. Before an activated pilot, include these three tables in backup/restore and account-deletion retention procedures. Roll back activation first and retain profile/group records and audit history; do not drop new tables or clear device study data. U4 will define curriculum/scenario/content contracts; U5 will build the prompt studio; U6 will implement actual group material assignment and publication; U7 will integrate Excel.
