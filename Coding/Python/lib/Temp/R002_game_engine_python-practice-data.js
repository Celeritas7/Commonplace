/* Python practice exercises for the §III practice loop.
 * Each runs deterministically: optional `stdin` lines are fed to input(),
 * stdout is compared (trimmed, per-line) against `expect`. Grouped by section;
 * solved/attempted ones hide behind the tab strip just like the SQL practice. */
window.PY_PRACTICE_EX = [
  {
    id: "p1", sec: "Warmups", diff: 1, title: "Hello, Commonplace",
    prompt: "Print exactly: <b>Hello, Commonplace!</b>",
    hint: "One print() call with the string in quotes.",
    sol: 'print("Hello, Commonplace!")',
    expect: "Hello, Commonplace!",
  },
  {
    id: "p2", sec: "Warmups", diff: 1, title: "Sum 1 to 100",
    prompt: "Print the <b>sum of the integers from 1 to 100</b> (inclusive).",
    hint: "range(1, 101) stops before 101. sum() takes an iterable.",
    sol: "print(sum(range(1, 101)))",
    expect: "5050",
  },
  {
    id: "p3", sec: "Warmups", diff: 2, title: "Even squares",
    prompt: "Print a list of the <b>squares of the even numbers</b> from 1 to 10 — i.e. <code>[4, 16, 36, 64, 100]</code>.",
    hint: "A list comprehension with an `if n % 2 == 0` filter.",
    sol: "print([n*n for n in range(1, 11) if n % 2 == 0])",
    expect: "[4, 16, 36, 64, 100]",
  },
  {
    id: "p4", sec: "Strings & Loops", diff: 1, title: "Reverse it",
    prompt: "The variable <code>word = \"commonplace\"</code> is given. Print it <b>reversed</b>.",
    hint: "Slice with a step of -1:  word[::-1]",
    sol: 'word = "commonplace"\nprint(word[::-1])',
    expect: "ecalpnommoc",
  },
  {
    id: "p5", sec: "Strings & Loops", diff: 2, title: "Vowel count",
    prompt: "Count the <b>vowels</b> (a, e, i, o, u) in <code>\"encyclopedia\"</code> and print the number.",
    hint: "Loop the characters; sum 1 for each that is in 'aeiou'.",
    sol: 'print(sum(1 for c in "encyclopedia" if c in "aeiou"))',
    expect: "5",
  },
  {
    id: "p6", sec: "Strings & Loops", diff: 2, title: "FizzBuzz to 15",
    prompt: "Print <b>FizzBuzz</b> for the numbers 1 to 15, one per line: multiples of 3 → <code>Fizz</code>, of 5 → <code>Buzz</code>, of both → <code>FizzBuzz</code>, otherwise the number.",
    hint: "Check n % 15 == 0 FIRST, then % 3, then % 5, else the number.",
    sol: 'for n in range(1, 16):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)',
    expect: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
  },
  {
    id: "p7", sec: "Section 4: Randomisation & Lists", diff: 1, title: "Band Name Generator",
    prompt: "Read two lines of input — the <b>city</b> you grew up in, then a <b>pet's name</b> — and print <code>Your band name is &lt;city&gt; &lt;pet&gt;</code>.",
    hint: "Two input() calls. print() with comma-separated values inserts the spaces for you.",
    stdin: ["London", "Biscuit"],
    sol: 'city = input()\npet = input()\nprint("Your band name is", city, pet)',
    expect: "Your band name is London Biscuit",
  },
  {
    id: "p8", sec: "Section 4: Randomisation & Lists", diff: 3, title: "Treasure Map",
    prompt: "Read a coordinate line like <code>2,3</code> (<i>col,row</i>, 1-indexed). On a 3×3 grid of <code>.</code> place an <code>X</code> at that cell and print the grid, cells space-separated.",
    hint: "Split on the comma, int() each part, subtract 1 for a 0-based index. Build rows = [['.']*3 ...], set grid[row][col]='X', then ' '.join each row.",
    stdin: ["2,3"],
    sol: 'pos = input().split(",")\ncol = int(pos[0]) - 1\nrow = int(pos[1]) - 1\ngrid = [["."] * 3 for _ in range(3)]\ngrid[row][col] = "X"\nfor line in grid:\n    print(" ".join(line))',
    expect: ". . .\n. . .\n. X .",
  },
];
