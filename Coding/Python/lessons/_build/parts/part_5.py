# -*- coding: utf-8 -*-
"""Part V — Errors and Debugging."""
from build import src, code, ann, matcher, quiz, mistakes, exercises, recap, tryit_notebook

NB = "../fundamentals/07_exceptions.html"

LESSONS = [

# ───────────────────────────────────────────────────────────── 5.1
dict(
 id="5.1", short="try / except",
 title="try / except / else / finally",
 sub="C returns an error code you can ignore. Python raises an exception you cannot. Catching it well means catching narrowly — and the four clauses each have a job worth knowing.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_5_2.html","5.2 Raising exceptions"),
 cobra={
  "s1":"You cannot ignore an exception. That is the point.",
  "s2":"Four clauses, four different jobs.",
  "s3":"Catch the specific one. Never bare except.",
  "s4":"Which exception does this raise?",
  "s5":"finally runs even when you return.",
  "s6":"Bare except catches Ctrl-C too.",
  "s7":"Make a reader robust.",
  "s8":"Next: raising your own."
 },

 s1="""<p class="lead">In C, <code>fopen</code> returns NULL on failure and nothing forces you to look. Skip the check and the program continues with a null pointer until it crashes somewhere unrelated.</p>
  <p>Python's equivalent <em>raises</em>. If you do not handle it, the program stops right there with a traceback naming the file and the line — the report you learned to read in 0.4. You cannot accidentally continue with a broken value, because there is no value to continue with.</p>
  <p>So the question is never &ldquo;did it work?&rdquo; but &ldquo;which failures do I want to handle here, and which should stop the program?&rdquo; That second half matters as much as the first.</p>""",

 s2="""<p>Four clauses. Most code uses two.</p>
  """ + code("clauses.py",
  '''<span class="k">try</span>:
    <span class="n">value</span> = <span class="f">int</span>(<span class="n">raw</span>)          <span class="c"># code that might fail</span>
<span class="k">except</span> <span class="f">ValueError</span>:
    <span class="f">print</span>(<span class="s">"not a number"</span>)      <span class="c"># runs only on THAT failure</span>
<span class="k">else</span>:
    <span class="f">print</span>(<span class="s">f"got </span><span class="n">{value}</span><span class="s">"</span>)      <span class="c"># runs only if NOTHING failed</span>
<span class="k">finally</span>:
    <span class="f">print</span>(<span class="s">"done"</span>)             <span class="c"># runs either way, always</span>'''
  ) + """
  <table class="cmp">
    <tr><th>Clause</th><th>Runs when</th><th>Use for</th></tr>
    <tr><td>try</td><td>always — it is the guarded block</td><td>keep it <em>small</em>; only the risky line</td></tr>
    <tr><td>except</td><td>that specific exception was raised</td><td>handling a failure you expected</td></tr>
    <tr><td>else</td><td>the try finished with no exception</td><td>work that should not itself be guarded</td></tr>
    <tr><td>finally</td><td>always, even on return or re-raise</td><td>cleanup — closing, releasing, restoring</td></tr>
  </table>
  <p>The <code>else</code> is the one people skip, and it earns its place: code in <code>else</code> is <em>not</em> covered by the <code>except</code>. Put the risky call in <code>try</code> and everything that follows in <code>else</code>, and you cannot accidentally catch a <code>ValueError</code> raised by the success path.</p>""",

 s3="""<p>Catching narrowly, and catching more than one.</p>
  """ + code("catching.py",
  '''<span class="c"># one specific exception</span>
<span class="k">try</span>:
    <span class="n">qty</span> = <span class="f">int</span>(<span class="f">input</span>(<span class="s">"Quantity: "</span>))
<span class="k">except</span> <span class="f">ValueError</span>:
    <span class="n">qty</span> = <span class="n">0</span>

<span class="c"># several, same handling</span>
<span class="k">try</span>:
    <span class="n">data</span> = <span class="f">load</span>(<span class="n">path</span>)
<span class="k">except</span> (<span class="f">FileNotFoundError</span>, <span class="f">PermissionError</span>):
    <span class="n">data</span> = {}

<span class="c"># several, different handling — and keeping the object</span>
<span class="k">try</span>:
    <span class="n">result</span> = <span class="n">a</span> / <span class="n">b</span>
<span class="k">except</span> <span class="f">ZeroDivisionError</span>:
    <span class="f">print</span>(<span class="s">"b was zero"</span>)
<span class="k">except</span> <span class="f">TypeError</span> <span class="k">as</span> <span class="n">e</span>:
    <span class="f">print</span>(<span class="s">f"wrong types: </span><span class="n">{e}</span><span class="s">"</span>)   <span class="c"># e is the exception object</span>

<span class="c"># cleanup that must happen whatever occurs</span>
<span class="n">f</span> = <span class="f">open</span>(<span class="n">path</span>)
<span class="k">try</span>:
    <span class="f">process</span>(<span class="n">f</span>)
<span class="k">finally</span>:
    <span class="n">f</span>.<span class="f">close</span>()                     <span class="c"># even if process() raises</span>'''
  ) + """
  """ + ann([
    ("narrow","Name the exception you expect. Catching <code>ValueError</code> and letting a <code>MemoryError</code> through is correct — you know how to handle one and not the other."),
    ("<code>as e</code>","Binds the exception object so you can print or log it. <code>str(e)</code> is the detail after the colon from 0.4."),
    ("<code>finally</code>","Runs even if the <code>try</code> block executes <code>return</code>. This is what makes it reliable for cleanup."),
    ("in practice","For files you would write <code>with open(path) as f:</code> — the <code>with</code> statement from 0.1 does this <code>try/finally</code> for you. Part VI.1."),
  ]) + """
  """ + src("nb","Your <code>07_Exceptions.ipynb</code> runs through all of this in ten sections — basic try/except, multiple exceptions, else, finally, raising, custom exceptions, try inside a loop, the hierarchy, and an input-validation example."),

 s4=matcher([
  ("<code>int(&quot;abc&quot;)</code>",
   [("a","ValueError"),("b","TypeError"),("c","SyntaxError")],"a"),
  ("<code>d[&quot;missing&quot;]</code> on a dict",
   [("a","IndexError"),("b","KeyError"),("c","AttributeError")],"b"),
  ("<code>items[99]</code> on a 3-item list",
   [("a","KeyError"),("b","ValueError"),("c","IndexError")],"c"),
 ]),

 s5=quiz(
  "A function with both <code>return</code> and <code>finally</code>. What does it print?",
  code("finally.py",
  '''<span class="k">def</span> <span class="f">check</span>():
    <span class="k">try</span>:
        <span class="k">return</span> <span class="s">"from try"</span>
    <span class="k">finally</span>:
        <span class="f">print</span>(<span class="s">"cleanup"</span>)

<span class="f">print</span>(<span class="f">check</span>())'''),
  [("a","'from try' only — finally is skipped by return."),
   ("b","'cleanup' then 'from try'."),
   ("c","'from try' then 'cleanup'.")],
  "b",
  "<strong>cleanup, then from try.</strong> The <code>return</code> value is computed and set aside, then <code>finally</code> runs, and only then does the function actually return.<p style=\"margin:10px 0 0\">That ordering is the whole guarantee of <code>finally</code>: it runs on the way out, no matter how you leave — normal completion, <code>return</code>, <code>break</code>, or an exception propagating upward. There is no path that skips it.</p><p style=\"margin:10px 0 0\">Which is exactly why it is the right place for closing a file, releasing a lock, or restoring a setting. And why a <code>return</code> inside <code>finally</code> is a bad idea — it would silently discard whatever the <code>try</code> was returning, and swallow any exception on its way past.</p>"),

 s6=mistakes([
  ("🕳️","<code>except:</code> with nothing after it","A bare except catches <em>everything</em> — including <code>KeyboardInterrupt</code> when you press Ctrl-C, and <code>SystemExit</code>. A loop with a bare except can become genuinely unstoppable. If you must be broad, use <code>except Exception:</code>, which leaves those two alone."),
  ("🤐","Catching and doing nothing","<code>except ValueError: pass</code> makes the failure invisible. Later, when something is wrong, there is no trace of where it started. At minimum log it. Silent handlers are how a bug survives for months."),
  ("🥅","Wrapping too much in one <code>try</code>","A twenty-line <code>try</code> with one <code>except ValueError</code> will catch a <code>ValueError</code> from anywhere in those twenty lines, including places you never considered. Guard the single risky call; put the rest in <code>else</code>."),
 ]),

 s7=exercises([
  ("Easy","Write a loop that keeps asking for a number until it gets one, catching only <code>ValueError</code>. Test it with letters, an empty line, and a decimal."),
  ("Medium","Write <code>safe_divide(a, b)</code> that returns the quotient, or <code>None</code> on division by zero, and prints a message either way using <code>finally</code>. Then argue in one sentence whether returning <code>None</code> or letting the exception propagate is better here."),
  ("Stretch","Take the input-validation example from section 10 of your exceptions notebook and add an <code>else</code> clause, moving the success-path work out of the <code>try</code>. Then find a case where that change actually prevents a wrongly-caught exception."),
 ]),

 s8=recap("What to carry forward",[
  "An unhandled exception <b>stops the program</b> with a traceback — you cannot ignore it the way you can a C return code.",
  "<b>Catch narrowly.</b> Name the exception you expect; let the others through.",
  "<code>except X as e:</code> binds the object — <code>str(e)</code> is the detail line.",
  "<b>else</b> runs when nothing failed, and is <b>not</b> covered by the except. <b>finally</b> always runs, even on return.",
  "Keep the <code>try</code> block <b>small</b> — one risky call, not twenty lines.",
  "<b>Never write a bare <code>except:</code></b> — it swallows Ctrl-C. Use <code>except Exception:</code>.",
 ]),
),

