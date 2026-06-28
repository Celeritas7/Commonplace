-- commonplace_pages.seed.sql
-- One table that drives the Python index card grids (Fundamentals, Data
-- Libraries, Practice). Edit rows here (or in the Supabase table editor) and the
-- page re-renders — no HTML changes. Lesson CONTENT stays as your existing pages;
-- this table only stores the card index (title, badge, link, order, status).
--
-- Run this once in the Supabase SQL editor.

create table if not exists commonplace_pages (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null default 'python',
  section_key   text not null,                 -- 'fundamentals' | 'libraries' | 'practice'
  section_no    text not null,                 -- roman numeral shown as "§ I"
  section_title text not null,                 -- e.g. 'Fundamentals'
  section_desc  text,                          -- the italic line under the heading
  section_order int  not null,                 -- order of the sections on the page
  idx           text,                          -- card badge: '01', '▤', '●' …
  title         text not null,                 -- card title
  href          text,                          -- link to the lesson page
  card_order    int  not null,                 -- order of the card within its section
  status        text default 'available'       -- 'available' | 'wip' | 'hidden'
);

-- Content is public-read; lock writes to your own dashboard / service role.
alter table commonplace_pages enable row level security;
drop policy if exists cp_pages_read on commonplace_pages;
create policy cp_pages_read on commonplace_pages for select using (true);

-- ---- seed: Python, mirrors your current static cards ----
delete from commonplace_pages where subject = 'python';

-- § I  Fundamentals
insert into commonplace_pages (subject, section_key, section_no, section_title, section_desc, section_order, idx, title, href, card_order) values
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'01','Random Module','fundamentals/01_random_module.html',1),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'02','For Loops','fundamentals/02_for_loops.html',2),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'03','While Loops','fundamentals/03_while_loops.html',3),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'04','If / Else','fundamentals/04_if_else.html',4),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'05','Lists, Tuples & Dicts','fundamentals/05_lists_tuples_dicts.html',5),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'06','Strings','fundamentals/06_strings.html',6),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'07','Exceptions','fundamentals/07_exceptions.html',7),
('python','fundamentals','I','Fundamentals','Core Python — concept, then runnable code. Work them in order.',1,'08','Functions','fundamentals/08_functions.html',8);

-- § II  Data Libraries
insert into commonplace_pages (subject, section_key, section_no, section_title, section_desc, section_order, idx, title, href, card_order) values
('python','libraries','II','Data Libraries','NumPy → Pandas → Matplotlib. Edit and run real arrays, frames and plots in the browser.',2,'▤','NumPy','libraries/numpy.html',1),
('python','libraries','II','Data Libraries','NumPy → Pandas → Matplotlib. Edit and run real arrays, frames and plots in the browser.',2,'▤','Pandas','libraries/pandas.html',2),
('python','libraries','II','Data Libraries','NumPy → Pandas → Matplotlib. Edit and run real arrays, frames and plots in the browser.',2,'✎','Pandas — Practice','libraries/pandas_practice.html',3),
('python','libraries','II','Data Libraries','NumPy → Pandas → Matplotlib. Edit and run real arrays, frames and plots in the browser.',2,'◠','Matplotlib','libraries/matplotlib.html',4);

-- § IV  Practice & Drills
insert into commonplace_pages (subject, section_key, section_no, section_title, section_desc, section_order, idx, title, href, card_order) values
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'●','Beginner','practice/self_practice_beginner.html',1),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'●','Beginner (from AI study)','practice/self_practice_beginner_from_aistudy.html',2),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'◐','Intermediate','practice/self_practice_intermediate.html',3),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'◐','Intermediate (structured)','practice/self_practice_intermediate_structured.html',4),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'✦','Random Module Practice','practice/random_module_practice.html',5),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'✦','Random Module Practice 2','practice/random_module_practice_2.html',6),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'§','Section 3–14','practice/section_3_14.html',7),
('python','practice','IV','Practice & Drills','Problem sets and your own practice logs, fully runnable.',4,'★','Golden Problem Template','practice/golden_problem_template.html',8);
