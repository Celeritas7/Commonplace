/* Authored quiz bank — Module 8 · Importing & exporting data (import, export, cleaning).
   Loaded by _lib/quiz/quiz.js on module-08.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("8.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '8.1', type: 'mcq', ask: 'In PostgreSQL, what is the difference between <code>COPY</code> and psql\'s <code>\\copy</code>?',
    options: ['COPY reads a file on the database server; \\copy reads a file on your own machine', 'They are the same command', '\\copy only exports', 'COPY only works in pgAdmin'], answer: 0 },
  { sec: '8.1', type: 'fill', ask: 'Load a CSV that has a header row.', code: "COPY film_import FROM '/data/films.csv'\nWITH (FORMAT {{1}}, {{2}} true);", blanks: ['csv', 'HEADER'], ci: true },
  { sec: '8.1', type: 'mcq', ask: 'Which is a common import pitfall?',
    options: ['Columns in the file in a different order from the table', 'Too few rows', 'Using SELECT afterwards', 'A table with a primary key'], answer: 0 },
  { sec: '8.2', type: 'mcq', ask: 'Which tool exports a whole PostgreSQL database, schema and data, to a file?',
    options: ['pg_dump', 'COPY … FROM', 'SELECT INTO', 'TRUNCATE'], answer: 0 },
  { sec: '8.2', type: 'fill', ask: 'Export a query result to CSV.', code: "COPY (SELECT title, rating FROM film)\n{{1}} '/tmp/films.csv' WITH (FORMAT csv, HEADER true);", blanks: ['TO'], ci: true },
  { sec: '8.2', type: 'match', ask: 'Match each command to its job',
    pairs: { 'COPY … FROM': 'import a file into a table', 'COPY … TO': 'export a table or query to a file', 'pg_dump': 'back up a whole database', '.import (SQLite)': 'load a CSV in the sqlite3 shell' } },
  { sec: '8.3', type: 'mcq', ask: "Imported data has the text 'N/A' where a value is missing. What should you turn it into?",
    options: ['A real NULL, with NULLIF(col, \'N/A\')', 'An empty string', 'Zero', 'Leave it — it is fine as text'], answer: 0, html: false },
  { sec: '8.3', type: 'fill', ask: 'Remove spaces around a value.', code: 'UPDATE staging SET name = {{1}}(name);', blanks: ['TRIM'], ci: true },
  { sec: '8.3', type: 'mcq', ask: 'How do you find duplicate emails in a staging table?',
    options: ['GROUP BY email HAVING COUNT(*) > 1', 'SELECT DISTINCT email', 'ORDER BY email', 'WHERE email = email'], answer: 0, html: false }
];
