# -*- coding: utf-8 -*-
"""Part IV — Functions."""
from build import src, code, ann, matcher, quiz, mistakes, exercises, recap, tryit_notebook

NB = "../fundamentals/08_functions.html"

LESSONS = [

# ───────────────────────────────────────────────────────────── 4.1
dict(
 id="4.1", short="Defining functions",
 title="Defining and calling; why functions exist",
 sub="No return type, no prototype, no header file. A Python function is four lines of ceremony less than a C one — which makes it cheap enough to write the small ones you would otherwise skip.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_4_2.html","4.2 Parameters"),
 cobra={
  "s1":"Cheap to write means you write more of them.",
  "s2":"def binds a name to a function object.",
  "s3":"Definition and call are different moments.",
  "s4":"Name the function well.",
  "s5":"Calling before defining. Order matters.",
  "s6":"The missing parentheses one is subtle.",
  "s7":"Extract a function from a loop.",
  "s8":"Next: how arguments actually work."
 },

 s1="""<p class="lead">In C, adding a small helper means a prototype, a return type, a definition, and often a header edit. The friction is enough that you inline the logic instead.</p>
  <p>Python's version is <code>def</code>, a name, and a colon. That is the whole declaration. No return type to choose, no forward declaration, no separate header.</p>
  <p>The consequence is behavioural rather than technical: because a function costs nothing to write, you write the three-line ones. And it is those small named pieces — <code>is_valid()</code>, <code>clean(line)</code>, <code>average(values)</code> — that make a program readable, far more than any comment.</p>""",

 s2="""<p><code>def</code> creates a function object and ties a name to it — the same binding you learned in 1.1. Functions are objects: you can pass them around, store them in lists, return them from other functions. That becomes the point of 4.6.</p>
  """ + code("shape.py",
  '''<span class="k">def</span> <span class="f">greet</span>(<span class="n">name</span>):
    <span class="s">"""Return a greeting for name."""</span>     <span class="c"># docstring — 4.4</span>
    <span class="k">return</span> <span class="s">f"Hello, </span><span class="n">{name}</span><span class="s">"</span>

<span class="n">msg</span> = <span class="f">greet</span>(<span class="s">"Aniket"</span>)     <span class="c"># the CALL — parentheses do it</span>
<span class="f">print</span>(<span class="n">msg</span>)

<span class="f">print</span>(<span class="n">greet</span>)               <span class="c"># &lt;function greet at 0x...&gt; — the object</span>
<span class="n">say</span> = <span class="n">greet</span>                <span class="c"># a second name for the same function</span>
<span class="f">print</span>(<span class="n">say</span>(<span class="s">"Cobra"</span>))        <span class="c"># works</span>'''
  ) + """
  """ + ann([
    ("<code>def</code>","Runs when Python reaches it, creating the object. Nothing inside the body executes until the function is called."),
    ("the colon and indent","Same block rule as 2.1 — the indented lines are the body."),
    ("<code>return</code>","Optional. A function with no <code>return</code> gives back <code>None</code>. Reaching the end of the body is the same as <code>return None</code>."),
    ("<code>say = greet</code>","No parentheses, so this ties a second name to the function itself rather than calling it. This distinction is section 6."),
  ]) + """
  """ + src("nb","Your <code>08_Functions.ipynb</code> covers all six lessons of this Part in ten sections — simple definitions, parameters, returns, defaults, keywords, <code>*args</code>, <code>**kwargs</code>, lambdas, nested functions, and an area-calculator example."),

 s3="""<p>Definition and call are two separate moments, and confusing them causes the error in section 5.</p>
  """ + code("moments.py",
  '''<span class="c"># --- definition time: Python stores the body, runs nothing ---</span>
<span class="k">def</span> <span class="f">area</span>(<span class="n">w</span>, <span class="n">h</span>):
    <span class="f">print</span>(<span class="s">"computing..."</span>)
    <span class="k">return</span> <span class="n">w</span> * <span class="n">h</span>

<span class="f">print</span>(<span class="s">"defined"</span>)          <span class="c"># prints first — no "computing..." yet</span>

<span class="c"># --- call time: now the body runs ---</span>
<span class="n">a</span> = <span class="f">area</span>(<span class="n">3</span>, <span class="n">4</span>)         <span class="c"># prints "computing..." and returns 12</span>
<span class="n">b</span> = <span class="f">area</span>(<span class="n">5</span>, <span class="n">2</span>)         <span class="c"># runs again, independently</span>

<span class="c"># a function with no return gives None</span>
<span class="k">def</span> <span class="f">log</span>(<span class="n">msg</span>):
    <span class="f">print</span>(<span class="s">f"[log] </span><span class="n">{msg}</span><span class="s">"</span>)

<span class="n">result</span> = <span class="f">log</span>(<span class="s">"started"</span>)
<span class="f">print</span>(<span class="n">result</span>)              <span class="c"># None</span>'''
  ) + """
  <p>When to extract a function, in practice: when a block needs a comment to explain it (the function name replaces the comment), when the same logic appears twice, or when a function has grown past about twenty lines and has an obvious inner step.</p>
  <p>Naming: lowercase with underscores, and a <strong>verb</strong> — <code>calculate_total</code>, <code>load_readings</code>, <code>is_valid</code>. Functions answering yes/no conventionally start with <code>is_</code> or <code>has_</code>, which makes <code>if is_valid(row):</code> read as a sentence.</p>""",

 s4=matcher([
  ("A function that returns True or False.",
   [("a","def check(row):"),("b","def is_valid(row):"),("c","def validation(row):")],"b"),
  ("Call the function and keep the answer.",
   [("a","result = area(3, 4)"),("b","result = area"),("c","area(3, 4)")],"a"),
  ("Refer to the function itself, without calling it.",
   [("a","area()"),("b","area"),("c","&area")],"b"),
 ]),

 s5=quiz(
  "What happens when this file runs?",
  code("order.py",
  '''<span class="f">print</span>(<span class="f">double</span>(<span class="n">5</span>))

<span class="k">def</span> <span class="f">double</span>(<span class="n">n</span>):
    <span class="k">return</span> <span class="n">n</span> * <span class="n">2</span>'''),
  [("a","Prints 10 — Python scans the file for definitions first."),
   ("b","NameError: name 'double' is not defined."),
   ("c","SyntaxError — functions must be defined before use.")],
  "b",
  "<strong><code>NameError: name 'double' is not defined</code>.</strong> Python runs the file top to bottom. At line 1 the <code>def</code> has not executed yet, so no name <code>double</code> exists.<p style=\"margin:10px 0 0\">This is the interpreted/compiled difference from 0.1 showing up again. A C compiler reads the whole file before generating anything, so it can resolve a call to a function defined later. Python simply has not got there yet.</p><p style=\"margin:10px 0 0\">Two useful consequences. <strong>Define before you call</strong> at the top level. But a function may freely call another defined <em>below</em> it, as long as neither runs until both definitions have — which is why the standard layout is: all the <code>def</code>s, then the code that uses them at the bottom.</p>"),

 s6=mistakes([
  ("()","Forgetting the parentheses when calling","<code>result = greet</code> ties <code>result</code> to the function object rather than calling it. No error — and then <code>print(result)</code> shows <code>&lt;function greet at 0x...&gt;</code>. Whenever output looks like that, a call is missing its <code>()</code>."),
  ("🕳️","Forgetting to return","A function that computes and prints but never returns gives back <code>None</code>. <code>total = add(2, 3)</code> then leaves <code>total</code> as <code>None</code>, and the failure surfaces later in an arithmetic error. If a function's job is to produce a value, it must <code>return</code> it."),
  ("📛","Naming a function after a built-in","<code>def sum(...)</code> shadows the built-in <code>sum</code> for the rest of the file — the same shadowing problem as 1.1, and harder to spot because the code reads perfectly well."),
 ]),

 s7=exercises([
  ("Easy","Write <code>celsius_to_f(c)</code> that returns the converted temperature. Call it three times and print the results. Then deliberately remove the <code>return</code> and observe what the caller gets."),
  ("Medium","Take a loop from your beginner notebook that both computes and prints — the grading exercise is a good candidate — and split it into a function that computes and returns, plus a loop that prints. Note why that split makes the logic testable."),
  ("Stretch","Write <code>is_prime(n)</code> returning True or False. Then use it in a comprehension to list the primes below 100. Compare the readability with the prime-checker you originally wrote as one long block."),
 ]),

 s8=recap("What to carry forward",[
  "<code>def name(params):</code> and an indented body. <b>No return type, no prototype.</b>",
  "<code>def</code> <b>creates a function object</b> and binds a name — functions are values you can pass around.",
  "The body runs only when <b>called</b>. Definition and call are separate moments.",
  "<b>Define before you call</b> at the top level — Python reads the file in order.",
  "No <code>return</code> means the function returns <code>None</code>.",
  "<code>f</code> is the function; <code>f()</code> calls it. Missing parentheses fails silently.",
 ]),
),

