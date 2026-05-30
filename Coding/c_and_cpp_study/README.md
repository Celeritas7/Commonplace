# Interactive C &amp; C++ Books

Two playful, beginner-first books for learning C and C++ from scratch — built as self-contained HTML lessons with animated mascots, XP, and small interactive demos in every chapter.

**[→ Open the launcher](index.html)** to start reading.

---

## What's published

Part 0 (Before You Code) is complete for both books — **10 lessons** total. Each lesson is a single self-contained HTML file that runs in any modern browser, with no internet required after the first load.

### The C Book — guided by Bit, the friendly CPU chip 🟠

| # | Title | What's inside |
|---|---|---|
| [0.1](samples/C_Book_Lesson_0_1_v3.html) | What is a program? | Programming as a way to talk to computers; drag-sort game |
| [0.2](samples/C_Book_Lesson_0_2.html) | What computers actually do | CPU + memory at cartoon level; step-through CPU simulator |
| [0.3](samples/C_Book_Lesson_0_3.html) | Why C? Where C lives today | Day-in-your-life timeline showing C running everywhere |
| [0.4](samples/C_Book_Lesson_0_4.html) | Thinking like a programmer | User brain vs programmer brain; decomposition tree |
| [0.5](samples/C_Book_Lesson_0_5.html) | Read, write, run, fix, repeat | The five activities of programming; scene classifier game |

### The C++ Book — guided by Pixel, the modern robot 🟣

| # | Title | What's inside |
|---|---|---|
| [0.1](samples/Cpp_Book_Lesson_0_1_v3.html) | What is a program? | Python vs C++ vs Java side-by-side comparison |
| [0.2](samples/Cpp_Book_Lesson_0_2.html) | What computers actually do | CPU + memory cartoon-level; step-through simulator |
| [0.3](samples/Cpp_Book_Lesson_0_3.html) | Why C++? Where it lives today | Chrome, games, finance, AI — all C++ underneath |
| [0.4](samples/Cpp_Book_Lesson_0_4.html) | Thinking like a programmer | Decomposition tree mapped to functions, classes, namespaces |
| [0.5](samples/Cpp_Book_Lesson_0_5.html) | Read, write, run, fix, repeat | The five activities, with real C++ error scenarios |

---

## Who these books are for

- **Complete beginners** — no prior programming experience assumed
- People who want **practical working knowledge**, not encyclopedic detail
- Anyone who learns better through small interactive bites than long static text

The books are **independent** — read either one without the other. Some topics (control flow, basic I/O) appear in both, written for that book's specific context.

---

## How each lesson is structured

Every lesson follows the same 7- or 8-section pattern, so the reading experience is predictable:

1. **Why this matters** — a one-paragraph hook with a concrete scenario
2. **The mental model** — diagrams and analogies before any code
3. **Walk-through** — annotated examples
4. **Try it** — interactive: simulator, drag-sort, decomposition tree, scenario classifier
5. **Predict** — a quick multiple-choice that locks the concept in
6. **Common mistakes** — the two or three things beginners get wrong here
7. **Exercises** — three graded problems (Easy / Medium / Stretch)
8. **Quick recap** — bullet takeaways

Plus an **XP system**, **streak counter**, and confetti for milestones. The mascots (Bit for C, Pixel for C++) chime in with context-specific hints as you scroll.

---

## Content sourcing

Every callout in every lesson is labeled:

- 📖 **FROM YOUR NOTES** — text lifted directly from the author's existing study notes
- ✨ **NEWLY WRITTEN** — content written fresh to fit the interactive format

This makes it transparent what came from where, lesson by lesson.

---

## The roadmap ahead

Part 0 is complete; **65+ lessons** are still planned. Coming up:

**C Book (Parts I–X)** — Setting up your toolchain, your first program, variables & types, control flow, functions, arrays & strings, **pointers** (the heart of C), dynamic memory, structs, file I/O, multi-file projects, and capstone mini-projects (contacts CLI, word-count utility).

**C++ Book (Parts I–XII)** — Setup, building blocks, control flow, functions, the STL (introduced early!), object-oriented programming, inheritance, **modern resource management** (RAII, move semantics, smart pointers), templates, exceptions, I/O, concurrency, and capstones (to-do list app, tiny JSON parser).

See [`TOPIC_LIST.md`](TOPIC_LIST.md) for the full per-lesson plan.

---

## Tech notes

- **No build step.** Each lesson is a single self-contained `.html` file with inline CSS and JS.
- **No external dependencies** beyond the Google Fonts CDN (Fredoka + JetBrains Mono); falls back to system fonts if offline.
- **No backend.** XP and progress are session-only (reset on reload) — intentional for a sample book.
- **Works on mobile.** Touch interactions are supported for drag-and-drop and click-to-classify.

---

*Built one lesson at a time. Feedback welcome.*
