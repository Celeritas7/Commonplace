# -*- coding: utf-8 -*-
"""Part II — Decisions and Loops."""
from build import src, code, ann, matcher, quiz, mistakes, exercises, recap, tryit_notebook

NB_IF, NB_FOR, NB_WHILE = ("../fundamentals/04_if_else.html",
                           "../fundamentals/02_for_loops.html",
                           "../fundamentals/03_while_loops.html")

LESSONS = [

# ───────────────────────────────────────────────────────────── 2.1
dict(
 id="2.1", short="if / elif / else",
 title="if / elif / else, and nesting",
 sub="No braces, no parentheses — the indentation is the block. That one decision shapes how Python code looks, and it turns a familiar C bug into an impossible one.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_2_2.html","2.2 Truthiness and the ternary"),
 cobra={
  "s1":"Whitespace is syntax. Really.",
  "s2":"elif is one word. Not else if.",
  "s3":"Read the indentation as the structure.",
  "s4":"Run it and mis-indent it deliberately.",
  "s5":"Order of branches changes the answer.",
  "s6":"Tabs and spaces. Pick one, forever.",
  "s7":"Flatten a nested mess.",
  "s8":"Next: what counts as true."
 },

 s1="""<p class="lead">In C the braces say what is inside the <code>if</code>, and the indentation is a courtesy to the reader.</p>
  <p>Python removes the braces and promotes the courtesy to law. Whatever is indented under the <code>if</code> is the block; when the indentation goes back out, the block has ended.</p>
  <p>The trade is real. You lose the freedom to format however you like. You gain the guarantee that the code's appearance and its behaviour cannot disagree — which kills the C bug where a stray semicolon or a missing brace makes an indented line run unconditionally. In Python there is nothing to get out of sync.</p>""",

 s2="""<p>Three keywords, and a colon at the end of each condition line.</p>
  """ + code("shape.py",
  '''<span class="k">if</span> <span class="n">temp</span> &gt; <span class="n">40</span>:
    <span class="f">print</span>(<span class="s">"too hot"</span>)
<span class="k">elif</span> <span class="n">temp</span> &lt; <span class="n">5</span>:
    <span class="f">print</span>(<span class="s">"too cold"</span>)
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">"fine"</span>)'''
  ) + """
  <p>Four things to notice, all of which differ from C:</p>
  <p><strong>No parentheses</strong> around the condition. <code>if (temp &gt; 40):</code> works but marks you as visiting from another language.</p>
  <p><strong>A colon</strong> ends every line that opens a block. Forgetting it gives <code>SyntaxError: expected ':'</code> — a clear message, and the most common beginner error.</p>
  <p><strong><code>elif</code>, one word.</strong> Not <code>else if</code>. Python needs it because <code>else</code> followed by a nested <code>if</code> would indent one level deeper each time, and a five-way choice would march off the right of the screen.</p>
  <p><strong>Exactly one branch runs.</strong> Python tests each condition in order and takes the first that is true. The rest are skipped, even if they are also true — which is why order matters, as section 5 shows.</p>
  """ + src("nb","Your <code>04_If_Else.ipynb</code> covers this in ten runnable sections, including the login-check example at the end. The notebook is where to go and get the indentation wrong on purpose; this lesson is the why."),

 s3="""<p>Nesting, and the standard four spaces.</p>
  """ + code("grade.py",
  '''<span class="n">score</span> = <span class="f">int</span>(<span class="f">input</span>(<span class="s">"Score: "</span>))

<span class="k">if</span> <span class="n">score</span> &gt;= <span class="n">0</span> <span class="k">and</span> <span class="n">score</span> &lt;= <span class="n">100</span>:
    <span class="k">if</span> <span class="n">score</span> &gt;= <span class="n">90</span>:
        <span class="n">grade</span> = <span class="s">"A"</span>
    <span class="k">elif</span> <span class="n">score</span> &gt;= <span class="n">75</span>:
        <span class="n">grade</span> = <span class="s">"B"</span>
    <span class="k">else</span>:
        <span class="n">grade</span> = <span class="s">"C"</span>
    <span class="f">print</span>(<span class="s">f"grade </span><span class="n">{grade}</span><span class="s">"</span>)
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">"score out of range"</span>)

<span class="f">print</span>(<span class="s">"done"</span>)   <span class="c"># no indent — always runs</span>'''
  ) + """
  """ + ann([
    ("4 spaces","The convention, from PEP 8. Any consistent amount works, but every editor and every other Python programmer expects four. Configure your editor to insert spaces on Tab and never think about it again."),
    ("the inner block","Indented eight spaces — two levels. The <code>print(f&quot;grade {grade}&quot;)</code> at four spaces is inside the outer <code>if</code> but after the inner chain, so it runs for any valid score."),
    ("<code>print(&quot;done&quot;)</code>","Zero indent, so it is outside everything. This is how a block ends — there is no <code>}</code>, just a line that starts further left."),
    ("nesting depth","Two levels is fine. Three is a smell. Four means the logic wants restructuring — see the exercises."),
  ]) + """
  <p>Note the chained comparison from 1.7 would be tidier here: <code>if 0 &lt;= score &lt;= 100:</code>.</p>""",

 s4=tryit_notebook(NB_IF,"Open the If / Else notebook",
   "Ten runnable sections, ending with a login check that combines conditions. Worth doing: take a working two-branch example, shift one line four spaces left, and read the error. Doing that once teaches indentation faster than any explanation."),

 s5=quiz(
  "Score is 95. What does this print?",
  code("order.py",
  '''<span class="n">score</span> = <span class="n">95</span>
<span class="k">if</span> <span class="n">score</span> &gt;= <span class="n">50</span>:
    <span class="f">print</span>(<span class="s">"pass"</span>)
<span class="k">elif</span> <span class="n">score</span> &gt;= <span class="n">90</span>:
    <span class="f">print</span>(<span class="s">"distinction"</span>)'''),
  [("a","pass and distinction — both conditions are true."),
   ("b","distinction — Python picks the most specific match."),
   ("c","pass — the first true branch wins and the rest are skipped.")],
  "c",
  "<strong>pass.</strong> Both conditions are true, but an <code>if/elif</code> chain stops at the first one that holds. <code>score &gt;= 90</code> is never even evaluated.<p style=\"margin:10px 0 0\">This is not a Python quirk — C's <code>else if</code> does the same. What makes it worth a whole section is that it is a <em>silent</em> logic bug: the code runs, prints something sensible, and the distinction branch is simply unreachable forever.</p><p style=\"margin:10px 0 0\">The rule: in an <code>elif</code> chain, order from <strong>most specific to least</strong>. Put <code>&gt;= 90</code> first. If you ever write a branch that can never be reached, no error will tell you.</p>"),

 s6=mistakes([
  ("␣","Mixing tabs and spaces","Looks identical on screen, and Python raises <code>TabError: inconsistent use of tabs and spaces</code>. Set your editor to insert four spaces for Tab. In VS Code the indicator is in the status bar, bottom right — it should say <em>Spaces: 4</em>."),
  ("🔤","Using <code>=</code> instead of <code>==</code>","<code>if x = 5:</code> is a <code>SyntaxError</code> in Python. In C it compiles, assigns, and tests the result — one of the classic C bugs. Python simply forbids it. A small thing you get for free here."),
  ("🪜","Nesting three or four deep","Each level is another thing the reader has to hold. Usually the fix is an early exit — check the invalid case first and <code>return</code> or <code>continue</code>, leaving the main path unindented. The exercises have you do exactly that."),
 ]),

 s7=exercises([
  ("Easy","Write an <code>if/elif/else</code> that maps a temperature to \"freezing\" (below 0), \"cold\" (0–15), \"mild\" (16–25), \"hot\" (above 25). Check your branch order is not hiding one."),
  ("Medium","Rewrite the grade example using a chained comparison for the range check, so the whole thing is one level shallower."),
  ("Stretch","Find a three-level-deep <code>if</code> in your beginner practice notebook — the coffee machine or blind auction projects will have one. Rewrite it with early exits so no branch is deeper than one level. Note whether it reads better."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Indentation is the block.</b> No braces; four spaces by convention; consistency is enforced by the interpreter.",
  "Every block-opening line ends with a <b>colon</b>.",
  "<code>elif</code> is one word, and exists so long chains don't march right.",
  "<b>The first true branch wins</b> — order from most specific to least, or you'll hide a branch silently.",
  "<code>if x = 5:</code> is a SyntaxError here. The C assignment-in-condition bug cannot happen.",
  "Three levels of nesting means it's time for an early exit.",
 ]),
),

# ───────────────────────────────────────────────────────────── 2.2
dict(
 id="2.2", short="Truthiness and the ternary",
 title="Truthiness, membership, and the ternary",
 sub="Empty things are false. That single rule replaces a pile of length checks and null tests — and creates exactly one trap, which is worth meeting on purpose.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_2_3.html","2.3 for loops and range"),
 cobra={
  "s1":"Empty is false. That is the whole idea.",
  "s2":"Six falsy values. Memorise them.",
  "s3":"if items — not if len(items) > 0.",
  "s4":"Which test is the idiomatic one?",
  "s5":"Zero is falsy. This is the trap.",
  "s6":"None is not the same as empty.",
  "s7":"Clean up some length checks.",
  "s8":"Next: for loops, which walk things."
 },

 s1="""<p class="lead">In C, testing whether a string has content means <code>if (s != NULL &amp;&amp; s[0] != '\\0')</code>.</p>
  <p>In Python it is <code>if s:</code>.</p>
  <p>That works because Python asks every object whether it considers itself true, and the built-in types all answer the same sensible way: <strong>empty is false, non-empty is true</strong>. One rule covers strings, lists, dicts, sets and tuples, and it removes most of the ceremony from the conditions you write.</p>""",

 s2="""<p>Everything is true except a short list. Learn the list, and you know the rule.</p>
  <table class="cmp">
    <tr><th>Falsy</th><th>Type</th><th></th></tr>
    <tr><td>False</td><td>bool</td><td>the obvious one</td></tr>
    <tr><td>None</td><td>NoneType</td><td>&ldquo;no value&rdquo; — Python's null</td></tr>
    <tr><td>0 &nbsp; 0.0</td><td>int, float</td><td>zero of any numeric type</td></tr>
    <tr><td>&quot;&quot;</td><td>str</td><td>empty string</td></tr>
    <tr><td>[] &nbsp; () &nbsp; {}</td><td>list, tuple, dict, set</td><td>empty containers</td></tr>
  </table>
  <p>Everything else is truthy — including <code>&quot;0&quot;</code>, <code>&quot;False&quot;</code>, <code>[0]</code> and <code>-1</code>. A string containing the character zero is a non-empty string, so it is true. That catches people once.</p>
  <p><strong>Membership</strong> follows the same instinct for readability. <code>in</code> works on everything: <code>&quot;a&quot; in word</code>, <code>3 in numbers</code>, <code>&quot;name&quot; in record</code>. On a dict it tests the <em>keys</em>.</p>
  <p><strong>The ternary</strong> puts a small choice on one line, written in reading order rather than C's <code>?:</code>:</p>
  """ + code("",'<span class="n">label</span> = <span class="s">"ok"</span> <span class="k">if</span> <span class="n">count</span> &gt; <span class="n">0</span> <span class="k">else</span> <span class="s">"empty"</span>   <span class="c"># C: count &gt; 0 ? "ok" : "empty"</span>'),

 s3="""<p>What the rule buys you in practice.</p>
  """ + code("truthy.py",
  '''<span class="n">items</span> = []

<span class="c"># the C-shaped way — works, but nobody writes this</span>
<span class="k">if</span> <span class="f">len</span>(<span class="n">items</span>) &gt; <span class="n">0</span>:
    <span class="f">print</span>(<span class="s">"has items"</span>)

<span class="c"># the Python way</span>
<span class="k">if</span> <span class="n">items</span>:
    <span class="f">print</span>(<span class="s">"has items"</span>)
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">"empty"</span>)

<span class="c"># membership reads like English</span>
<span class="n">record</span> = {<span class="s">"name"</span>: <span class="s">"Aniket"</span>, <span class="s">"city"</span>: <span class="s">"Tokyo"</span>}
<span class="k">if</span> <span class="s">"name"</span> <span class="k">in</span> <span class="n">record</span>:          <span class="c"># checks KEYS, not values</span>
    <span class="f">print</span>(<span class="n">record</span>[<span class="s">"name"</span>])

<span class="c"># ternary, in reading order</span>
<span class="n">status</span> = <span class="s">"active"</span> <span class="k">if</span> <span class="n">items</span> <span class="k">else</span> <span class="s">"idle"</span>'''
  ) + """
  """ + ann([
    ("<code>if items:</code>","Reads as &ldquo;if there are items&rdquo;. Shorter, and it works unchanged if <code>items</code> later becomes a string or a dict."),
    ("<code>in</code> on a dict","Tests keys. To test values, <code>&quot;Tokyo&quot; in record.values()</code>. Forgetting this is a common source of quietly-false conditions."),
    ("ternary","Use it when the whole thing fits comfortably on one line. If you find yourself nesting ternaries, write the <code>if</code> block out — nested ones are genuinely hard to read."),
  ]),

 s4=matcher([
  ("Test that a list has at least one element.",
   [("a","if len(items) > 0:"),("b","if items:"),("c","if items != []:")],"b"),
  ("Test that a dict has a key called <code>city</code>.",
   [("a",'if "city" in record:'),("b",'if record["city"]:'),("c",'if record.city:')],"a"),
  ("Give <code>n</code> the value 10 when <code>flag</code> is true, else 0.",
   [("a","n = flag ? 10 : 0"),("b","n = 10 if flag else 0"),("c","n = if flag: 10 else: 0")],"b"),
 ]),

 s5=quiz(
  "A sensor reads zero — a perfectly valid measurement. What prints?",
  code("trap.py",
  '''<span class="n">reading</span> = <span class="n">0</span>

<span class="k">if</span> <span class="n">reading</span>:
    <span class="f">print</span>(<span class="s">"got a reading"</span>)
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">"no reading"</span>)'''),
  [("a","got a reading — 0 is a real value that was measured."),
   ("b","no reading — 0 is falsy."),
   ("c","Nothing; you cannot use a number as a condition.")],
  "b",
  "<strong>no reading</strong> — and this is the one place truthiness will hurt you.<p style=\"margin:10px 0 0\">Zero is falsy, so &ldquo;the sensor returned 0&rdquo; is indistinguishable from &ldquo;the sensor returned nothing&rdquo;. Same for an empty string that a user legitimately typed, and for an empty list that is a valid result.</p><p style=\"margin:10px 0 0\">The fix is to test for the thing you actually mean:</p><p style=\"margin:8px 0 0\"><code>if reading is not None:</code></p><p style=\"margin:10px 0 0\">Rule of thumb: when <b>0</b>, <b>&quot;&quot;</b> or <b>[]</b> are legitimate values in your data, test against <code>None</code> explicitly. When &ldquo;empty&rdquo; and &ldquo;missing&rdquo; genuinely mean the same thing, plain truthiness is right and shorter.</p>"),

 s6=mistakes([
  ("0️⃣","Treating <code>0</code> and <code>None</code> as interchangeable","They are both falsy but they mean different things: <code>0</code> is a measured value, <code>None</code> is the absence of one. Once your data can contain a real zero, <code>if x:</code> is a bug waiting for the right input."),
  ("🧾","<code>if x == True:</code>","Redundant, and subtly wrong — <code>1 == True</code> is <code>True</code> but <code>2 == True</code> is <code>False</code>, so <code>if x == True</code> rejects truthy values that <code>if x</code> accepts. Just write <code>if x:</code>."),
  ("🔑","Assuming <code>in</code> on a dict searches values","<code>&quot;Tokyo&quot; in record</code> is <code>False</code> even when a value is <code>&quot;Tokyo&quot;</code> — it looked at the keys. Use <code>.values()</code> or <code>.items()</code> when you mean the other thing. Covered fully in 3.4."),
 ]),

 s7=exercises([
  ("Easy","Rewrite these three as idiomatic Python: <code>if len(s) != 0:</code>, <code>if flag == True:</code>, <code>if len(items) == 0:</code>."),
  ("Medium","Write a function <code>describe(value)</code> that returns \"missing\" for <code>None</code>, \"empty\" for a falsy-but-not-None value, and \"present\" otherwise. Test it with <code>None</code>, <code>0</code>, <code>&quot;&quot;</code>, <code>[]</code>, <code>5</code> and <code>&quot;hi&quot;</code>."),
  ("Stretch","Search your practice notebooks for <code>len(</code> inside an <code>if</code>. For each, decide whether plain truthiness would be equivalent — and find at least one where it would <em>not</em> be, because zero is a real value there."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Empty is false.</b> <code>&quot;&quot;</code>, <code>[]</code>, <code>{}</code>, <code>()</code>, <code>0</code>, <code>0.0</code>, <code>None</code>, <code>False</code> — everything else is true.",
  "Write <code>if items:</code>, not <code>if len(items) &gt; 0:</code>.",
  "<code>&quot;0&quot;</code> and <code>&quot;False&quot;</code> are <b>non-empty strings</b>, so they are true.",
  "<code>in</code> on a dict tests <b>keys</b>.",
  "The trap: <b>0 is falsy</b>. When zero is a legitimate value, test <code>is not None</code>.",
  "Ternary reads in order: <code>a if cond else b</code>. Don't nest them.",
 ]),
),

# ───────────────────────────────────────────────────────────── 2.3
dict(
 id="2.3", short="for loops and range",
 title="for loops and range",
 sub="Python's for loop does not count. It walks. Once that lands, the index variable you have carried since C mostly disappears — and with it a whole family of off-by-one bugs.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_2_4.html","2.4 while loops"),
 cobra={
  "s1":"No counter. It walks the thing itself.",
  "s2":"for-each, not for-count.",
  "s3":"range stops before the end. Same rule as slicing.",
  "s4":"Loop over a real collection.",
  "s5":"Modifying while looping. Don't.",
  "s6":"range(1, n) versus range(n).",
  "s7":"Rewrite an indexed loop.",
  "s8":"Next: while, for when you don't know how many."
 },

 s1="""<p class="lead">C's <code>for</code> is three expressions bolted together: set up a counter, test it, change it. The counter is the point, and the data is reached through it.</p>
  <p>Python's <code>for</code> is a different construct with the same name. It takes a collection and hands you its items, one at a time. There is no counter unless you ask for one.</p>
  """ + code("",
  '''<span class="c">// C</span>
<span class="k">for</span> (<span class="n">i</span> = <span class="n">0</span>; <span class="n">i</span> &lt; <span class="n">n</span>; <span class="n">i</span>++) <span class="f">printf</span>(<span class="s">"%s"</span>, <span class="n">names</span>[<span class="n">i</span>]);

<span class="c"># Python</span>
<span class="k">for</span> <span class="n">name</span> <span class="k">in</span> <span class="n">names</span>:
    <span class="f">print</span>(<span class="n">name</span>)'''
  ) + """
  <p>The Python version cannot run off the end, cannot start at the wrong index, and does not need to know how long <code>names</code> is. Those three bugs are simply gone.</p>""",

 s2="""<p>The loop asks the collection for its items. Anything that can produce items in sequence — an <em>iterable</em> — works: strings, lists, tuples, dicts, sets, files, ranges.</p>
  <div class="model">
    <svg viewBox="0 0 620 132" role="img" aria-label="A for loop takes items one at a time from an iterable and binds each to the loop variable">
      <rect x="8" y="30" width="180" height="66" rx="10" fill="#f4f5ec" stroke="#d2dacb"/>
      <text x="98" y="22" font-family="JetBrains Mono, monospace" font-size="11" fill="#7a8c80" text-anchor="middle">the iterable</text>
      <g font-family="JetBrains Mono, monospace" font-size="13" text-anchor="middle">
        <rect x="22" y="48" width="46" height="30" rx="5" fill="#fbfcf6" stroke="#d2dacb"/><text x="45" y="68" fill="#1a2820">"a"</text>
        <rect x="76" y="48" width="46" height="30" rx="5" fill="#fbfcf6" stroke="#d2dacb"/><text x="99" y="68" fill="#1a2820">"b"</text>
        <rect x="130" y="48" width="46" height="30" rx="5" fill="#fbfcf6" stroke="#d2dacb"/><text x="153" y="68" fill="#1a2820">"c"</text>
      </g>
      <path d="M196 63 h48" stroke="#7fa68b" stroke-width="2" marker-end="url(#a4)"/>
      <text x="220" y="52" font-family="EB Garamond, serif" font-size="12" fill="#7a8c80" text-anchor="middle">one</text>
      <rect x="250" y="34" width="128" height="58" rx="9" fill="#dde7dd" stroke="#2f6b4f"/>
      <text x="314" y="58" font-family="JetBrains Mono, monospace" font-size="12.5" fill="#234f3b" text-anchor="middle">for x in ...</text>
      <text x="314" y="77" font-family="EB Garamond, serif" font-size="12.5" fill="#41564a" text-anchor="middle">x is tied to it</text>
      <path d="M384 63 h44" stroke="#7fa68b" stroke-width="2" marker-end="url(#a4)"/>
      <rect x="434" y="34" width="176" height="58" rx="9" fill="#16352a"/>
      <text x="522" y="58" font-family="JetBrains Mono, monospace" font-size="12" fill="#a8d8ba" text-anchor="middle">the body runs</text>
      <text x="522" y="77" font-family="EB Garamond, serif" font-size="12.5" fill="#7fa68b" text-anchor="middle">then loop back for the next</text>
      <defs><marker id="a4" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill="#7fa68b"/></marker></defs>
    </svg>
  </div>
  <p>When you genuinely need numbers, <code>range()</code> produces them:</p>
  <p><code>range(5)</code> → 0 1 2 3 4 &nbsp;·&nbsp; <code>range(2, 6)</code> → 2 3 4 5 &nbsp;·&nbsp; <code>range(0, 10, 2)</code> → 0 2 4 6 8</p>
  <p><strong>The stop value is excluded</strong> — the same rule as slicing in 1.3, for the same reason: <code>range(n)</code> gives exactly <code>n</code> numbers, and <code>range(a, b)</code> gives <code>b - a</code> of them.</p>""",

 s3="""<p>The four shapes you will actually write.</p>
  """ + code("loops.py",
  '''<span class="n">names</span> = [<span class="s">"bolt"</span>, <span class="s">"washer"</span>, <span class="s">"nut"</span>]

<span class="c"># 1 — walk the items. The default.</span>
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">names</span>:
    <span class="f">print</span>(<span class="n">n</span>)

<span class="c"># 2 — need the position too? enumerate.</span>
<span class="k">for</span> <span class="n">i</span>, <span class="n">n</span> <span class="k">in</span> <span class="f">enumerate</span>(<span class="n">names</span>):
    <span class="f">print</span>(<span class="n">i</span>, <span class="n">n</span>)            <span class="c"># 0 bolt / 1 washer / 2 nut</span>

<span class="c"># 3 — two lists in step? zip.</span>
<span class="n">qty</span> = [<span class="n">10</span>, <span class="n">50</span>, <span class="n">25</span>]
<span class="k">for</span> <span class="n">n</span>, <span class="n">q</span> <span class="k">in</span> <span class="f">zip</span>(<span class="n">names</span>, <span class="n">qty</span>):
    <span class="f">print</span>(<span class="s">f"</span><span class="n">{n}</span><span class="s">: </span><span class="n">{q}</span><span class="s">"</span>)

<span class="c"># 4 — a fixed number of repeats, item unused</span>
<span class="k">for</span> <span class="n">_</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">3</span>):
    <span class="f">print</span>(<span class="s">"tick"</span>)'''
  ) + """
  """ + ann([
    ("shape 1","Reach for this first. If you are not using an index for anything, do not create one."),
    ("<code>enumerate</code>","Gives <code>(index, item)</code> pairs. Add <code>start=1</code> for human numbering: <code>enumerate(names, start=1)</code>. This is the honest replacement for a C index loop."),
    ("<code>zip</code>","Walks several sequences together, stopping at the shortest. Much clearer than indexing both with the same <code>i</code>."),
    ("<code>_</code>","A conventional name meaning &ldquo;I don't use this&rdquo;. Ordinary variable, but readers take the hint."),
  ]) + """
  """ + src("nb","Your <code>02_For_Loops.ipynb</code> covers exactly these, section by section — basic loop, custom start and end, step size, looping a list, <code>enumerate</code>, looping a string, nesting, <code>break</code>, <code>continue</code>, and a summing example. This lesson is the map; the notebook is the terrain."),

 s4=tryit_notebook(NB_FOR,"Open the For Loops notebook",
   "Eleven runnable sections. The one worth deliberately breaking: section 5, the enumerate example. Change <code>enumerate(x)</code> to <code>enumerate(x, start=1)</code> and watch every index shift — that is the difference between a position and a count."),

 s5=quiz(
  "Removing items while looping over the same list. What is left in <code>nums</code>?",
  code("mutate.py",
  '''<span class="n">nums</span> = [<span class="n">1</span>, <span class="n">2</span>, <span class="n">3</span>, <span class="n">4</span>]
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span>:
    <span class="k">if</span> <span class="n">n</span> % <span class="n">2</span> == <span class="n">0</span>:
        <span class="n">nums</span>.<span class="f">remove</span>(<span class="n">n</span>)
<span class="f">print</span>(<span class="n">nums</span>)'''),
  [("a","[1, 3] — both even numbers removed."),
   ("b","[1, 3, 4] — the loop skips an item."),
   ("c","IndexError — the list shrank underneath the loop.")],
  "b",
  "<strong>[1, 3, 4].</strong> The loop tracks a position. It hands you index 1 (<code>2</code>), you remove it, and everything shifts left — <code>3</code> is now at index 1. The loop moves to index 2, which is now <code>4</code>. <code>3</code> was never visited.<p style=\"margin:10px 0 0\">No error, no warning. Just a quietly wrong answer, and one that gets more confusing the longer the list.</p><p style=\"margin:10px 0 0\"><strong>Never add to or remove from a collection you are looping over.</strong> Build a new one instead:</p><p style=\"margin:8px 0 0\"><code>nums = [n for n in nums if n % 2 != 0]</code></p><p style=\"margin:8px 0 0\">That is a comprehension — Part III.6 — and it is the standard answer to this whole class of problem.</p>"),

 s6=mistakes([
  ("🔢","<code>range(1, n)</code> when you meant <code>range(n)</code>","<code>range(5)</code> gives five numbers starting at 0. <code>range(1, 5)</code> gives four starting at 1. If a loop runs one time too few, this is usually why — and if you want 1 to 5 inclusive, it is <code>range(1, 6)</code>."),
  ("🔁","Keeping the C index habit","<code>for i in range(len(names)): print(names[i])</code> works and marks the code as translated rather than written. It also reintroduces the off-by-one you just escaped. Use <code>enumerate</code> if you need <code>i</code>, and nothing if you don't."),
  ("👻","Using the loop variable after the loop","It survives, holding the last item — which is legal and occasionally useful, but usually a bug. If the loop body never ran, the name may not exist at all, and you get <code>NameError</code>."),
 ]),

 s7=exercises([
  ("Easy","Print the numbers 1 to 10 and their squares, using <code>range</code>. Then print only the even ones, using a step."),
  ("Medium","Given <code>parts = [\"bolt\", \"nut\", \"washer\"]</code> and <code>counts = [4, 4, 8]</code>, print numbered lines like <code>1. bolt x4</code> using <code>enumerate</code> and <code>zip</code> together."),
  ("Stretch","Take the nested pattern-printing programs in your <code>Pattern_programs</code> folder. Pick the right-angle triangle one and rewrite it so the inner loop uses string repetition (<code>\"*\" * n</code>) instead of an inner loop. Which version reads better, and why might the loop version still be worth keeping as an exercise?"),
 ]),

 s8=recap("What to carry forward",[
  "Python's <code>for</code> <b>walks a collection</b>; it does not count. No index unless you ask.",
  "<code>range(n)</code> gives <code>n</code> numbers starting at 0 — <b>stop is excluded</b>, same as slicing.",
  "<code>enumerate(x)</code> when you need the position; <code>enumerate(x, start=1)</code> for human numbering.",
  "<code>zip(a, b)</code> walks two sequences together and stops at the shorter.",
  "<code>for _ in range(n)</code> for plain repetition.",
  "<b>Never add to or remove from</b> the collection you are looping over — build a new one.",
 ]),
),