# ───────────────────────────────────────────────────────────── 4.2
dict(
 id="4.2", short="Parameters",
 title="Parameters: positional, keyword, default",
 sub="Python lets the caller name the arguments, and lets the definition supply fallbacks. Together they replace the overloaded-function zoo you would write in C — and hide one genuinely dangerous trap.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_4_3.html","4.3 *args and **kwargs"),
 cobra={
  "s1":"One function, several calling styles.",
  "s2":"Positional by order, keyword by name.",
  "s3":"Defaults go last. Always.",
  "s4":"Which call is clearest?",
  "s5":"The mutable default. Read this one twice.",
  "s6":"Defaults evaluate once, at definition.",
  "s7":"Give a function sensible defaults.",
  "s8":"Next: variable numbers of arguments."
 },

 s1="""<p class="lead">In C, a function that can be called three different ways means three functions, or a struct of options, or a variadic mess.</p>
  <p>Python gives one definition and lets the caller choose how to supply the arguments — by position, by name, or by leaving some out entirely and taking the defaults.</p>
  <p>This is why so many Python library functions have long signatures you can ignore. <code>print()</code> takes <code>sep</code>, <code>end</code>, <code>file</code> and <code>flush</code>; you have used it a hundred times without knowing.</p>""",

 s2="""<p>Two ways to pass, one way to default.</p>
  """ + code("params.py",
  '''<span class="k">def</span> <span class="f">order</span>(<span class="n">part</span>, <span class="n">qty</span>, <span class="n">priority</span>=<span class="s">"normal"</span>):
    <span class="f">print</span>(<span class="s">f"</span><span class="n">{qty}</span><span class="s"> x </span><span class="n">{part}</span><span class="s"> (</span><span class="n">{priority}</span><span class="s">)"</span>)

<span class="f">order</span>(<span class="s">"bolt"</span>, <span class="n">40</span>)                        <span class="c"># positional; priority defaults</span>
<span class="f">order</span>(<span class="s">"bolt"</span>, <span class="n">40</span>, <span class="s">"urgent"</span>)              <span class="c"># all positional</span>
<span class="f">order</span>(<span class="n">part</span>=<span class="s">"bolt"</span>, <span class="n">qty</span>=<span class="n">40</span>)              <span class="c"># all keyword</span>
<span class="f">order</span>(<span class="s">"bolt"</span>, <span class="n">priority</span>=<span class="s">"urgent"</span>, <span class="n">qty</span>=<span class="n">40</span>)  <span class="c"># mixed; keywords in any order</span>

<span class="c"># order(qty=40, "bolt")   → SyntaxError: positional after keyword</span>'''
  ) + """
  <p><strong>Positional</strong> arguments match by position, left to right. <strong>Keyword</strong> arguments match by name and may come in any order. The one rule: once you start using keywords in a call, everything after must also be keyword.</p>
  <p><strong>Defaults</strong> are written in the definition with <code>=</code>. Parameters with defaults must come <em>after</em> those without — otherwise a positional call would be ambiguous, and Python rejects the definition outright.</p>
  <p>When to use which, in practice: positional for the one or two obvious arguments, keyword for anything a reader could not guess. <code>order(&quot;bolt&quot;, 40, True)</code> is a puzzle at the call site; <code>order(&quot;bolt&quot;, 40, urgent=True)</code> is not.</p>""",

 s3="""<p>Defaults make a function grow options without breaking old calls.</p>
  """ + code("defaults.py",
  '''<span class="k">def</span> <span class="f">report</span>(<span class="n">values</span>, <span class="n">precision</span>=<span class="n">2</span>, <span class="n">label</span>=<span class="s">"total"</span>, <span class="n">show_count</span>=<span class="k">False</span>):
    <span class="n">total</span> = <span class="f">sum</span>(<span class="n">values</span>)
    <span class="n">line</span> = <span class="s">f"</span><span class="n">{label}</span><span class="s">: </span><span class="n">{total:.{precision}f}</span><span class="s">"</span>
    <span class="k">if</span> <span class="n">show_count</span>:
        <span class="n">line</span> += <span class="s">f" (</span><span class="n">{len(values)}</span><span class="s"> items)"</span>
    <span class="k">return</span> <span class="n">line</span>

<span class="f">print</span>(<span class="f">report</span>([<span class="n">1.5</span>, <span class="n">2.25</span>]))
<span class="c"># total: 3.75</span>

<span class="f">print</span>(<span class="f">report</span>([<span class="n">1.5</span>, <span class="n">2.25</span>], <span class="n">precision</span>=<span class="n">1</span>, <span class="n">show_count</span>=<span class="k">True</span>))
<span class="c"># total: 3.8 (2 items)</span>'''
  ) + """
  """ + ann([
    ("three defaults","Every one is optional, so the simplest call passes a single argument. Adding a fourth option later breaks nothing that already works."),
    ("<code>show_count=True</code>","A boolean passed by keyword. Passing <code>True</code> positionally would be unreadable at the call site — this is the clearest case for insisting on a keyword."),
    ("nested format spec","<code>{total:.{precision}f}</code> — the precision itself comes from a variable. A small f-string trick from 1.5 that is worth knowing."),
  ]) + """
  <p>You can force callers to use keywords by putting a bare <code>*</code> in the signature — everything after it must be named:</p>
  """ + code("",'<span class="k">def</span> <span class="f">report</span>(<span class="n">values</span>, *, <span class="n">precision</span>=<span class="n">2</span>, <span class="n">label</span>=<span class="s">"total"</span>):    <span class="c"># precision and label are keyword-only</span>'),

 s4=matcher([
  ("Make a boolean argument readable at the call site.",
   [("a","save(data, True)"),("b","save(data, overwrite=True)"),("c","save(data, 1)")],"b"),
  ("Give a parameter a fallback value.",
   [("a","def f(x, y = 10):"),("b","def f(x=10, y):"),("c","def f(x, y := 10):")],"a"),
  ("Call with arguments out of order.",
   [("a","order(40, \"bolt\")"),("b","order(qty=40, part=\"bolt\")"),("c","order[qty=40, part=\"bolt\"]")],"b"),
 ]),

 s5=quiz(
  "A function that collects items into a list. What does the second call print?",
  code("mutable.py",
  '''<span class="k">def</span> <span class="f">add_part</span>(<span class="n">name</span>, <span class="n">basket</span>=[]):
    <span class="n">basket</span>.<span class="f">append</span>(<span class="n">name</span>)
    <span class="k">return</span> <span class="n">basket</span>

<span class="f">print</span>(<span class="f">add_part</span>(<span class="s">"bolt"</span>))
<span class="f">print</span>(<span class="f">add_part</span>(<span class="s">"nut"</span>))'''),
  [("a","['bolt'] then ['nut'] — each call starts fresh."),
   ("b","['bolt'] then ['bolt', 'nut'] — the default list is shared."),
   ("c","['bolt'] then TypeError.")],
  "b",
  "<strong>['bolt'] then ['bolt', 'nut'].</strong> The list is created <em>once</em>, when the <code>def</code> line runs — not on each call. Every call that omits <code>basket</code> gets the same list, and appends accumulate across calls forever.<p style=\"margin:10px 0 0\">This is the most notorious trap in Python, and it is a direct consequence of 4.1: <code>def</code> executes once, and the default value is evaluated at that moment.</p><p style=\"margin:10px 0 0\">The fix is a fixed idiom:</p><p style=\"margin:8px 0 0\"><code>def add_part(name, basket=None):</code><br><code>&nbsp;&nbsp;&nbsp;&nbsp;if basket is None: basket = []</code></p><p style=\"margin:8px 0 0\">Now a fresh list is made on each call that needs one. <strong>Never use a list, dict or set as a default value.</strong> Immutable defaults — numbers, strings, <code>None</code>, <code>True</code> — are entirely safe, because there is nothing to accumulate.</p>"),

 s6=mistakes([
  ("📦","Mutable default arguments","Section 5. The rule is absolute: default to <code>None</code> and build inside. This one has shipped bugs in real libraries."),
  ("↔️","Putting a defaulted parameter before a plain one","<code>def f(x=1, y):</code> is a <code>SyntaxError</code> at definition time — Python catches it immediately, which is the one mercy here."),
  ("⏱️","Expecting a default to re-evaluate","<code>def log(msg, when=datetime.now()):</code> captures the time the module was <em>imported</em>, not the time of the call. Every log line gets the same timestamp. Same cause as the mutable default; same fix."),
 ]),

 s7=exercises([
  ("Easy","Write <code>greet(name, greeting=\"Hello\")</code> and call it three ways: positional only, with the greeting positional, and with the greeting by keyword."),
  ("Medium","Write <code>summarise(values, precision=2, label=\"total\")</code> that returns a formatted string. Then add a keyword-only parameter using the bare <code>*</code>, and confirm that passing it positionally is now an error."),
  ("Stretch","Reproduce the mutable-default bug with a dict instead of a list, then fix it. Then explain in one sentence why <code>def f(x=0)</code> and <code>def f(x=\"\")</code> are perfectly safe."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Positional</b> match by order; <b>keyword</b> match by name and can be reordered. Positional cannot follow keyword.",
  "<b>Defaults go last</b> in the definition — Python rejects the reverse.",
  "Use keywords for anything a reader couldn't guess, especially booleans.",
  "A bare <code>*</code> in the signature makes everything after it <b>keyword-only</b>.",
  "<b>Never default to a list, dict or set.</b> Default to <code>None</code> and build inside.",
  "Defaults are evaluated <b>once, at definition time</b> — that's the whole reason for the trap.",
 ]),
),

