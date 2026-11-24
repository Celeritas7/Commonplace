# U0–U5 foundation review corrections

Baseline: `e063905`, after PR #79 merged. This correction does not activate the platform or change production authentication, database policies, existing lessons or offline packs.

## Findings and changes

1. **Same-account session refresh discarded unsaved work.** The admin adapter previously invalidated the view for every auth event. The shared owner observer now compares session identities, preserving access/profile drafts, generated prompts and learner storage tickets on same-owner refreshes. Events observe identity only: `getUser()` remains required and server RLS/RPC checks remain authoritative. Signout, missing identity and account changes invalidate old operations immediately. Conflicting verified identity also cancels the request before it can reach an RPC. A matching initial-session event no longer cancels initial verification.
2. **Browser CI never reached the tests.** Since U2, `ubuntu-latest` selected Ubuntu 26.04, which Playwright 1.58.2 does not support. The workflow now pins Ubuntu 24.04, supported by the installed Playwright browser and dependency registry. Both Node/database and browser suites remain required steps; no checks are skipped or marked optional.
3. **Valid content keys exceeded U1 storage limits.** A valid 57-character assignment ID produced a 171-character tuple, rejected by both the account store and PostgreSQL's 160-character constraint. `progressIdentity` now returns an awaited key: short tuples retain their exact previous values; long tuples use an 85-character SHA-256 key containing the same versioned identity inputs. No SQL constraint is widened and no legacy progress is migrated. Future adapters must await the result, then perform the existing ownership-checked write.

## Regression evidence

- API tests exercise same-owner token refresh during pending requests, repeated sign-in, initial-session timing, real account changes, signout carrying an old user, absent session identity and conflicting verified identity. A preserved session still receives a server permission denial.
- Learner-context tests verify that normal refreshes preserve the active storage ticket and that switching/signout abort it.
- Browser tests edit access and profile fields and generate/review a prompt across auth events, then confirm account changes/signout clear private views.
- Content tests cover the exact 160/161-character boundary, maximum-length IDs/versions, deterministic keys and independent changes to version/activity references.
- PostgreSQL tests round-trip a maximum-length valid lesson identity through the actual account store and database, then verify another user cannot read or write that record. Browser tests independently exercise Web Crypto, local storage and backup restore.

Run `npm test --prefix platform` and `npm run test:browser --prefix platform` after installing the pinned dependencies and Playwright Chromium. The local workspace can use the existing `CP_CHROMIUM_PATH` override; GitHub CI installs Playwright's normal Chromium on Ubuntu 24.04.

## Remaining release gates

Full hosted Supabase/JWT/PostgREST/Storage tests, concurrency testing, approved deployment target, recoverable backups, verified owner bootstrap and physical iPad checks remain outstanding. U6–U9 still own material publication/private delivery, actual section integration, offline synchronization and release acceptance. Existing public files remain public. No production migration is part of this correction.
