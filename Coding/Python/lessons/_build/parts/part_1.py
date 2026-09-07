# -*- coding: utf-8 -*-
"""Part I — The Basics."""
from build import src, code, ann, matcher, quiz, mistakes, exercises, recap, tryit_notebook

NB_STR = "../fundamentals/06_strings.html"
NB_IF  = "../fundamentals/04_if_else.html"

LESSONS = [

# ───────────────────────────────────────────────────────────── 1.1
dict(
 id="1.1", short="Variables and names",
 title="Variables, names, and dynamic typing",
 sub="In C a variable is a labelled box of a fixed size. In Python it is a luggage tag you tie onto a value. Almost every surprise in this Part comes from that one difference.",
 mins="13", meta3="No setup needed",
 next=("Py_Lesson_1_2.html","1.2 Numbers and arithmetic"),
 cobra={
  "s1":"Forget boxes. Think labels.",
  "s2":"The tag moves. The value stays put.",
  "s3":"Watch what = actually does here.",
  "s4":"Which line changes what the tag points at?",
  "s5":"Two tags, one list. This is the classic.",
  "s6":"The mutable-default one has bitten everybody.",
  "s7":"Predict before you run. Always.",
  "s8":"Names bound to objects. Everything else follows."
 },

 s1="""<p class="lead">You already know what <code>int x = 5;</code> does in C. Python's <code>x = 5</code> is not the same thing, and the difference is not cosmetic.</p>
  <p>In C, declaring <code>x</code> reserves four bytes somewhere and calls that place <code>x</code>. Assigning writes into that place. The box exists first; values pass through it.</p>
  <p>In Python, <code>5</code> is an object that exists on its own, and <code>x</code> is a name tied to it. There is no box. Assigning again does not overwrite anything — it unties the name and ties it somewhere else. Once you see it that way, a whole family of otherwise baffling behaviours becomes obvious.</p>""",

 s2="""<p>Think of a luggage tag, not a box.</p>
  <div class="model">
    <svg viewBox="0 0 620 200" role="img" aria-label="In C a variable is a box holding a value; in Python a name is a tag tied to an object">
      <text x="10" y="20" font-family="JetBrains Mono, monospace" font-size="12" fill="#7a8c80">C — the box holds the value</text>
      <rect x="10" y="32" width="86" height="44" rx="6" fill="#fbfcf6" stroke="#d2dacb"/>
      <text x="53" y="59" font-family="JetBrains Mono, monospace" font-size="15" fill="#1a2820" text-anchor="middle">5</text>
      <text x="53" y="90" font-family="JetBrains Mono, monospace" font-size="12" fill="#41564a" text-anchor="middle">x</text>
      <text x="120" y="52" font-family="EB Garamond, serif" font-size="13.5" fill="#7a8c80">x = 7 overwrites the four bytes.</text>
      <text x="120" y="70" font-family="EB Garamond, serif" font-size="13.5" fill="#7a8c80">Same box, new contents.</text>

      <text x="10" y="126" font-family="JetBrains Mono, monospace" font-size="12" fill="#7a8c80">PYTHON — the name is tied to the object</text>
      <rect x="150" y="138" width="70" height="40" rx="8" fill="#dde7dd" stroke="#7fa68b"/>
      <text x="185" y="163" font-family="JetBrains Mono, monospace" font-size="15" fill="#234f3b" text-anchor="middle">5</text>
      <text x="24" y="163" font-family="JetBrains Mono, monospace" font-size="13" fill="#41564a">x</text>
      <path d="M36 158 h108" stroke="#2f6b4f" stroke-width="1.6" marker-end="url(#a2)"/>
      <text x="252" y="152" font-family="EB Garamond, serif" font-size="13.5" fill="#7a8c80">x = 7 unties the string and</text>
      <text x="252" y="170" font-family="EB Garamond, serif" font-size="13.5" fill="#7a8c80">ties it to a different object. 5 is untouched.</text>
      <defs><marker id="a2" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill="#2f6b4f"/></marker></defs>
    </svg>
  </div>
  <p>Three consequences, and they explain most of what follows:</p>
  <p><strong>A name has no type; the object does.</strong> <code>x = 5</code> then <code>x = "hello"</code> is perfectly legal. Nothing was redeclared — the tag simply moved to a string. This is what <em>dynamic typing</em> means. Not &ldquo;no types&rdquo; — Python is strict about types — but that types live on values, not on names.</p>
  <p><strong>Two names can tag the same object.</strong> <code>b = a</code> does not copy. It ties a second tag to the same thing.</p>
  <p><strong>Some objects can be changed in place; some cannot.</strong> A list can. A number or string cannot. That distinction is the subject of section 5, and it is the single most useful thing in this lesson.</p>""",

 s3="""<p>Read <code>=</code> as &ldquo;tie this name to that object&rdquo;, never as &ldquo;store into&rdquo;.</p>
  """ + code("names.py",
  '''<span class="n">x</span> = <span class="n">5</span>              <span class="c"># tie x to the integer 5</span>
<span class="n">y</span> = <span class="n">x</span>              <span class="c"># tie y to the SAME object</span>
<span class="n">x</span> = <span class="n">7</span>              <span class="c"># re-tie x to 7. y is untouched.</span>
<span class="f">print</span>(<span class="n">x</span>, <span class="n">y</span>)        <span class="c"># 7 5</span>

<span class="n">name</span> = <span class="s">"Aniket"</span>    <span class="c"># names have no declared type...</span>
<span class="n">name</span> = <span class="n">42</span>           <span class="c"># ...so this is legal</span>

<span class="f">print</span>(<span class="f">type</span>(<span class="n">name</span>))    <span class="c"># &lt;class 'int'&gt; — the OBJECT has the type</span>'''
  ) + """
  """ + ann([
    ("line 2","<code>y = x</code> copies the tag, not the value. Both names now point at the same <code>5</code>. For numbers this never matters, because you cannot change a 5. For lists it matters enormously."),
    ("line 3","<code>x</code> is re-tied. Nothing was written into <code>y</code>, so <code>y</code> still shows the old object."),
    ("<code>type()</code>","Asks an object what it is. Useful when a value is not behaving — it is the first thing to reach for, before guessing."),
  ]) + """
  <p>Names follow three rules: letters, digits and underscores only; not starting with a digit; and not one of Python's ~35 keywords. Convention is <code>lower_snake_case</code> for variables and <code>UPPER_SNAKE</code> for values you intend never to change — Python will not stop you changing them, the capitals are a message to the next reader.</p>
  """ + src("fresh","One name is worth learning to avoid: do not call a variable <code>list</code>, <code>str</code>, <code>sum</code>, <code>type</code> or <code>id</code>. Those are built-in functions, and re-tying the name hides the function for the rest of the program. <code>TypeError: 'list' object is not callable</code> almost always means someone did exactly this."),

 s4=matcher([
  ("Tie a new name to an existing object.",
   [("a","b = a"),("b","b == a"),("c","b := a")],"a"),
  ("Ask an object what type it is.",
   [("a","typeof(x)"),("b","type(x)"),("c","x.type()")],"b"),
  ("Signal to other readers that a value should not change.",
   [("a","const RATE = 0.08"),("b","final RATE = 0.08"),("c","RATE = 0.08")],"c"),
 ]),

 s5=quiz(
  "Two names, one list. What does this print?",
  code("shared.py",
  '''<span class="n">a</span> = [<span class="n">1</span>, <span class="n">2</span>, <span class="n">3</span>]
<span class="n">b</span> = <span class="n">a</span>
<span class="n">b</span>.<span class="f">append</span>(<span class="n">4</span>)
<span class="f">print</span>(<span class="n">a</span>)'''),
  [("a","[1, 2, 3] — b is a copy, so a is unchanged."),
   ("b","[1, 2, 3, 4] — both names point at the same list."),
   ("c","An error — you cannot append through a second name.")],
  "b",
  "<strong>[1, 2, 3, 4].</strong> <code>b = a</code> tied a second tag to the same list. <code>append</code> changes that list <em>in place</em> — so both names see the change, because there is only one list.<p style=\"margin:10px 0 0\">Compare with the earlier example, where <code>x = 7</code> left <code>y</code> alone. The difference is not the assignment; it is that <code>append</code> <em>mutates</em> while <code>=</code> <em>re-ties</em>. Lists, dicts and sets can be mutated. Numbers, strings and tuples cannot — which is exactly why the number example felt safe.</p><p style=\"margin:10px 0 0\">When you want a real copy: <code>b = a.copy()</code> or <code>b = a[:]</code>.</p>"),

 s6=mistakes([
  ("🔗","Expecting <code>b = a</code> to copy a list","It never copies. For anything mutable — list, dict, set — you have handed out a second key to the same room. Use <code>.copy()</code> when you mean a copy, and <code>copy.deepcopy()</code> when the thing contains other mutable things."),
  ("🕳️","Shadowing a built-in","<code>list = [1,2,3]</code> works, and then <code>list(range(5))</code> fails with <code>'list' object is not callable</code>. The fix is to rename your variable — <code>items</code>, <code>rows</code>, <code>values</code>. Coming from C, where there is no such global namespace to trample, this one is easy to walk into."),
  ("🧨","Assuming a name exists because you wrote it in an <code>if</code>","<code>if flag: msg = &quot;hi&quot;</code> then <code>print(msg)</code> raises <code>NameError</code> whenever <code>flag</code> is false. No compiler warned you, because the binding only happens when the branch runs. Give the name a value before the branch."),
 ]),

 s7=exercises([
  ("Easy","Predict, then run: <code>a = [1,2]; b = a; a = [9,9]; print(b)</code>. Explain in one sentence why the answer differs from the quiz above."),
  ("Medium","Write three lines that leave two names pointing at two <em>different</em> lists with identical contents. Then prove they are different objects using <code>is</code> and <code>==</code>, and say in one sentence what the difference between those two operators is."),
  ("Stretch","In C, describe what <code>int *p = &amp;x; int *q = p;</code> does. Then explain how Python's <code>b = a</code> is like it and how it differs — specifically, what Python has no equivalent of."),
 ]),

 s8=recap("What to carry forward",[
  "A Python name is a <b>tag tied to an object</b>, not a box holding bytes.",
  "<b>Types live on values, not names.</b> <code>x</code> can hold an int then a string; <code>type(x)</code> asks the object.",
  "<code>b = a</code> <b>never copies</b> — it ties a second name to the same object.",
  "<code>=</code> re-ties a name; <b>mutating methods</b> like <code>.append()</code> change the object everyone can see.",
  "Lists, dicts, sets are <b>mutable</b>. Numbers, strings, tuples are <b>immutable</b> — which is why they feel safe.",
  "Never name a variable <code>list</code>, <code>str</code>, <code>sum</code> or <code>type</code>.",
 ]),
),

# ───────────────────────────────────────────────────────────── 1.2
dict(
 id="1.2", short="Numbers and arithmetic",
 title="Numbers and arithmetic; //, %, **",
 sub="Python integers never overflow, division always gives a float, and 0.1 + 0.2 is not 0.3. Two of those will delight you and one will eventually cost you an afternoon.",
 mins="12", meta3="No setup needed",
 next=("Py_Lesson_1_3.html","1.3 Strings"),
 cobra={
  "s1":"No int overflow. Genuinely none.",
  "s2":"Two divisions. Learn which is which.",
  "s3":"Watch the types in the comments.",
  "s4":"Match the operator to the job.",
  "s5":"Floats. Everyone meets this once.",
  "s6":"The // rounding one surprises people.",
  "s7":"Try the factorial. It really is unbounded.",
  "s8":"Next: strings, which behave like sequences."
 },

 s1="""<p class="lead">In C you choose a numeric type and live with its edges: <code>int</code> overflows around two billion, <code>/</code> truncates when both sides are integers, and you cast to control it.</p>
  <p>Python removes two of those problems and keeps the third. Integers grow to whatever size fits in memory — <code>2 ** 1000</code> is an ordinary expression with an exact answer. Division always produces a float, so <code>7 / 2</code> is <code>3.5</code>, never <code>3</code>.</p>
  <p>What Python does <em>not</em> fix is floating point. <code>0.1 + 0.2</code> is not <code>0.3</code>, here or in C or anywhere else, and knowing why keeps you out of a trap that appears the first time you compare two computed prices.</p>""",

 s2="""<p>Three numeric types, and you will use two of them.</p>
  <table class="cmp">
    <tr><th>Type</th><th>What it is</th><th>Edge to know</th></tr>
    <tr><td>int</td><td>Whole numbers, unbounded</td><td>No overflow, ever. Big ones just get slower.</td></tr>
    <tr><td>float</td><td>Decimals — 64-bit, same as C's <code>double</code></td><td>Approximate. About 15–17 significant digits.</td></tr>
    <tr><td>Decimal</td><td>Exact decimal arithmetic, from the stdlib</td><td>Slower. Use it for money.</td></tr>
  </table>
  <p>And two divisions, which is the thing to fix in your fingers:</p>
  <div class="two-col">
    <div><h4><code>/</code> true division</h4><p>Always returns a float. <code>6 / 3</code> is <code>2.0</code>, not <code>2</code>. Even when it divides evenly.</p></div>
    <div><h4><code>//</code> floor division</h4><p>Divides and rounds <em>down</em>. <code>7 // 2</code> is <code>3</code>. This is closest to C's integer <code>/</code>, but not identical — see the mistakes.</p></div>
  </div>
  """ + src("notes","Your <code>2_Module_Math.py</code> script already covers <code>math.floor</code>, <code>math.ceil</code> and <code>math.sqrt</code>. Those are the same operations reached a different way — <code>a // b</code> is <code>math.floor(a / b)</code>, and for large numbers the operator is both faster and exact where the float route is not."),

 s3="""<p>The five arithmetic operators, and where the types land.</p>
  """ + code("numbers.py",
  '''<span class="f">print</span>(<span class="n">7</span> + <span class="n">2</span>)      <span class="c"># 9      int</span>
<span class="f">print</span>(<span class="n">7</span> - <span class="n">2</span>)      <span class="c"># 5      int</span>
<span class="f">print</span>(<span class="n">7</span> * <span class="n">2</span>)      <span class="c"># 14     int</span>
<span class="f">print</span>(<span class="n">7</span> / <span class="n">2</span>)      <span class="c"># 3.5    float — ALWAYS</span>
<span class="f">print</span>(<span class="n">6</span> / <span class="n">3</span>)      <span class="c"># 2.0    float, even though it divides evenly</span>
<span class="f">print</span>(<span class="n">7</span> // <span class="n">2</span>)     <span class="c"># 3      int — floor division</span>
<span class="f">print</span>(<span class="n">7</span> % <span class="n">2</span>)      <span class="c"># 1      remainder</span>
<span class="f">print</span>(<span class="n">7</span> ** <span class="n">2</span>)     <span class="c"># 49     power (C needs pow())</span>

<span class="c"># no overflow — this is exact, all 302 digits of it</span>
<span class="f">print</span>(<span class="n">2</span> ** <span class="n">1000</span>)'''
  ) + """
  """ + ann([
    ("<code>/</code>","The one that catches C programmers. If you want an integer back, you want <code>//</code>. Using <code>/</code> where an index is expected gives <code>TypeError: list indices must be integers</code>."),
    ("<code>%</code>","Remainder. <code>n % 2 == 0</code> tests even; <code>n % 15 == 0</code> is the FizzBuzz test you already wrote. On negatives Python differs from C — see the mistakes."),
    ("<code>**</code>","Power. <code>2 ** 10</code> is 1024. Also does roots: <code>9 ** 0.5</code> is 3.0."),
    ("<code>2 ** 1000</code>","Prints a 302-digit integer, exactly. No <code>long long</code>, no big-number library. This is one of the genuinely nice things about Python."),
  ]),

 s4=matcher([
  ("&ldquo;How many whole boxes of 12 do I need for 100 items?&rdquo;",
   [("a","100 / 12"),("b","100 // 12"),("c","100 % 12")],"b"),
  ("&ldquo;How many items are left over after filling whole boxes?&rdquo;",
   [("a","100 % 12"),("b","100 // 12"),("c","100 ** 12")],"a"),
  ("&ldquo;What is the exact average of these two prices?&rdquo;",
   [("a","(a + b) // 2"),("b","(a + b) % 2"),("c","(a + b) / 2")],"c"),
 ]),

 s5=quiz(
  "A price calculation. What prints?",
  code("money.py",
  '''<span class="n">total</span> = <span class="n">0.1</span> + <span class="n">0.2</span>
<span class="f">print</span>(<span class="n">total</span>)
<span class="f">print</span>(<span class="n">total</span> == <span class="n">0.3</span>)'''),
  [("a","0.3 then True"),
   ("b","0.30000000000000004 then False"),
   ("c","0.3 then False")],
  "b",
  "<strong>0.30000000000000004, then False.</strong> Neither 0.1 nor 0.2 can be written exactly in binary, any more than ⅓ can be written exactly in decimal. The tiny errors add up and show.<p style=\"margin:10px 0 0\">This is not a Python flaw — C, Java and your calculator app all do it. What matters is the habit it forces: <strong>never compare floats with <code>==</code></strong>. Compare within a tolerance:</p><p style=\"margin:10px 0 0\"><code>math.isclose(total, 0.3)</code> &nbsp;→&nbsp; True</p><p style=\"margin:10px 0 0\">And for money specifically, use <code>Decimal(&quot;0.1&quot;)</code> from the <code>decimal</code> module, which is exact because it works in base 10. Slower, but a rounding error in a total is not a trade you want.</p>"),

 s6=mistakes([
  ("➗","Using <code>/</code> where you meant <code>//</code>","<code>mid = len(items) / 2</code> gives a float, and <code>items[mid]</code> then raises <code>TypeError: list indices must be integers or slices, not float</code>. In C the same line would have silently truncated. Python refuses instead — which is safer, but only if you recognise the message."),
  ("➖","Assuming <code>//</code> and <code>%</code> behave like C on negatives","C truncates toward zero: <code>-7 / 2</code> is <code>-3</code>. Python floors: <code>-7 // 2</code> is <code>-4</code>. And <code>-7 % 2</code> is <code>1</code> in Python but <code>-1</code> in C. Python's rule is that the remainder takes the sign of the divisor. If you are porting arithmetic from C, check every negative case."),
  ("💸","Using floats for money","Add ten prices and compare to an expected total and it will eventually fail by a fraction of a cent. Either work in integer minor units — store 1250 rather than 12.50 — or use <code>decimal.Decimal</code>. Pick one before the first bug, not after."),
 ]),

 s7=exercises([
  ("Easy","Compute how many complete weeks are in 1000 days, and how many days are left over. Two lines, using <code>//</code> and <code>%</code>."),
  ("Medium","Write a loop that computes 100 factorial by repeated multiplication. Print it. Confirm it is exact and count the digits with <code>len(str(result))</code> — then note what you would have needed in C to get the same answer."),
  ("Stretch","Add <code>0.1</code> to itself ten times in a loop and compare the result to <code>1.0</code> with <code>==</code>, then with <code>math.isclose</code>. Then do the same using <code>Decimal(&quot;0.1&quot;)</code>. Write one sentence on when the extra effort is worth it."),
 ]),

 s8=recap("What to carry forward",[
  "Python <b>ints never overflow</b>. <code>2 ** 1000</code> is exact and ordinary.",
  "<code>/</code> <b>always</b> returns a float. <code>//</code> floors to an int. Index with <code>//</code>.",
  "<code>%</code> is remainder, <code>**</code> is power — no <code>pow()</code> needed.",
  "On negatives Python <b>floors</b> where C <b>truncates</b>: <code>-7 // 2</code> is <code>-4</code>, not <code>-3</code>.",
  "<b>Never compare floats with <code>==</code></b>. Use <code>math.isclose()</code>.",
  "For money use integer minor units or <code>decimal.Decimal</code>, decided up front.",
 ]),
),

# ───────────────────────────────────────────────────────────── 1.3
dict(
 id="1.3", short="Strings",
 title="Strings — creation, indexing, slicing",
 sub="A Python string is a sequence you can index, slice and loop over — and one you can never change. Both halves of that matter, and the slicing notation you learn here reappears on every list in Part III.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_1_4.html","1.4 String methods"),
 cobra={
  "s1":"No char type. No terminator. No buffer.",
  "s2":"Two rulers — count from the left, or the right.",
  "s3":"The colon is the whole idea.",
  "s4":"Slice it yourself in the notebook.",
  "s5":"Out of range? Depends how you asked.",
  "s6":"Immutability trips every C programmer once.",
  "s7":"Palindromes in one line. Try it.",
  "s8":"Next: the methods that do the real work."
 },

 s1="""<p class="lead">In C a string is an array of <code>char</code> ending in a zero byte, and half the work is remembering that.</p>
  <p>Python has no character type at all — a single character is just a string of length one. There is no terminator, no buffer to size, no <code>strlen</code> walking the array to count. <code>len(s)</code> is instant because the string knows its own length.</p>
  <p>What you get instead is a <em>sequence</em>: something you can index, slice, loop over and test membership in. Learn the notation here and it transfers unchanged to lists, tuples and ranges later.</p>""",

 s2="""<p>Every position has two numbers: one counting forward from 0, one counting backward from &minus;1.</p>
  <div class="model">
    <svg viewBox="0 0 620 150" role="img" aria-label="The string PYTHON with forward indices 0 to 5 and negative indices minus 6 to minus 1">
      <text x="10" y="22" font-family="JetBrains Mono, monospace" font-size="11" fill="#7a8c80">index</text>
      <text x="10" y="122" font-family="JetBrains Mono, monospace" font-size="11" fill="#7a8c80">negative</text>
      <g font-family="JetBrains Mono, monospace" font-size="22" text-anchor="middle">
        <rect x="96"  y="40" width="62" height="52" rx="6" fill="#fbfcf6" stroke="#d2dacb"/><text x="127" y="76" fill="#1a2820">P</text>
        <rect x="158" y="40" width="62" height="52" rx="6" fill="#fbfcf6" stroke="#d2dacb"/><text x="189" y="76" fill="#1a2820">Y</text>
        <rect x="220" y="40" width="62" height="52" rx="6" fill="#fbfcf6" stroke="#d2dacb"/><text x="251" y="76" fill="#1a2820">T</text>
        <rect x="282" y="40" width="62" height="52" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="313" y="76" fill="#234f3b">H</text>
        <rect x="344" y="40" width="62" height="52" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="375" y="76" fill="#234f3b">O</text>
        <rect x="406" y="40" width="62" height="52" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="437" y="76" fill="#234f3b">N</text>
      </g>
      <g font-family="JetBrains Mono, monospace" font-size="12.5" fill="#41564a" text-anchor="middle">
        <text x="127" y="30">0</text><text x="189" y="30">1</text><text x="251" y="30">2</text>
        <text x="313" y="30">3</text><text x="375" y="30">4</text><text x="437" y="30">5</text>
        <text x="127" y="112">-6</text><text x="189" y="112">-5</text><text x="251" y="112">-4</text>
        <text x="313" y="112">-3</text><text x="375" y="112">-2</text><text x="437" y="112">-1</text>
      </g>
      <text x="490" y="62" font-family="EB Garamond, serif" font-size="13.5" fill="#7a8c80">s[3:] is the</text>
      <text x="490" y="80" font-family="EB Garamond, serif" font-size="13.5" fill="#7a8c80">shaded part</text>
    </svg>
  </div>
  <p>Slicing is written <code>s[start:stop]</code> and the rule that makes everything else consistent is: <strong>start is included, stop is excluded</strong>. So <code>s[0:3]</code> is <code>&quot;PYT&quot;</code> — three characters, positions 0, 1 and 2.</p>
  <p>That looks arbitrary until you notice two things fall out of it for free. <code>s[:n]</code> and <code>s[n:]</code> split the string with no overlap and nothing lost. And <code>len(s[a:b])</code> is just <code>b - a</code>. Both are wrong under any other convention.</p>
  <p>The second fact about strings: <strong>they cannot be changed.</strong> <code>s[0] = &quot;J&quot;</code> is an error. Every operation that looks like it edits a string actually builds a new one.</p>""",

 s3="""<p>Creating, indexing, slicing.</p>
  """ + code("strings.py",
  '''<span class="n">s</span> = <span class="s">"PYTHON"</span>
<span class="n">t</span> = <span class="s">'single quotes work too'</span>
<span class="n">long</span> = <span class="s">"""three quotes
span several lines"""</span>

<span class="f">print</span>(<span class="f">len</span>(<span class="n">s</span>))        <span class="c"># 6</span>
<span class="f">print</span>(<span class="n">s</span>[<span class="n">0</span>])          <span class="c"># P   — first</span>
<span class="f">print</span>(<span class="n">s</span>[-<span class="n">1</span>])         <span class="c"># N   — last, no len() needed</span>
<span class="f">print</span>(<span class="n">s</span>[<span class="n">0</span>:<span class="n">3</span>])        <span class="c"># PYT — 0,1,2. Stop is excluded.</span>
<span class="f">print</span>(<span class="n">s</span>[:<span class="n">3</span>])         <span class="c"># PYT — start defaults to 0</span>
<span class="f">print</span>(<span class="n">s</span>[<span class="n">3</span>:])         <span class="c"># HON — stop defaults to the end</span>
<span class="f">print</span>(<span class="n">s</span>[::<span class="n">2</span>])        <span class="c"># PTO — every 2nd character</span>
<span class="f">print</span>(<span class="n">s</span>[::-<span class="n">1</span>])       <span class="c"># NOHTYP — reversed</span>

<span class="f">print</span>(<span class="s">"TH"</span> <span class="k">in</span> <span class="n">s</span>)     <span class="c"># True — substring test, reads like English</span>'''
  ) + """
  """ + ann([
    ("quotes","<code>'</code> and <code>&quot;</code> are identical in meaning — pick whichever avoids escaping. <code>&quot;it's&quot;</code> needs no backslash; <code>'he said &quot;hi&quot;'</code> neither. Triple quotes hold newlines and are how docstrings are written."),
    ("<code>s[-1]</code>","The last character. In C this is <code>s[strlen(s)-1]</code>. Negative indexing removes a whole category of off-by-one."),
    ("<code>[::2]</code>","The third slot is <em>step</em>. <code>s[start:stop:step]</code>."),
    ("<code>[::-1]</code>","Step of &minus;1 walks backwards — the idiomatic reverse. It works on lists too."),
    ("<code>in</code>","Substring test. Compare with C's <code>strstr(haystack, needle) != NULL</code>."),
  ]),

 s4=tryit_notebook(NB_STR,"Open the Strings notebook",
   "Slicing is one of those things that only sticks once your own fingers have got it wrong a few times. The Strings notebook has ten runnable sections — try slicing past the end, try a negative step, try to assign to a character and read the error."),

 s5=quiz(
  "One of these two lines raises an error. Which, and why?",
  code("edges.py",
  '''<span class="n">s</span> = <span class="s">"PYTHON"</span>       <span class="c"># length 6</span>
<span class="f">print</span>(<span class="n">s</span>[<span class="n">10</span>])
<span class="f">print</span>(<span class="n">s</span>[<span class="n">2</span>:<span class="n">10</span>])'''),
  [("a","Both raise IndexError — 10 is out of range either way."),
   ("b","Neither — Python clamps both to the end of the string."),
   ("c","s[10] raises IndexError; s[2:10] quietly returns 'THON'.")],
  "c",
  "<strong>Indexing is strict; slicing is forgiving.</strong> <code>s[10]</code> asks for a character that does not exist, so Python raises <code>IndexError: string index out of range</code>. <code>s[2:10]</code> asks for a range, and Python gives you the overlap with what exists — <code>'THON'</code>, no error.<p style=\"margin:10px 0 0\">That asymmetry is deliberate and useful: <code>s[:200]</code> is a safe way to take &ldquo;up to the first 200 characters&rdquo; without checking the length first. But it also means a slice bug stays silent. If a slice returns an empty string when you expected content, check your indices — nothing will have complained.</p>"),

 s6=mistakes([
  ("🔒","Trying to change a character in place","<code>s[0] = &quot;J&quot;</code> raises <code>TypeError: 'str' object does not support item assignment</code>. Strings are immutable. Build a new one instead: <code>&quot;J&quot; + s[1:]</code>. Coming from C, where a string <em>is</em> a writable array, this is the biggest adjustment."),
  ("🔁","Building a long string by repeated <code>+=</code> in a loop","Every <code>+=</code> creates a whole new string and throws the old one away. For a few dozen pieces it does not matter; for tens of thousands it becomes quadratic and slow. Collect the pieces in a list and <code>&quot;&quot;.join(parts)</code> at the end — covered in 1.4."),
  ("↔️","Forgetting that stop is excluded","<code>s[0:len(s)]</code> is the whole string, not one short — but <code>s[0:len(s)-1]</code> silently drops the last character. When you catch yourself writing <code>-1</code> inside a slice, check whether you actually wanted it."),
 ]),

 s7=exercises([
  ("Easy","Given <code>s = &quot;engineering&quot;</code>, print: the first three characters, the last three, every second character, and the whole thing reversed. Four slices, no loops."),
  ("Medium","Write a one-line expression that is <code>True</code> when a string is a palindrome, ignoring case. Test it on <code>&quot;Level&quot;</code> and <code>&quot;Python&quot;</code>."),
  ("Stretch","<code>s[::-1]</code> reverses a string. Explain why the same expression also reverses a list, and what that says about what <code>[start:stop:step]</code> actually belongs to — the string, or something more general."),
 ]),

 s8=recap("What to carry forward",[
  "No <code>char</code> type, no terminator — a single character is a <b>string of length 1</b>.",
  "Two rulers: <code>0..n-1</code> forward and <code>-1..-n</code> backward. <code>s[-1]</code> is the last item.",
  "<code>s[start:stop:step]</code> — <b>start included, stop excluded</b>. That is why <code>s[:n] + s[n:]</code> is the whole string.",
  "<b>Indexing is strict, slicing is forgiving.</b> <code>s[10]</code> raises; <code>s[2:10]</code> just clamps.",
  "<code>s[::-1]</code> reverses. <code>&quot;ab&quot; in s</code> tests for a substring.",
  "Strings are <b>immutable</b> — every &ldquo;edit&rdquo; builds a new string.",
 ]),
),

