/* Authored quiz bank — Module 2 · Filtering & sorting (WHERE, ORDER BY, LIMIT). Format: _lib/quiz/README.md */
window.CP_QUIZ_BANK = [
  { sec: '2.1', type: 'mcq', ask: 'Why does this return no rows, even though some customers have no email?', code: "SELECT * FROM customer\nWHERE email = NULL;",
    options: ['NULL never equals anything — use <code>IS NULL</code>', 'NULL must be quoted: <code>\'NULL\'</code>', 'WHERE cannot test text columns', 'It needs a LIMIT'], answer: 0,
    why: 'NULL is not a value, it is "unknown". <code>= NULL</code> is never true, not even for NULL itself.' },
  { sec: '2.1', type: 'mcq', ask: 'Which is the cleanest way to keep ratings G, PG and PG-13?',
    options: ["WHERE rating IN ('G', 'PG', 'PG-13')", "WHERE rating = 'G' AND rating = 'PG' AND rating = 'PG-13'", "WHERE rating LIKE 'G, PG, PG-13'", "WHERE rating BETWEEN 'G' AND 'PG-13'"], answer: 0, html: false,
    why: 'IN beats a chain of ORs. AND here can never be true — one row has one rating.' },
  { sec: '2.3', type: 'mcq', ask: 'In what order do these run?', options: ['WHERE → ORDER BY → LIMIT', 'ORDER BY → WHERE → LIMIT', 'LIMIT → WHERE → ORDER BY', 'WHERE → LIMIT → ORDER BY'], answer: 0,
    why: 'Filter the raw rows, sort what survived, then cut it to size. Swapping ORDER BY and LIMIT would change which rows survive.' },
  { sec: '2.1', type: 'mcq', ask: "Which titles does <code>WHERE title LIKE 'A%'</code> keep?",
    options: ['Titles starting with A', 'Titles ending with A', 'Titles containing exactly one A', 'Titles equal to "A%"'], answer: 0,
    why: '<code>%</code> matches any run of characters, including none.' },
  { sec: '2.2', type: 'mcq', ask: 'With no ASC or DESC, ORDER BY sorts…', options: ['ascending (smallest first)', 'descending (largest first)', 'in insertion order', 'randomly'], answer: 0 },
  { sec: '2.1', type: 'fill', ask: 'Find customers with no email on file.', code: 'SELECT first_name\nFROM customer\nWHERE email {{1}};', blanks: [{ a: 'IS NULL' }], ci: true },
  { sec: '2.3', type: 'fill', ask: 'The five longest films.', code: 'SELECT title, length\nFROM film\n{{1}} length {{2}}\n{{3}} 5;', blanks: ['ORDER BY', 'DESC', 'LIMIT'], ci: true },
  { sec: '2.1', type: 'fill', ask: 'Films between 60 and 90 minutes, inclusive.', code: 'SELECT title FROM film\nWHERE length {{1}} 60 {{2}} 90;', blanks: ['BETWEEN', 'AND'], ci: true },
  { sec: '2.1', type: 'fill', ask: 'Complete the trap.', text: 'NULLs silently disappear from any condition written with {{1}} or !=, so test them with IS NULL or IS {{2}} NULL.', blanks: [{ a: '=', alt: ['=='] }, 'NOT'], ci: true },
  { sec: '2.1', type: 'match', ask: 'Match each filter to what it keeps',
    pairs: { "rating = 'PG'": 'exactly PG', 'length > 120': 'films over two hours', "rating IN ('G','PG')": 'either of two ratings',
      "title LIKE '%Love%'": 'titles containing Love', 'email IS NOT NULL': 'rows that have an email' } },
  { sec: '2.2', type: 'match', ask: 'Match the clause to its job',
    pairs: { 'WHERE': 'drops rows that fail a condition', 'ORDER BY': 'lays the rows out in order', 'LIMIT': 'caps how many rows come back', 'DESC': 'largest first' } }
];
