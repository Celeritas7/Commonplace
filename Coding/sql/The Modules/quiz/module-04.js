/* Authored quiz bank — Module 4 · JOINs (INNER, OUTER, UNION).
   Loaded by _lib/quiz/quiz.js on module-04.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("4.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '4.1', type: 'mcq', ask: 'What does an INNER JOIN of <code>customer</code> and <code>payment</code> keep?',
    options: ['Only customers that have at least one matching payment', 'Every customer, with NULLs where there is no payment', 'Every payment and every customer', 'Only customers with no payments'], answer: 0,
    why: 'INNER JOIN keeps only rows that match on both sides.' },
  { sec: '4.1', type: 'fill', ask: 'Join each payment to its customer.', code: 'SELECT c.first_name, p.amount\nFROM customer c\n{{1}} JOIN payment p\n  {{2}} c.customer_id = p.customer_id;', blanks: ['INNER', 'ON'], ci: true },
  { sec: '4.1', type: 'mcq', ask: 'Why give tables short aliases such as <code>c</code> and <code>p</code>?',
    options: ['To say which table a shared column name like customer_id comes from, with less typing', 'Aliases make the join faster', 'Without aliases a JOIN returns no rows', 'Aliases rename the tables permanently'], answer: 0 },
  { sec: '4.2', type: 'mcq', ask: 'Which join keeps every customer, even those with no payments?',
    options: ['customer LEFT JOIN payment', 'customer INNER JOIN payment', 'customer RIGHT JOIN payment', 'customer CROSS JOIN payment'], answer: 0,
    why: 'LEFT JOIN keeps every row of the left table and fills NULLs where nothing matches.' },
  { sec: '4.2', type: 'fill', ask: 'Find customers who have never paid (an anti-join).', code: 'SELECT c.customer_id\nFROM customer c\nLEFT JOIN payment p ON p.customer_id = c.customer_id\nWHERE p.payment_id {{1}} {{2}};', blanks: ['IS', 'NULL'], ci: true },
  { sec: '4.2', type: 'match', ask: 'Match each join to what it keeps',
    pairs: { 'INNER JOIN': 'only rows that match on both sides', 'LEFT JOIN': 'every row of the left table', 'RIGHT JOIN': 'every row of the right table', 'FULL JOIN': 'every row from both tables' } },
  { sec: '4.3', type: 'mcq', ask: 'JOIN vs UNION — what is the difference in shape?',
    options: ['JOIN puts columns side by side; UNION stacks rows on top of each other', 'JOIN stacks rows; UNION puts columns side by side', 'They are the same', 'UNION only works on one table'], answer: 0 },
  { sec: '4.3', type: 'mcq', ask: 'What does UNION ALL do that UNION does not?',
    options: ['Keeps duplicate rows', 'Removes duplicate rows', 'Sorts the result', 'Joins on every column'], answer: 0,
    why: 'UNION removes duplicates (extra work); UNION ALL keeps every row and is faster.' },
  { sec: '4.3', type: 'fill', ask: 'Complete the rule.', text: 'Both SELECTs in a UNION must return the same number of {{1}}, in compatible types.', blanks: ['columns'], ci: true }
];