# ───────────────────────────────────────────────────────────── 1.4
dict(
 id="1.4", short="String methods",
 title="String methods, split, join, find, replace",
 sub="Almost every text job you will ever do is four methods deep. This is the lesson that replaces about two hundred lines of C string handling with about six.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_1_5.html","1.5 f-strings"),
 cobra={
  "s1":"Six methods cover nearly everything.",
  "s2":"Methods return; they never edit.",
  "s3":"split and join are inverses. Mostly.",
  "s4":"Pick the method for the job.",
  "s5":"strip() does not do what its name suggests.",
  "s6":"The find/index difference matters.",
  "s7":"Parse a real line of data.",
  "s8":"Next: putting values into text properly."
 },

 s1="""<p class="lead">Splitting a line of CSV in C means <code>strtok</code>, a mutable buffer, and remembering that it destroys the input.</p>
  <p>In Python it is <code>line.split(&quot;,&quot;)</code>, which returns a list and leaves the original untouched. That is the shape of this whole lesson: a small set of methods that read like verbs, none of which modify anything.</p>
  <p>You have already used most of these in the beginner practice notebooks — the word-count exercise, the Caesar cipher, the Hangman word handling. This lesson names them properly and points at the two that behave differently from how they read.</p>""",

 s2="""<p>A <em>method</em> is a function that belongs to an object. You call it with a dot: <code>s.upper()</code> rather than <code>upper(s)</code>. Discovering them is easy — in a notebook or REPL, type <code>s.</code> and press Tab.</p>
  <p>The rule that governs all of them: <strong>a string method never changes the string. It returns a new one.</strong> Which means this line does nothing at all:</p>
  """ + code("nothing.py",
  '''<span class="n">name</span> = <span class="s">"  aniket  "</span>
<span class="n">name</span>.<span class="f">strip</span>()          <span class="c"># computes "aniket" and throws it away</span>
<span class="f">print</span>(<span class="n">name</span>)             <span class="c"># "  aniket  " — unchanged</span>

<span class="n">name</span> = <span class="n">name</span>.<span class="f">strip</span>()   <span class="c"># this is what you meant</span>'''
  ) + """
  """ + src("fresh","This catches everybody at least once, because in C most string functions <em>do</em> modify in place. In Python, if a string method's result is not assigned to something, the work is discarded. When a text transformation &ldquo;does nothing&rdquo;, this is nearly always why."),

 s3="""<p>The six that matter, and one pairing worth memorising.</p>
  """ + code("methods.py",
  '''<span class="n">line</span> = <span class="s">"  Aniket,Tokyo,Engineer  "</span>

<span class="c"># 1 — clean the edges</span>
<span class="n">line</span> = <span class="n">line</span>.<span class="f">strip</span>()              <span class="c"># "Aniket,Tokyo,Engineer"</span>

<span class="c"># 2 — split on a separator → a LIST</span>
<span class="n">parts</span> = <span class="n">line</span>.<span class="f">split</span>(<span class="s">","</span>)         <span class="c"># ['Aniket', 'Tokyo', 'Engineer']</span>

<span class="c"># 3 — join a list back into a string</span>
<span class="n">out</span> = <span class="s">" | "</span>.<span class="f">join</span>(<span class="n">parts</span>)         <span class="c"># "Aniket | Tokyo | Engineer"</span>

<span class="c"># 4 — case</span>
<span class="f">print</span>(<span class="n">line</span>.<span class="f">upper</span>(), <span class="n">line</span>.<span class="f">lower</span>())

<span class="c"># 5 — replace every occurrence</span>
<span class="f">print</span>(<span class="n">line</span>.<span class="f">replace</span>(<span class="s">","</span>, <span class="s">"; "</span>))

<span class="c"># 6 — where is it? -1 means "not there"</span>
<span class="f">print</span>(<span class="n">line</span>.<span class="f">find</span>(<span class="s">"Tokyo"</span>))       <span class="c"># 7</span>
<span class="f">print</span>(<span class="n">line</span>.<span class="f">find</span>(<span class="s">"Osaka"</span>))       <span class="c"># -1</span>'''
  ) + """
  """ + ann([
    ("<code>.strip()</code>","Removes whitespace from <em>both ends only</em> — never the middle. <code>.lstrip()</code> and <code>.rstrip()</code> do one side. Essential on anything read from a file, because of trailing newlines."),
    ("<code>.split()</code>","With no argument it splits on any run of whitespace and drops empties — which is what you want for prose. With an argument it splits on exactly that separator, and keeps empties."),
    ("<code>.join()</code>","Reads backwards at first: the <em>separator</em> owns the method. <code>&quot;, &quot;.join(items)</code>. Say it as &ldquo;join these with this&rdquo;. This is also the fast way to build a long string."),
    ("<code>.find()</code>","Returns the index, or <code>-1</code> if absent. Its sibling <code>.index()</code> raises <code>ValueError</code> instead. Use <code>in</code> when you only want a yes/no."),
  ]) + """
  <p>Three more that pay for themselves: <code>.startswith()</code> and <code>.endswith()</code> for prefix and suffix tests, and <code>.count(sub)</code> for how many times something appears.</p>""",

 s4=matcher([
  ("Turn <code>&quot;a,b,c&quot;</code> into a list of three items.",
   [("a",'"a,b,c".split(",")'),("b",'",".join("a,b,c")'),("c",'list("a,b,c")')],"a"),
  ("Turn <code>[&quot;a&quot;,&quot;b&quot;,&quot;c&quot;]</code> into <code>&quot;a-b-c&quot;</code>.",
   [("a",'["a","b","c"].join("-")'),("b",'"-".join(["a","b","c"])'),("c",'"-".split(["a","b","c"])')],"b"),
  ("Remove the trailing newline from a line read out of a file.",
   [("a",'line.replace("\\\\n")'),("b",'line[:-1]'),("c",'line.rstrip()')],"c"),
 ]),

 s5=quiz(
  "<code>.strip()</code> takes an optional argument. What does this print?",
  code("strip.py",
  '''<span class="f">print</span>(<span class="s">"xxhelloxx"</span>.<span class="f">strip</span>(<span class="s">"x"</span>))
<span class="f">print</span>(<span class="s">"mississippi"</span>.<span class="f">strip</span>(<span class="s">"mip"</span>))'''),
  [("a","hello then ssissss"),
   ("b","hello then ssiss"),
   ("c","hello then mississippi")],
  "b",
  "<strong>hello, then ssiss.</strong> The argument is not a prefix to remove — it is a <em>set of characters</em>. <code>.strip(&quot;mip&quot;)</code> chews inward from both ends removing any of m, i or p, and stops at the first character not in that set. From the left it eats <code>m</code>, <code>i</code>; from the right <code>i</code>, <code>p</code>, <code>p</code>, <code>i</code>. What survives is <code>ssiss</code>.<p style=\"margin:10px 0 0\">The trap is code like <code>filename.strip(&quot;.txt&quot;)</code>, meant to remove an extension. On <code>&quot;report.txt&quot;</code> it happens to work. On <code>&quot;test.txt&quot;</code> it returns <code>&quot;es&quot;</code> — it ate the leading <code>t</code> too. Use <code>.removesuffix(&quot;.txt&quot;)</code> (3.9+) or <code>pathlib</code>, covered in 6.2.</p>"),

 s6=mistakes([
  ("🪞","Forgetting to assign the result","<code>s.upper()</code> on its own line does nothing. Every string method returns; none mutate. If a transformation appears to have no effect, look for a missing <code>s = </code>."),
  ("🔍","Using <code>.index()</code> when you meant <code>.find()</code>","<code>.find()</code> returns <code>-1</code> for absent; <code>.index()</code> raises <code>ValueError</code>. Neither is wrong — but <code>if s.find(x)</code> is a bug, because <code>-1</code> is truthy and index <code>0</code> is falsy. Write <code>if s.find(x) != -1</code>, or better, <code>if x in s</code>."),
  ("🧵","Splitting on <code>&quot;,&quot;</code> to parse real CSV","Fine for clean data. It breaks the moment a field contains a quoted comma — <code>&quot;Tokyo, Japan&quot;</code> becomes two fields. For real files use the <code>csv</code> module (Part VI.3). Your <code>.split()</code> is for simple, known-shape text."),
 ]),

 s7=exercises([
  ("Easy","Given <code>&quot;  the quick brown fox  &quot;</code>, produce a list of the four words with no leading or trailing spaces. One line."),
  ("Medium","Write a function that takes a full name like <code>&quot;Mangaonkar Aniket Ganesh&quot;</code> and returns <code>&quot;M. A. Ganesh&quot;</code> — first letters of all but the last part, then the last part in full. Use split, slicing and join."),
  ("Stretch","Your word-count exercise in the beginner notebook counted words in a paragraph. Rewrite it to be case-insensitive and to ignore trailing punctuation, using only the methods from this lesson — no regular expressions. Then note which case it still gets wrong."),
 ]),

 s8=recap("What to carry forward",[
  "String methods <b>return a new string</b> and never modify. Assign the result or lose it.",
  "<code>.strip()</code> cleans <b>both ends only</b> — and its argument is a <b>set of characters</b>, not a suffix.",
  "<code>.split(sep)</code> → list. <code>sep.join(list)</code> → string. The <b>separator owns</b> <code>join</code>.",
  "<code>.find()</code> returns <code>-1</code> when absent; <code>.index()</code> raises. For yes/no, use <code>in</code>.",
  "<code>.replace()</code> changes <b>every</b> occurrence unless you pass a count.",
  "Build long strings with <code>&quot;&quot;.join(parts)</code>, not repeated <code>+=</code>.",
 ]),
),

