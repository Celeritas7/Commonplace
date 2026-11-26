/* Shared syntax checks for the existing fixed-range beginner exercises.
   This is not an arbitrary Excel formula evaluator or a lesson registry. */
(function (global) {
  'use strict';
  // Microsoft MS-XLSX formula whitespace is ASCII space or a CRLF sequence.
  // Keep function/cell tokens intact: a space can also mean intersection.
  const gap = '(?: |\\r\\n)*';
  const formulaPattern = new RegExp('^' + gap + '=' + gap +
    '(SUM|AVERAGE|COUNT|MIN|MAX)\\(' + gap +
    '(\\$?B\\$?[24])' + gap + ':' + gap +
    '(\\$?B\\$?[24])' + gap + '\\)' + gap + '$', 'i');
  function parse(formula) {
    if (typeof formula !== 'string' || formula.length > 80) return null;
    const match = formulaPattern.exec(formula);
    // RegExp's $ may precede a final newline; require the whole input instead.
    if (!match || match[0].length !== formula.length) return null;
    const fn = match[1].toUpperCase(), start = match[2].toUpperCase(),
      end = match[3].toUpperCase();
    if (start.slice(-1) === end.slice(-1)) return null;
    // Both endpoint orders address the same rectangle here. Absolute/mixed
    // markers are retained, even though evaluation in these fixed cells agrees.
    return { fn, start, end, range: 'B2:B4', canonical: '=' + fn + '(B2:B4)' };
  }
  function numericCell(value, { allowBlank = false } = {}) {
    if (typeof value !== 'string' || value.length > 40)
      throw Error('Use a number of at most 40 characters.');
    const text = value.trim();
    if (text === '' && allowBlank) return null;
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) ||
        !Number.isFinite(Number(text)) || Math.abs(Number(text)) > 1e12)
      throw Error('Enter a finite numeric value within ±1 trillion.');
    return Number(text);
  }
  global.CommonplaceExcelFormulaSyntax = Object.freeze({ parse, numericCell });
})(typeof window === 'undefined' ? globalThis : window);
