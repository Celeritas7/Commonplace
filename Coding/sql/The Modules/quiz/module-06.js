/* Authored quiz bank — Module 6 · Creating & modifying tables (design, INSERT/UPDATE/DELETE, ALTER/DROP).
   Loaded by _lib/quiz/quiz.js on module-06.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("6.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '6.1', type: 'mcq', ask: 'What does a PRIMARY KEY guarantee?',
    options: ['Every row has a value, and no two rows share it', 'The column is sorted', 'The column links to another table', 'The column can never change type'], answer: 0 },
  { sec: '6.1', type: 'mcq', ask: 'What does a FOREIGN KEY on <code>payment.customer_id</code> do?',
    options: ['Rejects a payment whose customer_id does not exist in customer', 'Makes customer_id unique in payment', 'Copies the customer row into payment', 'Deletes payments when a customer is added'], answer: 0 },
  { sec: '6.1', type: 'match', ask: 'Match each constraint to its rule',
    pairs: { 'NOT NULL': 'a value must be given', 'UNIQUE': 'no two rows may share the value', 'CHECK (price > 0)': 'the value must pass a test', 'DEFAULT 0': 'used when no value is given' } },
  { sec: '6.2', type: 'fill', ask: 'Add one product.', code: "{{1}} INTO product (name, price)\n{{2}} ('Pen', 1.50);", blanks: ['INSERT', 'VALUES'], ci: true },
  { sec: '6.2', type: 'mcq', ask: 'What happens if you run <code>UPDATE product SET price = 0;</code> with no WHERE?',
    options: ['Every row gets price 0', 'Nothing — UPDATE needs WHERE', 'Only the first row changes', 'An error'], answer: 0,
    why: 'No WHERE means every row. Run the same WHERE as a SELECT first to see what you will change.' },
  { sec: '6.2', type: 'fill', ask: 'Remove only the discontinued products.', code: "{{1}} FROM product\n{{2}} status = 'discontinued';", blanks: ['DELETE', 'WHERE'], ci: true },
  { sec: '6.3', type: 'fill', ask: 'Add a column to an existing table.', code: '{{1}} TABLE product\nADD {{2}} stock INTEGER DEFAULT 0;', blanks: ['ALTER', 'COLUMN'], ci: true },
  { sec: '6.3', type: 'match', ask: 'Match each statement to what it does',
    pairs: { 'DELETE FROM t': 'removes rows, one by one, can use WHERE', 'TRUNCATE t': 'empties the table fast, no WHERE', 'DROP TABLE t': 'removes the table itself', 'ALTER TABLE t': 'changes the table\'s structure' } },
  { sec: '6.3', type: 'mcq', ask: 'Why is dropping a column riskier than adding one?',
    options: ['The data in it is gone, and any query that uses it breaks', 'It is slower to type', 'It also drops the table', 'It renames every other column'], answer: 0 }
];