# ───────────────────────────────────────────────────────────── 1.5
dict(
 id="1.5", short="f-strings",
 title="f-strings and formatting output",
 sub="Putting a value into a sentence is the most common thing you will do in Python. There are four ways to do it, three of them are legacy, and the modern one is genuinely delightful.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_1_6.html","1.6 input() and type conversion"),
 cobra={
  "s1":"printf without the format-string archaeology.",
  "s2":"The f is the whole trick.",
  "s3":"Format specs after a colon.",
  "s4":"Build the line you would actually log.",
  "s5":"Alignment and width. Worth knowing.",
  "s6":"The missing f is the number-one typo.",
  "s7":"Format a real table.",
  "s8":"Next: getting values in from outside."
 },

 s1="""<p class="lead">In C, printing a name and a number means <code>printf(&quot;%s scored %d\\n&quot;, name, score)</code> — and getting the specifier wrong is undefined behaviour.</p>
  <p>Python's modern answer puts the expression where it appears in the sentence:</p>
  """ + code("",'<span class="f">print</span>(<span class="s">f"</span><span class="n">{name}</span><span class="s"> scored </span><span class="n">{score}</span><span class="s">"</span>)') + """
  <p>No positional matching, no type specifiers, nothing to keep in sync. These are <em>f-strings</em>, and since Python 3.6 they are the right default. You will still meet the older forms in code you read — this lesson covers the modern one properly and the old ones briefly, so you can recognise them.</p>""",

 s2="""<p>Put <code>f</code> before the opening quote. Then anything inside <code>{ }</code> is <strong>evaluated as Python and inserted</strong>.</p>
  """ + code("fstrings.py",
  '''<span class="n">name</span> = <span class="s">"Aniket"</span>
<span class="n">parts</span> = <span class="n">3</span>
<span class="n">rate</span>  = <span class="n">0.0825</span>

<span class="f">print</span>(<span class="s">f"</span><span class="n">{name}</span><span class="s"> checked </span><span class="n">{parts}</span><span class="s"> parts"</span>)

<span class="c"># any expression, not just a name</span>
<span class="f">print</span>(<span class="s">f"next batch: </span><span class="n">{parts * 2}</span><span class="s">"</span>)
<span class="f">print</span>(<span class="s">f"upper: </span><span class="n">{name.upper()}</span><span class="s">"</span>)

<span class="c"># = shows the expression AND its value — a debugging gift</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{rate = }</span><span class="s">"</span>)      <span class="c"># rate = 0.0825</span>'''
  ) + """
  """ + ann([
    ("the <code>f</code>","Without it you get the literal text <code>{name}</code>. This is the most common typo in Python, and it fails silently — no error, just wrong output."),
    ("expressions","Method calls, arithmetic, indexing — all fine inside the braces. Keep them short; a long expression buried in a string is hard to read."),
    ("<code>{rate = }</code>","Python 3.8+. Prints the expression text and its value. Faster than typing <code>print(&quot;rate =&quot;, rate)</code> and it never goes stale when you rename things."),
  ]) + """
  """ + src("fresh","You will also see <code>&quot;%s scored %d&quot; % (name, score)</code> — the oldest form, borrowed straight from C — and <code>&quot;{} scored {}&quot;.format(name, score)</code>. Both still work. Neither is worth writing new. Recognise them, and reach for f-strings."),

 s3="""<p>After a colon inside the braces comes a <em>format spec</em>: how the value should look.</p>
  """ + code("formatting.py",
  '''<span class="n">value</span> = <span class="n">1234.5678</span>

<span class="f">print</span>(<span class="s">f"</span><span class="n">{value:.2f}</span><span class="s">"</span>)      <span class="c"># 1234.57      2 decimal places</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{value:,.2f}</span><span class="s">"</span>)     <span class="c"># 1,234.57     thousands separator</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{value:10.2f}</span><span class="s">"</span>)    <span class="c">#    1234.57   width 10, right-aligned</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{0.0825:.1%}</span><span class="s">"</span>)     <span class="c"># 8.2%         as a percentage</span>

<span class="n">label</span> = <span class="s">"bolt"</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{label:&lt;10}</span><span class="s">|"</span>)     <span class="c"># bolt      |   left-align in 10</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{label:&gt;10}</span><span class="s">|"</span>)     <span class="c">#       bolt|   right-align</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{label:^10}</span><span class="s">|"</span>)     <span class="c">#    bolt   |   centre</span>'''
  ) + """
  """ + ann([
    ("<code>.2f</code>","Fixed-point, two decimals. Rounds for display only — the underlying value is untouched."),
    ("<code>,</code>","Thousands separators. <code>f&quot;{1234567:,}&quot;</code> gives <code>1,234,567</code>."),
    ("<code>10.2f</code>","Total width 10, two decimals, padded with spaces. This is what lines up columns."),
    ("<code>&lt; &gt; ^</code>","Left, right, centre. Numbers default to right, text to left — which is usually what you want in a table."),
  ]),

 s4=matcher([
  ("Show 0.0825 as <code>8.25%</code>.",
   [("a","f'{0.0825:.2%}'"),("b","f'{0.0825}%'"),("c","f'{0.0825:.2f}%'")],"a"),
  ("Show 1234567 as <code>1,234,567</code>.",
   [("a","f'{1234567:.,}'"),("b","f'{1234567:,}'"),("c","f'{1234567:n}'")],"b"),
  ("Pad the word <code>bolt</code> to 12 characters so a column lines up.",
   [("a","f'{\"bolt\":12}'"),("b","f'{\"bolt\".pad(12)}'"),("c","f'{12:\"bolt\"}'")],"a"),
 ]),

 s5=quiz(
  "One of these prints something other than a formatted value. Which, and what does it print?",
  code("oops.py",
  '''<span class="n">n</span> = <span class="n">7</span>
<span class="f">print</span>(<span class="s">f"count: </span><span class="n">{n}</span><span class="s">"</span>)
<span class="f">print</span>(<span class="s">"count: </span><span class="n">{n}</span><span class="s">"</span>)'''),
  [("a","Both print 'count: 7' — the f is optional."),
   ("b","The second prints the literal 'count: {n}'."),
   ("c","The second raises a NameError.")],
  "b",
  "<strong>It prints <code>count: {n}</code>, literally.</strong> Without the <code>f</code>, the braces are just characters. No error, no warning — the string is perfectly valid, it simply is not an f-string.<p style=\"margin:10px 0 0\">This is why the missing <code>f</code> is worth calling out on its own. Every other formatting mistake announces itself. This one produces output that looks almost right in a log file and is completely wrong. When you see literal braces in your output, that is the whole diagnosis.</p>"),

 s6=mistakes([
  ("🅵","Leaving out the <code>f</code>","Silent, and the only formatting error that produces no error. If your output contains <code>{</code> and <code>}</code>, this is why."),
  ("💬","Quote collision inside the braces","<code>f&quot;{d[&quot;key&quot;]}&quot;</code> ends the string early. Before Python 3.12 you must use different quotes inside: <code>f&quot;{d['key']}&quot;</code>. Easiest habit — double quotes outside, single inside."),
  ("🧮","Thinking <code>:.2f</code> rounds the value","It rounds the <em>display</em> only. <code>total</code> is unchanged, and summing displayed values will not match the displayed sum. If you need the value itself rounded, use <code>round(x, 2)</code> — and remember 1.2 on why money should not be a float at all."),
 ]),

 s7=exercises([
  ("Easy","Print your name, the current year, and a rate of 0.0825 shown as a percentage to one decimal — all in one f-string."),
  ("Medium","Given a list of (part_name, quantity, unit_price) tuples, print a table where names are left-aligned in 14 characters, quantities right-aligned in 5, and prices show two decimals with a thousands separator. It should line up."),
  ("Stretch","Take one <code>print()</code> call from your existing practice notebooks that uses comma-separated arguments, and rewrite it as an f-string. Then say which is more readable and why — there is a defensible answer either way."),
 ]),

 s8=recap("What to carry forward",[
  "<code>f&quot;...&quot;</code> — the <b>f is mandatory</b>, and forgetting it fails silently.",
  "Anything in <code>{ }</code> is <b>evaluated as Python</b>: names, arithmetic, method calls.",
  "<code>{x = }</code> prints both the expression and its value — the fastest debug print there is.",
  "After a colon comes the format spec: <code>.2f</code>, <code>,</code>, <code>10.2f</code>, <code>.1%</code>, <code>&lt; &gt; ^</code>.",
  "Formatting changes <b>display only</b>. The value is untouched.",
  "<code>%</code> and <code>.format()</code> are legacy — read them, don't write them.",
 ]),
),