# ───────────────────────────────────────────────────────────── 4.3
dict(
 id="4.3", short="*args and **kwargs",
 title="*args and **kwargs",
 sub="Accept any number of arguments, or forward a whole call unchanged. The stars look cryptic and mean exactly one thing: pack them up, or spread them out.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_4_4.html","4.4 Return values"),
 cobra={
  "s1":"printf without the format-string danger.",
  "s2":"One star for a tuple, two for a dict.",
  "s3":"Same symbol, opposite directions.",
  "s4":"Pack or unpack — which is it?",
  "s5":"The star in a call is not the star in a def.",
  "s6":"Order in the signature is fixed.",
  "s7":"Write a wrapper.",
  "s8":"Next: returning values properly."
 },

 s1="""<p class="lead">C's variadic functions are the unsafe corner of the language — <code>va_list</code>, a format string the compiler mostly cannot check, and undefined behaviour when they disagree.</p>
  <p>Python's version is safe and, once the notation clicks, ordinary. <code>*args</code> collects extra positional arguments into a tuple. <code>**kwargs</code> collects extra keyword arguments into a dict. That is genuinely all they do.</p>
  <p>You already rely on this: <code>print(&quot;a&quot;, &quot;b&quot;, &quot;c&quot;)</code> takes any number of things because <code>print</code> is defined with <code>*args</code>.</p>""",

 s2="""<p>In a <strong>definition</strong>, the stars <em>pack</em>.</p>
  """ + code("packing.py",
  '''<span class="k">def</span> <span class="f">total</span>(*<span class="n">args</span>):
    <span class="f">print</span>(<span class="f">type</span>(<span class="n">args</span>).<span class="n">__name__</span>, <span class="n">args</span>)   <span class="c"># tuple (1, 2, 3)</span>
    <span class="k">return</span> <span class="f">sum</span>(<span class="n">args</span>)

<span class="f">print</span>(<span class="f">total</span>(<span class="n">1</span>, <span class="n">2</span>, <span class="n">3</span>))       <span class="c"># 6</span>
<span class="f">print</span>(<span class="f">total</span>())              <span class="c"># 0 — zero arguments is fine</span>

<span class="k">def</span> <span class="f">tag</span>(**<span class="n">kwargs</span>):
    <span class="f">print</span>(<span class="f">type</span>(<span class="n">kwargs</span>).<span class="n">__name__</span>, <span class="n">kwargs</span>)  <span class="c"># dict {'colour': 'red'}</span>

<span class="f">tag</span>(<span class="n">colour</span>=<span class="s">"red"</span>, <span class="n">size</span>=<span class="n">10</span>)

<span class="c"># both, with ordinary parameters first</span>
<span class="k">def</span> <span class="f">record</span>(<span class="n">name</span>, *<span class="n">values</span>, <span class="n">unit</span>=<span class="s">"mm"</span>, **<span class="n">meta</span>):
    <span class="f">print</span>(<span class="n">name</span>, <span class="n">values</span>, <span class="n">unit</span>, <span class="n">meta</span>)

<span class="f">record</span>(<span class="s">"bolt"</span>, <span class="n">10</span>, <span class="n">12</span>, <span class="n">14</span>, <span class="n">unit</span>=<span class="s">"cm"</span>, <span class="n">batch</span>=<span class="s">"B7"</span>)
<span class="c"># bolt (10, 12, 14) cm {'batch': 'B7'}</span>'''
  ) + """
  <p>The signature order is fixed and worth memorising: <strong>ordinary, <code>*args</code>, keyword-only, <code>**kwargs</code></strong>. The names <code>args</code> and <code>kwargs</code> are convention only — the stars do the work — but use them anyway, because every Python reader expects them.</p>""",

 s3="""<p>In a <strong>call</strong>, the same stars <em>unpack</em> — the exact opposite direction.</p>
  """ + code("unpacking.py",
  '''<span class="k">def</span> <span class="f">area</span>(<span class="n">w</span>, <span class="n">h</span>):
    <span class="k">return</span> <span class="n">w</span> * <span class="n">h</span>

<span class="n">dims</span> = (<span class="n">3</span>, <span class="n">4</span>)
<span class="f">print</span>(<span class="f">area</span>(*<span class="n">dims</span>))            <span class="c"># same as area(3, 4)</span>

<span class="n">opts</span> = {<span class="s">"w"</span>: <span class="n">3</span>, <span class="s">"h"</span>: <span class="n">4</span>}
<span class="f">print</span>(<span class="f">area</span>(**<span class="n">opts</span>))           <span class="c"># same as area(w=3, h=4)</span>

<span class="c"># the real use — forwarding a whole call untouched</span>
<span class="k">def</span> <span class="f">logged</span>(<span class="n">fn</span>, *<span class="n">args</span>, **<span class="n">kwargs</span>):
    <span class="f">print</span>(<span class="s">f"calling </span><span class="n">{fn.__name__}</span><span class="s">"</span>)
    <span class="n">result</span> = <span class="n">fn</span>(*<span class="n">args</span>, **<span class="n">kwargs</span>)     <span class="c"># spread them back out</span>
    <span class="f">print</span>(<span class="s">f"  → </span><span class="n">{result}</span><span class="s">"</span>)
    <span class="k">return</span> <span class="n">result</span>

<span class="f">logged</span>(<span class="f">area</span>, <span class="n">3</span>, <span class="n">4</span>)
<span class="f">logged</span>(<span class="f">area</span>, <span class="n">w</span>=<span class="n">5</span>, <span class="n">h</span>=<span class="n">2</span>)'''
  ) + """
  """ + ann([
    ("<code>*dims</code> in a call","Spreads the tuple into separate positional arguments. Without the star, <code>area(dims)</code> passes the tuple as a single argument and fails."),
    ("<code>**opts</code> in a call","Spreads the dict into keyword arguments. The keys must match the parameter names exactly."),
    ("<code>logged</code>","This is the payoff. It accepts <em>any</em> call, forwards it unchanged, and adds behaviour around it. Every decorator, wrapper and middleware in Python is built on these four lines."),
  ]) + """
  """ + src("nb","Sections 6 and 7 of <code>08_Functions.ipynb</code> cover <code>*args</code> and <code>**kwargs</code> with runnable examples. Worth doing there: print <code>type(args)</code> and <code>type(kwargs)</code> inside a function to see the tuple and the dict for yourself."),

 s4=matcher([
  ("Accept any number of numbers to add up.",
   [("a","def total(args):"),("b","def total(*args):"),("c","def total(**args):")],"b"),
  ("Call <code>f(w, h)</code> using a tuple you already have.",
   [("a","f(dims)"),("b","f(*dims)"),("c","f(**dims)")],"b"),
  ("Pass a dict of options through to another function.",
   [("a","inner(opts)"),("b","inner(*opts)"),("c","inner(**opts)")],"c"),
 ]),

 s5=quiz(
  "The same tuple, passed two ways. What does each print?",
  code("stars.py",
  '''<span class="k">def</span> <span class="f">show</span>(*<span class="n">args</span>):
    <span class="f">print</span>(<span class="f">len</span>(<span class="n">args</span>), <span class="n">args</span>)

<span class="n">dims</span> = (<span class="n">3</span>, <span class="n">4</span>)
<span class="f">show</span>(<span class="n">dims</span>)
<span class="f">show</span>(*<span class="n">dims</span>)'''),
  [("a","Both print: 2 (3, 4)"),
   ("b","1 ((3, 4),) then 2 (3, 4)"),
   ("c","2 (3, 4) then TypeError")],
  "b",
  "<strong><code>1 ((3, 4),)</code> then <code>2 (3, 4)</code>.</strong><p style=\"margin:10px 0 0\">The first call passes <em>one</em> argument that happens to be a tuple. <code>*args</code> packs that single argument into a one-element tuple — hence the nested-looking <code>((3, 4),)</code>, with the trailing comma from 3.3 marking a one-tuple.</p><p style=\"margin:10px 0 0\">The second call spreads the tuple first, so two separate arguments arrive and <code>args</code> is <code>(3, 4)</code>.</p><p style=\"margin:10px 0 0\">This is the whole distinction: <strong>a star in a <code>def</code> packs; a star in a call unpacks.</strong> Same symbol, opposite directions, and which one you are reading depends entirely on where it sits.</p>"),

 s6=mistakes([
  ("🔀","Wrong order in the signature","<code>def f(*args, x)</code> makes <code>x</code> keyword-only, which may not be what you meant. The fixed order is ordinary → <code>*args</code> → keyword-only → <code>**kwargs</code>."),
  ("✳️","Forgetting the star when forwarding","<code>fn(args, kwargs)</code> passes a tuple and a dict as two ordinary arguments. It needs <code>fn(*args, **kwargs)</code>. The symptom is a <code>TypeError</code> about argument counts that looks baffling until you spot the missing stars."),
  ("🎯","Reaching for <code>**kwargs</code> too early","It makes a signature that documents nothing — the reader cannot see what the function accepts, and typos in keyword names pass silently into the dict. Use named parameters with defaults unless you genuinely need to forward an unknown call."),
 ]),

 s7=exercises([
  ("Easy","Write <code>total(*nums)</code> that returns the sum of any number of arguments, and works with none. Then call it by unpacking a list you already have."),
  ("Medium","Write <code>timed(fn, *args, **kwargs)</code> that calls <code>fn</code>, measures how long it took with <code>time.perf_counter()</code>, prints the duration, and returns the result. Test it on a function that takes both positional and keyword arguments."),
  ("Stretch","Look up how <code>print</code> is defined — <code>print(*objects, sep=' ', end='\\\\n', ...)</code>. Explain why <code>sep</code> and <code>end</code> must be keyword-only, and what would break if they were ordinary parameters."),
 ]),

 s8=recap("What to carry forward",[
  "In a <b>def</b>, <code>*args</code> packs extra positionals into a <b>tuple</b>; <code>**kwargs</code> packs extra keywords into a <b>dict</b>.",
  "In a <b>call</b>, <code>*</code> and <code>**</code> do the opposite — they <b>spread</b> a tuple or dict into arguments.",
  "Signature order is fixed: ordinary → <code>*args</code> → keyword-only → <code>**kwargs</code>.",
  "<code>fn(*args, **kwargs)</code> forwards a whole call unchanged — the basis of every wrapper.",
  "<code>f(dims)</code> and <code>f(*dims)</code> are completely different calls.",
  "Don't use <code>**kwargs</code> where named parameters would do — it hides the interface.",
 ]),
),

