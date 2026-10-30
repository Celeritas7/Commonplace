/* Authored quiz bank — Module 10 · Capstone — Tiffinly (schema, analysis, operationalising).
   Loaded by _lib/quiz/quiz.js on module-10.html. Format: _lib/quiz/README.md.
   sec = the lesson a question belongs to ("10.1" …), used by the end-of-module check. */
window.CP_QUIZ_BANK = [
  { sec: '10.1', type: 'mcq', ask: 'Why do the DROP TABLE IF EXISTS lines drop <code>tf_rating</code> before <code>tf_customer</code>?',
    options: ['tf_rating references other tables; drop the children before the parents a foreign key points at', 'Alphabetical order', 'tf_customer is bigger', 'Order does not matter'], answer: 0 },
  { sec: '10.1', type: 'mcq', ask: '<code>tf_subscription.end_date</code> allows NULL. What does a NULL end_date mean?',
    options: ['The subscription has not ended', 'The subscription was cancelled', 'The date is invalid', 'The customer has no plan'], answer: 0 },
  { sec: '10.1', type: 'fill', ask: 'Link each subscription to a real customer.', code: 'customer_id INTEGER NOT NULL {{1}} tf_customer(customer_id)', blanks: ['REFERENCES'], ci: true },
  { sec: '10.2', type: 'mcq', ask: 'Monthly recurring revenue (MRR) is the sum of what?',
    options: ["monthly_price of the plans on subscriptions with status 'active'", 'every payment ever made', 'monthly_price of every plan', 'meals delivered this month'], answer: 0 },
  { sec: '10.2', type: 'mcq', ask: 'Customers who never rated anything — which pattern finds them?',
    options: ['LEFT JOIN tf_rating and keep rows where the rating side IS NULL', 'INNER JOIN tf_rating', 'UNION tf_customer and tf_rating', 'GROUP BY rating'], answer: 0,
    why: 'The anti-join from Module 4.' },
  { sec: '10.2', type: 'fill', ask: 'Revenue per area, biggest first.', code: 'SELECT c.area, SUM(p.monthly_price) AS mrr\nFROM tf_subscription s\nJOIN tf_customer c ON c.customer_id = s.customer_id\nJOIN tf_plan p ON p.plan_id = s.plan_id\nWHERE s.status = \'active\'\n{{1}} {{2}} c.area\nORDER BY mrr {{3}};', blanks: ['GROUP', 'BY', 'DESC'], ci: true },
  { sec: '10.3', type: 'mcq', ask: 'Why save the recurring business questions as views?',
    options: ['Everyone runs the same definition by name, and changing it in one place changes it everywhere', 'Views are faster than tables', 'Views cannot be deleted', 'Views store a copy of the data'], answer: 0 },
  { sec: '10.3', type: 'match', ask: 'Match each step to the module it comes from',
    pairs: { 'CREATE VIEW for each report': 'Module 7', 'COPY the report to CSV': 'Module 8', 'Python daily report with psycopg': 'Module 9', 'JOINs across subscription, customer and plan': 'Module 4' } },
  { sec: '10.3', type: 'mcq', ask: 'A daily report script runs the same queries every morning. What should it never do?',
    options: ['Build SQL by pasting values into the query string', 'Use a view', 'Close the connection', 'Write a CSV'], answer: 0 }
];