# ───────────────────────────────────────────────────────────── 1.6
dict(
 id="1.6", short="input() and conversion",
 title="input(), type conversion, and the classic bug",
 sub="input() always hands back a string. Always. Every beginner in every language meets the bug that follows, and in Python it has a particularly clear shape.",
 mins="11", meta3="No setup needed",
 next=("Py_Lesson_1_7.html","1.7 Booleans and operators"),
 cobra={
  "s1":"Always a string. No exceptions.",
  "s2":"Convert at the boundary, not later.",
  "s3":"int() is strict — and that is a feature.",
  "s4":"Which conversion for which input?",
  "s5":"The classic. You have hit this one.",
  "s6":"int('3.0') fails. There is a reason.",
  "s7":"Make it survive a bad typist.",
  "s8":"Last of Part I: booleans."
 },

 s1="""<p class="lead">One rule, and the whole lesson follows from it: <strong><code>input()</code> returns a string.</strong></p>
  <p>Not a number when the user types a number. Not an integer when the prompt says &ldquo;enter a number&rdquo;. A string, every time, no matter what was typed.</p>
  <p>C makes you say what you want up front — <code>scanf(&quot;%d&quot;, &amp;n)</code> — and quietly does something strange when the input does not match. Python gives you text and makes converting it your explicit job. That is more honest, and it puts the error exactly where the bad data entered.</p>""",

 s2="""<p>Think of it as a boundary. Outside the program, everything is text. Inside, you want real types. Convert once, at the edge.</p>
  <div class="model">
    <svg viewBox="0 0 620 128" role="img" aria-label="Text enters from the user, is converted once at the boundary, and the program works with real types">
      <rect x="8" y="40" width="130" height="46" rx="9" fill="#f4f5ec" stroke="#d2dacb"/>
      <text x="73" y="62" font-family="EB Garamond, serif" font-size="14" fill="#41564a" text-anchor="middle">what the user</text>
      <text x="73" y="79" font-family="EB Garamond, serif" font-size="14" fill="#41564a" text-anchor="middle">typed: "25"</text>
      <path d="M144 63 h44" stroke="#7fa68b" stroke-width="2" marker-end="url(#a3)"/>
      <rect x="194" y="34" width="150" height="58" rx="9" fill="#dde7dd" stroke="#2f6b4f"/>
      <text x="269" y="58" font-family="JetBrains Mono, monospace" font-size="12.5" fill="#234f3b" text-anchor="middle">int(...)</text>
      <text x="269" y="77" font-family="EB Garamond, serif" font-size="13" fill="#41564a" text-anchor="middle">the boundary</text>
      <path d="M350 63 h44" stroke="#7fa68b" stroke-width="2" marker-end="url(#a3)"/>
      <rect x="400" y="40" width="150" height="46" rx="9" fill="#16352a"/>
      <text x="475" y="62" font-family="JetBrains Mono, monospace" font-size="13" fill="#a8d8ba" text-anchor="middle">25</text>
      <text x="475" y="79" font-family="EB Garamond, serif" font-size="12.5" fill="#7fa68b" text-anchor="middle">a real int</text>
      <text x="310" y="118" font-family="EB Garamond, serif" font-size="13" fill="#a98a4b" text-anchor="middle">convert once, here — not scattered through the program</text>
      <defs><marker id="a3" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M0 0 L8 4 L0 8 z" fill="#7fa68b"/></marker></defs>
    </svg>
  </div>
  <p>The converters are named after the types: <code>int()</code>, <code>float()</code>, <code>str()</code>, <code>bool()</code>. They are strict — <code>int(&quot;abc&quot;)</code> raises <code>ValueError</code> rather than guessing zero. That strictness is what makes the boundary useful: bad input fails immediately, at the point of entry, with a message naming the text that failed.</p>""",

 s3="""<p>The pattern, and what each converter accepts.</p>
  """ + code("age.py",
  '''<span class="n">raw</span> = <span class="f">input</span>(<span class="s">"How many parts? "</span>)   <span class="c"># always a string</span>
<span class="n">count</span> = <span class="f">int</span>(<span class="n">raw</span>)                     <span class="c"># convert at the boundary</span>
<span class="f">print</span>(<span class="s">f"double that is </span><span class="n">{count * 2}</span><span class="s">"</span>)

<span class="c"># the usual one-liner, once you trust the input</span>
<span class="n">count</span> = <span class="f">int</span>(<span class="f">input</span>(<span class="s">"How many parts? "</span>))'''
  ) + """
  """ + ann([
    ("<code>int(&quot;25&quot;)</code>","→ <code>25</code>. Surrounding whitespace is fine: <code>int(&quot; 25 &quot;)</code> works."),
    ("<code>int(&quot;25.0&quot;)</code>","<strong>ValueError.</strong> <code>int()</code> parses integers only. Use <code>int(float(&quot;25.0&quot;))</code> if you must accept both."),
    ("<code>float(&quot;3.5&quot;)</code>","→ <code>3.5</code>. Also accepts <code>&quot;3&quot;</code>, <code>&quot;1e6&quot;</code>, <code>&quot;inf&quot;</code>."),
    ("<code>int(3.9)</code>","→ <code>3</code>. Converting a float truncates <em>toward zero</em> — it does not round. <code>int(-3.9)</code> is <code>-3</code>, not <code>-4</code>. Note this differs from <code>//</code>, from 1.2."),
  ]) + """
  <p>To survive a bad typist, wrap it — the full treatment is Part V, but the shape is worth seeing now:</p>
  """ + code("safe.py",
  '''<span class="k">while</span> <span class="k">True</span>:
    <span class="k">try</span>:
        <span class="n">count</span> = <span class="f">int</span>(<span class="f">input</span>(<span class="s">"How many parts? "</span>))
        <span class="k">break</span>
    <span class="k">except</span> <span class="f">ValueError</span>:
        <span class="f">print</span>(<span class="s">"Please type a whole number."</span>)'''),

 s4=matcher([
  ("The user types <code>42</code> and you need to do arithmetic.",
   [("a","int(input())"),("b","input()"),("c","str(input())")],"a"),
  ("The user types <code>3.75</code> — a measurement.",
   [("a","int(input())"),("b","float(input())"),("c","input().float()")],"b"),
  ("You want to print a number inside a message built with <code>+</code>.",
   [("a","\"n is \" + n"),("b","\"n is \" + str(n)"),("c","\"n is \" + int(n)")],"b"),
 ]),

 s5=quiz(
  "The classic. The user types 5. What happens?",
  code("classic.py",
  '''<span class="n">n</span> = <span class="f">input</span>(<span class="s">"Pick a number: "</span>)
<span class="f">print</span>(<span class="n">n</span> * <span class="n">3</span>)'''),
  [("a","15"),
   ("b","555"),
   ("c","TypeError — you cannot multiply a string")],
  "b",
  "<strong>555.</strong> <code>n</code> is the string <code>&quot;5&quot;</code>, and multiplying a string by an integer <em>repeats</em> it. <code>&quot;5&quot; * 3</code> is <code>&quot;555&quot;</code>.<p style=\"margin:10px 0 0\">What makes this the classic bug is that it does not crash. It produces a plausible-looking wrong answer, and in a longer program the nonsense surfaces far from here. Compare with <code>n + 3</code>, which <em>does</em> raise <code>TypeError: can only concatenate str (not &quot;int&quot;) to str</code> — much kinder, because it fails immediately.</p><p style=\"margin:10px 0 0\">The fix is the habit from section 2: convert at the boundary. <code>n = int(input(...))</code> and the whole class of problem is gone.</p>"),

 s6=mistakes([
  ("🔤","Forgetting that <code>input()</code> is always a string","Even when the prompt says &ldquo;enter a number&rdquo;. Even when they enter a number. Convert on the same line you read, and the rest of the program can trust the type."),
  ("🔢","<code>int(&quot;3.0&quot;)</code> raising ValueError","Surprising, but consistent: <code>int()</code> parses an <em>integer literal</em>, and <code>&quot;3.0&quot;</code> is not one. It has nothing to do with the value being whole. Use <code>int(float(s))</code> when the text might have a decimal point."),
  ("✂️","Expecting <code>int()</code> to round","<code>int(3.9)</code> is <code>3</code> and <code>int(-3.9)</code> is <code>-3</code> — it truncates toward zero. <code>round(3.9)</code> gives <code>4</code>. And <code>-7 // 2</code> gives <code>-4</code>. Three different roundings; pick deliberately."),
 ]),

 s7=exercises([
  ("Easy","Ask for two numbers and print their sum. Make it actually add rather than concatenate — then deliberately remove the conversion and observe what it prints instead."),
  ("Medium","Write a prompt that keeps asking until it gets a whole number between 1 and 10, using the try/except loop above. Test it with letters, with 0, and with 5.5."),
  ("Stretch","Your Rock–Paper–Scissors and number-guessing projects in the beginner notebook both read user input. Find where each converts, and check what happens if the user types a word instead of a number. Fix whichever one crashes ungracefully."),
 ]),

 s8=recap("What to carry forward",[
  "<code>input()</code> <b>always returns a string</b> — no matter what was typed.",
  "Convert <b>at the boundary</b>: <code>n = int(input(...))</code>, once, where data enters.",
  "<code>&quot;5&quot; * 3</code> is <code>&quot;555&quot;</code>, not 15 — the classic bug, and it doesn't crash.",
  "<code>int()</code> is strict: <code>int(&quot;3.0&quot;)</code> raises. Use <code>int(float(s))</code> for either form.",
  "<code>int(3.9)</code> <b>truncates toward zero</b>; <code>round()</code> rounds; <code>//</code> floors.",
  "Wrap conversion in <code>try/except ValueError</code> whenever a human is typing.",
 ]),
),