# ───────────────────────────────────────────────────────────── 4.4
dict(
 id="4.4", short="Return values",
 title="Return values, multiple returns, docstrings",
 sub="A function that returns nothing is a function you cannot test. This is about giving values back properly — including several at once — and writing the one sentence that explains what a function is for.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_4_5.html","4.5 Scope"),
 cobra={
  "s1":"Return the value. Print somewhere else.",
  "s2":"Several values means one tuple.",
  "s3":"Early return flattens the nesting.",
  "s4":"Return or print — which does the job?",
  "s5":"A bare return is not nothing.",
  "s6":"Returning different types is a trap.",
  "s7":"Write a docstring worth reading.",
  "s8":"Next: where names live."
 },

 s1="""<p class="lead">There are two things a function can do with a result: print it, or return it. The difference decides whether the function is reusable.</p>
  <p>A function that prints has done its one job and thrown the value away. You cannot add its result to another, store it, test it, or write it to a file. A function that returns can do all four — and the caller can print it if that is what is wanted.</p>
  <p><strong>Compute and return; let the caller decide about output.</strong> That single habit is most of what separates a script from a program.</p>""",

 s2="""<p><code>return</code> hands a value back and ends the function immediately.</p>
  """ + code("returns.py",
  '''<span class="k">def</span> <span class="f">average</span>(<span class="n">values</span>):
    <span class="k">if</span> <span class="k">not</span> <span class="n">values</span>:               <span class="c"># truthiness from 2.2</span>
        <span class="k">return</span> <span class="n">0</span>                 <span class="c"># early return — done here</span>
    <span class="k">return</span> <span class="f">sum</span>(<span class="n">values</span>) / <span class="f">len</span>(<span class="n">values</span>)

<span class="c"># several values: really one tuple (3.3)</span>
<span class="k">def</span> <span class="f">stats</span>(<span class="n">values</span>):
    <span class="k">return</span> <span class="f">min</span>(<span class="n">values</span>), <span class="f">max</span>(<span class="n">values</span>), <span class="f">sum</span>(<span class="n">values</span>) / <span class="f">len</span>(<span class="n">values</span>)

<span class="n">lo</span>, <span class="n">hi</span>, <span class="n">avg</span> = <span class="f">stats</span>([<span class="n">4</span>, <span class="n">9</span>, <span class="n">2</span>])     <span class="c"># unpack all three</span>
<span class="n">everything</span> = <span class="f">stats</span>([<span class="n">4</span>, <span class="n">9</span>, <span class="n">2</span>])         <span class="c"># or keep the tuple</span>'''
  ) + """
  <p><strong>Early return</strong> is worth adopting deliberately. Handle the awkward cases at the top and return; the main logic then sits unindented at the bottom instead of nested inside an <code>else</code>. This is the fix for the deep nesting flagged in 2.1.</p>
  """ + code("early.py",
  '''<span class="c"># nested — the real work is two levels in</span>
<span class="k">def</span> <span class="f">process</span>(<span class="n">row</span>):
    <span class="k">if</span> <span class="n">row</span>:
        <span class="k">if</span> <span class="n">row</span>.<span class="f">get</span>(<span class="s">"qty"</span>):
            <span class="k">return</span> <span class="n">row</span>[<span class="s">"qty"</span>] * <span class="n">2</span>
    <span class="k">return</span> <span class="n">0</span>

<span class="c"># early return — the real work is at the top level</span>
<span class="k">def</span> <span class="f">process</span>(<span class="n">row</span>):
    <span class="k">if</span> <span class="k">not</span> <span class="n">row</span>:
        <span class="k">return</span> <span class="n">0</span>
    <span class="k">if</span> <span class="k">not</span> <span class="n">row</span>.<span class="f">get</span>(<span class="s">"qty"</span>):
        <span class="k">return</span> <span class="n">0</span>
    <span class="k">return</span> <span class="n">row</span>[<span class="s">"qty"</span>] * <span class="n">2</span>'''),

 s3="""<p>The <strong>docstring</strong> is a string literal as the first statement in the function. Tools read it, <code>help()</code> prints it, and editors show it on hover.</p>
  """ + code("doc.py",
  '''<span class="k">def</span> <span class="f">average</span>(<span class="n">values</span>):
    <span class="s">"""Return the mean of values, or 0 for an empty sequence.</span>

<span class="s">    Args:</span>
<span class="s">        values: a sequence of numbers.</span>

<span class="s">    Returns:</span>
<span class="s">        float: the arithmetic mean, or 0 if values is empty.</span>
<span class="s">    """</span>
    <span class="k">if</span> <span class="k">not</span> <span class="n">values</span>:
        <span class="k">return</span> <span class="n">0</span>
    <span class="k">return</span> <span class="f">sum</span>(<span class="n">values</span>) / <span class="f">len</span>(<span class="n">values</span>)

<span class="f">help</span>(<span class="f">average</span>)              <span class="c"># prints the docstring</span>
<span class="f">print</span>(<span class="f">average</span>.<span class="n">__doc__</span>)     <span class="c"># same text, as a string</span>'''
  ) + """
  """ + ann([
    ("first line","One sentence, imperative — &ldquo;Return the mean&rdquo;, not &ldquo;This function returns&hellip;&rdquo;. For a short function this line alone is enough."),
    ("the edge case","Say what happens for empty input, zero, or missing keys. That is the part a reader cannot infer, and the part you will forget in three months."),
    ("triple quotes","From 1.3. They allow the multi-line form, and are used even for one-liners by convention."),
    ("<code>help()</code>","Works on anything — <code>help(str.split)</code>, <code>help(list)</code>. Faster than a web search when you just need the signature."),
  ]),

 s4=matcher([
  ("A function whose result you want to reuse.",
   [("a","print(total)"),("b","return total"),("c","global total")],"b"),
  ("Give back a minimum and a maximum.",
   [("a","return min(v), max(v)"),("b","return min(v) and max(v)"),("c","return [min(v)], [max(v)]")],"a"),
  ("Explain what a function does, for tools and editors.",
   [("a","# a comment above the def"),("b","a docstring as the first statement"),("c","a comment inside the body")],"b"),
 ]),

 s5=quiz(
  "Three functions, three returns. What does each print?",
  code("nothing.py",
  '''<span class="k">def</span> <span class="f">a</span>():
    <span class="k">return</span> <span class="n">1</span>

<span class="k">def</span> <span class="f">b</span>():
    <span class="k">return</span>

<span class="k">def</span> <span class="f">c</span>():
    <span class="f">print</span>(<span class="s">"hi"</span>)

<span class="f">print</span>(<span class="f">a</span>(), <span class="f">b</span>(), <span class="f">c</span>())'''),
  [("a","1 None None — and 'hi' prints first."),
   ("b","1 and then an error, because b returns nothing."),
   ("c","1 None 'hi'")],
  "a",
  "<strong>It prints <code>hi</code> first, then <code>1 None None</code>.</strong><p style=\"margin:10px 0 0\">Python evaluates the three calls before printing, so <code>c()</code>'s own <code>print</code> runs first. Then the outer <code>print</code> shows the three return values.</p><p style=\"margin:10px 0 0\">A bare <code>return</code> is not &ldquo;return nothing&rdquo; — it is <code>return None</code>. And <code>c()</code>, which never returns at all, also gives <code>None</code>. Falling off the end of a function is identical to <code>return None</code>.</p><p style=\"margin:10px 0 0\">This is why the print-versus-return distinction bites: <code>total = c()</code> looks like it worked, prints the right thing on screen, and leaves <code>total</code> as <code>None</code>. The failure appears later, in arithmetic, far from the cause.</p>"),

 s6=mistakes([
  ("🖨️","Printing instead of returning","The function can then only ever be used one way. If you want both, return the value and let the caller print — or return it <em>and</em> print, but never print only."),
  ("🎭","Returning different types from different branches","<code>return 0</code> in one branch and <code>return &quot;error&quot;</code> in another means every caller must check the type before using it. Prefer <code>None</code> for &ldquo;no result&rdquo;, or raise an exception (Part V) for a real failure."),
  ("🚪","Code after an unconditional <code>return</code>","<code>return</code> exits immediately, so anything below it in that branch never runs. No warning — the lines simply sit there looking functional. Some editors grey them out; Python says nothing."),
 ]),

 s7=exercises([
  ("Easy","Write <code>rectangle(w, h)</code> returning both the area and the perimeter. Call it and unpack both on one line."),
  ("Medium","Take a function from your practice notebooks that prints its result, and change it to return instead. Update the callers. Note what became possible that was not before."),
  ("Stretch","Write <code>parse_part(code)</code> that splits something like <code>\"A-10-X\"</code> into three parts and returns them, or returns <code>None</code> when the format is wrong. Write the docstring first, then the code — and see whether writing the docstring changed the design."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Compute and return</b>; let the caller print. A printing function cannot be reused or tested.",
  "<code>return</code> exits immediately. Code after it in that branch never runs.",
  "Returning several values returns <b>one tuple</b> — unpack it at the call site.",
  "A bare <code>return</code>, and falling off the end, both give <b>None</b>.",
  "<b>Early return</b> for edge cases keeps the main logic unindented.",
  "A <b>docstring</b> is the first statement, in triple quotes. One imperative sentence, plus the edge cases.",
 ]),
),

