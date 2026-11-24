# Central administration implementation and acceptance plan

Status: proposal after U0; no migrations or application implementation in this PR.

Current implementation checkpoint: U1–U8 are merged. [U9 acceptance and readiness](U9-READINESS.md)
records local evidence and outstanding hosted/device gates. The original roadmap
below is retained for its acceptance criteria; merged code is not live activation.

## Contracts and proposed data ownership

Use a dedicated Commonplace namespace/prefix; exact SQL comes in U1. Do not copy the entire shared project's schema into a new project.

| Entity | Responsibility | Write authority |
| --- | --- | --- |
| Membership / invite | Verified user UUID, role, status; pending invite mapped only after verified identity | Controlled administrator server operation |
| Section catalogue / grants | Stable hierarchy and reviewed permission scope | Administrator |
| Learning profile / groups | Professional background, occupation, industry, responsibilities, knowledge, objectives, language, markets, currencies, units, difficulty, scenarios and extra requirements | Administrator initially |
| Concept / scenario / dataset | Reusable curriculum semantics separated from professional context | Administrator |
| Material / material version / asset | Structured content, type, schema version, capability requirements, draft/published/archive state and private assets | Administrator |
| Assignment | Individual/group recipient, permitted section, exact material version and release rules | Administrator |
| Prompt template / history | Subject-specific prompt composition; optional privacy-filtered history | Administrator |
| Progress / attempt / annotation | Verified owner, stable lesson and material version, revision, timestamps | Own learner; narrowly scoped admin progress reporting |
| Audit event | Immutable account/access/content/publication actions | Server only |

No schema entry here grants access. Implement default-deny RLS plus minimal table/function privileges. Keep membership status checks fresh at protected request time. Avoid role authorization through editable user_metadata. Any SECURITY DEFINER helper requires an explicit reason, fixed search path, restricted execution and negative tests; ordinary operations should use invoker/RLS where possible.

Authorization evaluation: active membership AND permitted section AND published material AND effective individual/group assignment or explicit general authorization. Individual denial overrides group/inherited grants. Use the same evaluator for navigation, data, private downloads and manifests. Child permission can expose its breadcrumb without exposing sibling sections. New sections do not silently inherit access.

Initial profile template: beginner Excel for a sales/import-export professional, Japan–Philippines market, JPY/PHP, inventory, inquiries, follow-ups, quotes, shipping, profit, payments and monthly reports. This is a reusable scenario template, not an account. No email is created. Scope: office.excel only.

## Phase acceptance gates

| Phase | Deliverable | Required acceptance evidence |
| --- | --- | --- |
| U0 | Audit, catalogue, dependencies, deployment and rollback plan | Evidence pinned to repository revision; live metadata distinguished from source findings; unresolved deployment gates explicit; docs-only diff |
| U1 | Membership, verified admin bootstrap, permission evaluator, RLS, audit foundation, safe account storage/backup contract | Anonymous/A/B/admin matrix; no self-promotion; no owner reassignment; denied direct API/file requests; last-admin protection; no adoption of legacy work by the next login; no production deployment without backup/target decision |
| U2 | Main-app Admin Studio: learner management, permission editor, activation/revocation and effective-access preview | Learner cannot call admin operations directly; Excel-only landing has no other subject links; permission changes logged; suspended/revoked online requests fail even with previously issued tokens |
| U3 | Profile/group editing and reuse | Profile fields validated; A cannot access B profile; profile fields cannot alter roles; prompt-facing view omits identity data |
| U4 | Versioned core concept/scenario/dataset/lesson contracts and adapters | Same SUM concept renders different professional datasets; unsupported simulator capabilities rejected; old Excel lesson/progress remains usable |
| U5 | Copyable prompt generator and subject templates | Select learner/section/topic/objective/difficulty/exercise count/type/scenario/instructions; preview/edit/copy; no AI API dependency; no email/auth data in generated prompts or history |
| U6 | Import/preview/publish/archive/version/assignment library | AI output always draft; reject malformed/oversized content and unsafe markup; private assets never public; learners see published assigned versions only; group assignment cannot bypass section grants; answer sheets obey explicit release rules |
| U7 | Excel reference integration, then opt-in section adapters | Preserve PR #68/#69 functionality and reviewed #70 operations; profile-aware examples/workbooks; progress tied to versioned IDs; no separate Excel user/admin system; other sections remain compatible |
| U8 | Authorized offline packs and synchronization | Account A/B separation, saved-owner reopen, resumable hashed downloads, unchanged runtime reuse, offline edits/reconnect without loss, safe switching, revocation refresh and clear lease-expiry behaviour; physical iPad acceptance |
| U9 | Release acceptance and rollback rehearsal | No cross-account/privilege leakage; alternate URLs, storage IDs and old tokens tested; import isolation; failure/recovery and prior personal-study regressions; documented backup restore and rollback |

