/* Authored quiz bank — Module 1 · Retrieving data (SELECT, DISTINCT, COUNT).
   Loaded by _lib/quiz/quiz.js when the 🧠 Quiz button is pressed on module-01.html.
   Format: _lib/quiz/README.md. These are asked before any auto-generated questions. */
window.CP_QUIZ_BANK = [
  { type: 'mcq', ask: 'Which clause is required in <i>every</i> query?',
    options: ['SELECT', 'WHERE', 'ORDER BY', 'LIMIT'], answer: 0,
    why: 'SELECT is the only clause every query needs. FROM is needed as soon as you read from a table.' },
  { type: 'mcq', ask: 'What does this return?', code: 'SELECT DISTINCT rating, release_year\nFROM film;',
    options: ['Each unique <b>combination</b> of rating and release_year',
      'Each unique rating, with the first release_year found for it',
      'An error — DISTINCT takes one column',
      'Every row, sorted by rating'], answer: 0,
    why: 'DISTINCT applies to the whole row of selected columns, not just the first one.' },
  { type: 'mcq', ask: '<code>COUNT(*)</code> returns 1000 and <code>COUNT(email)</code> returns 994. What do the 6 rows mean?',
    options: ['Six rows have a NULL email', 'Six emails are duplicates', 'Six rows were deleted', 'COUNT(email) is rounded'], answer: 0,
    why: 'COUNT(column) skips NULLs; COUNT(*) counts every row. The gap is exactly the number of NULLs.' },
  { type: 'mcq', ask: 'How many <i>different</i> ratings exist in <code>film</code>?',
    options: ['SELECT COUNT(DISTINCT rating) FROM film;', 'SELECT DISTINCT COUNT(rating) FROM film;', 'SELECT COUNT(rating) FROM film;', 'SELECT COUNT(*) DISTINCT rating FROM film;'], answer: 0, html: false,
    why: 'DISTINCT goes <i>inside</i> COUNT: count the unique values, not the rows.' },
  { type: 'mcq', ask: 'Why avoid <code>SELECT *</code> in real queries?',
    options: ['You usually need only a few columns — * drags in everything and breaks when the table changes', 'It is a syntax error in PostgreSQL', 'It skips NULL columns', 'It only returns the first column'], answer: 0 },
  { type: 'fill', ask: 'Rename the column in the result.', code: 'SELECT title {{1}} film_title\nFROM film;', blanks: ['AS'], ci: true,
    why: 'AS gives a column (or table) an alias in the result.' },
  { type: 'fill', ask: 'List every possible rating, once each.', code: 'SELECT {{1}} rating\n{{2}} film;', blanks: ['DISTINCT', 'FROM'], ci: true },
  { type: 'fill', ask: 'Count only rows where email is filled in.', code: 'SELECT {{1}}({{2}})\nFROM customer;', blanks: ['COUNT', 'email'], ci: true,
    why: 'COUNT(column) ignores NULLs — COUNT(*) would count them too.' },
  { type: 'fill', ask: 'Complete the rule.', text: '{{1}}(*) counts every row; COUNT(column) counts only rows where that column is not {{2}}.', blanks: ['COUNT', 'NULL'], ci: true },
  { type: 'match', ask: 'Match each piece of SQL to what it does',
    pairs: { 'SELECT': 'chooses which columns come back', 'FROM': 'names the source table', 'DISTINCT': 'collapses duplicate rows into one',
      'COUNT(*)': 'counts every row, NULLs included', 'AS': 'renames a column in the result' } },
  { type: 'match', ask: 'Match the query to its answer',
    pairs: { 'SELECT COUNT(*) FROM film;': 'how many films there are', 'SELECT COUNT(DISTINCT rating) FROM film;': 'how many different ratings exist',
      'SELECT DISTINCT rating FROM film;': 'the list of possible ratings', 'SELECT * FROM film;': 'every column of every film' } }
];
