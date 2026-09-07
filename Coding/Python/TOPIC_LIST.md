# Interactive Book — Topic List for Python

**Project:** The Python book in Commonplace
**Author:** Aniket
**Last updated:** 2026-09-05 (first draft — pending review)

## Why this file exists

`Coding/Python/` today is **not a book**. It is a set of notebook *players*: each
"lesson" page holds a JSON dump of an `.ipynb` and renders the cells with Pyodide.
That is a good runnable surface, but it has none of the things that make SQL,
C & C++ and Batch feel like Commonplace — no "why this matters", no mental model,
no mascot, no source labelling, no reading-progress sync.

This file plans the actual book. The notebook players stay, as the **Try it**
surface each lesson links out to.

## Design Decisions

- **Audience:** Beginner, but *not* absolute beginner — the reader already met
  loops and functions in the C book. Python lessons may say "you know this from C,
  here is what Python does differently."
- **Depth:** Practical working knowledge. Skip metaclasses, descriptors, `__slots__`,
  async internals, and the C API.
- **Baseline:** Python 3.11+. Mark anything newer, e.g. **(3.12)**.
- **Independence:** The Python book stands alone. It may *reference* C for contrast
  but never requires it.
- **Mascot:** **Cobra** — a coiled green snake in round glasses. Personality: has read
  the docs, is unbothered, always says "there's a simpler way to write that."
  Speech bubbles bottom-left, swapping per section. (C = Bit, C++ = Pixel, Batch = none.)
- **Visual style:** Reuse the Python launcher's existing palette — paper `#eceee4`,
  ink `#1a2820`, green `#2f6b4f`, sage `#7fa68b`, brass `#a98a4b`. Cormorant/EB Garamond
  for prose, JetBrains Mono for code. Do **not** import the C book's cream/orange.

## Pedagogy — Every Lesson Follows This Pattern

Same seven-part structure as the C and C++ books, so the experience is predictable:

1. **Why this matters** — one concrete scenario.
2. **The mental model** — analogy and diagram before syntax.
3. **Walk-through** — line-by-line annotated code, small.
4. **Try it** — links out to the matching notebook player (live Pyodide).
5. **Predict the output** — quiz before the reveal.
6. **Common mistakes** — the two or three beginners get wrong.
7. **Exercises** — three graded problems (easy / medium / stretch).

Closing **Quick recap** card. Every callout is tagged for provenance:

- 📖 **FROM YOUR NOTES** — lifted from a docx/PDF study note
- 🧪 **FROM YOUR NOTEBOOK** — lifted from an `.ipynb` or `.py` you wrote
- ✨ **NEWLY WRITTEN** — fresh, to fit the interactive format

## What was actually read to build this list

To be precise about provenance, because it matters for how much to trust the mapping:

- **Read in full or near-full:** every `.ipynb` heading structure (Fundamentals,
  Libraries, Practice), all 17 stdlib script filenames, the Angela Yu section list,
  the 78 beginner problem titles.
- **Contents pages read, bodies not:** McKinney *Python for Data Analysis*
  (92 headings) and Sweigart *Automate the Boring Stuff* (18 chapters). Chapter-level
  mapping is sound; per-lesson detail will need the body read at authoring time.
- **Not read:** the book bodies themselves, the HackerRank `.xlsx` trackers,
  the `Thinking_in_code` screenshot sets.

There is **no scikit-learn book** in storage. The nearest thing is McKinney's
"Introduction to scikit-learn" section (ch.13) and the `AI_study` book's 18 chapters,
whose own source folder `3_Classical_ML/Course/Lessons` is not in any connected folder.

## Legend

**Status** — `Have` substantial source exists · `Partial` some source · `New` write fresh

**Source keys**

| Key | Where it lives |
|---|---|
| `NB-F` | `##Coding\Python\Notebooks\Fundamentals\*.ipynb` (8 notebooks) |
| `NB-L` | `##Coding\Python\Notebooks\Libraries\` (NumPy 119 cells, Pandas 155, Matplotlib 48) |
| `SCR` | `##Coding\Python\Scripts\Fundamentals\` (17 stdlib scripts you wrote) |
| `PAT` | `##Coding\Python\Scripts\Pattern_programs\` |
| `SPB` | `Notebooks\Practice\Self_practice_beginner.ipynb` (407 cells, 78 problems) |
| `SPI` | `Notebooks\Practice\Self_practice_intermediate.ipynb` (Angela Yu §15–40) |
| `SPS` | `Notebooks\Practice\Self_practice_intermediate_structured.ipynb` |
| `MCK` | `Books\Python_Book_Reference\Python_book_compiled_notes.docx` — McKinney *Python for Data Analysis*, full 92-heading contents read 2026-09-05 |
| `ATBS` | `Books\Automate_the_Boring_Stuff\` — Sweigart, 18 chapters, contents read 2026-09-05 |
| `PROJ` | `##Coding\Python\Projects\` (Turtle Hirst, Robotics, DB file reading, ML Rail) |

---

