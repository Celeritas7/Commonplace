# 01 · Frame-mounted hose — the problem

Snapshot of a real route, written generically (no part numbers, no customer names).
The real STEP and .pts files stay in the company Routing_study folder.

## The route

- Ø12 mm hose along a truck frame
- 15 route stations (datum coordinate systems), CS29 to CS41 in the model
- Held by clips and clamps bolted to the frame — they cannot move
- Catalogue minimum bend radius: **65 mm**
- Built as a spline through the stations

## What the check found

| # | Type | Where | Value | Limit |
|---|------|-------|-------|-------|
| 1 | Bend under MBR | after CS32 | R 59.8 | 65 |
| 2 | Bend under MBR | at CS33 | R 60.4 | 65 |
| 3 | Bend under MBR | after CS38 | R 61.3 | 65 |
| 4 | Clash | CS33 → CS34, a bolt | cuts 2 mm into the hose | 0 contact |
| 5 | Too close | CS32 → CS33, a bracket | 0.8 mm gap | clearance |
| 6 | Station order | CS39 | listed after CS38 but lies before it along the route | in order |

## What was done (don't read this until stage 2 is finished)

<details>
<summary>Show the fix</summary>

- Move the CS31/CS32 clip −10 mm in Y
- Re-route CS32→CS33 and CS38→CS40 with 3 corner points each, single radius 66
- Step the hose 12 mm around the bolt with 4 corner points, clamps unchanged
- 10 points in total

</details>
