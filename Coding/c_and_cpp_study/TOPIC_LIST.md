# Interactive Books — Topic List for C and C++ Study

**Project:** Interactive books for studying C and C++
**Author:** Aniket
**Last updated:** 2026-05-25 (revised for beginner audience)

## Design Decisions

These decisions shape every chapter:

- **Audience:** Complete beginner — no prior programming experience assumed.
- **Depth:** Practical working knowledge. We cover what a working developer
  uses; we skip or briefly mention rarely-used corners.
- **Standards baseline:** C99 for the C book, C++11 for the C++ book. Features
  added in later standards are marked, e.g. **(C++17)**, **(C++20)**.
- **Book linkage:** The two books are independent. A reader of either book gets
  the full story without needing the other. Shared foundations (control flow,
  basic I/O) appear in both, written for that book's context.

## Pedagogy — Every Chapter Follows This Pattern

Because the reader is a complete beginner, every lesson uses the same
seven-part structure so the experience is predictable:

1. **Why this matters** — one paragraph motivating the topic with a concrete scenario.
2. **The mental model** — diagrams and an analogy before any code.
3. **Walk-through** — line-by-line annotated code, very small example.
4. **Try it** — embedded code editor with starter code the reader edits.
5. **Predict the output** — short interactive quiz before the answer is revealed.
6. **Common mistakes** — the two or three things beginners get wrong here.
7. **Exercises** — three graded problems (easy / medium / stretch).

A **"Quick recap"** card closes each lesson with bullet takeaways.

Legend for **Status** column:
- **Have** — substantial coverage exists in your current files
- **Partial** — some material exists but is incomplete
- **New** — needs to be written fresh

---

# Book 1 — The C Language

## Part 0. Before You Code (beginner orientation)
| # | Topic | Status |
|---|---|---|
| 0.1 | What is a program? What is a programming language? | New |
| 0.2 | What computers actually do — instructions, memory, the CPU (cartoon level) | New |
| 0.3 | Why C? Where C lives in the modern world | Partial |
| 0.4 | How thinking like a programmer is different from thinking like a user | New |
| 0.5 | The five things you'll do over and over: read, write, run, fix, repeat | New |

## Part I. Setting Up and Your First Program
| # | Topic | Status |
|---|---|---|
| 1.1 | Installing a compiler (GCC on Windows via MSYS2; macOS with clang; Linux) | Partial |
| 1.2 | Choosing an editor (VS Code recommended) and configuring it | New |
| 1.3 | Your very first program — `hello.c` line-by-line | Partial |
| 1.4 | What happens when you press "run" — source → executable, in plain words | New |
| 1.5 | Reading compiler error messages without panic | New |

## Part II. Core Language
| # | Topic | Status |
|---|---|---|
| 2.1 | Variables and identifiers | Have |
| 2.2 | The basic types — `int`, `char`, `float`, `double`, `_Bool` — and what fits in each | Partial |
| 2.3 | Constants, literals, and `const` | Partial |
| 2.4 | Operators part 1 — arithmetic, assignment, comparison | New |
| 2.5 | Operators part 2 — logical, increment/decrement, the ternary `?:` | New |
| 2.6 | A practical look at operator precedence (just the rules you'll actually hit) | New |
| 2.7 | Type conversion — when does C convert silently, when do you need a cast | New |
| 2.8 | `printf` and `scanf` — the format specifiers you actually need | New |
| 2.9 | Bitwise operators (brief — pointed to from Appendix B for deep dive) | New |

## Part III. Making Decisions and Repeating Work
| # | Topic | Status |
|---|---|---|
| 3.1 | `if`, `else`, `else if` | New |
| 3.2 | `switch` and when to prefer it over chained `if` | New |
| 3.3 | `while` and `do-while` loops | New |
| 3.4 | `for` loops | New |
| 3.5 | `break` and `continue` | New |
| 3.6 | Nested loops with worked examples | New |
| 3.7 | *Note on `goto`* — what it is, why you won't be using it (1 page) | New |

## Part IV. Functions
| # | Topic | Status |
|---|---|---|
| 4.1 | Why functions exist — DRY, naming, testing | New |
| 4.2 | Writing your first function — parameters and return values | New |
| 4.3 | Function prototypes and where to put them | New |
| 4.4 | Scope — what a variable "sees" and how long it lives | New |
| 4.5 | `static` and `extern` for beginners (just the practical use) | New |
| 4.6 | Recursion — the small example that makes it click | New |

## Part V. Arrays and Strings
| # | Topic | Status |
|---|---|---|
| 5.1 | Arrays — declaring, initializing, accessing | New |
| 5.2 | Why C arrays don't know their own size (and what to do about it) | New |
| 5.3 | Multi-dimensional arrays | New |
| 5.4 | C strings — `char` arrays with a `'\0'` at the end | New |
| 5.5 | `<string.h>` — `strlen`, `strcpy`, `strcmp`, `strcat`, and the safer `strn*` versions | New |
| 5.6 | Arrays as function arguments | New |

## Part VI. Pointers — The Heart of C
This part is deliberately long. Pointers are *the* concept that decides whether
someone "gets" C or not, so we move slowly with lots of diagrams.
| # | Topic | Status |
|---|---|---|
| 6.1 | What an address is — memory as a row of numbered boxes | New |
| 6.2 | Declaring a pointer; `&` (address-of) and `*` (dereference) | New |
| 6.3 | Visualizing pointers — animated diagrams | New |
| 6.4 | Pointer arithmetic — what `p + 1` really means | New |
| 6.5 | Pointers and arrays — how they're related (and how they're different) | New |
| 6.6 | Pointers as function parameters — pass by reference idiom | New |
| 6.7 | `const` and pointers — the four combinations | New |
| 6.8 | Null pointers, dangling pointers, wild pointers — the three things that bite | New |
| 6.9 | *Brief intros (one section each):* pointers to pointers, function pointers | New |