# Part 0 — Before You Code · 4 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 0.1 | What Python is, and why it reads like English | — | New |
| 0.2 | Installing Python — Anaconda, and why you already have it | — | Partial |
| 0.3 | Three ways to run code: script, REPL, notebook | NB-F | Partial |
| 0.4 | Reading a traceback without panic | SPB (debugging set) | New |

# Part I — The Basics · 7 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 1.1 | Variables, names, and dynamic typing | — | New |
| 1.2 | Numbers and arithmetic; `//`, `%`, `**` | SCR `2_Module_Math` | Partial |
| 1.3 | Strings — creation, indexing, slicing | NB-F 06 | Have |
| 1.4 | String methods, split, join, find, replace | NB-F 06 | Have |
| 1.5 | f-strings and formatting output | NB-F 06 §9 | Have |
| 1.6 | `input()`, type conversion, and the classic bug | SPB | Partial |
| 1.7 | Booleans, comparison and logical operators | NB-F 04 §5–6 | Have |

# Part II — Decisions and Loops · 5 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 2.1 | `if` / `elif` / `else`, and nesting | NB-F 04 | Have |
| 2.2 | Truthiness, membership, and the ternary | NB-F 04 §7–9 | Have |
| 2.3 | `for` loops and `range` | NB-F 02 | Have |
| 2.4 | `while` loops — accumulator and sentinel patterns | NB-F 03 | Have |
| 2.5 | `break`, `continue`, and loop `else`; nested loops and patterns | SCR `1-3`, PAT | Have |

# Part III — Collections · 6 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 3.1 | Lists — building, mutating, growing | NB-F 05 | Have |
| 3.2 | Indexing and slicing, and the off-by-one | NB-F 05 §2 | Have |
| 3.3 | Tuples and unpacking | NB-F 05 §4–5 | Have |
| 3.4 | Dictionaries — keys, lookup, iteration | NB-F 05, SCR `Storage_dictionary` | Have |
| 3.5 | Sets — membership and deduplication | SCR `Storage_set` | Have |
| 3.6 | Comprehensions — list, dict, set | SPI §26 (NATO alphabet) | Partial |

# Part IV — Functions · 6 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 4.1 | Defining and calling; why functions exist | NB-F 08 | Have |
| 4.2 | Parameters: positional, keyword, default | NB-F 08 §2–5, SPB | Have |
| 4.3 | `*args` and `**kwargs` | NB-F 08 §6–7, SPI §27 | Have |
| 4.4 | Return values, multiple returns, docstrings | NB-F 08 §3, SPB | Have |
| 4.5 | Scope — local, global, and constants | SPB (namespaces set) | Have |
| 4.6 | Lambdas and higher-order functions | NB-F 08 §8, SPI §19 | Have |

# Part V — Errors and Debugging · 4 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 5.1 | `try` / `except` / `else` / `finally` | NB-F 07 | Have |
| 5.2 | Raising, custom exceptions, the hierarchy | NB-F 07 §6–9 | Have |
| 5.3 | The six-step debugging routine | SPB (describe → reproduce → play computer → fix → print → debugger) | Have |
| 5.4 | The Mistake Bank — turning failures into drills | `mistake-drill.html`, Golden Problem Template | Partial |

# Part VI — Files, Formats and the OS · 4 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 6.1 | Reading and writing text files | SPI §24, ATBS | Partial |
| 6.2 | Paths that work everywhere — `os` and `pathlib` | SCR `4_Module_Os_and_Pathlib` | Have |
| 6.3 | CSV — read, write, and the encoding trap | SPI §25 | Have |
| 6.4 | JSON — load, dump, nest | SCR `5_Module_Json`, SPI §30 | Have |

# Part VII — The Standard Library Toolbox · 7 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 7.1 | `random` — and how to make it repeatable | NB-F 01, Practice (19 examples) | Have |
| 7.2 | `math` and numeric edge cases | SCR `2_Module_Math` | Have |
| 7.3 | `datetime` and `time` | SCR `3_Module_Time`, SPI §32 | Have |
| 7.4 | `collections` — Counter, defaultdict, deque | SCR `7_Module_Collections` | Have |
| 7.5 | `itertools` — lazy combinatorics | SCR `6_Module_Itertools` | Have |
| 7.6 | `re` — regular expressions, gently | SCR `8_Advanced_re` | Have |
| 7.7 | Scripts that behave: `argparse`, `logging`, `sys` | SCR `8_Advanced_*`, `Advanced_sys` | Have |

# Part VIII — Object-Oriented Python · 5 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 8.1 | Why objects — the problem they solve | SPI §16 | Have |
| 8.2 | Classes, instances, attributes, `__init__` | SPI §16 | Have |
| 8.3 | Methods and state | SPI §19 | Have |
| 8.4 | Inheritance and overriding | SPI §21 | Have |
| 8.5 | Project — the Quiz app, refactored into objects | SPI §17 | Have |

