/* Authored quiz bank — Module 5 · Advanced SQL (dates, math & strings, subqueries, self-joins).
   Loaded by _lib/quiz/quiz.js on module-05.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("5.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '5.1', type: 'mcq', ask: 'In this SQLite playground, how do you get the year from <code>payment_date</code>?',
    options: ["strftime('%Y', payment_date)", 'EXTRACT(YEAR FROM payment_date)', 'YEAR(payment_date)', 'payment_date.year'], answer: 0, html: false,
    why: 'EXTRACT is the PostgreSQL way; SQLite uses strftime.' },
  { sec: '5.1', type: 'mcq', ask: 'Which keeps only payments made in May 2024?',
    options: ["WHERE payment_date >= '2024-05-01' AND payment_date < '2024-06-01'", "WHERE payment_date = '2024-05'", "WHERE payment_date LIKE 2024-05", "WHERE MONTH = 5"], answer: 0, html: false,
    why: 'A half-open range (>= start, < next start) catches every moment of the month.' },
  { sec: '5.1', type: 'fill', ask: 'PostgreSQL: the month number of a date.', code: 'SELECT {{1}}(MONTH FROM payment_date)\nFROM payment;', blanks: ['EXTRACT'], ci: true },
  { sec: '5.2', type: 'mcq', ask: 'Which joins first and last name with a space between them, in standard SQL?',
    options: ["first_name || ' ' || last_name", "first_name + ' ' + last_name", "first_name & last_name", "JOIN(first_name, last_name)"], answer: 0, html: false },
  { sec: '5.2', type: 'match', ask: 'Match each function to what it does',
    pairs: { 'UPPER(s)': 'capital letters', 'LENGTH(s)': 'number of characters', 'TRIM(s)': 'strips surrounding spaces', 'ROUND(x, 2)': 'two decimal places' } },
  { sec: '5.2', type: 'mcq', ask: 'In PostgreSQL, what is <code>7 / 2</code>?',
    options: ['3 — integer division drops the fraction', '3.5', '4', 'An error'], answer: 0,
    why: 'Dividing two integers gives an integer. Write 7.0 / 2 or CAST one side to get 3.5.' },
  { sec: '5.3', type: 'mcq', ask: 'Films longer than the average length — which query works?',
    options: ['SELECT title FROM film WHERE length > (SELECT AVG(length) FROM film);', 'SELECT title FROM film WHERE length > AVG(length);', 'SELECT title FROM film HAVING length > AVG(length);', 'SELECT title, AVG(length) FROM film;'], answer: 0, html: false,
    why: 'Aggregates cannot sit in WHERE directly; a scalar subquery computes the average first.' },
  { sec: '5.3', type: 'fill', ask: 'Customers that have at least one payment.', code: 'SELECT first_name\nFROM customer c\nWHERE {{1}} (SELECT 1 FROM payment p WHERE p.customer_id = c.customer_id);', blanks: ['EXISTS'], ci: true },
  { sec: '5.3', type: 'mcq', ask: 'What makes a subquery <i>correlated</i>?',
    options: ['It refers to a column of the outer query, so it runs once per outer row', 'It returns more than one column', 'It is in the FROM clause', 'It uses EXISTS'], answer: 0 },
  { sec: '5.4', type: 'mcq', ask: 'What is a self-join?',
    options: ['A table joined to itself under two different aliases', 'A join with no ON clause', 'A join that keeps only one side', 'A view that refers to itself'], answer: 0 },
  { sec: '5.4', type: 'fill', ask: 'Pairs of different films with the same rating, each pair once.', code: 'SELECT a.title, b.title\nFROM film a\nJOIN film b ON a.rating = b.rating\nWHERE a.film_id {{1}} b.film_id;', blanks: ['<'], ci: true,
    why: 'a.film_id < b.film_id drops self-pairs and keeps each pair in one order only.' },
  { sec: '5.4', type: 'mcq', ask: 'An <code>employee</code> table has <code>manager_id</code> pointing at another employee. How do you list each employee with their manager\'s name?',
    options: ['Join employee to itself: e.manager_id = m.employee_id', 'GROUP BY manager_id', 'UNION employee with employee', 'A subquery in ORDER BY'], answer: 0 }
];