# ───────────────────────────────────────────────────────────── 2.4
dict(
 id="2.4", short="while loops",
 title="while loops — accumulator and sentinel patterns",
 sub="Use for when you know the collection. Use while when you don't know how many times — waiting on a user, a file, a condition. Two patterns cover almost every real case.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_2_5.html","2.5 break, continue, nested loops"),
 cobra={
  "s1":"Unknown count. That is when while earns its place.",
  "s2":"Three parts. Miss one and it never ends.",
  "s3":"Accumulator and sentinel. Learn both shapes.",
  "s4":"Build a loop that survives bad input.",
  "s5":"Where the update goes changes everything.",
  "s6":"Ctrl-C is your friend. Know it.",
  "s7":"Write a menu loop.",
  "s8":"Last of Part II: break, continue, patterns."
 },

 s1="""<p class="lead">A <code>for</code> loop needs to know what it is walking. A <code>while</code> loop does not.</p>
  <p>That is the whole basis for choosing between them. Reading every line of a file, every item in a list, every number in a range — <code>for</code>. Asking until the user types something valid, retrying until a connection succeeds, iterating until a value converges — <code>while</code>.</p>
  <p>The cost is that <code>while</code> gives you no automatic progress. A <code>for</code> loop always ends because the collection runs out. A <code>while</code> loop ends only if <em>you</em> make its condition false, and forgetting to is how you write your first infinite loop.</p>""",

 s2="""<p>Every correct <code>while</code> has three parts, and they are easy to see once named.</p>
  """ + code("three-parts.py",
  '''<span class="n">count</span> = <span class="n">0</span>              <span class="c"># 1. SET UP  — before the loop</span>

<span class="k">while</span> <span class="n">count</span> &lt; <span class="n">5</span>:        <span class="c"># 2. TEST    — checked before every pass</span>
    <span class="f">print</span>(<span class="n">count</span>)
    <span class="n">count</span> += <span class="n">1</span>         <span class="c"># 3. UPDATE  — must move toward the test failing</span>'''
  ) + """
  <p>Drop part 3 and the loop runs forever. There is no compiler to warn you; the program simply never returns. (Ctrl-C stops it.)</p>
  <p>Two shapes cover most real uses:</p>
  <div class="two-col">
    <div><h4>Accumulator</h4><p>A running total or collection built up across passes. Set it up empty, add to it each time, use it after.</p></div>
    <div><h4>Sentinel</h4><p>Loop until a special value appears — the user types <code>quit</code>, a reading goes out of range, a file line is blank.</p></div>
  </div>
  """ + src("nb","Your <code>03_While_Loops.ipynb</code> has both, plus countdown, user-input, and nested variants — ten sections, all runnable. Section 6 is the accumulator; section 8 is the sentinel."),

 s3="""<p>Both patterns, and the safe-input loop you will reuse constantly.</p>
  """ + code("patterns.py",
  '''<span class="c"># ACCUMULATOR — build a total</span>
<span class="n">total</span>, <span class="n">n</span> = <span class="n">0</span>, <span class="n">1</span>
<span class="k">while</span> <span class="n">n</span> &lt;= <span class="n">100</span>:
    <span class="n">total</span> += <span class="n">n</span>
    <span class="n">n</span> += <span class="n">1</span>
<span class="f">print</span>(<span class="n">total</span>)                    <span class="c"># 5050</span>

<span class="c"># SENTINEL — loop until a signal value</span>
<span class="n">line</span> = <span class="f">input</span>(<span class="s">"&gt; "</span>)
<span class="k">while</span> <span class="n">line</span> != <span class="s">"quit"</span>:
    <span class="f">print</span>(<span class="s">f"you said </span><span class="n">{line}</span><span class="s">"</span>)
    <span class="n">line</span> = <span class="f">input</span>(<span class="s">"&gt; "</span>)      <span class="c"># the update — easy to forget</span>

<span class="c"># the while-True + break idiom: no duplicated input line</span>
<span class="k">while</span> <span class="k">True</span>:
    <span class="n">line</span> = <span class="f">input</span>(<span class="s">"&gt; "</span>)
    <span class="k">if</span> <span class="n">line</span> == <span class="s">"quit"</span>:
        <span class="k">break</span>
    <span class="f">print</span>(<span class="s">f"you said </span><span class="n">{line}</span><span class="s">"</span>)'''
  ) + """
  """ + ann([
    ("accumulator","<code>total</code> and <code>n</code> both set up before. Note this particular one is better as <code>sum(range(1, 101))</code> — <code>while</code> earns its keep when the count is genuinely unknown."),
    ("sentinel","Notice <code>input()</code> appears <em>twice</em> — once before the loop, once at the end of the body. That duplication is the classic annoyance of the sentinel shape."),
    ("<code>while True</code> + <code>break</code>","Removes the duplication by testing in the middle. Not a hack — it is the idiomatic Python answer, and it is what you already wrote in 1.6 for safe input."),
  ]),

 s4=tryit_notebook(NB_WHILE,"Open the While Loops notebook",
   "Ten runnable sections including the countdown, the accumulator and the sentinel. Deliberately delete the update line in section 1 and run it — then stop it with the interrupt button. Meeting an infinite loop on purpose, once, in a safe place, is worth more than a warning about them."),

 s5=quiz(
  "Where the update sits. What does this print?",
  code("update.py",
  '''<span class="n">n</span> = <span class="n">0</span>
<span class="k">while</span> <span class="n">n</span> &lt; <span class="n">3</span>:
    <span class="n">n</span> += <span class="n">1</span>
    <span class="f">print</span>(<span class="n">n</span>)'''),
  [("a","0 1 2"),
   ("b","1 2 3"),
   ("c","0 1 2 3")],
  "b",
  "<strong>1 2 3.</strong> The increment happens <em>before</em> the print, so the first value shown is 1, and the last pass takes <code>n</code> from 2 to 3 and prints 3 — the test only runs again afterwards, and 3 &lt; 3 is false.<p style=\"margin:10px 0 0\">Move <code>n += 1</code> below the <code>print</code> and you get <strong>0 1 2</strong> instead. Same three lines, same three passes, different output — because the update's position decides whether you see the value before or after it changes.</p><p style=\"margin:10px 0 0\">This is the whole reason <code>for n in range(3)</code> is preferred where it fits: it gives 0 1 2 with no decision to get wrong.</p>"),

 s6=mistakes([
  ("♾️","Forgetting the update","The commonest <code>while</code> bug, and it hangs rather than crashing. If a program stops responding, this is the first suspect. <b>Ctrl-C</b> in a terminal, or the stop button in a notebook, breaks out."),
  ("🎯","Updating the wrong variable","<code>while i &lt; n:</code> with <code>j += 1</code> in the body. The test and the update must involve the same name. Easy to do when a loop grows and picks up a second counter."),
  ("🔂","Using <code>while</code> where <code>for</code> fits","<code>i = 0; while i &lt; len(items): ... ; i += 1</code> is three chances to make a mistake instead of none. If you know what you are walking, use <code>for</code>."),
 ]),

 s7=exercises([
  ("Easy","Write a countdown from 10 to 1 with <code>while</code>, then print \"liftoff\". Then write it again with <code>for</code> and <code>range</code>, and say which you would keep."),
  ("Medium","Write a menu loop that prints four options, reads a choice, acts on it, and exits on option 4 — using <code>while True</code> and <code>break</code>. This is the shape of your dice-rolling and rock-paper-scissors projects."),
  ("Stretch","Write a loop that keeps halving a number until it is below 1, counting the steps. Then work out, without running it, how many steps 1000 takes — and check. What does that count have to do with <code>math.log2</code>?"),
 ]),

 s8=recap("What to carry forward",[
  "<code>for</code> when you know what you're walking; <code>while</code> when you don't know <b>how many times</b>.",
  "Every <code>while</code> needs <b>set up · test · update</b>. Missing the update hangs the program.",
  "<b>Accumulator</b>: build a total or list across passes. <b>Sentinel</b>: loop until a signal value.",
  "<code>while True:</code> with <code>break</code> is idiomatic — it avoids duplicating the read.",
  "Where the update sits decides what you see. <code>n += 1</code> before or after the print gives different output.",
  "<b>Ctrl-C</b> stops a runaway loop.",
 ]),
),

