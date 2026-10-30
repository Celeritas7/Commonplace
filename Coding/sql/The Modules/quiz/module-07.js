/* Authored quiz bank — Module 7 · Conditional expressions & views (CASE, COALESCE/NULLIF/CAST, views).
   Loaded by _lib/quiz/quiz.js on module-07.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("7.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '7.1', type: 'fill', ask: 'Label each film by length.', code: "SELECT title,\n  {{1}} WHEN length > 120 THEN 'long'\n       {{2}} 'short'\n  {{3}} AS size\nFROM film;", blanks: ['CASE', 'ELSE', 'END'], ci: true },
  { sec: '7.1', type: 'mcq', ask: 'A CASE has no ELSE and no WHEN matches. What does it return?',
    options: ['NULL', 'An error', 'The first THEN value', 'An empty string'], answer: 0,
    why: 'That is why an explicit ELSE is recommended.' },
  { sec: '7.1', type: 'mcq', ask: 'What does <code>SUM(CASE WHEN rating = \'PG\' THEN 1 ELSE 0 END)</code> count?',
    options: ['How many films are rated PG', 'The total length of PG films', 'How many ratings exist', 'Nothing — CASE cannot go inside SUM'], answer: 0,
    why: 'A conditional aggregate: one pass over the table, one count per condition.' },
  { sec: '7.2', type: 'mcq', ask: "What is <code>COALESCE(NULL, NULL, 'none', 'x')</code>?",
    options: ["'none'", 'NULL', "'x'", 'An error'], answer: 0,
    why: 'COALESCE returns the first argument that is not NULL.' },
  { sec: '7.2', type: 'mcq', ask: 'Why write <code>total / NULLIF(count, 0)</code>?',
    options: ['A zero count becomes NULL, so the result is NULL instead of a divide-by-zero error', 'It rounds the result', 'It turns NULL into 0', 'It makes the division faster'], answer: 0 },
  { sec: '7.2', type: 'fill', ask: 'Convert text to a whole number.', code: "SELECT {{1}}('42' AS {{2}});", blanks: ['CAST', 'INTEGER'], ci: true },
  { sec: '7.3', type: 'mcq', ask: 'What is a view?',
    options: ['A saved query you can select from like a table', 'A copy of a table', 'An index on a table', 'A table that cannot be changed'], answer: 0 },
  { sec: '7.3', type: 'fill', ask: 'Save a query as a view.', code: '{{1}} {{2}} long_films AS\nSELECT title, length FROM film WHERE length > 120;', blanks: ['CREATE', 'VIEW'], ci: true },
  { sec: '7.3', type: 'mcq', ask: 'How is a materialized view different from a plain view?',
    options: ['It stores the result and must be refreshed to see new data', 'It can only be read once', 'It cannot use JOINs', 'It is always up to date with no cost'], answer: 0 }
];