## Part VII. Memory Management
| # | Topic | Status |
|---|---|---|
| 7.1 | Stack vs heap — the two regions that matter | New |
| 7.2 | `malloc` and `free` — your first dynamic memory | New |
| 7.3 | `calloc` and `realloc` — when each one is the right tool | New |
| 7.4 | Memory leaks — what they are, why they matter, how to spot them | New |
| 7.5 | A first dynamic array — building it from scratch | New |
| 7.6 | *Brief:* introduction to AddressSanitizer / Valgrind (just enough to use them) | New |

## Part VIII. Building Your Own Types
| # | Topic | Status |
|---|---|---|
| 8.1 | `struct` — grouping related data | New |
| 8.2 | `typedef` — naming types | New |
| 8.3 | `enum` — naming constants | New |
| 8.4 | Pointers to structs and the `->` operator | New |
| 8.5 | A first data structure — singly linked list, end to end | New |
| 8.6 | *Brief:* `union` and bit fields (covered, but signposted as specialised) | New |

## Part IX. Files and the Outside World
| # | Topic | Status |
|---|---|---|
| 9.1 | Text files — `fopen`, `fclose`, `fprintf`, `fscanf`, `fgets` | New |
| 9.2 | Reading a file line by line — the right way | New |
| 9.3 | Writing a file safely | New |
| 9.4 | Standard streams — `stdin`, `stdout`, `stderr` and pipes | New |
| 9.5 | Command-line arguments — `argc` and `argv` | New |
| 9.6 | *Brief:* binary I/O with `fread` / `fwrite` (overview only) | New |

