# -*- coding: utf-8 -*-
"""Part 0 — Before You Code. (0.1 is hand-authored and lives outside the builder.)"""
from build import src, code, ann, matcher, quiz, mistakes, exercises, recap, tryit_notebook

LESSONS = [

# ───────────────────────────────────────────────────────────── 0.2
dict(
 id="0.2", short="Installing Python",
 title="Installing Python — Anaconda, and why you already have it",
 sub="You installed this months ago and may not know what you got. Before adding anything new, let's find out what's already on the machine — because it is almost certainly enough.",
 mins="10", meta3="Uses your own machine",
 next=("Py_Lesson_0_3.html","0.3 Script, REPL, notebook"),
 cobra={
  "s1":"Don't install anything yet. Look first.",
  "s2":"One Python is a tool. Four Pythons is a bug hunt.",
  "s3":"Three commands. They tell you everything.",
  "s4":"Go on — open a terminal and actually run them.",
  "s5":"This is the question that breaks most beginners' setups.",
  "s6":"Every one of these has cost somebody a weekend.",
  "s7":"Write down what you find. You'll want it later.",
  "s8":"You're installed. Next: three ways to run code."
 },

 s1="""<p class="lead">The most common way to lose an afternoon in Python is to install it twice.</p>
  <p>You type <code>pip install pandas</code>, it reports success, you run your script, and Python says <code>ModuleNotFoundError: No module named 'pandas'</code>. Nothing is broken. You simply installed pandas into one Python and ran your script with a different one.</p>
  <p>So this lesson is mostly <em>not</em> about installing. It is about finding out what is already on your machine and learning to ask which Python is speaking. Do that once, properly, and the whole class of problem disappears.</p>
  """ + src("fresh","Your machine already has Anaconda — there is an <code>anaconda3</code> folder in your home directory, along with <code>.conda</code>, <code>.jupyter</code>, <code>.ipython</code> and <code>.matplotlib</code>. Those last four are settings folders that only appear once you have actually run the tools. You are not starting from zero."),

 s2="""<p>A Python installation is three things that travel together:</p>
  <div class="two-col">
    <div><h4>The interpreter</h4><p>One executable file — <code>python.exe</code> on Windows. This is the program that reads your source and acts on it.</p></div>
    <div><h4>The standard library</h4><p>A folder of modules that ship with it: <code>math</code>, <code>random</code>, <code>json</code>, <code>pathlib</code>. Always there, no install needed.</p></div>
  </div>
  <p>And the third: <strong>a site-packages folder</strong>, where everything you <code>pip install</code> lands. Each interpreter has its own. That is the whole source of the confusion — pandas installed for interpreter A is invisible to interpreter B.</p>
  <p><strong>Anaconda</strong> is a distribution: one interpreter, plus about 250 pre-installed packages including NumPy, pandas, Matplotlib and Jupyter, plus <code>conda</code>, a tool for making <em>more</em> interpreters when a project needs a different set. For what this book covers, the one Anaconda gives you is enough. You will not need to create an environment until you hit two projects that need conflicting versions.</p>
  """ + src("notes","Your document-processing toolkit already runs on Windows + Anaconda Python — so this is the same interpreter you have been using for the PDF and Word conversion work, not a new one to learn."),

 s3="""<p>Three commands answer everything. Open <strong>Anaconda Prompt</strong> from the Start menu (not plain Command Prompt — Anaconda Prompt has the paths already set up).</p>
  """ + code("Anaconda Prompt",
  '''<span class="c"># 1 — which Python is answering, and what version?</span>
<span class="f">python</span> --version

<span class="c"># 2 — where does that executable actually live?</span>
<span class="f">where</span> python

<span class="c"># 3 — what is already installed for it?</span>
<span class="f">conda</span> list'''
  ) + """
  """ + ann([
    ("1","Should print something like <code>Python 3.12.x</code>. Anything 3.10 or newer is fine for this book. If it prints 2.7, you are talking to a different, very old Python — see the mistakes below."),
    ("2","The important one. It lists <em>every</em> <code>python.exe</code> on your PATH, in the order Windows searches. The first line is the one that runs. If you see several, that is your future <code>ModuleNotFoundError</code> waiting to happen."),
    ("3","A long list. Scroll for <code>numpy</code>, <code>pandas</code>, <code>matplotlib</code>, <code>jupyter</code>. If they are there — and with Anaconda they will be — you need install nothing for Parts 0 through XI."),
  ]) + """
  <p>There is a fourth command worth knowing, because it is the one that settles arguments:</p>
  """ + code("Anaconda Prompt",
  '''<span class="f">python</span> -c <span class="s">"import sys; print(sys.executable)"</span>'''
  ) + """
  <p>That asks Python itself where it lives, rather than asking Windows. When <code>where python</code> and <code>sys.executable</code> disagree, believe <code>sys.executable</code> — it is the one actually running your code.</p>""",

 s4="""<p>This one is not a puzzle. Go and run it.</p>
  <p>Open Anaconda Prompt and run all four commands above. Then answer three questions, in a notes file you keep:</p>
  <p><strong>1.</strong> What version of Python answers? &nbsp;<strong>2.</strong> How many <code>python.exe</code> did <code>where python</code> list? &nbsp;<strong>3.</strong> Are numpy, pandas and matplotlib in <code>conda list</code>?</p>
  """ + src("fresh","If the answer to 2 is \"more than one\", do not panic and do not uninstall anything. Multiple Pythons are normal — Windows itself ships one, and so does the Microsoft Store. The rule is simply: always launch from Anaconda Prompt, and you will always get the Anaconda one."),

 s5=quiz(
  "You run <code>pip install requests</code> in an ordinary Command Prompt. It says <em>Successfully installed requests</em>. Then you open Anaconda Prompt, start Python, and type <code>import requests</code>. What is the most likely result?",
  None,
  [("a","It works — pip is pip, there is only one package store."),
   ("b","<code>ModuleNotFoundError</code> — the two prompts are using different Pythons."),
   ("c","It works, but with a version warning.")],
  "b",
  "<strong>ModuleNotFoundError.</strong> The plain Command Prompt found some other <code>pip</code> on the PATH — the Windows Store Python, most likely — and installed <code>requests</code> into <em>that</em> interpreter's site-packages. Anaconda's Python cannot see it.<p style=\"margin:10px 0 0\">This is the single most common Python setup problem, and it has nothing to do with Python being badly designed. It is just PATH. The cure is a habit, not a fix: <strong>install and run from the same prompt, every time.</strong> For you, that means Anaconda Prompt.</p>"),

 s6=mistakes([
  ("🔀","Installing a second Python from python.org","You already have Anaconda. Adding the python.org installer gives you two interpreters competing for the same PATH, and every <code>pip install</code> becomes a coin flip. If you want a specific version later, use <code>conda create</code> — it keeps them separate on purpose."),
  ("📛","<code>'python' is not recognized as an internal or external command</code>","You are in plain Command Prompt, not Anaconda Prompt. Anaconda deliberately does not put itself on the global PATH by default, because doing so breaks other software. Use the Anaconda Prompt shortcut and the message goes away."),
  ("🧊","Treating <code>conda</code> and <code>pip</code> as interchangeable","Both install packages, into the same folder, without telling each other. Rule of thumb: prefer <code>conda install &lt;name&gt;</code>; fall back to <code>pip install &lt;name&gt;</code> only when conda does not have the package. Mixing them freely is how an environment gets quietly wrecked."),
 ]),

 s7=exercises([
  ("Easy","Run the four commands and record the answers in a file called <code>my-python.txt</code>. Keep it — in six months you will want to know what this machine had."),
  ("Medium","Run <code>conda list | find \"pandas\"</code> (Windows) and note the version number. Then look up what the current pandas version is. How far behind are you, and does it matter for anything in Part XI?"),
  ("Stretch","Open plain Command Prompt and run <code>where python</code> there too. Compare the output with what Anaconda Prompt gave you. Explain, in one sentence, what PATH is actually doing differently in the two windows."),
 ]),

 s8=recap("What to carry forward",[
  "You already have <b>Anaconda</b> — an interpreter plus ~250 packages. Nothing to install for most of this book.",
  "A package is installed <b>for one interpreter</b>, not for the machine. That is the whole reason <code>ModuleNotFoundError</code> happens.",
  "<code>where python</code> shows what Windows will run; <code>sys.executable</code> shows what <em>is</em> running. Trust the second.",
  "<b>Launch from Anaconda Prompt</b>, always. One habit removes an entire category of problem.",
  "Prefer <code>conda install</code>; use <code>pip</code> only when conda hasn't got it.",
 ]),
),

# ───────────────────────────────────────────────────────────── 0.3
dict(
 id="0.3", short="Script, REPL, notebook",
 title="Three ways to run code: script, REPL, notebook",
 sub="The same five lines of Python behave differently depending on where you type them. Knowing which of the three you want — and why — saves more time than any other habit in this Part.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_0_4.html","0.4 Reading a traceback"),
 cobra={
  "s1":"Same code, three homes. They are not interchangeable.",
  "s2":"State is the whole difference. Watch what survives.",
  "s3":"Read the middle column — that is where notebooks bite.",
  "s4":"You have twenty of these already. Go open one.",
  "s5":"Out-of-order execution. The classic notebook trap.",
  "s6":"I have seen all three of these ruin a good afternoon.",
  "s7":"Pick the right tool on purpose, not by habit.",
  "s8":"Part 0 nearly done. One more — then we write real code."
 },

 s1="""<p class="lead">In C there is one way to run code: compile it, then run the executable.</p>
  <p>Python has three, and they are genuinely different tools rather than three doors to the same room. Choose wrong and you will fight the environment instead of the problem — trying to explore data in a script that forgets everything each run, or trying to ship a scheduled job as a notebook nobody can execute unattended.</p>
  <p>You already use all three without necessarily having named them. This lesson names them.</p>""",

 s2="""<p>The difference is <strong>what survives between lines</strong>.</p>
  <table class="cmp">
    <tr><th>Way</th><th>What it is</th><th>What survives</th></tr>
    <tr><td>script</td><td>A <code>.py</code> file you run start-to-finish</td><td>Nothing. Every run starts empty and ends empty.</td></tr>
    <tr><td>REPL</td><td>An interactive prompt — type a line, see the answer</td><td>Everything, until you close the window.</td></tr>
    <tr><td>notebook</td><td>Cells you run individually, in any order</td><td>Everything, plus the outputs are saved into the file.</td></tr>
  </table>
  <p>REPL stands for <em>read, evaluate, print, loop</em> — it reads what you type, works it out, prints the answer, and waits for more. That printing is the part people miss: in a REPL, typing <code>2 + 2</code> shows <code>4</code>. In a script, <code>2 + 2</code> computes four and throws it away. You need <code>print(2 + 2)</code>.</p>
  """ + src("fresh","A notebook is a REPL whose history is a document you can edit and re-run. That single sentence explains both why notebooks are wonderful for exploring and why they are dangerous for anything that must be reproducible."),

 s3="""<p>The same job, in all three, so the difference is concrete.</p>
  """ + code("script — count.py",
  '''<span class="n">total</span> = <span class="n">0</span>
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">1</span>, <span class="n">11</span>):
    <span class="n">total</span> += <span class="n">n</span>
<span class="f">print</span>(<span class="n">total</span>)

<span class="c"># run it:  python count.py     →  55</span>
<span class="c"># run it again: it recomputes from scratch. total is gone.</span>'''
  ) + """
  """ + code("REPL — Anaconda Prompt, type: python",
  '''<span class="c">&gt;&gt;&gt;</span> <span class="n">total</span> = <span class="n">0</span>
<span class="c">&gt;&gt;&gt;</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">1</span>, <span class="n">11</span>):
<span class="c">...</span>     <span class="n">total</span> += <span class="n">n</span>
<span class="c">...</span>
<span class="c">&gt;&gt;&gt;</span> <span class="n">total</span>
<span class="n">55</span>
<span class="c">&gt;&gt;&gt;</span> <span class="n">total</span> * <span class="n">2</span>       <span class="c"># total is still here</span>
<span class="n">110</span>'''
  ) + """
  """ + ann([
    ("script","One shot. Good for anything you will run more than once the same way, hand to someone else, or schedule."),
    ("REPL","<code>&gt;&gt;&gt;</code> is the prompt; <code>...</code> means it is waiting for the rest of an indented block — press Enter on an empty line to finish it. Note <code>total</code> printed <code>55</code> without <code>print()</code>. That is the P in REPL."),
    ("exit","<code>exit()</code> or Ctrl-Z then Enter on Windows. Everything you defined vanishes."),
  ]) + """
  <p>The notebook version is the same code in a cell, with one difference that matters enormously: you can run the loop cell twice. Do that and <code>total</code> becomes 110, because the second run adds to the value the first run left behind. The code did not change. The <em>state</em> did.</p>""",

 s4=tryit_notebook("../fundamentals/02_for_loops.html","Open the For Loops notebook",
   "You already have twenty-odd runnable notebook pages in this book — every cell is editable and executes real Python in your browser, no install. Open the For Loops one and try the experiment: run a cell twice and watch a counter drift."),

 s5=quiz(
  "In a notebook you run three cells top to bottom. Then you go back, edit cell 1, and re-run <em>only</em> cell 3. What does cell 3 see?",
  code("notebook",
  '''<span class="c">[1]</span>  <span class="n">price</span> = <span class="n">100</span>          <span class="c"># edited to 250, not re-run</span>
<span class="c">[2]</span>  <span class="n">tax</span> = <span class="n">price</span> * <span class="n">0.1</span>
<span class="c">[3]</span>  <span class="f">print</span>(<span class="n">price</span> + <span class="n">tax</span>)    <span class="c"># re-run now</span>'''),
  [("a","275 — it picks up the edited value of 250."),
   ("b","110 — nothing changed, because cell 1 was never re-run."),
   ("c","An error, because the cells are out of sync.")],
  "b",
  "<strong>110.</strong> Editing a cell changes the <em>text</em>. It changes nothing in memory until you run it. <code>price</code> is still 100 and <code>tax</code> is still 10.<p style=\"margin:10px 0 0\">This is the notebook's defining hazard. The document you are reading and the state you are computing with can silently disagree. Anyone reading the saved notebook later sees <code>price = 250</code> and an output of 110, and cannot explain it.</p><p style=\"margin:10px 0 0\">The cure is a reflex: before you trust a notebook's result, <strong>Kernel → Restart &amp; Run All</strong>. If it does not survive that, it was never really working.</p>"),

 s6=mistakes([
  ("🔢","Trusting execution numbers to be in order","The <code>[1] [2] [3]</code> counters show the order cells were <em>run</em>, not the order they appear. A notebook showing <code>[7] [3] [12]</code> down the page has been run all over the place. Read those numbers — they are the truth about what happened."),
  ("🖨️","Forgetting <code>print()</code> when you move code from a notebook into a script","A notebook shows the value of the last expression in a cell automatically. A script shows nothing unless you ask. Code that printed beautifully in a cell goes silent as a <code>.py</code> file, and it looks like the code broke."),
  ("📦","Shipping a notebook as if it were a program","Notebooks are for exploring and explaining. When something needs to run unattended, on a schedule, or on someone else's machine, move it into a <code>.py</code> file. Part XII.5 covers scheduling; notebooks do not schedule well."),
 ]),

 s7=exercises([
  ("Easy","Open Anaconda Prompt, type <code>python</code>, and compute how many seconds are in a year. Do it in the REPL without writing a file. Then <code>exit()</code>."),
  ("Medium","Write the same calculation as <code>seconds.py</code> and run it with <code>python seconds.py</code>. Note what you had to add to see the answer, and why."),
  ("Stretch","Take one of your existing practice notebooks and run <b>Restart &amp; Run All</b>. Does every cell still work? If any cell fails, you have found a hidden dependency on out-of-order execution — write down which cell and what it depended on."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Script</b> — runs start to finish, remembers nothing. For things you run more than once, or hand over.",
  "<b>REPL</b> — remembers everything until you close it, and prints values without <code>print()</code>. For quick questions.",
  "<b>Notebook</b> — a REPL whose history is an editable document. For exploring and explaining.",
  "The notebook hazard is <b>state disagreeing with text</b>. <b>Restart &amp; Run All</b> before you trust a result.",
  "Moving notebook code into a script? Add the <code>print()</code> calls you were getting for free.",
 ]),
),

# ───────────────────────────────────────────────────────────── 0.4
dict(
 id="0.4", short="Reading a traceback",
 title="Reading a traceback without panic",
 sub="Python's error messages are not noise. They are a precise report, written bottom-up, that usually names the file, the line, and the mistake. Learning to read one is the highest-return ten minutes in this Part.",
 mins="13", meta3="No setup needed",
 next=("Py_Lesson_1_1.html","1.1 Variables and names"),
 cobra={
  "s1":"A traceback is help, not a telling-off.",
  "s2":"Read it upside down. Last line first.",
  "s3":"Follow the arrow. It points at the line that failed.",
  "s4":"Match the message to the mistake.",
  "s5":"The line number lies here — and there is a reason.",
  "s6":"The three that catch everyone coming from C.",
  "s7":"Break something on purpose. Read what it says.",
  "s8":"That is Part 0. Now we write Python."
 },

 s1="""<p class="lead">The first instinct on seeing a wall of red text is to scroll past it and re-read your code. That is exactly backwards.</p>
  <p>Python has just told you, in about six lines, what went wrong, where, and how it got there. Nothing you find by staring at the code will be more precise than that. The only skill required is knowing which line to read first — and it is not the top one.</p>
  <p>C gives you compiler errors before the program runs. Python gives you tracebacks while it runs. Same information, different moment, and a different reading order.</p>""",

 s2="""<p>A traceback is printed <strong>oldest call first, newest call last</strong>. Your program's failure is at the bottom. The lines above it are the path that got there.</p>
  <div class="model">
    <svg viewBox="0 0 620 210" role="img" aria-label="A traceback reads bottom-up: the last line names the error, the line above shows where it happened">
      <rect x="10" y="14" width="600" height="34" rx="7" fill="#f4f5ec" stroke="#d2dacb"/>
      <text x="24" y="36" font-family="JetBrains Mono, monospace" font-size="12" fill="#7a8c80">Traceback (most recent call last):</text>
      <text x="560" y="36" font-family="EB Garamond, serif" font-size="13" fill="#a98a4b">read 3rd</text>

      <rect x="10" y="56" width="600" height="52" rx="7" fill="#fbfcf6" stroke="#d2dacb"/>
      <text x="24" y="76" font-family="JetBrains Mono, monospace" font-size="12" fill="#41564a">  File "area.py", line 12, in &lt;module&gt;</text>
      <text x="24" y="96" font-family="JetBrains Mono, monospace" font-size="12" fill="#41564a">    print(width * heigth)</text>
      <text x="560" y="86" font-family="EB Garamond, serif" font-size="13" fill="#a98a4b">read 2nd</text>

      <rect x="10" y="116" width="600" height="36" rx="7" fill="#f7e6e1" stroke="#e3c4ba"/>
      <text x="24" y="139" font-family="JetBrains Mono, monospace" font-size="12.5" fill="#a5432f">NameError: name 'heigth' is not defined</text>
      <text x="560" y="139" font-family="EB Garamond, serif" font-size="13" fill="#a5432f">read 1st</text>

      <path d="M584 132 L584 92" stroke="#a98a4b" stroke-width="1.5" marker-end="url(#up)"/>
      <path d="M584 78 L584 44" stroke="#a98a4b" stroke-width="1.5" marker-end="url(#up)"/>
      <text x="310" y="180" font-family="EB Garamond, serif" font-size="14" fill="#41564a" text-anchor="middle">What broke → where it broke → how it got there</text>
      <defs><marker id="up" markerWidth="8" markerHeight="8" refX="4" refY="1" orient="auto">
        <path d="M4 0 L8 8 L0 8 z" fill="#a98a4b"/></marker></defs>
    </svg>
  </div>
  <p>The last line has two halves, separated by a colon. Before it: <strong>the error type</strong> — a fixed name from a short list you will soon know by heart. After it: <strong>the detail</strong> — usually the exact name or value that caused the trouble.</p>
  """ + src("fresh","<code>NameError: name 'heigth' is not defined</code> is not Python being obtuse. It has told you the category (a name it could not find), and the name itself (<code>heigth</code> — misspelled). Between those two facts the bug is already solved."),

 s3="""<p>A deeper one, with a function call in the middle, so you can see the path.</p>
  """ + code("Anaconda Prompt",
  '''Traceback (most recent call last):
  File <span class="s">"report.py"</span>, line <span class="n">18</span>, in <span class="f">&lt;module&gt;</span>
    <span class="n">summary</span> = <span class="f">average</span>(<span class="n">readings</span>)
  File <span class="s">"report.py"</span>, line <span class="n">9</span>, in <span class="f">average</span>
    <span class="k">return</span> <span class="f">sum</span>(<span class="n">values</span>) / <span class="f">len</span>(<span class="n">values</span>)
<span class="c">ZeroDivisionError: division by zero</span>'''
  ) + """
  """ + ann([
    ("last line","<strong>What.</strong> <code>ZeroDivisionError</code>. Something was divided by zero."),
    ("above it","<strong>Where.</strong> Line 9 of <code>report.py</code>, inside a function called <code>average</code>, and it shows you the exact expression. <code>len(values)</code> must have been 0."),
    ("above that","<strong>How.</strong> Line 18 called <code>average(readings)</code>. So <code>readings</code> was empty when it got there — and <em>that</em> is the real bug. Line 9 is where it surfaced; line 18 is where it started."),
    ("<code>&lt;module&gt;</code>","Means &ldquo;not inside any function&rdquo; — top level of the file. You will see it as the outermost frame in almost every traceback."),
  ]) + """
  <p>Notice the shape of the fix. You could guard line 9 with <code>if not values: return 0</code>. But the honest question is why <code>readings</code> was empty at line 18 — a file that did not load, a filter that matched nothing. The traceback pointed at both, in order.</p>""",

 s4=matcher([
  ("You typed <code>widht</code> instead of <code>width</code>.",
   [("a","NameError: name 'widht' is not defined"),
    ("b","SyntaxError: invalid syntax"),
    ("c","TypeError: 'str' object is not callable")],"a"),
  ("You wrote <code>\"3\" + 4</code> — a string plus a number.",
   [("a","ValueError: invalid literal for int()"),
    ("b","TypeError: can only concatenate str (not \"int\") to str"),
    ("c","NameError: name 'int' is not defined")],"b"),
  ("You forgot the colon: <code>if x &gt; 5</code>",
   [("a","IndentationError: expected an indented block"),
    ("b","AttributeError: 'int' object has no attribute '&gt;'"),
    ("c","SyntaxError: expected ':'")],"c"),
 ]),

 s5=quiz(
  "You forget a closing bracket on line 4. Python reports the error on <strong>line 5</strong>. Why?",
  code("totals.py",
  '''<span class="n">4</span>   <span class="n">total</span> = <span class="f">sum</span>(<span class="n">a</span>, <span class="n">b</span>
<span class="n">5</span>   <span class="f">print</span>(<span class="n">total</span>)'''),
  [("a","Python counts lines from zero, so it is off by one."),
   ("b","Line 4 is still open — Python keeps reading, and only knows something is wrong at line 5."),
   ("c","A bug in the interpreter; the line number is unreliable.")],
  "b",
  "<strong>The bracket is still open.</strong> An unclosed <code>(</code> means the expression continues onto the next line — which is legal Python, and how you split long lines deliberately. Python reads on, finds <code>print(total)</code> where it expected more arguments, and only <em>there</em> can it say something is wrong.<p style=\"margin:10px 0 0\">So the rule for <code>SyntaxError</code> specifically: <strong>the real mistake is at, or just before, the reported line</strong>. Check the line above first. For every other error type, the reported line is exact.</p>"),

 s6=mistakes([
  ("👆","Reading the traceback from the top","The top is the outermost caller — often library code you did not write and cannot fix. Start at the bottom, then walk up only as far as your own files."),
  ("🙈","Not reading the detail after the colon","<code>KeyError: 'custmer_id'</code> has handed you the misspelling. <code>FileNotFoundError: [Errno 2] ... 'data/logs.txt'</code> has handed you the exact path it tried. People re-read their code for ten minutes to discover what the message said in full."),
  ("⏱️","Expecting the error where you wrote the bug","Python fails at the moment of <em>use</em>, not the moment of writing. A wrong value assigned on line 3 can surface on line 90. The traceback's middle frames are what connect the two — that is what they are for."),
 ]),

 s7=exercises([
  ("Easy","In a notebook cell or the REPL, deliberately cause each of these: a <code>NameError</code>, a <code>TypeError</code>, and a <code>ZeroDivisionError</code>. Read each message aloud. Three minutes, and the names stop looking like noise."),
  ("Medium","Write a two-function file where <code>main()</code> calls <code>helper()</code> and <code>helper()</code> divides by zero. Run it. Confirm the traceback has three frames and identify which one you would actually fix."),
  ("Stretch","Find a real error from your own past work — the beginner practice notebooks are full of them, marked <em>failed</em>. Pick one, read its traceback properly, and write one sentence naming what the message was telling you that you missed at the time."),
 ]),

 s8=recap("What to carry forward",[
  "Read a traceback <b>bottom-up</b>: what broke, then where, then how it got there.",
  "The last line is <b>type: detail</b>. The detail usually names the exact culprit — read it in full.",
  "Middle frames are the <b>call path</b>. The deepest frame is where it surfaced; an earlier one is often where it started.",
  "<code>&lt;module&gt;</code> means top level of the file, outside any function.",
  "For <b>SyntaxError</b> only, check the line <em>above</em> the one reported — an unclosed bracket runs on.",
  "Python fails at the moment of <b>use</b>, not the moment you wrote the mistake.",
 ]),
),
]
