# G0 — Eagle workspace preparation

2026-11-26 (Japan). **Code preparation only; G0 remains uncleared.**
Commonplace base `9c9a881b626def7f691f343e11be429bb13e08ef` includes merged
HealthLog preparation and Excel E1. Restoration remains deferred at the existing
private checkpoint. No hosted changes, deployment or learner enrollment.

## Corrected consumer inventory

Read-only General_apps catalog inspection identified `eagle_units` and
`eagle_unit_progress`, their actual columns/constraints and the Logi parent graph.
No application records or Auth identities were read, copied or inferred.

| Repository / reviewed commit | Observed contract |
| --- | --- |
| [Eagle_eye_plus](https://github.com/Celeritas7/Eagle_eye_plus/tree/6ef6916fee13c15e234fc098f6eaeb67c42dba7b) | General_apps prototype names the legacy tables as future schema work; its current DB call only probes `logi_assemblies`. No implemented unit/progress writer was found |
| [Logi_assy_advanced](https://github.com/Celeritas7/Logi_assy_advanced/tree/c1abf9fa30bec3a97a57a0dbf22cee31ac9ea257) | Actual General_apps parent editor. Project/assembly deletion uses multiple HTTP mutations; node archival deletes links before updating the node. Failed later requests can leave partial changes |
| [Eagle_eye_view_app_advanced](https://github.com/Celeritas7/Eagle_eye_view_app_advanced/tree/c953088ca41f95231da159da21d763d32914c9c2) | Uses the distinct `eagle_eye_app_*` family and an untracked root configuration. It is not the verified consumer of these two legacy tables. Those tables were absent from the reviewed General_apps catalog; no alternate deployment/project was assumed |
| [Soroi_app](https://github.com/Celeritas7/Soroi_app/tree/bf70f5caed720eed04df5fd25bf8ad807ee68c07) | Reads the Logi parent graph for imports. Existing parent read policies remain unchanged |

This corrects the earlier generic association of “Eagle workspace” with Eagle
Advanced. It does **not** establish a deployed writer, the full external consumer
inventory, an approved team list or a completed client cutover.

## Prepared behavior

[Candidate 07](../operations/general-apps/07_eagle_workspace.sql) follows revised
01 and 02. It remains outside automatic migration discovery and staging packages.
The six immutable Commonplace migrations and study/offline files are unchanged.

- Explicit verified Auth UUID membership is required. Shared admin/operator
  members may write; viewer members may read. A shared or Commonplace admin role
  without Eagle membership has no implicit workspace access. Anonymous Auth
  identities/JWTs and unverified identities fail closed. Registry writes retain
  the reviewed shared-administrator policy; ordinary members cannot self-promote.
- Eight exact table shapes/constraints are checked: the two Eagle tables and Logi
  projects, assemblies, versions, nodes, links and revisions. Unexpected incoming
  FKs, parent triggers, changed Eagle policies, timestamp trigger/helper or shared
  role administration stop installation without changing source records.
- Linked parent mutations require an Eagle writer even when RLS hides their child
  rows. Unlinked Logi CRUD retains its existing policies. Browser
  TRUNCATE/TRIGGER/REFERENCES/MAINTAIN bypass privileges are removed on the graph
  and shared role registry; no parent CRUD grant is added.
- A private row update serializes graph mutations. Deferred validation checks the
  final unit/progress assembly and version relationships; optional legacy versions
  remain optional. Existing inconsistent data stops installation for review; it
  is not silently fixed. Revocation and role/identity changes serialize with the
  checked writer rows. Stale repeatable-read writers must retry after rollback.
- Invoker RPCs delete a project/assembly atomically. Units are deleted before nodes
  because the progress-to-node FK is NO ACTION. A refusal restores every earlier
  change. Node archival removes links and marks the node deleted in one transaction,
  retaining saved Eagle progress. Existing foreign keys are not weakened.
- Companion Logi preparation creates a separate **synthetic local staging copy**
  with those RPC calls and server-derived editing controls. Source hashes stop
  silent patching of changed code. Missing RPCs, offline authorization, invalid
  responses and stale account callbacks fail closed. The deployed root client,
  existing origin, configuration and saved work are unchanged.

## Acceptance and remaining gate

Synthetic PGlite tests cover exact shapes, saved notes/timing/status, roles,
self-promotion denial, parent writes, wrong assembly/version, revocation, bypass
privileges, failed installation and atomic rollback. Disposable Supabase CI adds
real JWT/PostgREST calls, node archival, concurrent parent writes, repeatable-read
conflicts and concurrent revocation. Companion tests cover one-RPC actions, no
fallback, stale account responses, source drift and staging isolation on Linux
and Windows. Passing these tests does not verify hosted behavior or devices.

Before any approved installation/cutover:

1. Resume the existing recovery work when scheduled; do not repeat closed checks.
   Identify the exact recovered snapshot and rollback/configuration custody.
   Keep raw recovery files outside both repositories.
2. Confirm the actual deployed legacy client, external callers/jobs and approved
   Eagle member UUIDs, with at least one verified writer. Review original Logi
   snapshots/exports and pending work. No mapping or evidence is fabricated.
3. Reconcile current metadata with 01/02/07. Test parent workflows, import readers
   and allowed/denied operations on isolated data. The global graph lock and
   deferred full-graph validation deliberately favor safety; measure bulk-operation
   latency and contention at realistic volume before installation.
4. Record a `client_cutovers` evidence reference starting with `eagle-graph-v1:`
   only after owning-team acceptance. Synthetic references are tests, never live
   attestations. Coordinate the atomic client with 02/07 in a maintenance window;
   do not leave the old multi-request editor active between those steps. Merge
   alone activates neither candidate nor staged client.
5. Keep broader G0 review open: Logi parent reads/policies, work orders and pickup
   logs, its separate user-role table, other RPCs/Edge routes and provider settings
   are not certified by this bounded Eagle change. Do not revoke unrelated apps
   wholesale. General_apps is not yet cleared for new Commonplace learners.

Existing offline packs, study state and browser data remain in place. No account
switch or cache reset is required. Rollback must preserve saved records and the
coordinated client/authorization contract; do not remove security guards merely
to make an older client work.