# ───────────────────────────────────────────────────────────── 1.7
dict(
 id="1.7", short="Booleans and operators",
 title="Booleans, comparison and logical operators",
 sub="Python's and/or don't return True and False — they return one of the operands. That sounds like trivia until it explains three idioms you will read constantly.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_2_1.html","2.1 if / elif / else"),
 cobra={
  "s1":"True and False are real objects here.",
  "s2":"Short-circuit: the second half may never run.",
  "s3":"Chained comparisons. C cannot do this.",
  "s4":"Which comparison says what you mean?",
  "s5":"and returns an operand, not a boolean.",
  "s6":"is versus == . Get this right early.",
  "s7":"Guard a division. Order matters.",
  "s8":"Part I done. Next: decisions and loops."
 },

 s1="""<p class="lead">C got booleans late and grudgingly — zero is false, everything else is true, and <code>&amp;&amp;</code> yields 1 or 0.</p>
  <p>Python has real <code>True</code> and <code>False</code> objects, comparison operators that can be chained the way mathematics writes them, and — the interesting part — <code>and</code>/<code>or</code> that return <em>one of the values you gave them</em> rather than a boolean.</p>
  <p>That last behaviour is not a curiosity. It is the basis of several idioms you will meet in real code within a week, and it is why <code>x = name or &quot;anonymous&quot;</code> works.</p>""",

 s2="""<p>Six comparisons, three logical operators.</p>
  <table class="cmp">
    <tr><th>Operator</th><th>Means</th><th>Note</th></tr>
    <tr><td>== !=</td><td>equal / not equal</td><td>Compares <em>values</em>. Works on strings, lists, anything.</td></tr>
    <tr><td>&lt; &lt;= &gt; &gt;=</td><td>ordering</td><td>On strings this is dictionary order, capitals first.</td></tr>
    <tr><td>and or not</td><td>logic</td><td>Words, not <code>&amp;&amp; || !</code>. Those exist but mean bitwise.</td></tr>
    <tr><td>is / is not</td><td>same object?</td><td>Not the same as <code>==</code>. See the mistakes.</td></tr>
    <tr><td>in / not in</td><td>membership</td><td>Works on strings, lists, dicts, sets.</td></tr>
  </table>
  <p>Two properties do the real work.</p>
  <p><strong>Short-circuit.</strong> <code>a and b</code> does not evaluate <code>b</code> if <code>a</code> is falsy — the answer is already settled. Likewise <code>a or b</code> skips <code>b</code> when <code>a</code> is truthy. Same as C, but it matters more here because you will lean on it deliberately as a guard.</p>
  <p><strong>They return an operand.</strong> <code>and</code> returns the first falsy value, or the last value if none are falsy. <code>or</code> returns the first truthy value, or the last. Neither converts to a boolean.</p>
  """ + code("returns.py",
  '''<span class="f">print</span>(<span class="n">3</span> <span class="k">and</span> <span class="n">5</span>)          <span class="c"># 5    — both truthy, so the last</span>
<span class="f">print</span>(<span class="n">0</span> <span class="k">and</span> <span class="n">5</span>)          <span class="c"># 0    — first falsy, stops there</span>
<span class="f">print</span>(<span class="s">""</span> <span class="k">or</span> <span class="s">"anonymous"</span>)  <span class="c"># anonymous — first truthy</span>
<span class="f">print</span>(<span class="k">not</span> <span class="n">3</span>)            <span class="c"># False — not ALWAYS gives a boolean</span>'''),

 s3="""<p>Two things Python does that C cannot.</p>
  """ + code("compare.py",
  '''<span class="n">age</span> = <span class="n">25</span>

<span class="c"># 1 — chained comparison, written like mathematics</span>
<span class="k">if</span> <span class="n">18</span> &lt;= <span class="n">age</span> &lt; <span class="n">65</span>:
    <span class="f">print</span>(<span class="s">"working age"</span>)

<span class="c"># in C you would need:  age &gt;= 18 &amp;&amp; age &lt; 65</span>
<span class="c"># and in C, 18 &lt;= age &lt; 65 compiles and is ALWAYS true.</span>

<span class="c"># 2 — comparisons work on more than numbers</span>
<span class="f">print</span>(<span class="s">"apple"</span> &lt; <span class="s">"banana"</span>)      <span class="c"># True  — dictionary order</span>
<span class="f">print</span>([<span class="n">1</span>, <span class="n">2</span>] == [<span class="n">1</span>, <span class="n">2</span>])       <span class="c"># True  — element by element</span>
<span class="f">print</span>(<span class="s">"Zebra"</span> &lt; <span class="s">"apple"</span>)       <span class="c"># True  — capitals sort first!</span>

<span class="c"># the guard idiom — short-circuit doing real work</span>
<span class="k">if</span> <span class="n">items</span> <span class="k">and</span> <span class="n">items</span>[<span class="n">0</span>] == <span class="s">"x"</span>:
    <span class="f">print</span>(<span class="s">"starts with x"</span>)'''
  ) + """
  """ + ann([
    ("chaining","<code>18 &lt;= age &lt; 65</code> means what it looks like. In C the same text parses as <code>(18 &lt;= age) &lt; 65</code> — a 0 or 1 compared against 65, always true. A real class of C bug that simply cannot happen here."),
    ("<code>&quot;Zebra&quot; &lt; &quot;apple&quot;</code>","True, because comparison is by character code and uppercase letters come before lowercase. For human-order sorting, compare <code>.lower()</code> versions."),
    ("the guard","If <code>items</code> is empty, <code>and</code> stops and <code>items[0]</code> never runs — so no <code>IndexError</code>. Reverse the order and it crashes. This ordering is the point of short-circuit."),
  ]),

 s4=matcher([
  ("Test that two lists contain the same values.",
   [("a","a is b"),("b","a == b"),("c","a.equals(b)")],"b"),
  ("Check a value is between 1 and 10 inclusive.",
   [("a","1 <= n <= 10"),("b","1 <= n && n <= 10"),("c","n in (1, 10)")],"a"),
  ("Use a default when a name is empty.",
   [("a","name if name else default"),("b","name or default"),("c","both of these work")],"c"),
 ]),

 s5=quiz(
  "What does this print — and what type is it?",
  code("shortcircuit.py",
  '''<span class="n">name</span> = <span class="s">""</span>
<span class="n">display</span> = <span class="n">name</span> <span class="k">or</span> <span class="s">"anonymous"</span>
<span class="f">print</span>(<span class="n">display</span>, <span class="f">type</span>(<span class="n">display</span>).<span class="n">__name__</span>)'''),
  [("a","True bool — or produces a boolean"),
   ("b","anonymous str — or returns the first truthy operand"),
   ("c","'' str — the first operand wins either way")],
  "b",
  "<strong>anonymous, and it is a str.</strong> <code>or</code> evaluates <code>name</code>, finds <code>&quot;&quot;</code> is falsy, moves on, finds <code>&quot;anonymous&quot;</code> is truthy, and <strong>returns that object</strong> — not <code>True</code>.<p style=\"margin:10px 0 0\">This is the idiom <code>value = something or fallback</code>, and it is everywhere in Python. It works for <code>0</code>, <code>&quot;&quot;</code>, <code>[]</code>, <code>None</code> — every falsy value — which is usually what you want and occasionally exactly what you don't. If <code>0</code> is a <em>legitimate</em> value, <code>count or 10</code> will wrongly replace it. Then you want <code>count if count is not None else 10</code>.</p>"),

 s6=mistakes([
  ("🟰","Using <code>is</code> when you mean <code>==</code>","<code>is</code> asks &ldquo;the same object?&rdquo;; <code>==</code> asks &ldquo;the same value?&rdquo;. <code>a = [1,2]; b = [1,2]</code> — then <code>a == b</code> is True but <code>a is b</code> is False. Small integers and short strings are cached, so <code>x is 5</code> sometimes appears to work, which makes it worse. Use <code>is</code> only with <code>None</code>, <code>True</code>, <code>False</code>."),
  ("🧩","Writing <code>&amp;&amp;</code> and <code>||</code>","<code>&amp;</code> and <code>|</code> exist in Python but are <em>bitwise</em>. <code>3 &amp; 5</code> is 1, not True. <code>&amp;&amp;</code> is a plain <code>SyntaxError</code>. The words are <code>and</code>, <code>or</code>, <code>not</code>."),
  ("🕳️","Ordering a guard wrongly","<code>if items[0] == &quot;x&quot; and items:</code> crashes on an empty list — the index runs before the check. The test that protects must come first. Short-circuit only helps if you order it correctly."),
 ]),

 s7=exercises([
  ("Easy","Write a single chained comparison that is True when a temperature is between &minus;10 and 40 inclusive. Then write the C version and compare their readability."),
  ("Medium","Given <code>readings</code>, which may be an empty list, write one <code>if</code> that safely prints the first reading only when the list is non-empty and that reading is above 100. One line, using short-circuit."),
  ("Stretch","Explain why <code>0 or []</code> returns <code>[]</code> while <code>[] or 0</code> returns <code>0</code>, and what that tells you about which operand <code>or</code> returns when everything is falsy."),
 ]),

 s8=recap("What to carry forward",[
  "<code>and</code> / <code>or</code> return <b>an operand</b>, not a boolean. Only <code>not</code> always gives True/False.",
  "<b>Short-circuit</b> lets you guard: <code>if items and items[0] == 'x'</code>. Order matters.",
  "<code>value = something or fallback</code> is the default-value idiom — but it also replaces <code>0</code> and <code>&quot;&quot;</code>.",
  "Comparisons <b>chain</b>: <code>18 &lt;= age &lt; 65</code> means what it reads. In C the same text is a bug.",
  "<code>==</code> compares values; <code>is</code> compares identity. Use <code>is</code> only with <code>None</code>/<code>True</code>/<code>False</code>.",
  "The operators are the words <code>and or not</code>. <code>&amp;</code> and <code>|</code> are bitwise.",
 ]),
),
]
