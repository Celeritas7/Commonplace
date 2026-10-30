/* Authored quiz bank — Module 3 · Aggregating data (aggregates, GROUP BY, HAVING).
   Loaded by _lib/quiz/quiz.js on module-03.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("3.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '3.1', type: 'mcq', ask: 'What does an aggregate function such as <code>SUM(amount)</code> return over a whole table?',
    options: ['One value for all the rows', 'One value per row', 'The rows sorted by amount', 'Every distinct amount'], answer: 0,
    why: 'Aggregates collapse many rows into one value. GROUP BY turns that into one value per group.' },
  { sec: '3.1', type: 'mcq', ask: 'A column has the values 10, 20 and NULL. What is <code>AVG(col)</code>?',
    options: ['15', '10', 'NULL', '30'], answer: 0,
    why: 'AVG ignores NULLs: (10 + 20) / 2 = 15. Use COALESCE(col, 0) first if NULL should count as zero.' },
  { sec: '3.1', type: 'fill', ask: 'Round the average rental rate to 2 decimal places.', code: 'SELECT {{1}}(AVG(rental_rate), {{2}}) AS avg_rate\nFROM film;', blanks: ['ROUND', '2'], ci: true },
  { sec: '3.2', type: 'mcq', ask: 'Which query is valid?',
    options: ['SELECT rating, COUNT(*) FROM film GROUP BY rating;', 'SELECT title, COUNT(*) FROM film GROUP BY rating;', 'SELECT rating, COUNT(*) FROM film;', 'SELECT COUNT(*) FROM film GROUP BY COUNT(*);'], answer: 0, html: false,
    why: 'The golden rule: every selected column is either in GROUP BY or inside an aggregate.' },
  { sec: '3.2', type: 'mcq', ask: 'You want the number of films per rating, but only for films longer than 60 minutes. Where does <code>length &gt; 60</code> go?',
    options: ['In WHERE, before GROUP BY', 'In HAVING, after GROUP BY', 'Inside COUNT', 'In ORDER BY'], answer: 0,
    why: 'WHERE filters rows before they are grouped. HAVING filters the groups afterwards.' },
  { sec: '3.2', type: 'fill', ask: 'Total payments per customer.', code: 'SELECT customer_id, {{1}}(amount) AS total\nFROM payment\n{{2}} {{3}} customer_id;', blanks: ['SUM', 'GROUP', 'BY'], ci: true },
  { sec: '3.3', type: 'mcq', ask: 'Why does <code>WHERE COUNT(*) &gt; 2</code> fail?',
    options: ['WHERE runs before grouping, so there is no count yet — use HAVING', 'COUNT cannot be compared with a number', 'WHERE needs brackets around COUNT', 'It works only in SQLite'], answer: 0 },
  { sec: '3.3', type: 'fill', ask: 'Keep only ratings with more than 3 films.', code: 'SELECT rating, COUNT(*) AS films\nFROM film\nGROUP BY rating\n{{1}} COUNT(*) > 3;', blanks: ['HAVING'], ci: true },
  { sec: '3.3', type: 'match', ask: 'Match each clause to when it runs',
    pairs: { 'WHERE': 'filters rows before grouping', 'GROUP BY': 'folds rows into groups', 'HAVING': 'filters groups after aggregating', 'ORDER BY': 'sorts the final result' } }
];
