/* practice-sets.js — exercise banks for the Fundamentals, Data Libraries and
 * 100 Days practice panels. Same shape as PY_PRACTICE_EX: stdout is compared
 * (trimmed, per-line) against `expect`; optional `stdin` lines feed input(). */

/* ============ §I — Fundamentals ============ */
window.FUND_PRACTICE_EX = [
  {
    id: "f1", sec: "Loops", diff: 1, title: "Count to Five",
    prompt: "Use a <b>for loop</b> to print the numbers <code>1</code> through <code>5</code>, one per line.",
    hint: "range(1, 6) gives 1,2,3,4,5. print() each i inside the loop.",
    sol: "for i in range(1, 6):\n    print(i)",
    expect: "1\n2\n3\n4\n5",
  },
  {
    id: "f2", sec: "While Loops", diff: 1, title: "Countdown",
    prompt: "Using a <b>while loop</b>, count down from <code>5</code> to <code>1</code>, one number per line.",
    hint: "Start n = 5, print, then n -= 1 while n > 0.",
    sol: "n = 5\nwhile n > 0:\n    print(n)\n    n -= 1",
    expect: "5\n4\n3\n2\n1",
  },
  {
    id: "f3", sec: "If / Else", diff: 1, title: "Odd or Even",
    prompt: "The variable <code>n = 17</code> is given. Print <code>odd</code> if it is odd, otherwise <code>even</code>.",
    hint: "n % 2 == 0 is True for even numbers.",
    sol: 'n = 17\nif n % 2 == 0:\n    print("even")\nelse:\n    print("odd")',
    expect: "odd",
  },
  {
    id: "f4", sec: "Lists", diff: 1, title: "Largest in List",
    prompt: "Given <code>nums = [3, 7, 2, 9, 4]</code>, print the <b>largest</b> value.",
    hint: "max() takes an iterable and returns its biggest element.",
    sol: "nums = [3, 7, 2, 9, 4]\nprint(max(nums))",
    expect: "9",
  },
  {
    id: "f5", sec: "Dictionaries", diff: 2, title: "Look It Up",
    prompt: "Given <code>scores = {\"Alice\": 90, \"Bob\": 85}</code>, print <b>Bob's</b> score.",
    hint: "Index a dict by its key: scores[\"Bob\"].",
    sol: 'scores = {"Alice": 90, "Bob": 85}\nprint(scores["Bob"])',
    expect: "85",
  },
  {
    id: "f6", sec: "Strings", diff: 1, title: "Shout It",
    prompt: "The variable <code>word = \"commonplace\"</code> is given. Print it in <b>uppercase</b>.",
    hint: "Strings have an .upper() method.",
    sol: 'word = "commonplace"\nprint(word.upper())',
    expect: "COMMONPLACE",
  },
  {
    id: "f7", sec: "Exceptions", diff: 2, title: "Safe Divide",
    prompt: "Dividing <code>10 / 0</code> crashes. Wrap it in <b>try / except</b> so that instead of crashing it prints <code>cannot divide by zero</code>.",
    hint: "Catch ZeroDivisionError in the except block.",
    sol: 'try:\n    print(10 / 0)\nexcept ZeroDivisionError:\n    print("cannot divide by zero")',
    expect: "cannot divide by zero",
  },
  {
    id: "f8", sec: "Functions", diff: 2, title: "Define add()",
    prompt: "Define a function <code>add(a, b)</code> that <b>returns</b> their sum, then print <code>add(2, 3)</code>.",
    hint: "Use def add(a, b): then return a + b. Remember to print the call.",
    sol: "def add(a, b):\n    return a + b\nprint(add(2, 3))",
    expect: "5",
  },
];

