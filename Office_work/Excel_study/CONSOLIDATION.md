# Excel Study B–D consolidation

Recovered Phases B (operations), C (guided practice) and D (independent assessment) from `1b9953ba990606783966f53d996e6b36a50e27d3` onto main `3516e8af80bf29a6706ce1aa52e96be0ef1a86b5`.

The standalone Section 1 practice page uses `excel-practice-ribbon.js` and `excel-practice-ribbon.css`, with the separate `CommonplaceExcelPracticeRibbon` global. The original Phase A `excel-ribbon.js`, `excel-ribbon.css` and central assigned-lesson adapter remain byte-for-byte unchanged to preserve the existing central offline shell manifest and learner integration. Phase D1 is excluded. No shared authentication, backend, deployment or account permission changes.

Verification: 20 isolated operation assertions, 15 guided integration checks and 21 independent assessment checks using mock DOMs; syntax checks passed. Run `node Office_work/Excel_study/tests/guided.test.cjs` and `node Office_work/Excel_study/tests/assessment.test.cjs` for the recovered regression suites. Real browser, iPad and central learner end-to-end checks remain pending. Assessment results in this legacy preview are session-only, not saved in the central database.
