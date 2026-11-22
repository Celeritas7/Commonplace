# Exercises and feedback

Phase 4 adds one checked exercise to each of the three sample lessons. The tasks, code, hints and feedback are original Commonplace material using the topics documented in [sample sources and scope](SAMPLE_LESSONS.md). They are not copied paid-course exercises, and they are separate from the five-question lesson checks and Commonplace’s shared generated quizzes.

| Exercise | Stable ID | Browser checks |
| --- | --- | --- |
| Build a reading card | `html-reading-card` | A `main.card` containing a nonempty `h1`, a nonempty `p`, and a real `button#counter` labelled `Start reading`. |
| Give the card room | `css-card-spacing` | An existing `main.card`, computed padding of 32px on all four sides, and computed corner radii of 12px. |
| Count in twos | `js-count-twos` | An enabled `button#counter`, starting label `Clicks: 0`, then labels `Clicks: 2`, `Clicks: 4` and `Clicks: 6` after three real programmatic clicks. |

## Learning flow

Open practice from a lesson, inspect the exercise goal, edit the relevant file, and run the automatic check. The result reports each requirement with expected and observed values. Three progressive hints and a complete possible solution are available. Hints and solution viewing are recorded so an assisted attempt remains distinguishable from an unassisted one.

Opening an exercise or a retry keeps the current shared project. Loading starter or saved-attempt files requires an explicit user action and confirmation because it replaces the three project files. It does not reset notes, bookmarks, lesson reading marks, quiz answers or previous attempts.

A fresh exercise run combines HTML, CSS and JavaScript in the existing opaque sandbox. The grading code inspects the rendered elements and computed styles; it tests the counter by clicking it rather than searching the source text for an expected answer. Syntax/runtime errors, blocked resources and timeouts produce a visible error, never a passing result. Stop and newer runs cancel an unfinished check.

A passing result means that the published rubric passed for the submitted files. It is not a general proof of correctness, accessibility, good design or resistance to deliberate cheating. The synchronous click-handler sample does not promise support for delayed counters or external services. The separate visual-review checkbox records the learner’s own inspection and is never set automatically by passing a check.

## Attempts and Mistake Bank

Exercise records are additive fields inside `commonplace_web_studio_v1`; the storage version and existing lesson IDs stay unchanged. They save locally first and participate in [account sync](CLOUD_SYNC.md), including attempts, hints and Mistake Bank state. Reconnect with the app open and signed in to upload queued changes; use the sync status to check the result.

Each attempt records its timestamp, exercise version, submitted files, per-check feedback, outcome and whether hints or the solution had been viewed. The latest 20 attempts per exercise are retained, along with a total attempt count. Submitted exercise projects are limited to 30,000 characters across the three files to keep the local history manageable. The ordinary preview retains its own existing limits.

Failed checks and execution errors appear in the Mistake Bank for another attempt. A later passing check resolves that exercise’s outstanding mistake; its retained attempt history remains available. Merely opening a retry, viewing a solution, or ticking the visual-review checkbox does not resolve a mistake. Edits made after a check are identified as changes to the checked submission rather than silently inheriting a pass.

The section’s study backup includes the retained exercise records and the current draft, using the existing scoped export. Authentication records and other Commonplace sections are excluded. Save errors, full/blocked storage and conflicting tabs remain visible; a failed save must not be described as successfully saved.

## Delivery boundaries

Exercise definitions and grading code are bundled app assets and require no remote execution service. They are included in the verified [offline study pack](OFFLINE_STUDY.md). Prepare that pack in the browser/app where you will study and wait for **Ready offline** before disconnecting. Physical iPad Safari and Home Screen acceptance remain separate from automated Chromium/WebKit results; see [Phase 7 validation](PHASE7_VALIDATION.md).