/* ============ §II — Data Libraries (numpy / pandas auto-load on first run) ============ */
window.LIB_PRACTICE_EX = [
  {
    id: "n1", sec: "NumPy", diff: 1, title: "Array Sum",
    prompt: "With <code>import numpy as np</code>, build the array <code>[1, 2, 3, 4, 5]</code> and print its <b>sum</b>.",
    hint: "np.arange(1, 6) builds [1..5]. Arrays have a .sum() method.",
    sol: "import numpy as np\nprint(np.arange(1, 6).sum())",
    expect: "15",
  },
  {
    id: "n2", sec: "NumPy", diff: 2, title: "Array Mean",
    prompt: "Print the <b>mean</b> of <code>np.array([2, 4, 6, 8])</code>.",
    hint: ".mean() returns a float — expect 5.0, not 5.",
    sol: "import numpy as np\nprint(np.array([2, 4, 6, 8]).mean())",
    expect: "5.0",
  },
  {
    id: "n3", sec: "NumPy", diff: 2, title: "Reshape",
    prompt: "Take <code>np.arange(6)</code> and <b>reshape</b> it into 2 rows × 3 columns, then print it.",
    hint: ".reshape(2, 3). Print the array directly — note NumPy's grid layout.",
    sol: "import numpy as np\nprint(np.arange(6).reshape(2, 3))",
    expect: "[[0 1 2]\n [3 4 5]]",
  },
  {
    id: "n4", sec: "NumPy", diff: 1, title: "Scale It",
    prompt: "Multiply the array <code>[1, 2, 3]</code> by <code>10</code> element-wise and print the result.",
    hint: "NumPy broadcasts: np.array([1,2,3]) * 10.",
    sol: "import numpy as np\nprint(np.array([1, 2, 3]) * 10)",
    expect: "[10 20 30]",
  },
  {
    id: "p1", sec: "Pandas", diff: 2, title: "Series Sum",
    prompt: "With <code>import pandas as pd</code>, build a <b>Series</b> from <code>[10, 20, 30]</code> and print its sum.",
    hint: "pd.Series([...]).sum().",
    sol: "import pandas as pd\ns = pd.Series([10, 20, 30])\nprint(s.sum())",
    expect: "60",
  },
  {
    id: "p2", sec: "Pandas", diff: 2, title: "Column Mean",
    prompt: "Build a DataFrame with one column <code>price</code> = <code>[100, 200, 300]</code> and print the <b>mean</b> of that column.",
    hint: 'pd.DataFrame({"price": [...]}), then df["price"].mean().',
    sol: 'import pandas as pd\ndf = pd.DataFrame({"price": [100, 200, 300]})\nprint(df["price"].mean())',
    expect: "200.0",
  },
  {
    id: "p3", sec: "Pandas", diff: 3, title: "Count the Matches",
    prompt: "Given a DataFrame column <code>age</code> = <code>[22, 35, 41, 19]</code>, print <b>how many</b> ages are greater than 30.",
    hint: "A boolean mask (df['age'] > 30) sums to the count of True values.",
    sol: 'import pandas as pd\ndf = pd.DataFrame({"age": [22, 35, 41, 19]})\nprint((df["age"] > 30).sum())',
    expect: "2",
  },
];

/* ============ §III — 100 Days (Angela Yu) ============ */
window.DAYS_PRACTICE_EX = [
  {
    id: "d1", sec: "Day 1: Strings", diff: 1, title: "Band Name Generator",
    prompt: "Read two lines — the <b>city</b> you grew up in, then a <b>pet's name</b> — and print <code>Your band name is &lt;city&gt; &lt;pet&gt;</code>.",
    hint: "Two input() calls. print() with comma-separated values adds the spaces.",
    stdin: ["London", "Biscuit"],
    sol: 'city = input()\npet = input()\nprint("Your band name is", city, pet)',
    expect: "Your band name is London Biscuit",
  },
  {
    id: "d2", sec: "Day 2: Numbers", diff: 2, title: "Tip Calculator",
    prompt: "Read the <b>bill</b> (e.g. <code>150</code>) then the <b>number of people</b> (e.g. <code>3</code>). Add a 10% tip, split evenly, and print <code>Each person pays: &lt;amount&gt;</code> rounded to 2 decimals.",
    hint: "total = bill * 1.1, each = total / people, round(each, 2).",
    stdin: ["150", "3"],
    sol: 'bill = float(input())\npeople = int(input())\ntotal = bill * 1.1\neach = total / people\nprint("Each person pays:", round(each, 2))',
    expect: "Each person pays: 55.0",
  },
  {
    id: "d3", sec: "Day 3: If/Else", diff: 1, title: "Treasure Island",
    prompt: "Read a direction. If it is <code>left</code>, print <code>You found the treasure!</code> — otherwise print <code>Game over</code>.",
    hint: 'Compare the input to "left" with ==.',
    stdin: ["left"],
    sol: 'move = input()\nif move == "left":\n    print("You found the treasure!")\nelse:\n    print("Game over")',
    expect: "You found the treasure!",
  },
  {
    id: "d4", sec: "Day 5: Loops", diff: 2, title: "Average Height",
    prompt: "Read one line of <b>space-separated heights</b> (e.g. <code>156 178 165</code>). Print their average, <b>rounded to a whole number</b>.",
    hint: "input().split() → list of strings; int() each, sum()/len(), then round().",
    stdin: ["156 178 165"],
    sol: "heights = [int(h) for h in input().split()]\nprint(round(sum(heights) / len(heights)))",
    expect: "166",
  },
  {
    id: "d5", sec: "Day 6: Functions", diff: 2, title: "FizzBuzz to 15",
    prompt: "Print <b>FizzBuzz</b> for 1 to 15, one per line: multiples of 3 → <code>Fizz</code>, of 5 → <code>Buzz</code>, of both → <code>FizzBuzz</code>, else the number.",
    hint: "Check n % 15 == 0 FIRST, then % 3, then % 5, else the number.",
    sol: 'for n in range(1, 16):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)',
    expect: "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
  },
  {
    id: "d6", sec: "Day 9: Dictionaries", diff: 2, title: "Life in Weeks",
    prompt: "Read an <b>age</b> (e.g. <code>25</code>). Assuming a 90-year life, print how many <b>weeks</b> are left: <code>(90 - age) * 52</code>.",
    hint: "One input(), convert with int(), then the arithmetic.",
    stdin: ["25"],
    sol: "age = int(input())\nprint((90 - age) * 52)",
    expect: "3380",
  },
];
