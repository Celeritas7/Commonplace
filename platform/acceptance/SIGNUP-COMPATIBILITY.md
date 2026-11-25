# Signup compatibility with hardened shared Auth

**2026-11-26 (Japan). Code preparation only; hosted changes remain on hold.**
Prepared from merged PR #104 (`14e892cab4c0c71cdf44aed79d717b6c38435229`).
The [G0 review](G0-READINESS.md) found that three of candidate 04's four expected
Auth trigger bodies differed from the hardened shared baseline. A read-only
recheck confirmed that baseline before this change. No Auth rows or secrets
were read, and no hosted SQL change or signup was performed.

## What changed

[Candidate 04](../operations/general-apps/04_commonplace_signup.sql) now requires
the reviewed hardened bodies and their exact execution configuration. It rejects
the superseded baseline, changed bodies/owners/security mode/search paths, missing
identity flags and unexpected trigger bindings. It still requires all six CP
migrations, the mutation lock and ordinary enabled, nondeferred Auth triggers.

The replacement behavior preserves the newer safeguards:

- Both admission and linking reject missing UUIDs, anonymous or unknown identity
  flags, and missing/blank email before reserving a request or creating records.
- Legacy approval locks exactly one matching registry row. A conflicting UUID
  raises the existing `registry_link_conflict` denial; it cannot transfer a role.
- Linking fills an empty UUID only and checks that the write actually happened.
  Reusing an already matching UUID leaves the link unchanged.
- Legacy default settings require the expected UUID/email link to exist. A
  suppressed or altered link aborts the transaction and its side effects.
- Existing approved roles and the UUID-based shared role helper remain intact.
  Editable metadata and a stale JWT email cannot supply a different role.

The Commonplace-only path still creates no legacy role/profile/settings or CP
membership automatically. Signup starts paused, reserves one UUID atomically,
and requires verified same-account completion into suspended membership with
zero section grants. Request preparation and the status panel never enable it.

This edits an **unapplied review candidate**, not a historical migration or a
replayable upgrade. An already installed or differently hardened deployment needs
its own reviewed delta. Do not change fingerprints merely to force installation.
The six immutable CP migrations, live activation settings and offline packs are
unchanged. Shared policy, RPC and compute findings outside signup remain open.

## Verification

The fixture retains the old baseline for a negative installation test and adds
the hardened Auth contract with synthetic data. Tests run the same legacy
behavior checks before and after the candidate: approved admin/operator/viewer
roles, spoofed metadata, missing/anonymous identities, ambiguous approvals,
conflicting UUIDs, suppressed/altered writes, repeated links, revoked membership
and stale email claims. Installation preserves existing rows, registry policies,
grants and the shared role helper. Invalid CP-only identities leave the admission
and audit unchanged. The existing reservation, expiry, revision and completion
tests continue to exercise the actual candidate SQL.

The disposable Supabase runner also starts with the hardened fixture, verifies a
legacy viewer signup before installation, and checks its retained role/profile/
settings afterward. It exercises invalid identity rejection without consuming an
enabled CP admission, plus the existing real Auth confirmation, concurrency,
default-deny and private-file tests. All identities and confirmation mail stay
inside the guarded loopback stack; paid providers are mocked.

Passing these tests does not establish hosted provider behavior, every owning
app's compatibility, recovery completion or clearance to enroll a learner.

## Recovery is deferred, not forgotten

The user has explicitly deferred the remaining local restoration checks so code
development can continue. Existing backups and completed restore results are
retained. A private restoration resume note records the selected archive/target,
latest reported successful local step and the next verification needed. No raw
dump, credentials, sessions or personal records belong in this repository.

When resuming, first verify the current isolated target and reconcile the latest
operator output with that note; do not rerun successful restores automatically.
The older bounded Solitro rehearsal remains closed with its documented limits.
The ongoing Akatsuki recovery is a separate, newer evidence set.

Recovery blocks the live database/Auth rollout and learner release, **not code
implementation or synthetic testing**. Finish the deferred recovery and remaining
shared-access gates before G1. Candidate 04 is installed paused only at G2, after
the six migrations and verified owner, following [the rollout order](SIGNUP-ROLLOUT.md).