# ───────────────────────────────────────────────────────────── 4.5
dict(
 id="4.5", short="Scope",
 title="Scope — local, global, and constants",
 sub="Where a name lives, who can see it, and why assigning inside a function behaves differently from reading. The rule is short; the one surprise is worth meeting deliberately.",
 mins="11", meta3="No setup needed",
 next=("Py_Lesson_4_6.html","4.6 Lambdas"),
 cobra={
  "s1":"Names have a home. Functions get their own.",
  "s2":"Local, enclosing, global, built-in. In that order.",
  "s3":"Reading is easy. Assigning is the twist.",
  "s4":"Where does this name live?",
  "s5":"Assign anywhere, local everywhere.",
  "s6":"global is almost never the answer.",
  "s7":"Untangle a global.",
  "s8":"Last of Part IV: lambdas."
 },

 s1="""<p class="lead">C has file scope and block scope, decided by where the braces are. Python has function scope, decided by where the <code>def</code> is.</p>
  <p>A name created inside a function belongs to that call and disappears when it returns. Two calls to the same function have entirely separate copies. That much is familiar.</p>
  <p>The part that surprises people is the asymmetry: <strong>reading a global name from inside a function works; assigning to one does not.</strong> Understanding why takes two minutes and prevents a genuinely confusing error.</p>""",

 s2="""<p>Python looks names up in four places, in a fixed order — <strong>LEGB</strong>.</p>
  <table class="cmp">
    <tr><th>Scope</th><th>Where</th><th>Example</th></tr>
    <tr><td>Local</td><td>Inside the current function</td><td>a parameter, or a name assigned in the body</td></tr>
    <tr><td>Enclosing</td><td>An outer function wrapping this one</td><td>nested functions — 4.6</td></tr>
    <tr><td>Global</td><td>Top level of the file</td><td>module-level names and constants</td></tr>
    <tr><td>Built-in</td><td>Always available</td><td><code>print</code>, <code>len</code>, <code>sum</code>, <code>range</code></td></tr>
  </table>
  <p>The first match wins, which is exactly why 1.1 warned against naming a variable <code>list</code> — a local or global <code>list</code> is found before the built-in one, and the built-in becomes unreachable.</p>
  """ + code("legb.py",
  '''<span class="n">RATE</span> = <span class="n">0.08</span>              <span class="c"># global — capitals signal "constant"</span>

<span class="k">def</span> <span class="f">total</span>(<span class="n">amount</span>):
    <span class="n">tax</span> = <span class="n">amount</span> * <span class="n">RATE</span>    <span class="c"># tax is LOCAL; RATE read from GLOBAL</span>
    <span class="k">return</span> <span class="n">amount</span> + <span class="n">tax</span>

<span class="f">print</span>(<span class="f">total</span>(<span class="n">100</span>))
<span class="c"># print(tax)   → NameError: tax does not exist out here</span>'''),

 s3="""<p>Reading is free. Assigning changes everything.</p>
  """ + code("assign.py",
  '''<span class="n">count</span> = <span class="n">0</span>

<span class="k">def</span> <span class="f">show</span>():
    <span class="f">print</span>(<span class="n">count</span>)        <span class="c"># fine — reads the global</span>

<span class="k">def</span> <span class="f">bump</span>():
    <span class="n">count</span> = <span class="n">count</span> + <span class="n">1</span>   <span class="c"># UnboundLocalError</span>

<span class="k">def</span> <span class="f">bump_ok</span>():
    <span class="k">global</span> <span class="n">count</span>        <span class="c"># explicit: I mean the global one</span>
    <span class="n">count</span> = <span class="n">count</span> + <span class="n">1</span>'''
  ) + """
  <p>Why does <code>bump</code> fail? Because Python decides a name's scope by <em>scanning the whole function body before running it</em>. It sees <code>count = ...</code> somewhere in <code>bump</code>, concludes <code>count</code> is local to <code>bump</code>, and then the right-hand side tries to read a local that has not been assigned yet.</p>
  <p>So the rule is: <strong>if a name is assigned anywhere in a function, it is local everywhere in that function</strong> — including on lines above the assignment.</p>
  """ + src("fresh","The error message names it precisely: <code>UnboundLocalError: cannot access local variable 'count' where it is not associated with a value</code>. That phrase &ldquo;local variable&rdquo; is the clue — Python is telling you it decided the name was local, which is usually the surprise."),

 s4=matcher([
  ("A name that exists only while the function runs.",
   [("a","a global"),("b","a local"),("c","a built-in")],"b"),
  ("Read a module-level constant inside a function.",
   [("a","just use it"),("b","declare global first"),("c","pass it as an argument")],"a"),
  ("A counter that several functions must update.",
   [("a","use global in each one"),("b","return the new value and reassign"),("c","both work; the second is usually better")],"c"),
 ]),

 s5=quiz(
  "What happens when <code>bump()</code> is called?",
  code("unbound.py",
  '''<span class="n">count</span> = <span class="n">10</span>

<span class="k">def</span> <span class="f">bump</span>():
    <span class="f">print</span>(<span class="n">count</span>)
    <span class="n">count</span> = <span class="n">count</span> + <span class="n">1</span>

<span class="f">bump</span>()'''),
  [("a","Prints 10, then count becomes 11."),
   ("b","UnboundLocalError on the print line."),
   ("c","Prints 10, then UnboundLocalError on the next line.")],
  "b",
  "<strong><code>UnboundLocalError</code> on the <em>print</em> line</strong> — before anything is printed at all.<p style=\"margin:10px 0 0\">This is the part that surprises. Python scanned the whole body of <code>bump</code> before running a single line, found the assignment <code>count = count + 1</code>, and marked <code>count</code> as local for the entire function. So by the time <code>print(count)</code> runs, it is looking for a <em>local</em> <code>count</code> that has no value yet. The global <code>10</code> is never consulted.</p><p style=\"margin:10px 0 0\">Delete the assignment line and the print works fine. The assignment on line 5 changes the meaning of line 4 — which is unusual, and worth remembering as the signature of this error.</p>"),

 s6=mistakes([
  ("🌍","Reaching for <code>global</code> to fix an UnboundLocalError","It silences the error, and it makes the function's behaviour depend on hidden state. Prefer passing the value in and returning the new one — the function then does the same thing every time it is called with the same arguments, which is what makes it testable."),
  ("🏷️","Assuming <code>UPPER_CASE</code> is enforced","It is a convention, nothing more. Python will happily let you reassign <code>RATE</code>. The capitals tell a human not to; they tell the interpreter nothing."),
  ("🔁","Expecting a loop variable to be scoped to the loop","In C, <code>for (int i = ...)</code> confines <code>i</code> to the loop. In Python the loop variable survives afterwards, holding the last value — and if the loop never ran, the name may not exist at all."),
 ]),

 s7=exercises([
  ("Easy","Write a function that assigns to a local name, then try to print that name after the call. Read the <code>NameError</code> carefully and note which name it reports."),
  ("Medium","Reproduce the <code>UnboundLocalError</code> above. Fix it twice: once with <code>global</code>, once by passing the value in and returning the new one. Say which version you would rather debug in six months."),
  ("Stretch","Your beginner notebook has a namespaces-and-scope section with global variables and constants. Take one function there that uses a global, and rewrite it to be self-contained. Note what you had to change at the call site — that cost is the real trade-off."),
 ]),

 s8=recap("What to carry forward",[
  "Names resolve <b>Local → Enclosing → Global → Built-in</b>. First match wins.",
  "A name assigned inside a function is <b>local to the whole function</b>, even above the assignment line.",
  "<b>Reading</b> a global works; <b>assigning</b> to one needs the <code>global</code> keyword.",
  "<code>UnboundLocalError</code> means Python decided the name was local — look for an assignment further down.",
  "Prefer <b>parameters in, values out</b> over <code>global</code>. Testable beats convenient.",
  "<code>UPPER_CASE</code> is a message to readers, not a rule Python enforces.",
 ]),
),