# ───────────────────────────────────────────────────────────── 5.2
dict(
 id="5.2", short="Raising exceptions",
 title="Raising, custom exceptions, the hierarchy",
 sub="Failing loudly at the moment something is wrong beats returning a sentinel value nobody checks. Raising is how you do that — and the hierarchy is why catching one name can catch several errors.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_5_3.html","5.3 The debugging routine"),
 cobra={
  "s1":"Fail at the cause, not three functions later.",
  "s2":"The hierarchy is a family tree.",
  "s3":"raise, with a message worth reading.",
  "s4":"Which exception fits the failure?",
  "s5":"Catching the parent catches the children.",
  "s6":"Order your except clauses narrow first.",
  "s7":"Validate an input properly.",
  "s8":"Next: the routine for when it still breaks."
 },

 s1="""<p class="lead">A function given bad input has three options: return a magic value, return <code>None</code>, or raise.</p>
  <p>The magic value is the C tradition — return &minus;1 and hope the caller checks. It never does, and &minus;1 flows into an average as a real reading.</p>
  <p>Returning <code>None</code> is better but still quiet: the failure surfaces later, in unrelated code, with a message about <code>NoneType</code> that says nothing about the cause.</p>
  <p><strong>Raising</strong> stops everything at the exact line where the problem was detected, with a message you wrote. The caller can catch it if it has something sensible to do; otherwise the traceback points straight at the cause. Failing early and loudly is almost always cheaper than failing late and quietly.</p>""",

 s2="""<p>Exceptions form a class hierarchy — a family tree — and catching a parent catches all its descendants.</p>
  <div class="model">
    <svg viewBox="0 0 620 190" role="img" aria-label="Exception hierarchy: BaseException at the top, Exception below it, then ValueError, LookupError and others">
      <g font-family="JetBrains Mono, monospace" font-size="12" text-anchor="middle">
        <rect x="222" y="8" width="176" height="30" rx="7" fill="#16352a"/><text x="310" y="28" fill="#a8d8ba">BaseException</text>
        <rect x="240" y="58" width="140" height="30" rx="7" fill="#234f3b"/><text x="310" y="78" fill="#cfe6d6">Exception</text>
        <rect x="24"  y="108" width="118" height="28" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="83" y="127" fill="#234f3b">ValueError</text>
        <rect x="156" y="108" width="118" height="28" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="215" y="127" fill="#234f3b">TypeError</text>
        <rect x="288" y="108" width="128" height="28" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="352" y="127" fill="#234f3b">LookupError</text>
        <rect x="430" y="108" width="166" height="28" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="513" y="127" fill="#234f3b">ArithmeticError</text>
        <rect x="288" y="152" width="60" height="26" rx="5" fill="#f4f5ec" stroke="#d2dacb"/><text x="318" y="170" fill="#41564a" font-size="11">KeyError</text>
        <rect x="354" y="152" width="72" height="26" rx="5" fill="#f4f5ec" stroke="#d2dacb"/><text x="390" y="170" fill="#41564a" font-size="11">IndexError</text>
        <rect x="432" y="152" width="164" height="26" rx="5" fill="#f4f5ec" stroke="#d2dacb"/><text x="514" y="170" fill="#41564a" font-size="11">ZeroDivisionError</text>
      </g>
      <g stroke="#7fa68b" stroke-width="1.3" fill="none">
        <path d="M310 38 v20"/>
        <path d="M310 88 v8 M83 96 v12 M215 96 v12 M352 96 v12 M513 96 v12 M83 96 h430"/>
        <path d="M352 136 v8 M318 144 v8 M390 144 v8 M318 144 h72"/>
        <path d="M513 136 v16"/>
      </g>
    </svg>
  </div>
  <p>Two practical consequences. <code>except Exception:</code> catches essentially every error your code can cause — but not <code>KeyboardInterrupt</code>, which sits under <code>BaseException</code> and is why the bare <code>except:</code> in 5.1 is dangerous. And <code>except LookupError:</code> catches both <code>KeyError</code> and <code>IndexError</code>, because both are children of it.</p>""",

 s3="""<p>Raising built-ins, and defining your own.</p>
  """ + code("raising.py",
  '''<span class="k">def</span> <span class="f">set_quantity</span>(<span class="n">part</span>, <span class="n">qty</span>):
    <span class="k">if</span> <span class="k">not</span> <span class="f">isinstance</span>(<span class="n">qty</span>, <span class="n">int</span>):
        <span class="k">raise</span> <span class="f">TypeError</span>(<span class="s">f"qty must be an int, got </span><span class="n">{type(qty).__name__}</span><span class="s">"</span>)
    <span class="k">if</span> <span class="n">qty</span> &lt; <span class="n">0</span>:
        <span class="k">raise</span> <span class="f">ValueError</span>(<span class="s">f"qty cannot be negative, got </span><span class="n">{qty}</span><span class="s">"</span>)
    <span class="n">part</span>[<span class="s">"qty"</span>] = <span class="n">qty</span>

<span class="c"># your own type, for errors specific to your program</span>
<span class="k">class</span> <span class="f">OutOfStockError</span>(<span class="f">Exception</span>):
    <span class="s">"""Raised when an order exceeds available stock."""</span>

<span class="k">def</span> <span class="f">ship</span>(<span class="n">part</span>, <span class="n">n</span>):
    <span class="k">if</span> <span class="n">n</span> &gt; <span class="n">part</span>[<span class="s">"qty"</span>]:
        <span class="k">raise</span> <span class="f">OutOfStockError</span>(<span class="s">f"asked </span><span class="n">{n}</span><span class="s">, have </span><span class="n">{part['qty']}</span><span class="s">"</span>)
    <span class="n">part</span>[<span class="s">"qty"</span>] -= <span class="n">n</span>

<span class="c"># callers can be specific about what they handle</span>
<span class="k">try</span>:
    <span class="f">ship</span>(<span class="n">bolt</span>, <span class="n">100</span>)
<span class="k">except</span> <span class="f">OutOfStockError</span> <span class="k">as</span> <span class="n">e</span>:
    <span class="f">print</span>(<span class="s">f"cannot ship: </span><span class="n">{e}</span><span class="s">"</span>)'''
  ) + """
  """ + ann([
    ("choosing the type","<code>ValueError</code> — right type, wrong value. <code>TypeError</code> — wrong type entirely. <code>KeyError</code>/<code>IndexError</code> — not found. Use the built-in that fits before inventing one."),
    ("the message","Include the offending value. <code>&quot;qty cannot be negative, got -5&quot;</code> ends the investigation; <code>&quot;invalid input&quot;</code> starts one."),
    ("custom classes","Three lines: a class, inheriting <code>Exception</code>, with a docstring. That is a complete exception. Classes properly are Part VIII — this shape is all you need here."),
    ("why custom","So callers can catch <em>your</em> failure without also catching every <code>ValueError</code> from the standard library."),
  ]) + """
  <p><code>raise</code> on its own inside an <code>except</code> block re-raises the current exception — useful for logging and then letting it continue upward.</p>""",

 s4=matcher([
  ("A quantity arrives as the string <code>&quot;ten&quot;</code>.",
   [("a","raise TypeError"),("b","raise ValueError"),("c","raise KeyError")],"a"),
  ("A quantity arrives as <code>-5</code>.",
   [("a","raise TypeError"),("b","raise ValueError"),("c","raise IndexError")],"b"),
  ("Your program's own business rule was broken.",
   [("a","raise Exception"),("b","return None"),("c","raise your own Error subclass")],"c"),
 ]),

 s5=quiz(
  "Which handler catches this, and why?",
  code("hierarchy.py",
  '''<span class="n">d</span> = {<span class="s">"a"</span>: <span class="n">1</span>}

<span class="k">try</span>:
    <span class="f">print</span>(<span class="n">d</span>[<span class="s">"b"</span>])
<span class="k">except</span> <span class="f">LookupError</span>:
    <span class="f">print</span>(<span class="s">"lookup failed"</span>)
<span class="k">except</span> <span class="f">KeyError</span>:
    <span class="f">print</span>(<span class="s">"no such key"</span>)'''),
  [("a","no such key — KeyError is more specific, so it wins."),
   ("b","lookup failed — clauses are tried in order and KeyError is a LookupError."),
   ("c","Both print.")],
  "b",
  "<strong>lookup failed.</strong> Except clauses are tested <em>top to bottom</em>, and the first one that matches wins — exactly like the <code>elif</code> chain in 2.1. <code>KeyError</code> is a subclass of <code>LookupError</code>, so the first clause matches and the second is never reached.<p style=\"margin:10px 0 0\">The <code>except KeyError</code> clause here is dead code. Python will not warn you about it.</p><p style=\"margin:10px 0 0\">The rule: <strong>order except clauses from most specific to most general.</strong> Put <code>KeyError</code> first and <code>LookupError</code> after it as a catch-all. Putting <code>except Exception:</code> first makes every clause below it unreachable.</p>"),

 s6=mistakes([
  ("📢","<code>raise Exception(&quot;something went wrong&quot;)</code>","Too generic to catch selectively — a caller wanting to handle just your error would have to catch everything. Pick a specific built-in, or define a subclass. It costs three lines."),
  ("🔇","Returning a sentinel instead of raising","<code>return -1</code> or <code>return None</code> for a genuine failure pushes the problem to a caller who probably will not check. Raise at the point of detection; that is where the useful context is."),
  ("🪆","Except clauses in the wrong order","General before specific makes the specific ones unreachable, silently. Narrowest first, always."),
 ]),

 s7=exercises([
  ("Easy","Write <code>set_age(n)</code> that raises <code>ValueError</code> with a helpful message for negatives and <code>TypeError</code> for non-integers. Trigger both and read the tracebacks."),
  ("Medium","Define <code>InvalidPartCode(Exception)</code> and a function that raises it when a code does not match the pattern <code>letter-digits</code>. Write a caller that catches only that exception and leaves everything else alone."),
  ("Stretch","Write a <code>try</code> with three except clauses in the wrong order, so one is unreachable. Confirm Python raises no warning. Then reorder them and describe how you would have caught this in review."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Raise at the point of detection</b> — a loud failure beats a sentinel value nobody checks.",
  "Pick the fitting built-in: <b>ValueError</b> (right type, wrong value), <b>TypeError</b> (wrong type), <b>KeyError/IndexError</b> (not found).",
  "<b>Put the offending value in the message.</b> It ends the investigation instead of starting one.",
  "A custom exception is <code>class MyError(Exception):</code> and a docstring. Three lines.",
  "Exceptions form a <b>hierarchy</b> — catching a parent catches its children.",
  "<b>Order except clauses narrowest first</b>, or the later ones become unreachable dead code.",
 ]),
),