## Part X. Putting It All Together
| # | Topic | Status |
|---|---|---|
| 10.1 | Multi-file projects — splitting code into `.c` and `.h` | New |
| 10.2 | The preprocessor in practice — includes, macros, guards | New |
| 10.3 | A first Makefile (just the 10 lines you'll actually need) | New |
| 10.4 | Debugging with `gdb` — the five commands you'll use 95% of the time | New |
| 10.5 | Undefined behaviour — what it is, three classic examples, how to avoid it | New |
| 10.6 | **Capstone project:** build a small contacts CLI end-to-end | New |
| 10.7 | **Capstone project:** build a word-count utility (like `wc`) | New |

---

# Book 2 — The C++ Language

## Part 0. Before You Code (beginner orientation)
| # | Topic | Status |
|---|---|---|
| 0.1 | What is a program? What is a programming language? | New |
| 0.2 | What computers actually do — instructions, memory, the CPU | New |
| 0.3 | Why C++? Where it lives — games, browsers, finance, embedded | Partial |
| 0.4 | The C++ way of thinking — types, ownership, zero-cost abstractions | Delivered |
| 0.5 | Standards in one paragraph — C++11 as our floor, newer features tagged | Delivered |

## Part I. Setting Up and Your First Program
| # | Topic | Status |
|---|---|---|
| 1.1 | Installing a modern compiler (g++, clang++, MSVC) | Partial |
| 1.2 | Choosing an editor / IDE; turning on C++11 (or later) | New |
| 1.3 | Your first program — `hello.cpp` with `iostream` | Have |
| 1.4 | How a C++ program is built — compile, link, run | New |
| 1.5 | Reading C++ compiler errors (they're long; here's how) | New |

## Part II. The Building Blocks
| # | Topic | Status |
|---|---|---|
| 2.1 | Variables, types, and `auto` | Partial |
| 2.2 | Basic types — `int`, `double`, `bool`, `char`, sizes, ranges | Partial |
| 2.3 | `std::string` — your first proper string type | New |
| 2.4 | Input and output — `std::cin`, `std::cout`, `getline` | New |
| 2.5 | Operators and expressions | New |
| 2.6 | Type conversion and the four C++ casts (just one of them at first) | New |
| 2.7 | `const` and immutability | New |
| 2.8 | Namespaces and `using` | New |
| 2.9 | References and pointers — aliases, addresses, and which to reach for | New |

## Part III. Making Decisions and Repeating Work
| # | Topic | Status |
|---|---|---|
| 3.1 | `if`, `else`, and `if-init` **(C++17)** | New |
| 3.2 | `switch` | New |
| 3.3 | `while`, `do-while`, `for` | New |
| 3.4 | The range-`for` loop **(C++11)** | New |
| 3.5 | `break`, `continue` | New |

## Part IV. Functions
| # | Topic | Status |
|---|---|---|
| 4.1 | Defining and calling functions | Have |
| 4.2 | Pass by value vs pass by reference (and `const &`) | Have |
| 4.3 | Default arguments and function overloading | Have |
| 4.4 | Recursion | Have |
| 4.5 | Lambda expressions — your first one **(C++11)** | New |
| 4.6 | *Brief:* `std::function` and passing callables around | New |

## Part V. The STL Containers and Algorithms (early!)
We introduce `vector`, `string`, and a few algorithms *before* raw arrays and
pointers. This is deliberate: modern C++ beginners should reach for the safe
tools first.
| # | Topic | Status |
|---|---|---|
| 5.1 | `std::vector` — the resizable array you'll use 90% of the time | New |
| 5.2 | `std::array` — fixed-size, when you want it on the stack | New |
| 5.3 | `std::map` and `std::unordered_map` — key/value lookups | New |
| 5.4 | `std::set` and `std::unordered_set` — collections of unique things | New |
| 5.5 | Iterators — the idea, not the gnarly details | New |
| 5.6 | The algorithms you'll reach for: `sort`, `find`, `count`, `transform`, `accumulate` | New |
| 5.7 | `std::optional` **(C++17)** — when "no value" is a real answer | Not written — covered briefly in 10.6 |
| 5.8 | Tuples and structured bindings **(C++17)** | Not written — structured bindings appear in 3.1/10.6 |

## Part VI. Object-Oriented Programming
| # | Topic | Status |
|---|---|---|
| 6.1 | Classes and objects — the basic idea | Have |
| 6.2 | Members, methods, and `this` | Have |
| 6.3 | Access specifiers — `public`, `private`, `protected` | Have |
| 6.4 | Constructors — default, parameterized, copy | Have |
| 6.5 | Destructors and the lifecycle of an object | Have |
| 6.6 | `const` member functions | Have |
| 6.7 | `static` members | New |
| 6.8 | Friend functions (brief — used sparingly in practice) | Have |
| 6.9 | Member initializer lists | Have |
| 6.10 | Operator overloading — the common cases | Have |
| 6.11 | Composition vs inheritance — when to choose which | Have |

## Part VII. Inheritance and Polymorphism
| # | Topic | Status |
|---|---|---|
| 7.1 | Single inheritance | Delivered |
| 7.2 | `public`, `protected`, `private` inheritance | Delivered |
| 7.3 | Virtual functions and dynamic dispatch | Delivered |
| 7.4 | Pure virtual functions and abstract base classes | Delivered |
| 7.5 | Virtual destructors — the leak with no symptom | Delivered |
| 7.6 | `override` and `final` **(C++11)** — always use them | Delivered |
| 7.7 | *Brief:* multiple inheritance and the diamond problem | Delivered |
| 7.8 | `dynamic_cast` and RTTI | Delivered |
| 7.9 | Object slicing — what it is and how to avoid it | Delivered |

## Part VIII. Modern Resource Management (the soul of modern C++)
| # | Topic | Status |
|---|---|---|
| 8.1 | RAII — the central idea | New |
| 8.2 | Copy semantics — copy ctor and copy assignment | New |
| 8.3 | Move semantics — rvalue references, move ctor, move assignment **(C++11)** | New |
| 8.4 | Rule of 0 / 3 / 5 — when to write the special members yourself | New |
| 8.5 | `std::unique_ptr` — owning a thing | New |
| 8.6 | `std::shared_ptr` and `std::weak_ptr` — shared ownership | New |
| 8.7 | Why `new` and `delete` are rare in modern code | New |

## Part IX. Templates — Generic Code
| # | Topic | Status |
|---|---|---|
| 9.1 | Function templates | Have |
| 9.2 | Class templates | Have |
| 9.3 | `constexpr` for compile-time values **(C++11)** | New |
| 9.4 | *Brief:* template specialisation, non-type parameters | Have |
| 9.5 | *Brief:* concepts **(C++20)** — what they're for, one example | New |

## Part X. Errors and Exceptions
| # | Topic | Status |
|---|---|---|
| 10.1 | Why exceptions exist — the alternative is worse | Have |
| 10.2 | `throw`, `try`, `catch` | Have |
| 10.3 | Standard exception hierarchy (`std::exception`, `runtime_error`, …) | Have |
| 10.4 | Writing your own exception class | New |
| 10.5 | `noexcept` — when and why | New |
| 10.6 | *Brief:* error codes and `std::expected` **(C++23)** as alternatives | New |

## Part XI. I/O and Files
| # | Topic | Status |
|---|---|---|
| 11.1 | Stream basics — `cin`, `cout`, manipulators | New |
| 11.2 | File streams — `ifstream`, `ofstream` | Have |
| 11.3 | `stringstream` — turning strings into structured data | New |
| 11.4 | `std::filesystem` **(C++17)** — paths and directories the easy way | New |
| 11.5 | `std::format` **(C++20)** — the modern way to format text | Not written |

## Part XII. Putting It All Together
| # | Topic | Status |
|---|---|---|
| 12.1 | **Capstone project:** a small to-do list app with file persistence | Delivered |
| 12.2 | **Capstone project:** a tiny JSON-like parser | Delivered |
| 12.3 | **Capstone project:** an expression evaluator | Delivered |
| 12.5 | Turning on warnings and sanitizers — `-Wall -Wextra -fsanitize=address,undefined` | Delivered |
| 12.6 | Building with CMake — the nine lines that cover most projects | Delivered |
| 12.7 | A first unit test with doctest, wired into CMake and `ctest` | Delivered |
| 12.8 | A taste of the C++ Core Guidelines — five rules to live by | Delivered |
| 12.9 | Where to go next — what this book left out, and habits worth keeping | Delivered |

---

## Topics Intentionally Left Out (or Briefly Mentioned Only)

To stay at "practical working knowledge," these are *not* full chapters:

- **C:** `register`, deep `goto` patterns, manual `setjmp`/`longjmp`, K&R-style declarations, signal handlers in depth, full `<locale.h>`, threading (C11)
- **C++:** variadic templates, template metaprogramming, custom allocators, coroutines (C++20), modules (C++20) in depth, full concurrency / atomics / memory model, vtable internals, exception specifications history, full C++ Core Guidelines

These can be a future "Volume 2" once the main book is done.

---

## Cross-Book Appendices (each book ships with its own copy)

| # | Topic |
|---|---|
| A | ASCII table |
| B | Number systems and a primer on bitwise tricks |
| C | Reading a compiler error message — worked examples |
| D | Glossary of jargon |
| E | One-page cheatsheets — operators, format specifiers, STL containers (C++ only) |
| F | Where to go next — recommended books, websites, communities |

---

## Source-Material Map (what we already have)

- **C++_language_R001.pdf / C_&_C++_A4_R000.pdf** — strong source for Book 2
  Parts IV (functions), VI (OOP), VII (inheritance/polymorphism), IX (templates,
  basics), X (exceptions), XI.2 (file streams). Chapters tagged **Have** above.
- **C_trying_to_generate_book.pdf** — only useful for Book 1 Part II (variables,
  constants, keywords). The rest of that PDF is unrelated SQL content and
  should be discarded.
- **C_Complete_Notes.pdf** — image-based, 75 scanned pages, no extractable
  text. Visual reference only.
- **ref/Effective Modern C++** (Scott Meyers) — best secondary source for
  Book 2 Part VIII (RAII, move semantics, smart pointers) and Part IX (modern
  template features).
- **ref/0321714113Cplus2.pdf** — broad C++ reference, useful across Parts II–VII.
