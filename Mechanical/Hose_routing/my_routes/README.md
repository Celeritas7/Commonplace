# my_routes (Hose)

Same method as the batch and Python My Scripts: each folder is one real route I am rebuilding.
The page (index.html) shows whatever stage files exist:

- problem.md — the route as found and the check's issue list (written generically)
- notes.md   — stage 1: why each issue happens, answers to the hint questions. Claude checks these.
- reroute.md — stage 2: my fix from the problem list only (corner points, R, clip moves), then checked in Creo
- change.md  — stage 3: the same route with one new constraint
- new.md     — stage 4: a similar route from scratch

## Company rule

This folder syncs to GitHub. Never put part numbers, customer names, STEP, .pts or IGES files here.
The real files live in D:\Coding\#Sorted\Company\Routing_study\02_Hose\ (not synced).

## Opening the page
- Double-click index.html: works offline from a snapshot. After saving notes, double-click refresh.bat, then reload.
- Through run-commonplace-study.bat (localhost:8137) or the hosted app: always live.

To add another route: make a new folder with problem.md, add an entry to routes.json, run refresh.bat.