# ───────────────────────────────────────────────────────────── 5.3
dict(
 id="5.3", short="The debugging routine",
 title="The six-step debugging routine",
 sub="Debugging is not a talent. It is a procedure, and you already wrote it down once. This lesson makes it explicit, because the difference between five minutes and an afternoon is almost always whether you followed it.",
 mins="12", meta3="From your own notes",
 next=("Py_Lesson_5_4.html","5.4 The Mistake Bank"),
 cobra={
  "s1":"Not talent. A procedure.",
  "s2":"Six steps, in order. Skipping one costs time.",
  "s3":"Play computer. It is the step people skip.",
  "s4":"Which step comes next?",
  "s5":"print debugging done properly.",
  "s6":"Changing things at random is not debugging.",
  "s7":"Debug something real.",
  "s8":"Last of Part V: the Mistake Bank."
 },

 s1="""<p class="lead">Everyone debugs by instinct at first: stare at the code, change something plausible, run it again, repeat.</p>
  <p>It works on small bugs and collapses on real ones, because it has no memory and no stopping condition. You cannot tell whether you are making progress, and you frequently introduce a second bug while hunting the first.</p>
  <p>The alternative is a routine. You already have one — the beginner practice notebook lists exactly these steps — and it is worth stating properly because the steps are in a specific order for a reason.</p>""",

 s2="""<p>Six steps. Each one narrows where the bug can be hiding.</p>
  <table class="cmp">
    <tr><th>Step</th><th>What you do</th><th>What it rules out</th></tr>
    <tr><td>1 Describe</td><td>State what you expected and what happened</td><td>Vagueness — half of bugs die here</td></tr>
    <tr><td>2 Reproduce</td><td>Find the smallest input that shows it, every time</td><td>Chasing something intermittent</td></tr>
    <tr><td>3 Play computer</td><td>Hand-trace the code as if you were the interpreter</td><td>Your assumption about what it does</td></tr>
    <tr><td>4 Read the error</td><td>Bottom-up, in full — as in 0.4</td><td>Guessing when you were told</td></tr>
    <tr><td>5 Print</td><td>Show the actual values at the boundary</td><td>Where the data first goes wrong</td></tr>
    <tr><td>6 Debugger</td><td>Step through with breakpoints</td><td>Everything else, when 1–5 didn't</td></tr>
  </table>
  """ + src("notes","This is your own list, from the debugging section of <code>Self_practice_beginner.ipynb</code>: <em>describe the problem → reproduce the bug → play computer → fix the errors → use print → use a debugger</em>. The ordering below is that list with the error-reading step moved next to it, because in Python the message usually is the answer."),

 s3="""<p>The two steps people skip, and why they are the load-bearing ones.</p>
  <p><strong>Step 1, describe.</strong> Write one sentence: <em>&ldquo;I expected the total to be 15, and it printed 10.&rdquo;</em> A surprising number of bugs are solved by this alone, because stating the expectation exposes that the expectation was wrong. It also gives you a test for when you are done.</p>
  <p><strong>Step 3, play computer.</strong> Take the smallest failing input and walk the code by hand, on paper, writing down every variable after every line. No running it. This is slow and it is the step that actually finds the bug, because it forces you to read what the code <em>says</em> rather than what you meant.</p>
  """ + code("trace.py",
  '''<span class="k">def</span> <span class="f">total_to</span>(<span class="n">n</span>):
    <span class="n">total</span> = <span class="n">0</span>
    <span class="k">for</span> <span class="n">i</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">n</span>):
        <span class="n">total</span> += <span class="n">i</span>
    <span class="k">return</span> <span class="n">total</span>

<span class="f">print</span>(<span class="f">total_to</span>(<span class="n">5</span>))      <span class="c"># expected 15, got 10</span>'''
  ) + """
  """ + ann([
    ("trace it","n=5. <code>range(5)</code> yields 0,1,2,3,4. total goes 0 → 0 → 1 → 3 → 6 → 10. Return 10."),
    ("the finding","The trace shows 5 was never added. <code>range(5)</code> stops at 4 — the excluded stop from 2.3."),
    ("the fix","<code>range(1, n + 1)</code>. Found by tracing in thirty seconds, not by staring."),
    ("why it works","Hand-tracing makes you evaluate <code>range(5)</code> for real instead of reading it as &ldquo;up to five&rdquo;."),
  ]) + """
  <p>And <strong>step 5, print</strong> — but deliberately. Not scattered <code>print(x)</code> calls, but labelled ones at the boundaries between stages, using the <code>=</code> form from 1.5:</p>
  """ + code("",
  '''<span class="f">print</span>(<span class="s">f"</span><span class="n">{raw = }</span><span class="s">"</span>)              <span class="c"># raw = '  25 '</span>
<span class="f">print</span>(<span class="s">f"</span><span class="n">{parsed = }</span><span class="s"> </span><span class="n">{type(parsed) = }</span><span class="s">"</span>)   <span class="c"># the value AND its type</span>'''),

 s4=matcher([
  ("The program crashes with a traceback.",
   [("a","start adding print statements"),("b","read the last line of the traceback"),("c","open the debugger")],"b"),
  ("It runs but gives the wrong number.",
   [("a","hand-trace it with the smallest input"),("b","rewrite the function"),("c","add try/except")],"a"),
  ("It fails only sometimes.",
   [("a","fix it and hope"),("b","find an input that fails every time"),("c","add a retry loop")],"b"),
 ]),

 s5=quiz(
  "You add a print to check a value. What is wrong with this?",
  code("printing.py",
  '''<span class="k">def</span> <span class="f">clean</span>(<span class="n">rows</span>):
    <span class="k">for</span> <span class="n">r</span> <span class="k">in</span> <span class="n">rows</span>:
        <span class="f">print</span>(<span class="n">r</span>)
        <span class="n">r</span>[<span class="s">"qty"</span>] = <span class="f">int</span>(<span class="n">r</span>[<span class="s">"qty"</span>])
    <span class="k">return</span> <span class="n">rows</span>'''),
  [("a","Nothing — printing the row is exactly right."),
   ("b","It prints before the conversion, so it can't show what went wrong in it."),
   ("c","print() cannot display a dict.")],
  "b",
  "<strong>It prints the input, not the thing that fails.</strong> If <code>int(r[&quot;qty&quot;])</code> raises, you see the row — but you already knew the row. What you need is which <em>field</em>, and what it actually contained.<p style=\"margin:10px 0 0\">Better:</p><p style=\"margin:8px 0 0\"><code>print(f&quot;{r['qty'] = } {type(r['qty']) = }&quot;)</code></p><p style=\"margin:10px 0 0\">Two rules for print debugging. <strong>Print the value <em>and</em> its type</strong> — half of Python bugs are a string where a number was expected, and <code>25</code> and <code>&quot;25&quot;</code> print identically. And <strong>print immediately before the failing line</strong>, not at the top of the loop.</p><p style=\"margin:10px 0 0\">Then delete them when you are done. Leftover debug prints are how a script ends up with mystery output nobody dares remove.</p>"),

 s6=mistakes([
  ("🎲","Changing things at random","If you cannot say <em>why</em> a change should fix it, you are not debugging — you are shuffling. And when it appears to work you will not know whether you fixed it or hid it."),
  ("🔧","Fixing more than one thing at a time","Change one thing, run, observe. Two changes and a passing test tells you nothing about which mattered — or whether they cancelled out."),
  ("🙈","Not reading the error because it is long","The traceback frames between the top and bottom are the call path, and they are usually what you need. 0.4 covers reading them; the mistake is not reading them at all."),
 ]),

 s7=exercises([
  ("Easy","Hand-trace <code>total_to(3)</code> from section 3 on paper, writing every variable after every line. Then run it and compare. Did your trace match?"),
  ("Medium","Take a cell marked <em>failed</em> in your beginner practice notebook — there are several. Do not look at the working version. Run the six steps in order and write down which step found it."),
  ("Stretch","Set a breakpoint and step through a function in VS Code: click the gutter, press F5, and use step-over and step-into. Then write two sentences on when the debugger beats print statements, and when it does not."),
 ]),

 s8=recap("What to carry forward",[
  "Debugging is a <b>procedure</b>, not a talent. The order matters.",
  "<b>1 Describe</b> — expected versus actual, in one sentence. Solves a surprising number outright.",
  "<b>2 Reproduce</b> — smallest input that fails every time.",
  "<b>3 Play computer</b> — hand-trace on paper. This is the step that finds it, and the one people skip.",
  "<b>4 Read the error</b> in full, bottom-up. <b>5 Print</b> value <i>and</i> type, right before the failing line. <b>6 Debugger</b> last.",
  "<b>One change at a time</b>, and only changes you can justify.",
 ]),
),

