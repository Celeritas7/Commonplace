/* Authored quiz bank — Module 9 · PostgreSQL with Python (connect, read, write with psycopg).
   Loaded by _lib/quiz/quiz.js on module-09.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("9.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '9.1', type: 'mcq', ask: 'Where should database credentials come from in a Python script?',
    options: ['Environment variables or a config file kept out of version control', 'Hard-coded in the script', 'A comment at the top of the script', 'The query string'], answer: 0 },
  { sec: '9.1', type: 'fill', ask: 'Open a connection with psycopg.', code: 'import psycopg\nwith psycopg.{{1}}(conninfo) as conn:\n    ...', blanks: ['connect'], ci: true },
  { sec: '9.1', type: 'mcq', ask: 'What is a connection pool for?',
    options: ['Reusing open connections instead of opening a new one for every request', 'Running two databases at once', 'Storing query results', 'Encrypting passwords'], answer: 0 },
  { sec: '9.2', type: 'mcq', ask: 'Which is the safe way to pass a user\'s value into a query?',
    options: ['cur.execute("SELECT * FROM film WHERE rating = %s", (rating,))', 'cur.execute("SELECT * FROM film WHERE rating = \'" + rating + "\'")', 'cur.execute(f"SELECT * FROM film WHERE rating = \'{rating}\'")', 'cur.execute("SELECT * FROM film WHERE rating = " % rating)'], answer: 0, html: false,
    why: 'Parameters are sent separately from the SQL, so a value can never become code — that is what stops SQL injection.' },
  { sec: '9.2', type: 'match', ask: 'Match each fetch method to what it returns',
    pairs: { 'fetchone()': 'the next row, or None', 'fetchmany(100)': 'up to 100 rows', 'fetchall()': 'every remaining row', 'pandas.read_sql': 'a DataFrame' } },
  { sec: '9.2', type: 'mcq', ask: 'What is SQL injection?',
    options: ['Input that is pasted into the SQL text and runs as part of the query', 'A slow query', 'A query that returns too many rows', 'A missing index'], answer: 0 },
  { sec: '9.3', type: 'mcq', ask: 'You ran an INSERT through psycopg but the row never appears. What is the most likely reason?',
    options: ['The transaction was never committed', 'INSERT needs fetchall()', 'psycopg cannot write', 'The table has a primary key'], answer: 0,
    why: 'Changes are part of a transaction until conn.commit() — or until a with-block exits normally.' },
  { sec: '9.3', type: 'fill', ask: 'Insert many rows in one call.', code: 'cur.{{1}}("INSERT INTO t (a, b) VALUES (%s, %s)", rows)', blanks: ['executemany'], ci: true },
  { sec: '9.3', type: 'mcq', ask: 'Which is fastest for loading a very large file from Python?',
    options: ['COPY (cur.copy)', 'One execute() per row', 'executemany with one row', 'SELECT … INTO'], answer: 0 }
];
