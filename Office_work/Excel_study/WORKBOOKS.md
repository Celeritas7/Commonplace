# Phase D2 — downloadable practice workbooks

The standalone Excel Study preview now generates editable .xlsx files in the browser for each of the five versioned fictional scenarios. No external library, API, network request, or account data is needed. The selected *applied* scenario determines the original dataset; unsaved edits to the simulator are never included.

Each practice and solution file contains five worksheets: Read me, 01 Sum, 02 Revise, 03 Copy, 04 Format. Starter cells for the totals are blank, revision/copy values start at the original baseline, and A1 on the format exercise is plain. Solutions contain completed numeric values, working SUM(B2:B4) formulas with matching cached results, and bold/yellow/bordered A1. The header identifies units; PHP shows two decimal places. The guide provides desktop Excel tool locations and fictional context. File names pin scenario ID and version. No macros, external links, or arbitrary formula input are supported.

The separate solution download is a convenience for self-study, **not** server-controlled answer release. The public preview is distinct from central authorized assignments; no changes to shared authentication, private material delivery, learner profiles, cloud sync, central offline shell, or database. Files edited outside Commonplace are not collected or automatically scored. The earlier standalone Japan–Philippines business workbook is not imported; this phase creates new workbooks aligned to the current sample lessons. Richer workbooks and centrally assigned files can be added later using the central material workflow.

## Verification
Run `node Office_work/Excel_study/tests/workbooks.test.cjs` and the existing guided, assessment and scenario suites. The workbook suite checks ZIP CRC and directory structure, typed values, cell/formula separation, relationships, correct scenario totals, formatting targets, and mock browser download handlers across all ten combinations. Real Microsoft Excel open/save behavior and physical iPad download testing are still required.

## F2 reference workbooks

Section 3 adds separate practice and solution files for all five professional
contexts. The default Japan–Philippines context covers second-hand inventory line
totals, fictional JPY-to-PHP conversion, quantity quotations and landed cost per
usable unit. Mechanical engineering and the other existing contexts remain
available. Each selected context has a versioned F2 filename:
`Commonplace-Excel-<scenario>-v1-F2-practice.xlsx` or
`Commonplace-Excel-<scenario>-v1-F2-solution.xlsx`.

Each file contains **Read me**, **01 Line totals**, **02 Fixed rate**,
**03 Quote grid** and **04 Unit cost**. The four exercise sheets match the guided
Section 3 datasets and cell addresses. Practice answer cells are blank. Solutions
contain relative multiplication/division formulas, the fixed `$F$2` exchange-rate
reference, and mixed references copied across and down, together with matching
cached results. Rates are fictional practice inputs, visibly formatted as
`0.38` PHP per JPY. Landed cost includes shipping; usable units are the units
ready for use or sale.

Downloads always use the selected context's guided starting data. They do not
export a learner's edited draft, independent assessment values or study records.
The solution remains a self-study download; external workbook edits are not
collected or scored by Commonplace. The browser creates these files without an
account, API call, macros or external links. No new runtime dependency is added.

F2 uses a separate exact formula/address allowlist. The earlier D2 and F1 export
paths retain their filenames, styles, formulas and output bytes. The new
`platform/tests/excel-reference-workbooks.test.mjs` verifies all 40
lesson/context/mode datasets, all 10 F2 files, XML/ZIP structure, formulas,
cached results, blank starters and rejection of unsupported export formulas.
It also pins SHA-256 hashes for all 20 existing D2/F1 workbook outputs.

An independent Artifact Tool check imported the generated Japan–Philippines
practice and solution files, recalculated all 13 solution answers, confirmed all
13 practice blanks and checked changed-input dependencies and division by zero.
All 10 rendered sheets were visually reviewed. These checks supplement the
automated exporter tests; native Microsoft Excel open/save and physical iPad
download acceptance remain pending.