# ───────────────────────────────────────────────────────────── 2.5
dict(
 id="2.5", short="break, continue, patterns",
 title="break, continue, and loop else; nested loops and patterns",
 sub="Two words that change a loop's flow, one clause almost nobody knows exists, and the nested loops behind every pattern program you have written.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_3_1.html","3.1 Lists"),
 cobra={
  "s1":"Leave early, or skip one. That is all.",
  "s2":"break exits. continue skips. Don't mix them up.",
  "s3":"Nested loops: inner finishes first, every time.",
  "s4":"Match the keyword to the intent.",
  "s5":"for-else. Almost nobody knows this one.",
  "s6":"break only leaves ONE loop.",
  "s7":"Your pattern programs, explained.",
  "s8":"Part II done. Next: collections."
 },

 s1="""<p class="lead">Sometimes a loop has done its job before the collection runs out — you found what you were searching for. Sometimes one item should be skipped and the rest handled normally.</p>
  <p><code>break</code> and <code>continue</code> handle both, and they work identically in C, so this part is quick. What is genuinely new is <strong><code>for...else</code></strong> — a clause with no C equivalent that solves the &ldquo;did I find it?&rdquo; problem cleanly — and the nesting rules behind the pattern programs you have already written by hand.</p>""",

 s2="""<p>Two keywords, and a third thing that surprises people.</p>
  <table class="cmp">
    <tr><th>Keyword</th><th>Effect</th><th>Use for</th></tr>
    <tr><td>break</td><td>Leave the loop entirely, now</td><td>Found it; stop searching</td></tr>
    <tr><td>continue</td><td>Skip the rest of this pass, start the next</td><td>Not interested in this item</td></tr>
    <tr><td>else</td><td>Runs only if the loop was <em>not</em> broken out of</td><td>&ldquo;Searched everything, found nothing&rdquo;</td></tr>
  </table>
  <p>That last one reads wrongly at first. A loop's <code>else</code> has nothing to do with a condition being false. Think of it as <strong>&ldquo;on exhaustion&rdquo;</strong> — it runs when the loop finished naturally, and is skipped when <code>break</code> cut it short. That is exactly the flag variable you would otherwise have to maintain by hand.</p>
  <p>And the nesting rule, which is the whole of pattern printing: <strong>the inner loop runs to completion for every single pass of the outer loop.</strong> Outer moves once, inner runs all the way through.</p>""",

 s3="""<p>All four ideas, in the smallest useful examples.</p>
  """ + code("flow.py",
  '''<span class="c"># break — stop as soon as you find it</span>
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> [<span class="n">4</span>, <span class="n">7</span>, <span class="n">2</span>, <span class="n">9</span>]:
    <span class="k">if</span> <span class="n">n</span> &gt; <span class="n">5</span>:
        <span class="f">print</span>(<span class="s">f"found </span><span class="n">{n}</span><span class="s">"</span>)
        <span class="k">break</span>

<span class="c"># continue — skip this one, keep going</span>
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">10</span>):
    <span class="k">if</span> <span class="n">n</span> % <span class="n">2</span>:
        <span class="k">continue</span>          <span class="c"># odd → skip</span>
    <span class="f">print</span>(<span class="n">n</span>)              <span class="c"># 0 2 4 6 8</span>

<span class="c"># for-else — ran to the end without breaking</span>
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> [<span class="n">4</span>, <span class="n">2</span>, <span class="n">1</span>]:
    <span class="k">if</span> <span class="n">n</span> &gt; <span class="n">5</span>:
        <span class="f">print</span>(<span class="s">"found one"</span>)
        <span class="k">break</span>
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">"nothing above 5"</span>)   <span class="c"># this runs</span>

<span class="c"># nested — inner completes for EVERY outer pass</span>
<span class="k">for</span> <span class="n">row</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">1</span>, <span class="n">5</span>):
    <span class="k">for</span> <span class="n">col</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">row</span>):
        <span class="f">print</span>(<span class="s">"*"</span>, <span class="n">end</span>=<span class="s">""</span>)
    <span class="f">print</span>()                   <span class="c"># newline after each row</span>'''
  ) + """
  """ + ann([
    ("<code>if n % 2:</code>","Truthiness from 2.2 — a remainder of 1 is truthy, so this reads as &ldquo;if odd&rdquo;. Idiomatic once you see it."),
    ("<code>for...else</code>","The <code>else</code> lines up with <code>for</code>, not with <code>if</code>. It runs on natural exhaustion, and is skipped by <code>break</code>. Replaces a <code>found = False</code> flag entirely."),
    ("<code>end=&quot;&quot;</code>","<code>print</code> normally adds a newline; <code>end=&quot;&quot;</code> suppresses it so the row builds across. The bare <code>print()</code> afterwards ends the line."),
    ("the triangle","Outer picks the row; inner prints that many stars. This is exactly the structure of your <code>Pattern_programs</code> scripts."),
  ]) + """
  """ + src("notes","Your <code>1-3_Loops_break_continue_else.py</code> script covers these three keywords, and <code>Pattern_programs/</code> has the right-angle triangle in two attempts. The nesting rule above is the thing those attempts were circling."),

 s4=matcher([
  ("Stop searching the moment you find a match.",
   [("a","continue"),("b","break"),("c","pass")],"b"),
  ("Ignore blank lines but process all the others.",
   [("a","if not line: continue"),("b","if not line: break"),("c","if not line: return")],"a"),
  ("Print a message only if the search found nothing.",
   [("a","put it after the loop"),("b","use a for...else clause"),("c","both work; else needs no flag")],"c"),
 ]),

 s5=quiz(
  "A search for a part number. What does this print?",
  code("search.py",
  '''<span class="n">parts</span> = [<span class="s">"A-10"</span>, <span class="s">"B-22"</span>, <span class="s">"C-31"</span>]

<span class="k">for</span> <span class="n">p</span> <span class="k">in</span> <span class="n">parts</span>:
    <span class="k">if</span> <span class="n">p</span>.<span class="f">startswith</span>(<span class="s">"Z"</span>):
        <span class="f">print</span>(<span class="s">"found it"</span>)
        <span class="k">break</span>
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">"not in stock"</span>)'''),
  [("a","Nothing — no part starts with Z, so no branch runs."),
   ("b","not in stock — the else runs because the loop was never broken."),
   ("c","not in stock, three times — once per item.")],
  "b",
  "<strong>not in stock</strong>, once. The <code>else</code> belongs to the <code>for</code>, not to the <code>if</code>. It runs exactly once, after the loop finishes — and only because <code>break</code> never fired.<p style=\"margin:10px 0 0\">Add <code>&quot;Z-99&quot;</code> to the list and the output becomes <code>found it</code> with no <code>not in stock</code>: the <code>break</code> skips the <code>else</code> entirely.</p><p style=\"margin:10px 0 0\">The alternative, without <code>for...else</code>, is a flag:</p><p style=\"margin:8px 0 0\"><code>found = False</code> … <code>found = True; break</code> … <code>if not found:</code></p><p style=\"margin:8px 0 0\">Three extra lines and a variable to keep in sync. The <code>else</code> clause is worth knowing precisely because it deletes all of that.</p>"),

 s6=mistakes([
  ("🚪","Expecting <code>break</code> to leave both loops","It leaves <b>one</b> — the innermost it sits in. To escape a nested pair, either put the loops in a function and <code>return</code>, or set a flag the outer loop checks. There is no <code>break 2</code> in Python."),
  ("🤔","Reading <code>else</code> as attached to the <code>if</code>","Indentation settles it: an <code>else</code> lined up with <code>for</code> or <code>while</code> belongs to the loop. This is genuinely confusing naming — many people read it as &ldquo;no-break&rdquo; in their head, which is what it means."),
  ("🔄","<code>continue</code> in a <code>while</code> loop, before the update","<code>continue</code> jumps straight back to the test. If the update line sits below it, the update is skipped and the loop hangs. This is why <code>continue</code> is safe in <code>for</code> loops and needs care in <code>while</code> loops."),
 ]),

 s7=exercises([
  ("Easy","Loop over 1 to 20 and print only numbers divisible by 3, using <code>continue</code> for the rest. Then rewrite it with an <code>if</code> and no <code>continue</code>, and decide which you prefer."),
  ("Medium","Write a search over a list of part numbers that prints the first one over 100 units, or \"none found\" — using <code>for...else</code> and no flag variable."),
  ("Stretch","Open your <code>Pattern_programs</code> folder and take the inverted-triangle attempt. Using the nesting rule from section 3, explain in two sentences why the number of stars per row is what it is — then write the pyramid version, where each row is centred."),
 ]),

 s8=recap("What to carry forward",[
  "<code>break</code> leaves the loop; <code>continue</code> skips to the next pass.",
  "<code>for...else</code> runs the <code>else</code> <b>only if no break happened</b> — read it as &ldquo;on exhaustion&rdquo;. It replaces a flag variable.",
  "<code>break</code> escapes <b>one</b> loop only. For nested loops, use a function and <code>return</code>.",
  "Nested loops: the <b>inner runs completely for every outer pass</b>. That's all pattern printing is.",
  "<code>print(x, end=&quot;&quot;)</code> suppresses the newline; a bare <code>print()</code> ends the row.",
  "In a <code>while</code>, <code>continue</code> before the update line will hang the loop.",
 ]),
),
]