# ───────────────────────────────────────────────────────────── 4.6
dict(
 id="4.6", short="Lambdas",
 title="Lambdas and higher-order functions",
 sub="Functions are values. Once that lands, you can pass them to other functions — which is what sorted(), max() and every key= argument are really doing.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_5_1.html","5.1 try / except"),
 cobra={
  "s1":"You already knew functions were objects. Now use it.",
  "s2":"lambda is a def without a name.",
  "s3":"key= is where you will actually meet it.",
  "s4":"Sort by the right thing.",
  "s5":"Note what key= receives.",
  "s6":"Don't name a lambda. Use def.",
  "s7":"Sort your inventory three ways.",
  "s8":"Part IV done. Next: errors."
 },

 s1="""<p class="lead">In 4.1 you saw <code>say = greet</code> tie a second name to a function. That was not a curiosity — it is the basis of this lesson.</p>
  <p>Because functions are ordinary objects, they can be <strong>passed as arguments</strong>. A function that takes another function is called <em>higher-order</em>, and you have already used several: <code>sorted()</code>, <code>max()</code>, <code>min()</code> all accept a <code>key=</code> argument that is a function.</p>
  <p>C has function pointers, and they work — but the syntax is heavy enough that you use them rarely. In Python it is common enough to need a shorthand, and that shorthand is <code>lambda</code>.</p>""",

 s2="""<p>A <code>lambda</code> is a function written as an expression: no name, no <code>def</code>, no <code>return</code>. The body is a single expression whose value is returned.</p>
  """ + code("lambda.py",
  '''<span class="c"># these two are the same function</span>
<span class="k">def</span> <span class="f">double</span>(<span class="n">n</span>):
    <span class="k">return</span> <span class="n">n</span> * <span class="n">2</span>

<span class="n">double</span> = <span class="k">lambda</span> <span class="n">n</span>: <span class="n">n</span> * <span class="n">2</span>      <span class="c"># works, but see section 6</span>

<span class="c"># the real use: passed inline, never named</span>
<span class="n">parts</span> = [(<span class="s">"bolt"</span>, <span class="n">40</span>), (<span class="s">"nut"</span>, <span class="n">12</span>), (<span class="s">"pin"</span>, <span class="n">7</span>)]

<span class="f">print</span>(<span class="f">sorted</span>(<span class="n">parts</span>))                          <span class="c"># by name — the default</span>
<span class="f">print</span>(<span class="f">sorted</span>(<span class="n">parts</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">p</span>: <span class="n">p</span>[<span class="n">1</span>]))       <span class="c"># by quantity</span>
<span class="f">print</span>(<span class="f">max</span>(<span class="n">parts</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">p</span>: <span class="n">p</span>[<span class="n">1</span>]))          <span class="c"># biggest quantity</span>'''
  ) + """
  <p><strong>Limits, deliberately.</strong> A lambda holds one expression — no statements, no <code>if/else</code> blocks (the ternary is fine), no loops, no assignments. If you need any of those, you need <code>def</code>. That restriction is the point: a lambda is for things too small to deserve a name.</p>""",

 s3="""<p><code>key=</code> is where you will meet this in real work. It takes a function, calls it on each item, and sorts by whatever comes back.</p>
  """ + code("key.py",
  '''<span class="n">stock</span> = [
    {<span class="s">"name"</span>: <span class="s">"bolt"</span>,   <span class="s">"qty"</span>: <span class="n">40</span>},
    {<span class="s">"name"</span>: <span class="s">"nut"</span>,    <span class="s">"qty"</span>: <span class="n">12</span>},
    {<span class="s">"name"</span>: <span class="s">"washer"</span>, <span class="s">"qty"</span>: <span class="n">7</span>},
]

<span class="c"># sort dicts by a field</span>
<span class="n">by_qty</span> = <span class="f">sorted</span>(<span class="n">stock</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">d</span>: <span class="n">d</span>[<span class="s">"qty"</span>])
<span class="n">most</span>   = <span class="f">max</span>(<span class="n">stock</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">d</span>: <span class="n">d</span>[<span class="s">"qty"</span>])

<span class="c"># descending</span>
<span class="n">top</span> = <span class="f">sorted</span>(<span class="n">stock</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">d</span>: <span class="n">d</span>[<span class="s">"qty"</span>], <span class="n">reverse</span>=<span class="k">True</span>)

<span class="c"># case-insensitive sort — key can be any function, not just a lambda</span>
<span class="n">names</span> = [<span class="s">"Zebra"</span>, <span class="s">"apple"</span>, <span class="s">"Mango"</span>]
<span class="f">print</span>(<span class="f">sorted</span>(<span class="n">names</span>))                  <span class="c"># ['Mango','Zebra','apple'] — 1.7!</span>
<span class="f">print</span>(<span class="f">sorted</span>(<span class="n">names</span>, <span class="n">key</span>=<span class="n">str</span>.<span class="f">lower</span>))    <span class="c"># ['apple','Mango','Zebra']</span>

<span class="c"># sort by two things: a tuple key</span>
<span class="f">sorted</span>(<span class="n">stock</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">d</span>: (-<span class="n">d</span>[<span class="s">"qty"</span>], <span class="n">d</span>[<span class="s">"name"</span>]))'''
  ) + """
  """ + ann([
    ("<code>key=</code>","Receives <strong>one item</strong> and returns the value to sort by. It is not a comparison function — there is no <code>a, b</code> pair like C's <code>qsort</code>."),
    ("<code>str.lower</code>","A plain function passed by name, no lambda needed. When a suitable function already exists, use it — it is clearer than wrapping it."),
    ("tuple key","Sorts by the first element, then breaks ties with the second. The minus sign reverses just that one field. Tuple comparison from 3.3 doing real work."),
  ]) + """
  """ + src("nb","Section 8 of <code>08_Functions.ipynb</code> covers lambdas, and section 9 covers functions defined inside functions — the &ldquo;enclosing&rdquo; scope from 4.5."),

 s4=matcher([
  ("Sort records by their <code>qty</code> field.",
   [("a","sorted(stock, key=lambda d: d['qty'])"),("b","sorted(stock, 'qty')"),("c","sorted(stock.qty)")],"a"),
  ("Sort names ignoring case.",
   [("a","sorted(names, key=lower)"),("b","sorted(names, key=str.lower)"),("c","sorted(names.lower())")],"b"),
  ("Find the record with the largest quantity.",
   [("a","max(stock, key=lambda d: d['qty'])"),("b","max(stock['qty'])"),("c","sorted(stock)[-1]")],"a"),
 ]),

 s5=quiz(
  "What does the <code>key</code> function receive on each call?",
  code("what.py",
  '''<span class="n">parts</span> = [(<span class="s">"bolt"</span>, <span class="n">40</span>), (<span class="s">"nut"</span>, <span class="n">12</span>)]
<span class="f">sorted</span>(<span class="n">parts</span>, <span class="n">key</span>=<span class="k">lambda</span> <span class="n">p</span>: <span class="n">p</span>[<span class="n">1</span>])'''),
  [("a","Two items to compare — p is a pair of tuples."),
   ("b","One item — p is a single tuple like ('bolt', 40)."),
   ("c","The index of the item in the list.")],
  "b",
  "<strong>One item.</strong> <code>p</code> is <code>(&quot;bolt&quot;, 40)</code>, then <code>(&quot;nut&quot;, 12)</code>. The lambda returns <code>40</code>, then <code>12</code>, and Python sorts by those values.<p style=\"margin:10px 0 0\">This is worth stating because it differs from C's <code>qsort</code>, where the comparator receives <em>two</em> items and returns &minus;1, 0 or 1. Python's <code>key=</code> is a <em>transformation</em>, not a comparison: &ldquo;what should I sort this item by?&rdquo;</p><p style=\"margin:10px 0 0\">The consequence is that it is called once per item rather than once per comparison, which is both faster and much easier to get right — there is no way to write an inconsistent comparator.</p>"),

 s6=mistakes([
  ("🏷️","Assigning a lambda to a name","<code>double = lambda n: n * 2</code> works, but <code>def double(n):</code> is clearer, gets a real name in tracebacks, and can carry a docstring. If it deserves a name, it deserves a <code>def</code>. Lambdas are for inline use."),
  ("📏","Cramming logic into a lambda","No statements allowed, so people force it with nested ternaries. When you reach that point, write a small <code>def</code> just above and pass it by name — <code>key=quantity_of</code> reads better than any lambda."),
  ("🔁","Lambdas in a loop capturing the loop variable","<code>[lambda: i for i in range(3)]</code> gives three functions that all return <code>2</code>, because they capture the <em>variable</em>, not its value at the time. The fix is a default argument: <code>lambda i=i: i</code>. This one is genuinely subtle and worth knowing exists."),
 ]),

 s7=exercises([
  ("Easy","Given a list of words, sort them by length, then by length descending. Two lines using <code>key=</code>."),
  ("Medium","Given your stock dicts, print the three parts with the lowest quantity, formatted with an f-string. Use <code>sorted</code> with a <code>key=</code> and a slice."),
  ("Stretch","Sort the stock by quantity descending, breaking ties alphabetically by name — one <code>key=</code> returning a tuple. Then explain why <code>-d[\"qty\"]</code> works for the reversal but would not if the field were a string."),
 ]),

 s8=recap("What to carry forward",[
  "Functions are <b>objects</b> — pass them as arguments, store them, return them.",
  "<code>lambda args: expression</code> is a nameless one-expression function. No statements, no loops.",
  "<code>key=</code> takes a function of <b>one item</b> and returns what to sort by — a transformation, not a comparison.",
  "Pass an existing function by name when there is one: <code>key=str.lower</code>.",
  "A <b>tuple key</b> sorts by several fields; <code>-x</code> reverses one numeric field.",
  "If it deserves a name, use <code>def</code>. Lambdas are for inline use only.",
 ]),
),
]