# Part IX — Programs People Use · 5 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 9.1 | Turtle graphics — drawing with code | SPI §18, PROJ Turtle Hirst | Have |
| 9.2 | The game loop — Snake and Pong | SPI §20–22 | Have |
| 9.3 | Tkinter — windows, widgets, layout | SPI §27 | Have |
| 9.4 | Project — Pomodoro timer and password manager | SPI §28–29 | Have |
| 9.5 | Handing a script to someone else | ATBS | New |

# Part X — Talking to the Internet · 4 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 10.1 | HTTP requests and JSON APIs | SPI §33 | Have |
| 10.2 | Endpoints, parameters, and reading API docs | SPI §33–34 | Have |
| 10.3 | Keys, auth and environment variables | SPI §35 | Have |
| 10.4 | Project — an alert that runs itself | SPI §36–38 | Have |

# Part XI — Data Libraries · 11 lessons

| # | Topic | Source | Status |
|---|---|---|---|
| 11.1 | NumPy — arrays, shape, dtype | NB-L NumPy §1–2, MCK ch.4 | Have |
| 11.2 | NumPy — vectorized operations, and why loops lose | NB-L NumPy §3, HackerRank comparison notes | Have |
| 11.3 | Pandas — Series and DataFrames | NB-L Pandas §1–2, MCK ch.5 | Have |
| 11.4 | Pandas — loading CSV, JSON, SQL | NB-L Pandas §3–4 | Have |
| 11.5 | Pandas — selecting, filtering, `loc` vs `iloc` | NB-L Pandas §6 | Have |
| 11.6 | Pandas — missing data, duplicates, cleaning | NB-L Pandas §7–9 | Have |
| 11.7 | Pandas — merge, join, concat, pivot | NB-L Pandas §11–12, MCK ch.8 | Have |
| 11.8 | Matplotlib — plots that explain something | NB-L Matplotlib, MCK ch.9 | Have |
| 11.9 | GroupBy — split, apply, combine | MCK ch.10 | Have |
| 11.10 | Time series — dates, ranges, resampling, rolling windows | MCK ch.11 | Have |
| 11.11 | Plotting with pandas and seaborn | MCK ch.9 | Have |

# Part XII — Automating the Boring Stuff · 7 lessons

Sweigart's book is the one source in your storage that covers a whole dimension the
notebooks miss: making Python do chores. These map close to 1:1 onto ATBS chapters.

| # | Topic | Source | Status |
|---|---|---|---|
| 12.1 | Organising files in bulk — copy, move, rename, delete | ATBS ch.9, SCR `4_Module_Os_and_Pathlib` | Have |
| 12.2 | Web scraping — requests and BeautifulSoup | ATBS ch.11 | Have |
| 12.3 | Excel spreadsheets from Python | ATBS ch.12, SPB (excel / Sheets sets) | Have |
| 12.4 | PDF and Word documents | ATBS ch.13, your markitdown toolkit | Have |
| 12.5 | Scheduling tasks and launching programs | ATBS ch.15 | Have |
| 12.6 | Manipulating images | ATBS ch.17 | Have |
| 12.7 | Controlling the keyboard and mouse | ATBS ch.18 | Have |

---

## Totals

| | Lessons |
|---|---|
| Part 0 — Before You Code | 4 |
| Part I — The Basics | 7 |
| Part II — Decisions and Loops | 5 |
| Part III — Collections | 6 |
| Part IV — Functions | 6 |
| Part V — Errors and Debugging | 4 |
| Part VI — Files, Formats and the OS | 4 |
| Part VII — Standard Library Toolbox | 7 |
| Part VIII — Object-Oriented Python | 5 |
| Part IX — Programs People Use | 5 |
| Part X — Talking to the Internet | 4 |
| Part XI — Data Libraries | 11 |
| Part XII — Automating the Boring Stuff | 7 |
| **Total** | **75** |

Status split: **57 Have · 12 Partial · 6 New.** Most of this book is already
written somewhere in your folders — the work is shaping it, not inventing it.

## Deliberately left out

- Machine learning — lives in its own book (`Coding/AI_study`, 18 chapters).
- Statistics / hypothesis testing (`HackerRank\Hackerrank_Python_coding_practice.docx`)
  — belongs with the ML book, not here.
- `async`/`await`, threading, metaclasses, descriptors, packaging to PyPI.

## Build order

1. **Phase 1** — Parts 0, I, II (16 lessons). Proves the template.
2. **Phase 2** — Parts III, IV, V (16 lessons). Completes the core language.
3. **Phase 3** — Parts VI, VII (12 lessons). The toolbox.
4. **Phase 4** — Parts VIII, IX, X (14 lessons). Projects.
5. **Phase 5** — Part XI (11 lessons). Converts the library notebooks.
6. **Phase 6** — Part XII (7 lessons). The automation book.

## Where files go

- Lessons: `Coding\Python\lessons\Py_Lesson_<part>_<n>.html`
- Launcher: `Coding\Python\index.html` (Learn pane rebuilt as 13 part rows — Part 0 plus I–XII)
- Notebook players stay where they are and become each lesson's **Try it** target.
- Every lesson ends with the standard `READING_SYNC` tail block —
  no Python page currently has one, so none of them count toward progress yet.