# ───────────────────────────────────────────────────────────── 5.4
dict(
 id="5.4", short="The Mistake Bank",
 title="The Mistake Bank — turning failures into drills",
 sub="You already keep your failed attempts instead of deleting them. That instinct is right, and this lesson turns it into a system — because a mistake you have re-solved twice is one you stop making.",
 mins="11", meta3="Links to your Mistake Bank",
 next=("Py_Lesson_6_1.html","6.1 Reading and writing files"),
 cobra={
  "s1":"You already do this. Let us make it deliberate.",
  "s2":"Keep the failure, not just the fix.",
  "s3":"Four fields. That is the whole record.",
  "s4":"Classify a mistake honestly.",
  "s5":"Re-solving beats re-reading.",
  "s6":"Do not bank typos.",
  "s7":"Start your own bank.",
  "s8":"Part V done. Next: files and formats."
 },

 s1="""<p class="lead">Look at your own beginner practice notebook and you will find cells labelled <em>failed</em>, <em>half successful with printing</em>, <em>Successful</em>, <em>Successful with efficiency</em>.</p>
  <p>You kept the failures. Most people delete them the moment something works, which throws away the most useful thing in the file — the record of what you actually got wrong.</p>
  <p>A working solution teaches you little on re-reading; you understand it already. A failure you have to re-solve teaches you exactly the thing you did not know. This lesson is about doing that on purpose.</p>""",

 s2="""<p>The principle is that <strong>a mistake is only learned when you have re-solved it from scratch, later, without looking</strong>. Reading your old fix feels like learning and is not — recognition is not recall.</p>
  <p>So the record has to contain the <em>problem</em>, not the solution. Four fields:</p>
  <div class="two-col">
    <div><h4>The trigger</h4><p>The smallest code that reproduces it. Three lines, not thirty.</p></div>
    <div><h4>What you expected</h4><p>One sentence — the step-1 description from 5.3.</p></div>
    <div><h4>What actually happened</h4><p>The output or the error's last line, verbatim.</p></div>
    <div><h4>The category</h4><p>Which kind of mistake it was. This is what makes patterns visible.</p></div>
  </div>
  <p>Note what is <em>not</em> in the record: the fix. Keep that separately, folded away, so re-solving is possible.</p>
  """ + src("notes","Your <code>Golden_Problem_Template.ipynb</code> already has this shape — <em>Problem Statement → Attempt 1, Raw Thinking (DO NOT EDIT) → Attempt 2, Fixed by Me (Later) → Verified Working Solution</em>. The &ldquo;DO NOT EDIT&rdquo; on attempt 1 is exactly the right instinct: preserving the wrong version is what makes the record useful."),

 s3="""<p>Categories matter because they turn ten isolated mistakes into two patterns you can actually fix.</p>
  <table class="cmp">
    <tr><th>Category</th><th>Looks like</th><th>Lesson</th></tr>
    <tr><td>type confusion</td><td><code>&quot;5&quot; * 3</code> giving <code>555</code></td><td>1.6</td></tr>
    <tr><td>off-by-one</td><td><code>range(5)</code> missing the 5</td><td>2.3, 3.2</td></tr>
    <tr><td>mutation</td><td>changing a list while looping it</td><td>2.3, 3.1</td></tr>
    <tr><td>aliasing</td><td><code>b = a</code> not copying</td><td>1.1</td></tr>
    <tr><td>truthiness</td><td>a valid <code>0</code> treated as missing</td><td>2.2</td></tr>
    <tr><td>scope</td><td><code>UnboundLocalError</code></td><td>4.5</td></tr>
    <tr><td>return</td><td>a function that prints but returns <code>None</code></td><td>4.4</td></tr>
  </table>
  <p>After a dozen entries the distribution tells you something. If four of them are type confusion, the fix is not &ldquo;be more careful&rdquo; — it is the habit from 1.6: convert at the boundary, every time.</p>
  <p>A worked entry:</p>
  """ + code("bank-entry.md",
  '''<span class="c"># Entry 7 — 2026-09-04</span>

<span class="c">## Trigger</span>
<span class="n">rows</span> = [{<span class="s">"qty"</span>: <span class="s">"5"</span>}, {<span class="s">"qty"</span>: <span class="s">"12"</span>}]
<span class="n">total</span> = <span class="f">sum</span>(<span class="n">r</span>[<span class="s">"qty"</span>] <span class="k">for</span> <span class="n">r</span> <span class="k">in</span> <span class="n">rows</span>)

<span class="c">## Expected</span>
<span class="c">17</span>

<span class="c">## Actual</span>
<span class="c">TypeError: unsupported operand type(s) for +: 'int' and 'str'</span>

<span class="c">## Category</span>
<span class="c">type confusion — values from a file are strings</span>

<span class="c">&lt;details&gt; fix — int(r["qty"]) at the boundary &lt;/details&gt;</span>'''),

 s4=matcher([
  ("<code>b = a</code> then editing <code>b</code> changed <code>a</code>.",
   [("a","off-by-one"),("b","aliasing"),("c","scope")],"b"),
  ("A reading of 0 was reported as &ldquo;no data&rdquo;.",
   [("a","truthiness"),("b","type confusion"),("c","mutation")],"a"),
  ("A function printed the right answer but the caller got <code>None</code>.",
   [("a","scope"),("b","return"),("c","off-by-one")],"b"),
 ]),

 s5=quiz(
  "Two weeks after banking a mistake, which review actually teaches you?",
  None,
  [("a","Re-read the entry and its fix, and confirm you understand it."),
   ("b","Open only the trigger and expected output, and solve it again from scratch."),
   ("c","Re-run the working solution to check it still passes.")],
  "b",
  "<strong>Re-solve it from scratch.</strong> Reading a fix you already understand produces a strong feeling of competence and almost no learning — you are recognising, not retrieving.<p style=\"margin:10px 0 0\">Retrieval is the thing that works. Opening the trigger cold, being unable to fix it, and having to think it through again is uncomfortable and is precisely why it sticks.</p><p style=\"margin:10px 0 0\">This is why the template hides the fix. It is also why option (c) is nearly worthless: a passing test tells you the code works, not that <em>you</em> could write it.</p><p style=\"margin:10px 0 0\">A practical cadence: review a week later, then a month, then a quarter. Anything you re-solve cleanly twice in a row can be retired from the bank.</p>"),

 s6=mistakes([
  ("🗑️","Banking typos","A misspelled variable is not a mistake worth keeping — you will not learn anything from re-solving it. Bank only mistakes that came from a <em>wrong model</em> of how something works. If you can say &ldquo;I thought X, and actually Y&rdquo;, it belongs."),
  ("📚","Writing the entry after you have fixed it","By then you have lost what you actually believed at the time, and the entry becomes a description of the fix. Write the trigger and the expectation <em>while still stuck</em> — that is when the wrong model is visible."),
  ("🏔️","Letting the bank grow without pruning","Fifty entries you never revisit is a graveyard, not a bank. Retire anything you have re-solved cleanly twice, and keep it small enough that a review is fifteen minutes."),
 ]),

 s7=exercises([
  ("Easy","Open <code>fundamentals/mistake-drill.html</code> in this book and work one drill. Then write your first bank entry using the four fields from section 2."),
  ("Medium","Go through your beginner practice notebook and find three cells marked <em>failed</em>. For each, write a bank entry — trigger, expected, actual, category — without looking at the working version below it."),
  ("Stretch","Categorise ten past mistakes from your notebooks. Count the categories. Whichever appears most is your standing weakness — name the one habit from Parts I–V that would prevent most of them, and write it somewhere you will see it."),
 ]),

 s8=recap("What to carry forward",[
  "<b>Keep the failure, not just the fix.</b> The working version teaches you least.",
  "An entry is four fields: <b>trigger · expected · actual · category</b>. The fix stays hidden.",
  "<b>Re-solve, don't re-read.</b> Recognition feels like learning and isn't.",
  "<b>Categories reveal patterns</b> — four type-confusion entries point at one habit, not four accidents.",
  "Bank <b>wrong models</b>, not typos. &ldquo;I thought X, actually Y&rdquo; is the test.",
  "Review at a week, a month, a quarter. <b>Retire</b> anything re-solved cleanly twice.",
 ]),
),
]