U1 should be split into small PRs: (a) contract and isolated test fixtures, (b) additive schema/policies with database tests, (c) auth/storage adapters behind an unenabled feature boundary, (d) reviewed staging integration. Do not combine new infrastructure provisioning, live auth replacement and all section adapters in one release.

U8 design starts in U1: account ownership and private-cache rules cannot wait until the end. U9 security checks run at each phase and are consolidated for release.

## Publishing and import boundaries

Supported material types: in-app examples, explanations, guided exercises, independent practice, quizzes, practical projects, code examples, datasets, XLSX tutorials, answer sheets, PDFs and images/diagrams.

Validate both client and server representations. Structured JSON uses a versioned schema, limits and capability declarations. Validate actual file type, size, archive expansion and permitted formats; reject macro-enabled workbooks and active HTML/SVG/script payloads unless an explicitly safe processing path is designed. Spreadsheet formulas are content for a constrained engine, not arbitrary app code; prevent formula injection when exporting untrusted tabular text. Preview imported content in an isolated sandbox with no application cookies/tokens or privileged messaging. Explicit learner code execution belongs in dedicated constrained runtimes, never in the admin page's origin/context.

Publishing creates immutable versions. Assignments pin versions; updates are explicit and preserve progress mappings. Archiving stops new assignments and follows an explicit policy for existing access. Draft files need authorization too. Group changes re-evaluate access without granting unrelated courses. Prompt-generated answers are not automatically public to learners.

## Excel handoff

- Central Commonplace owns identity, permissions, profiles, materials and assignments.
- Excel owns simulator capabilities, rendering, guided step validation and practice UI.
- Adapter contract: authorized learner context, allowed section IDs, sanitized profile/scenario, assigned published material descriptors, asset retrieval and scoped progress adapter.
- Do not pass privileged credentials or trust role flags supplied by a lesson.
- Guided lesson schema declares simulator capability IDs and worksheet mappings; ensure capability identifiers match actual operations, not Ribbon orientation placeholders.
- PR #70 is open against feat/excel-study-phase-a at U0. Its owner should inspect the retargeted diff against main before merge. U0 has not retargeted, merged or changed it.
- Curriculum expansion and offline startup fixes may continue independently; refresh the baseline before shared-file implementation.

## Migration and deployment prerequisites

1. Decide new isolated backend/origin versus remediated existing project; document cost/limits before provisioning. The U0 recommendation is isolation, not authorization to incur costs.
2. Select canonical origin and verify actual deployment ownership/settings. GitHub Pages is confirmed serving the baseline lesson; Vercel repository homepage metadata is not a confirmed matching deployment.
3. Verify bootstrap owner in the target backend. If using a new project, UUIDs must be mapped through a controlled verified-account process; never copy ownership by unverified email alone. Existing tokens/session records are not portable backups.
4. Verify Google callback allowlists, email delivery/invitations and signup policy. Keep invites explicit; no global signup change in a shared project without impact review.
5. Back up any backend to be modified, relevant Storage bytes and safe device study records. Record checksum, scope, timestamp and restore result. This audit does not attest that a usable backup currently exists.
6. Test schema and migrations in isolation. Use real role/JWT contexts for RLS tests, not admin/service-role success alone. Inspect trigger/function exposure and referenced-record ownership.
7. Deploy additive backend changes before enabling the new UI; preserve legacy URLs/keys for the original owner. Migrate in explicit batches with before/after counts, duplicate detection, idempotency and recovery checkpoints.
8. Keep legacy environment read/write behaviour stable during pilot. Do not dual-write blindly: record which system owns each dataset and how conflicts are reconciled.
9. Rollback route/feature activation without deleting new records, reverting ownership indiscriminately or clearing device storage. Document how queued offline changes are retained and reconciled after rollback.

## Offline policy decision still required before rollout

Choose the allowed disconnected-study interval for private material. Describe when the app requires an online permission refresh and what remains readable after expiry. Admin actions always require online authorization. Revocation is immediate for new server-authorized requests, but disconnected copies and exported workbooks cannot be recalled. Avoid promising DRM through localStorage or cache-name prefixes.

A separate origin reduces accidental cross-app cache access but means first-use runtime downloads and explicit progress transfer; preserve the existing installation until the new one is verified. Allow account switching only after requests, queues, local views and private caches have clear ownership. Never solve migration issues by asking the user to clear website data.

## Review decisions, not blockers to preparing U1 locally

- Approve or revise isolated deployment direction before provisioning.
- Decide which existing curriculum remains public; restricted future material must be absent from public source/builds.
- Choose offline authorization interval before private pack release.
- Supply the learner's real email only when ready to invite; it is unnecessary for U0/U1 contracts and tests.

Reference documentation reviewed: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Storage access control](https://supabase.com/docs/guides/storage/security/access-control), [changelog](https://supabase.com/changelog.md). Recheck relevant API/CLI changes at implementation time.
