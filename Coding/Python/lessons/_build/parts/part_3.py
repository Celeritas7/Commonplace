# -*- coding: utf-8 -*-
"""Part III — Collections."""
from build import src, code, ann, matcher, quiz, mistakes, exercises, recap, tryit_notebook

NB = "../fundamentals/05_lists_tuples_dicts.html"

LESSONS = [

# ───────────────────────────────────────────────────────────── 3.1
dict(
 id="3.1", short="Lists",
 title="Lists — building, mutating, growing",
 sub="A list is a growable array that holds anything. No size to declare, no realloc, no element type — and one consequence about copying that you met in 1.1 and will meet again here.",
 mins="12", meta3="Links to a live notebook",
 next=("Py_Lesson_3_2.html","3.2 Indexing and slicing"),
 cobra={
  "s1":"No malloc. No size. No element type.",
  "s2":"It grows itself. That is the whole point.",
  "s3":"append changes; + builds new.",
  "s4":"Pick the method that does what you mean.",
  "s5":"sort returns None. Everyone hits this.",
  "s6":"The multiplied-list trap is a good one.",
  "s7":"Build an inventory.",
  "s8":"Next: slicing, in detail."
 },

 s1="""<p class="lead">In C, a growable array of strings means <code>malloc</code>, a capacity, a count, <code>realloc</code> when it fills, and <code>free</code> at the end.</p>
  <p>In Python it is <code>[]</code>, and then you <code>.append()</code> to it. The list handles its own memory, grows when needed, and holds objects of any type — including a mix.</p>
  <p>The one thing to carry from 1.1: a list is <strong>mutable</strong>. Two names can point at the same list, and changing it through one is visible through the other. That property is what makes lists useful and what makes them the thing to be careful with.</p>""",

 s2="""<p>An ordered, mutable sequence. Ordered means position is meaningful and stable — item 0 stays item 0 until you move it.</p>
  """ + code("lists.py",
  '''<span class="n">parts</span> = [<span class="s">"bolt"</span>, <span class="s">"nut"</span>, <span class="s">"washer"</span>]
<span class="n">mixed</span> = [<span class="n">1</span>, <span class="s">"two"</span>, <span class="n">3.0</span>, <span class="k">True</span>, [<span class="n">4</span>, <span class="n">5</span>]]   <span class="c"># all legal</span>
<span class="n">empty</span> = []

<span class="f">print</span>(<span class="f">len</span>(<span class="n">parts</span>))       <span class="c"># 3</span>
<span class="f">print</span>(<span class="n">parts</span>[<span class="n">0</span>])         <span class="c"># bolt</span>
<span class="n">parts</span>[<span class="n">0</span>] = <span class="s">"screw"</span>      <span class="c"># lists CAN be changed in place</span>'''
  ) + """
  <p>That last line is the difference from strings. <code>s[0] = &quot;J&quot;</code> was an error in 1.3; <code>parts[0] = &quot;screw&quot;</code> is fine. Lists are mutable, strings are not.</p>
  <p>The methods split into two groups, and confusing them is the source of most list bugs:</p>
  <div class="two-col">
    <div><h4>Change in place</h4><p><code>.append() .extend() .insert() .remove() .pop() .sort() .reverse()</code> — these modify the list and return <code>None</code>.</p></div>
    <div><h4>Build something new</h4><p><code>+</code>, <code>sorted()</code>, <code>reversed()</code>, slicing — these leave the original alone and hand you a new object.</p></div>
  </div>
  """ + src("nb","Your <code>05_Lists_Tuples_Dicts.ipynb</code> runs through lists, indexing, looping, then tuples and dicts — ending with an inventory-system example that uses all three together. Sections 1–3 are this lesson."),

 s3="""<p>The methods you will use weekly.</p>
  """ + code("methods.py",
  '''<span class="n">parts</span> = [<span class="s">"bolt"</span>, <span class="s">"nut"</span>]

<span class="n">parts</span>.<span class="f">append</span>(<span class="s">"washer"</span>)         <span class="c"># add ONE item at the end</span>
<span class="n">parts</span>.<span class="f">extend</span>([<span class="s">"pin"</span>, <span class="s">"clip"</span>])  <span class="c"># add SEVERAL</span>
<span class="n">parts</span>.<span class="f">insert</span>(<span class="n">0</span>, <span class="s">"screw"</span>)       <span class="c"># add at a position</span>

<span class="n">parts</span>.<span class="f">remove</span>(<span class="s">"nut"</span>)            <span class="c"># delete by VALUE (first match)</span>
<span class="n">last</span> = <span class="n">parts</span>.<span class="f">pop</span>()             <span class="c"># remove &amp; return the last</span>
<span class="n">first</span> = <span class="n">parts</span>.<span class="f">pop</span>(<span class="n">0</span>)           <span class="c"># remove &amp; return by INDEX</span>

<span class="f">print</span>(<span class="n">parts</span>.<span class="f">count</span>(<span class="s">"pin"</span>))      <span class="c"># how many</span>
<span class="f">print</span>(<span class="n">parts</span>.<span class="f">index</span>(<span class="s">"pin"</span>))      <span class="c"># where (raises if absent)</span>
<span class="f">print</span>(<span class="s">"pin"</span> <span class="k">in</span> <span class="n">parts</span>)          <span class="c"># yes/no — prefer this for a test</span>

<span class="c"># in place vs new</span>
<span class="n">nums</span> = [<span class="n">3</span>, <span class="n">1</span>, <span class="n">2</span>]
<span class="n">nums</span>.<span class="f">sort</span>()                      <span class="c"># nums is now [1,2,3]; returns None</span>
<span class="n">ordered</span> = <span class="f">sorted</span>([<span class="n">3</span>, <span class="n">1</span>, <span class="n">2</span>])      <span class="c"># original untouched; returns a NEW list</span>'''
  ) + """
  """ + ann([
    ("<code>append</code> vs <code>extend</code>","<code>append([1,2])</code> adds the <em>list itself</em> as one item, giving a nested list. <code>extend([1,2])</code> adds its two elements. Mixing them up produces a list that looks almost right."),
    ("<code>remove</code> vs <code>pop</code>","<code>remove</code> takes a value and returns nothing; <code>pop</code> takes an index and returns the item. <code>remove</code> on a missing value raises <code>ValueError</code>."),
    ("<code>.sort()</code> vs <code>sorted()</code>","The method sorts in place and returns <code>None</code>. The function returns a new sorted list. Section 5 is about the bug this causes."),
    ("<code>+</code>","<code>a + b</code> builds a new list. <code>a += b</code> extends <code>a</code> in place — which matters when another name points at it."),
  ]),

 s4=matcher([
  ("Add three items from another list, one by one.",
   [("a","parts.append(others)"),("b","parts.extend(others)"),("c","parts.insert(others)")],"b"),
  ("Get a sorted copy, leaving the original order intact.",
   [("a","items.sort()"),("b","sorted(items)"),("c","items.sorted()")],"b"),
  ("Remove and use the last item.",
   [("a","x = items.pop()"),("b","x = items.remove(-1)"),("c","x = items[-1]; del items")],"a"),
 ]),

 s5=quiz(
  "Sorting a list of readings. What does this print?",
  code("sortbug.py",
  '''<span class="n">nums</span> = [<span class="n">3</span>, <span class="n">1</span>, <span class="n">2</span>]
<span class="n">nums</span> = <span class="n">nums</span>.<span class="f">sort</span>()
<span class="f">print</span>(<span class="n">nums</span>)'''),
  [("a","[1, 2, 3]"),
   ("b","None"),
   ("c","[3, 1, 2] — sort needs a key argument")],
  "b",
  "<strong>None.</strong> <code>.sort()</code> sorted the list in place and returned <code>None</code> — and the assignment then replaced <code>nums</code> with that <code>None</code>. The sorted list existed for an instant and was thrown away.<p style=\"margin:10px 0 0\">This is the most common list bug in Python, and it follows a rule worth internalising: <strong>methods that mutate return <code>None</code>.</strong> That applies to <code>.sort()</code>, <code>.reverse()</code>, <code>.append()</code>, <code>.extend()</code> — all of them. It is deliberate, precisely so that <code>x = y.sort()</code> fails loudly instead of quietly looking right.</p><p style=\"margin:10px 0 0\">Either <code>nums.sort()</code> on its own line, or <code>nums = sorted(nums)</code>. Never both.</p>"),

 s6=mistakes([
  ("✖️","Building a grid with <code>[[0] * 3] * 3</code>","This makes three references to the <em>same</em> inner list, so <code>grid[0][0] = 1</code> changes all three rows. <code>*</code> repeats the reference, not the object. Use a comprehension: <code>[[0] * 3 for _ in range(3)]</code>."),
  ("📋","Assuming <code>b = a</code> copies","Straight from 1.1, and it bites hardest with lists. Use <code>a.copy()</code> or <code>a[:]</code> for a shallow copy; <code>copy.deepcopy(a)</code> when the list contains other lists."),
  ("🗑️","Removing items while iterating","Covered in 2.3 and worth repeating, because lists are where it happens. Build a new list with a comprehension instead — 3.6."),
 ]),

 s7=exercises([
  ("Easy","Start with an empty list. Append four part names, insert one at the front, remove one by value, and print the length and contents at each step."),
  ("Medium","Given a list of numbers, produce a new list with duplicates removed but the original order kept. Do it with a loop and <code>in</code> — no sets yet, that is 3.5."),
  ("Stretch","Write two lines that demonstrate the <code>[[0]*3]*3</code> trap: build the grid, set one cell, and print it to show three rows changed. Then fix it and explain what <code>*</code> actually copied."),
 ]),

 s8=recap("What to carry forward",[
  "A list is a <b>growable, ordered, mutable</b> sequence that holds any mix of types.",
  "<b>Mutating methods return <code>None</code></b> — <code>x = items.sort()</code> gives you <code>None</code>.",
  "<code>.sort()</code> in place; <code>sorted()</code> returns a new list. Same for <code>.reverse()</code> / <code>reversed()</code>.",
  "<code>.append(x)</code> adds one item; <code>.extend(xs)</code> adds each of several.",
  "<code>.remove(value)</code> vs <code>.pop(index)</code> — one takes a value, one an index and returns it.",
  "<code>[[0]*3]*3</code> repeats a <b>reference</b>. Use a comprehension for grids.",
 ]),
),

# ───────────────────────────────────────────────────────────── 3.2
dict(
 id="3.2", short="Indexing and slicing",
 title="Indexing and slicing, and the off-by-one",
 sub="The same [start:stop:step] you learned on strings, now on lists — plus what a slice actually gives you, which is where copying and aliasing quietly meet.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_3_3.html","3.3 Tuples and unpacking"),
 cobra={
  "s1":"Same notation. New consequence.",
  "s2":"Think of cuts between items, not items.",
  "s3":"A slice of a list is a new list.",
  "s4":"Slice it three ways.",
  "s5":"Assigning to a slice. This is unusual.",
  "s6":"The -1 inside a slice is nearly always wrong.",
  "s7":"Chunk a list.",
  "s8":"Next: tuples, and why immutability helps."
 },

 s1="""<p class="lead">You already know <code>s[start:stop:step]</code> from 1.3. It works identically on lists, which is the point — one notation for every sequence.</p>
  <p>What is new is that a list can be <em>changed</em>, and that raises questions a string never did: is a slice a copy or a view? Can you assign to a slice? What happens when the slice and the original disagree?</p>
  <p>The answers are clean, and one of them — slice assignment — is a genuinely useful tool that C has no equivalent for.</p>""",

 s2="""<p>The mental model that removes off-by-one errors: <strong>indices label the gaps between items, not the items.</strong></p>
  <div class="model">
    <svg viewBox="0 0 620 130" role="img" aria-label="Slice indices sit between items, so a[1:3] takes what lies between cut 1 and cut 3">
      <g font-family="JetBrains Mono, monospace" font-size="16" text-anchor="middle">
        <rect x="70"  y="42" width="94" height="42" rx="6" fill="#fbfcf6" stroke="#d2dacb"/><text x="117" y="69" fill="#1a2820">"a"</text>
        <rect x="170" y="42" width="94" height="42" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="217" y="69" fill="#234f3b">"b"</text>
        <rect x="270" y="42" width="94" height="42" rx="6" fill="#dde7dd" stroke="#7fa68b"/><text x="317" y="69" fill="#234f3b">"c"</text>
        <rect x="370" y="42" width="94" height="42" rx="6" fill="#fbfcf6" stroke="#d2dacb"/><text x="417" y="69" fill="#1a2820">"d"</text>
      </g>
      <g stroke="#a98a4b" stroke-width="1.3" stroke-dasharray="3 3">
        <path d="M67 34 v58"/><path d="M167 30 v66"/><path d="M267 34 v58"/><path d="M367 30 v66"/><path d="M467 34 v58"/>
      </g>
      <g font-family="JetBrains Mono, monospace" font-size="12" fill="#a98a4b" text-anchor="middle">
        <text x="67" y="24">0</text><text x="167" y="22">1</text><text x="267" y="24">2</text><text x="367" y="22">3</text><text x="467" y="24">4</text>
      </g>
      <path d="M167 104 h200" stroke="#2f6b4f" stroke-width="2"/>
      <text x="267" y="122" font-family="JetBrains Mono, monospace" font-size="13" fill="#2f6b4f" text-anchor="middle">a[1:3] — between cut 1 and cut 3</text>
    </svg>
  </div>
  <p>Read <code>a[1:3]</code> as &ldquo;everything between cut 1 and cut 3&rdquo; and the excluded stop stops feeling arbitrary. It also makes three facts obvious: <code>len(a[i:j])</code> is <code>j - i</code>; <code>a[:i] + a[i:]</code> is the whole list; and <code>a[i:i]</code> is empty.</p>
  <p><strong>A slice of a list is a new list</strong> — a shallow copy. Change it and the original is unaffected. This is why <code>b = a[:]</code> is a common way to copy.</p>""",

 s3="""<p>Reading slices, and the thing you cannot do with strings.</p>
  """ + code("slicing.py",
  '''<span class="n">a</span> = [<span class="s">"a"</span>, <span class="s">"b"</span>, <span class="s">"c"</span>, <span class="s">"d"</span>, <span class="s">"e"</span>]

<span class="f">print</span>(<span class="n">a</span>[<span class="n">1</span>:<span class="n">3</span>])      <span class="c"># ['b', 'c']</span>
<span class="f">print</span>(<span class="n">a</span>[:<span class="n">2</span>])       <span class="c"># ['a', 'b']</span>
<span class="f">print</span>(<span class="n">a</span>[<span class="n">3</span>:])       <span class="c"># ['d', 'e']</span>
<span class="f">print</span>(<span class="n">a</span>[-<span class="n">2</span>:])      <span class="c"># ['d', 'e']  — last two</span>
<span class="f">print</span>(<span class="n">a</span>[::<span class="n">2</span>])      <span class="c"># ['a', 'c', 'e']</span>
<span class="f">print</span>(<span class="n">a</span>[::-<span class="n">1</span>])     <span class="c"># reversed copy</span>

<span class="n">b</span> = <span class="n">a</span>[:]           <span class="c"># a shallow COPY, not an alias</span>
<span class="n">b</span>[<span class="n">0</span>] = <span class="s">"z"</span>
<span class="f">print</span>(<span class="n">a</span>[<span class="n">0</span>])       <span class="c"># still 'a'</span>

<span class="c"># slice ASSIGNMENT — no string equivalent</span>
<span class="n">a</span>[<span class="n">1</span>:<span class="n">3</span>] = [<span class="s">"X"</span>]   <span class="c"># replace two items with one</span>
<span class="f">print</span>(<span class="n">a</span>)          <span class="c"># ['a', 'X', 'd', 'e'] — the list SHRANK</span>'''
  ) + """
  """ + ann([
    ("<code>a[-2:]</code>","&ldquo;The last two&rdquo;, without needing the length. The negative-index habit from 1.3 pays off constantly here."),
    ("<code>b = a[:]</code>","A copy — the standard idiom before <code>.copy()</code> existed, and still common. Shallow: nested lists inside are still shared."),
    ("slice assignment","Replaces a whole region, and the replacement need not be the same length. The list resizes itself. In C this would be a memmove and a realloc."),
    ("<code>del a[1:3]</code>","Also works — deletes a region."),
  ]),

 s4=tryit_notebook(NB,"Open the Lists, Tuples & Dicts notebook",
   "Section 2 is indexing and slicing. Worth trying there: slice past the end and confirm it does not raise; take <code>a[5:2]</code> and see you get an empty list rather than an error; then assign to a slice and watch the length change."),

 s5=quiz(
  "Dropping the last element. Which line does it correctly?",
  code("lastone.py",
  '''<span class="n">a</span> = [<span class="n">10</span>, <span class="n">20</span>, <span class="n">30</span>, <span class="n">40</span>]

<span class="n">x</span> = <span class="n">a</span>[<span class="n">0</span>:<span class="f">len</span>(<span class="n">a</span>) - <span class="n">1</span>]
<span class="n">y</span> = <span class="n">a</span>[:-<span class="n">1</span>]
<span class="n">z</span> = <span class="n">a</span>[<span class="n">0</span>:<span class="f">len</span>(<span class="n">a</span>)]'''),
  [("a","Only x — you must compute the length explicitly."),
   ("b","x and y both give [10, 20, 30]; z gives the whole list."),
   ("c","y and z both give [10, 20, 30].")],
  "b",
  "<strong>x and y are the same; z is the whole list.</strong><p style=\"margin:10px 0 0\"><code>a[:-1]</code> is the idiomatic &ldquo;everything but the last&rdquo; — no length needed, and it reads directly. <code>a[0:len(a)-1]</code> is the C translation of the same idea; correct, but three chances to mistype.</p><p style=\"margin:10px 0 0\">And <code>z</code> is the point of the section: <code>a[0:len(a)]</code> is the <em>entire</em> list, not one short — because stop is excluded, so a stop of <code>len(a)</code> reaches exactly the end. Writing <code>len(a)-1</code> there, expecting to be safe, is what silently drops an element.</p><p style=\"margin:10px 0 0\">Whenever you catch yourself writing <code>-1</code> inside a slice, stop and ask whether the excluded stop has already done it for you.</p>"),

 s6=mistakes([
  ("➖","Writing <code>len(x)-1</code> as a slice stop","Almost always an off-by-one. The stop is already exclusive. <code>a[:len(a)]</code> is the whole thing; <code>a[:-1]</code> drops the last."),
  ("🪞","Expecting a slice to be a view","In NumPy (Part XI) a slice <em>is</em> a view — changing it changes the original array. In plain Python a list slice is a copy. Two different behaviours with identical syntax; worth remembering when you get to 11.1."),
  ("🧅","Trusting a shallow copy","<code>b = a[:]</code> copies the outer list only. If <code>a</code> holds lists, both still share those inner lists. <code>copy.deepcopy()</code> when you need it all the way down."),
 ]),

 s7=exercises([
  ("Easy","Given a list of ten numbers, print: the first three, the last three, every other one, and the whole thing reversed — four slices, no loops."),
  ("Medium","Write a function <code>chunk(items, n)</code> that splits a list into pieces of length <code>n</code> (the last piece may be shorter). Use a loop and slicing. Test with 10 items and n=3."),
  ("Stretch","Use slice assignment to replace the middle two items of a five-item list with four new ones. Print the length before and after, and explain what the list did with its memory that a C array could not."),
 ]),

 s8=recap("What to carry forward",[
  "Indices label the <b>gaps between items</b> — that is why stop is excluded.",
  "<code>len(a[i:j])</code> is <code>j - i</code>; <code>a[:i] + a[i:]</code> is the whole list.",
  "A list slice is a <b>new shallow copy</b>. <code>b = a[:]</code> is a copy; <code>b = a</code> is an alias.",
  "<b>Slice assignment</b> <code>a[1:3] = [...]</code> can change the list's length. No string equivalent.",
  "<code>a[:-1]</code> drops the last item. <code>a[:len(a)-1]</code> is the same thing, written worse.",
  "Careful in Part XI: a <b>NumPy</b> slice is a view, not a copy.",
 ]),
),

# ───────────────────────────────────────────────────────────── 3.3
dict(
 id="3.3", short="Tuples and unpacking",
 title="Tuples and unpacking",
 sub="A tuple is a list that cannot change. That sounds like a limitation until you see what it buys: dict keys, multiple return values, and the swap that needs no temporary.",
 mins="11", meta3="Links to a live notebook",
 next=("Py_Lesson_3_4.html","3.4 Dictionaries"),
 cobra={
  "s1":"Immutable. That is a feature, not a restriction.",
  "s2":"The comma makes it, not the brackets.",
  "s3":"Unpacking is everywhere once you see it.",
  "s4":"Swap without a temporary.",
  "s5":"A one-element tuple needs the comma.",
  "s6":"A tuple can still contain a mutable thing.",
  "s7":"Return two values properly.",
  "s8":"Next: dictionaries — the workhorse."
 },

 s1="""<p class="lead">A tuple looks like a list with round brackets and behaves like one you cannot modify.</p>
  <p>The obvious question is why you would want that. Three answers, and each is a thing you will do constantly:</p>
  <p><strong>It can be a dict key.</strong> Only immutable things can — a list cannot. <code>{(52.5, 13.4): &quot;Berlin&quot;}</code> works.</p>
  <p><strong>It signals shape, not sequence.</strong> A list is &ldquo;several of the same kind of thing&rdquo;. A tuple is usually &ldquo;one thing with several parts&rdquo; — a coordinate, a row, a name-and-score.</p>
  <p><strong>It is how Python returns more than one value</strong> — and how you take them apart on the receiving end.</p>""",

 s2="""<p>The syntax has one surprise: <strong>the comma makes a tuple, not the brackets.</strong></p>
  """ + code("tuples.py",
  '''<span class="n">point</span>  = (<span class="n">3</span>, <span class="n">4</span>)
<span class="n">also</span>   = <span class="n">3</span>, <span class="n">4</span>            <span class="c"># same thing — brackets optional</span>
<span class="n">single</span> = (<span class="n">3</span>,)             <span class="c"># ONE-element tuple. The comma is required.</span>
<span class="n">nope</span>   = (<span class="n">3</span>)              <span class="c"># just the number 3 in brackets</span>
<span class="n">empty</span>  = ()

<span class="f">print</span>(<span class="n">point</span>[<span class="n">0</span>])          <span class="c"># 3 — indexing works</span>
<span class="f">print</span>(<span class="f">len</span>(<span class="n">point</span>))         <span class="c"># 2</span>
<span class="c"># point[0] = 9              → TypeError. Immutable.</span>'''
  ) + """
  <p>Everything read-only works — indexing, slicing, <code>len</code>, <code>in</code>, looping. Everything that changes is absent: no <code>append</code>, no <code>sort</code>, no item assignment.</p>
  """ + src("nb","Sections 4 and 5 of <code>05_Lists_Tuples_Dicts.ipynb</code> cover tuples and unpacking, and section 9 compares lists, tuples and dicts side by side — worth running once the three lessons here are done."),

 s3="""<p><em>Unpacking</em> is the real payoff. It takes a tuple apart into named pieces in one line.</p>
  """ + code("unpacking.py",
  '''<span class="n">point</span> = (<span class="n">3</span>, <span class="n">4</span>)
<span class="n">x</span>, <span class="n">y</span> = <span class="n">point</span>              <span class="c"># x is 3, y is 4</span>

<span class="c"># the swap — no temporary variable</span>
<span class="n">a</span>, <span class="n">b</span> = <span class="n">b</span>, <span class="n">a</span>

<span class="c"># a function returning two things returns a tuple</span>
<span class="k">def</span> <span class="f">min_max</span>(<span class="n">values</span>):
    <span class="k">return</span> <span class="f">min</span>(<span class="n">values</span>), <span class="f">max</span>(<span class="n">values</span>)

<span class="n">lo</span>, <span class="n">hi</span> = <span class="f">min_max</span>([<span class="n">4</span>, <span class="n">9</span>, <span class="n">2</span>])   <span class="c"># unpack straight into two names</span>

<span class="c"># star collects the rest</span>
<span class="n">first</span>, *<span class="n">rest</span> = [<span class="n">1</span>, <span class="n">2</span>, <span class="n">3</span>, <span class="n">4</span>]     <span class="c"># first=1, rest=[2,3,4]</span>

<span class="c"># unpacking in a for loop — you have used this already</span>
<span class="k">for</span> <span class="n">i</span>, <span class="n">name</span> <span class="k">in</span> <span class="f">enumerate</span>(<span class="n">parts</span>):
    <span class="f">print</span>(<span class="n">i</span>, <span class="n">name</span>)'''
  ) + """
  """ + ann([
    ("the swap","<code>a, b = b, a</code> builds the tuple <code>(b, a)</code> first, then unpacks it — which is why no temporary is needed. In C this is three lines and a spare variable."),
    ("two return values","There is no special syntax. The function returns one tuple; you unpack it. Every &ldquo;returns multiple values&rdquo; in Python is this."),
    ("<code>*rest</code>","Collects whatever is left into a list. Works anywhere in the pattern: <code>first, *middle, last = items</code>."),
    ("<code>enumerate</code>","It yields tuples, and <code>for i, name in ...</code> unpacks each one. You have been using tuple unpacking since 2.3 without naming it."),
  ]),

 s4=matcher([
  ("Swap two variables.",
   [("a","a, b = b, a"),("b","tmp = a; a = b; b = tmp"),("c","swap(a, b)")],"a"),
  ("Make a tuple holding exactly one item.",
   [("a","(5)"),("b","(5,)"),("c","tuple(5)")],"b"),
  ("Take the first item and keep the rest as a list.",
   [("a","first, rest = items"),("b","first, *rest = items"),("c","first = items[0]; rest = items[1]")],"b"),
 ]),

 s5=quiz(
  "One of these is not a tuple. Which, and what is it?",
  code("comma.py",
  '''<span class="n">a</span> = (<span class="n">1</span>, <span class="n">2</span>)
<span class="n">b</span> = (<span class="n">1</span>,)
<span class="n">c</span> = (<span class="n">1</span>)
<span class="f">print</span>(<span class="f">type</span>(<span class="n">a</span>).<span class="n">__name__</span>, <span class="f">type</span>(<span class="n">b</span>).<span class="n">__name__</span>, <span class="f">type</span>(<span class="n">c</span>).<span class="n">__name__</span>)'''),
  [("a","tuple tuple tuple — brackets always make a tuple."),
   ("b","tuple tuple int — c is just 1 with brackets round it."),
   ("c","tuple int int — b needs two elements to be a tuple.")],
  "b",
  "<strong>tuple tuple int.</strong> <code>(1)</code> is the number one wrapped in ordinary grouping brackets — the same brackets as in <code>(a + b) * c</code>. Nothing makes it a tuple, because there is no comma.<p style=\"margin:10px 0 0\">This matters in practice more than it looks. <code>return (value)</code> returns a bare value, not a one-tuple. And <code>parts = (&quot;bolt&quot;)</code> makes a <em>string</em>, so <code>len(parts)</code> is 4 and looping over it gives you letters.</p><p style=\"margin:10px 0 0\">The rule: <strong>the comma builds the tuple</strong>. Brackets only group. <code>(1,)</code> and even <code>1,</code> are one-element tuples.</p>"),

 s6=mistakes([
  ("🔒","Thinking immutable means &ldquo;contents are frozen&rdquo;","A tuple's <em>slots</em> cannot be re-pointed, but a mutable object inside one can still change. <code>t = ([1,2], 3)</code> — then <code>t[0].append(9)</code> works fine. The tuple still holds the same list; the list is different. This also means such a tuple cannot be a dict key."),
  ("⚖️","Unpacking the wrong number of items","<code>x, y = (1, 2, 3)</code> raises <code>ValueError: too many values to unpack</code>. Clear message, but it appears at runtime — there is no compiler checking the shapes match. <code>*rest</code> is the fix when the count varies."),
  ("🤷","Using a tuple where a list belongs","If you will add, remove or sort, use a list. Tuples are for fixed-shape records. Choosing a tuple and then needing to change it means rebuilding the whole thing."),
 ]),

 s7=exercises([
  ("Easy","Write a function that takes a list of numbers and returns their sum and their average. Call it and unpack both results into named variables on one line."),
  ("Medium","Given <code>records = [(\"bolt\", 4), (\"nut\", 10), (\"washer\", 2)]</code>, loop over it unpacking each tuple into <code>name, qty</code>, and print a formatted line for each using an f-string from 1.5."),
  ("Stretch","Explain why <code>{(1, 2): \"a\"}</code> is a valid dictionary but <code>{[1, 2]: \"a\"}</code> raises <code>TypeError: unhashable type: 'list'</code>. Your answer should mention what would go wrong if mutable keys were allowed."),
 ]),

 s8=recap("What to carry forward",[
  "A tuple is an <b>immutable sequence</b> — indexing, slicing, <code>len</code>, <code>in</code> all work; nothing that changes it does.",
  "<b>The comma makes the tuple.</b> <code>(1)</code> is an int; <code>(1,)</code> is a tuple.",
  "<b>Unpacking</b>: <code>x, y = point</code>. The swap <code>a, b = b, a</code> needs no temporary.",
  "Returning several values <b>is</b> returning a tuple — there's no special syntax.",
  "<code>first, *rest = items</code> collects the remainder into a list.",
  "Immutable means the <b>slots</b> are fixed — a list inside a tuple can still be changed.",
 ]),
),

# ───────────────────────────────────────────────────────────── 3.4
dict(
 id="3.4", short="Dictionaries",
 title="Dictionaries — keys, lookup, iteration",
 sub="Look something up by name instead of by position. This is the collection you will reach for most, and it is the shape of every JSON file, every CSV row, and every configuration you will ever read.",
 mins="13", meta3="Links to a live notebook",
 next=("Py_Lesson_3_5.html","3.5 Sets"),
 cobra={
  "s1":"Look up by name. Instantly, no matter the size.",
  "s2":"Keys must be immutable. Now you know why 3.3 mattered.",
  "s3":"get() is the one to learn.",
  "s4":"Iterate three ways.",
  "s5":"Missing key. Two behaviours, pick deliberately.",
  "s6":"in checks keys. Always keys.",
  "s7":"Count some words.",
  "s8":"Next: sets, for membership and dedup."
 },

 s1="""<p class="lead">A list answers &ldquo;what is at position 3?&rdquo;. A dictionary answers &ldquo;what is stored under <em>this name</em>?&rdquo;.</p>
  <p>Finding a part by number in a list means scanning it — and the longer the list, the longer that takes. A dictionary finds it in the same time whether it holds ten entries or ten million, because it hashes the key straight to the value.</p>
  <p>In C this is a hash table you write yourself, or borrow. In Python it is built into the language, has its own syntax, and underpins JSON, CSV rows, function keyword arguments and object attributes. Learning it well pays back across the whole book.</p>""",

 s2="""<p>Keys and values, in braces, separated by colons.</p>
  """ + code("dicts.py",
  '''<span class="n">part</span> = {
    <span class="s">"code"</span>: <span class="s">"A-10"</span>,
    <span class="s">"name"</span>: <span class="s">"bolt"</span>,
    <span class="s">"qty"</span>:  <span class="n">40</span>,
}

<span class="f">print</span>(<span class="n">part</span>[<span class="s">"name"</span>])       <span class="c"># bolt</span>
<span class="n">part</span>[<span class="s">"qty"</span>] = <span class="n">35</span>          <span class="c"># update</span>
<span class="n">part</span>[<span class="s">"supplier"</span>] = <span class="s">"X"</span>   <span class="c"># add — same syntax</span>
<span class="k">del</span> <span class="n">part</span>[<span class="s">"supplier"</span>]      <span class="c"># remove</span>'''
  ) + """
  <p>Two rules govern what can go where.</p>
  <p><strong>Keys must be immutable</strong> — string, number, tuple. Not a list. This is where 3.3 pays off: Python needs to hash the key, and hashing something that can change underneath it would break the table. <code>{[1,2]: &quot;a&quot;}</code> raises <code>TypeError: unhashable type: 'list'</code>.</p>
  <p><strong>Values can be anything</strong>, including other dicts and lists. Nested dicts are how JSON is represented, and you will see them constantly in Part X.</p>
  <p>Since Python 3.7 dictionaries also <strong>keep insertion order</strong>, so looping gives you keys back in the order you added them.</p>""",

 s3="""<p>Lookup, and the three ways to iterate.</p>
  """ + code("access.py",
  '''<span class="n">stock</span> = {<span class="s">"bolt"</span>: <span class="n">40</span>, <span class="s">"nut"</span>: <span class="n">12</span>, <span class="s">"washer"</span>: <span class="n">0</span>}

<span class="c"># [] raises KeyError if absent; .get() returns None (or a default)</span>
<span class="f">print</span>(<span class="n">stock</span>[<span class="s">"bolt"</span>])              <span class="c"># 40</span>
<span class="f">print</span>(<span class="n">stock</span>.<span class="f">get</span>(<span class="s">"pin"</span>))            <span class="c"># None</span>
<span class="f">print</span>(<span class="n">stock</span>.<span class="f">get</span>(<span class="s">"pin"</span>, <span class="n">0</span>))         <span class="c"># 0   ← the useful form</span>

<span class="k">if</span> <span class="s">"nut"</span> <span class="k">in</span> <span class="n">stock</span>:                <span class="c"># membership tests KEYS</span>
    <span class="f">print</span>(<span class="s">"we stock nuts"</span>)

<span class="c"># iterate — keys, values, or both</span>
<span class="k">for</span> <span class="n">name</span> <span class="k">in</span> <span class="n">stock</span>:                 <span class="c"># default: keys</span>
    <span class="f">print</span>(<span class="n">name</span>)

<span class="k">for</span> <span class="n">qty</span> <span class="k">in</span> <span class="n">stock</span>.<span class="f">values</span>():
    <span class="f">print</span>(<span class="n">qty</span>)

<span class="k">for</span> <span class="n">name</span>, <span class="n">qty</span> <span class="k">in</span> <span class="n">stock</span>.<span class="f">items</span>():    <span class="c"># ← the one you want most</span>
    <span class="f">print</span>(<span class="s">f"</span><span class="n">{name}</span><span class="s">: </span><span class="n">{qty}</span><span class="s">"</span>)'''
  ) + """
  """ + ann([
    ("<code>.get(k, default)</code>","The most useful method on a dict. No exception, and you choose what &ldquo;absent&rdquo; means. <code>stock.get(name, 0)</code> treats a missing part as zero stock, which is usually right."),
    ("<code>in</code>","Tests keys, never values — the trap from 2.2. For values, <code>40 in stock.values()</code>."),
    ("<code>.items()</code>","Yields <code>(key, value)</code> tuples, which the <code>for</code> unpacks — tuple unpacking from 3.3 again. This is the standard way to walk a dict."),
    ("ordering","Insertion order is preserved. Do not confuse that with sorted — use <code>sorted(stock.items())</code> if you want alphabetical."),
  ]) + """
  """ + src("notes","Your <code>Storage_dictionary.py</code> script covers these plus <code>.keys()</code>, <code>.update()</code> and <code>.setdefault()</code>. <code>setdefault</code> is worth a look once <code>.get()</code> is comfortable — it inserts the default as well as returning it."),

 s4=matcher([
  ("Read a value, using 0 when the key is absent.",
   [("a",'stock["pin"]'),("b",'stock.get("pin", 0)'),("c",'stock.get("pin")')],"b"),
  ("Loop over names and quantities together.",
   [("a","for k, v in stock.items():"),("b","for k, v in stock:"),("c","for k in stock.keys(), stock.values():")],"a"),
  ("Check whether the value 40 appears anywhere.",
   [("a","if 40 in stock:"),("b","if 40 in stock.values():"),("c","if stock.has(40):")],"b"),
 ]),

 s5=quiz(
  "Reading a key that is not there. What happens on each line?",
  code("missing.py",
  '''<span class="n">stock</span> = {<span class="s">"bolt"</span>: <span class="n">40</span>}

<span class="n">a</span> = <span class="n">stock</span>.<span class="f">get</span>(<span class="s">"pin"</span>, <span class="n">0</span>)
<span class="n">b</span> = <span class="n">stock</span>[<span class="s">"pin"</span>]'''),
  [("a","Both give 0 — Python defaults missing numeric values to zero."),
   ("b","a is 0; b raises KeyError."),
   ("c","a is None; b is None.")],
  "b",
  "<strong>a is 0; b raises <code>KeyError: 'pin'</code>.</strong><p style=\"margin:10px 0 0\">Both behaviours are correct — the choice is yours, and it should be deliberate.</p><p style=\"margin:10px 0 0\">Use <code>[]</code> when the key <em>must</em> exist and its absence is a bug you want to hear about immediately. A loud <code>KeyError</code> naming the key beats a silent <code>None</code> propagating through three functions before failing somewhere unrelated.</p><p style=\"margin:10px 0 0\">Use <code>.get(key, default)</code> when absence is normal — optional configuration, a part you have not stocked yet, a field some records omit.</p><p style=\"margin:10px 0 0\">The mistake is reaching for <code>.get()</code> everywhere to avoid errors. That converts a clear failure into a confusing one.</p>"),

 s6=mistakes([
  ("🔑","Expecting <code>in</code> to search values","<code>&quot;Tokyo&quot; in record</code> is False even when a value is <code>&quot;Tokyo&quot;</code>. Keys only. Use <code>.values()</code> or <code>.items()</code>."),
  ("🧊","Trying to use a list as a key","<code>TypeError: unhashable type: 'list'</code>. Convert to a tuple: <code>tuple(my_list)</code>. This is the practical reason tuples exist."),
  ("🔁","Changing the dict while looping over it","<code>RuntimeError: dictionary changed size during iteration</code>. Unlike the list version in 2.3, this one at least tells you. Loop over <code>list(stock.keys())</code> if you must delete as you go."),
 ]),

 s7=exercises([
  ("Easy","Build a dict of five part codes to quantities. Print one that exists with <code>[]</code>, one that does not with <code>.get()</code> and a default, then print every pair with <code>.items()</code>."),
  ("Medium","Write a word-frequency counter: given a sentence, return a dict of word to count. Use <code>.get(word, 0) + 1</code>. Then look up <code>collections.Counter</code> and note how much of your code it replaces — that is Part VII.4."),
  ("Stretch","Your inventory example in the notebook uses a dict of dicts. Write a loop that finds the part with the highest quantity, and then rewrite it in one line with <code>max()</code> and a <code>key=</code> argument. Which will you understand faster in six months?"),
 ]),

 s8=recap("What to carry forward",[
  "A dict looks up <b>by name, in constant time</b> — size does not matter.",
  "<b>Keys must be immutable</b> (str, int, tuple). Values can be anything.",
  "<code>d[k]</code> raises <code>KeyError</code> when absent; <code>d.get(k, default)</code> does not. Choose deliberately.",
  "<code>in</code> tests <b>keys</b>. For values, <code>d.values()</code>.",
  "<code>for k, v in d.items():</code> is the standard walk — tuple unpacking again.",
  "Insertion order is preserved (3.7+), but that is not the same as sorted.",
 ]),
),

# ───────────────────────────────────────────────────────────── 3.5
dict(
 id="3.5", short="Sets",
 title="Sets — membership and deduplication",
 sub="No duplicates, no order, and membership tests that stay fast however big it gets. A set is the right answer to two questions you will otherwise solve slowly with a list.",
 mins="10", meta3="Links to a live notebook",
 next=("Py_Lesson_3_6.html","3.6 Comprehensions"),
 cobra={
  "s1":"Two jobs. It is very good at both.",
  "s2":"Unordered. Do not expect a sequence.",
  "s3":"The operators come straight from maths.",
  "s4":"Which collection for which job?",
  "s5":"Empty braces are a dict, not a set.",
  "s6":"Dedup loses the order. Sometimes that matters.",
  "s7":"Compare two lists properly.",
  "s8":"Last of Part III: comprehensions."
 },

 s1="""<p class="lead">Two problems, both of which you have probably solved with a list and a loop:</p>
  <p><strong>&ldquo;Is this value in there?&rdquo;</strong> On a list, Python scans from the front. On ten items that is nothing; on a hundred thousand, inside another loop, it is the reason your script takes minutes.</p>
  <p><strong>&ldquo;Remove the duplicates.&rdquo;</strong> With a list that is a nested loop, or a growing <code>seen</code> list you check against each time.</p>
  <p>A set does both natively. It stores unique items only, and it finds them by hashing — same trick as a dictionary, which is why a set is essentially a dict with only the keys.</p>""",

 s2="""<p>Braces, or the <code>set()</code> function.</p>
  """ + code("sets.py",
  '''<span class="n">tools</span> = {<span class="s">"drill"</span>, <span class="s">"saw"</span>, <span class="s">"drill"</span>}
<span class="f">print</span>(<span class="n">tools</span>)             <span class="c"># {'saw', 'drill'} — duplicate gone</span>
<span class="f">print</span>(<span class="f">len</span>(<span class="n">tools</span>))        <span class="c"># 2</span>

<span class="n">empty</span> = <span class="f">set</span>()            <span class="c"># NOT {} — that is an empty dict</span>

<span class="n">tools</span>.<span class="f">add</span>(<span class="s">"file"</span>)
<span class="n">tools</span>.<span class="f">discard</span>(<span class="s">"saw"</span>)     <span class="c"># no error if absent</span>
<span class="n">tools</span>.<span class="f">remove</span>(<span class="s">"saw"</span>)      <span class="c"># KeyError if absent</span>

<span class="f">print</span>(<span class="s">"drill"</span> <span class="k">in</span> <span class="n">tools</span>)  <span class="c"># fast, whatever the size</span>'''
  ) + """
  <p>Three properties, and each has a consequence:</p>
  <p><strong>Unique.</strong> Adding something already there does nothing — no error, no duplicate.</p>
  <p><strong>Unordered.</strong> There is no &ldquo;first&rdquo; item, no indexing, no slicing. <code>tools[0]</code> is a <code>TypeError</code>. Printing may show any order, and it can differ between runs.</p>
  <p><strong>Items must be hashable</strong> — the same rule as dict keys, so strings, numbers and tuples but not lists.</p>""",

 s3="""<p>The set operators are the ones from school mathematics, and they read that way.</p>
  """ + code("ops.py",
  '''<span class="n">have</span>   = {<span class="s">"bolt"</span>, <span class="s">"nut"</span>, <span class="s">"washer"</span>}
<span class="n">needed</span> = {<span class="s">"nut"</span>, <span class="s">"washer"</span>, <span class="s">"pin"</span>}

<span class="f">print</span>(<span class="n">have</span> &amp; <span class="n">needed</span>)    <span class="c"># {'nut','washer'}   in BOTH  — intersection</span>
<span class="f">print</span>(<span class="n">have</span> | <span class="n">needed</span>)    <span class="c"># all four            in EITHER — union</span>
<span class="f">print</span>(<span class="n">needed</span> - <span class="n">have</span>)    <span class="c"># {'pin'}             MISSING — difference</span>
<span class="f">print</span>(<span class="n">have</span> ^ <span class="n">needed</span>)    <span class="c"># {'bolt','pin'}      in one but not both</span>

<span class="c"># the dedup one-liner</span>
<span class="n">nums</span>   = [<span class="n">3</span>, <span class="n">1</span>, <span class="n">3</span>, <span class="n">2</span>, <span class="n">1</span>]
<span class="n">unique</span> = <span class="f">list</span>(<span class="f">set</span>(<span class="n">nums</span>))       <span class="c"># [1, 2, 3] — order NOT guaranteed</span>
<span class="n">ordered</span> = <span class="f">sorted</span>(<span class="f">set</span>(<span class="n">nums</span>))    <span class="c"># [1, 2, 3] — order guaranteed</span>'''
  ) + """
  """ + ann([
    ("<code>needed - have</code>","&ldquo;What do I still need to order?&rdquo; — one line, and it reads as the question. This is the operation that makes sets worth learning."),
    ("<code>&amp;</code> and <code>|</code>","Note these are the bitwise symbols from 1.7, reused. On sets they mean intersection and union. Methods <code>.intersection()</code> and <code>.union()</code> do the same if you prefer words."),
    ("dedup","<code>list(set(x))</code> is the standard idiom — but it discards the original order. See the mistakes."),
  ]) + """
  """ + src("notes","Your <code>Storage_set.py</code> covers these operators plus <code>.issubset()</code> and <code>.issuperset()</code>, which answer &ldquo;is everything in A also in B?&rdquo; in one call."),

 s4=matcher([
  ("Which parts do I need that I do not have?",
   [("a","needed - have"),("b","needed & have"),("c","needed | have")],"a"),
  ("Remove duplicates and keep them sorted.",
   [("a","list(set(x))"),("b","sorted(set(x))"),("c","set(sorted(x))")],"b"),
  ("Make an empty set.",
   [("a","{}"),("b","set()"),("c","[]")],"b"),
 ]),

 s5=quiz(
  "What type is <code>a</code>, and what does the last line print?",
  code("braces.py",
  '''<span class="n">a</span> = {}
<span class="n">b</span> = {<span class="s">"x"</span>}
<span class="f">print</span>(<span class="f">type</span>(<span class="n">a</span>).<span class="n">__name__</span>, <span class="f">type</span>(<span class="n">b</span>).<span class="n">__name__</span>)'''),
  [("a","set set"),
   ("b","dict set"),
   ("c","dict dict")],
  "b",
  "<strong>dict, then set.</strong> Empty braces make a <em>dictionary</em>. Dicts got the braces first, historically, and sets were added later — so <code>{}</code> was already taken.<p style=\"margin:10px 0 0\">To make an empty set you must write <code>set()</code>. This trips people because the code looks symmetrical and is not: <code>{&quot;x&quot;}</code> is a set, <code>{&quot;x&quot;: 1}</code> is a dict, and <code>{}</code> is a dict.</p><p style=\"margin:10px 0 0\">The symptom is usually an <code>AttributeError: 'dict' object has no attribute 'add'</code> a few lines later, when you try to add to what you thought was a set.</p>"),

 s6=mistakes([
  ("🔀","Expecting <code>list(set(x))</code> to keep the order","Sets are unordered, so the result can come back in any order — and it may differ between runs. When order matters, use <code>sorted(set(x))</code>, or <code>list(dict.fromkeys(x))</code> which deduplicates while preserving first-seen order."),
  ("#️⃣","Indexing a set","<code>tools[0]</code> raises <code>TypeError: 'set' object is not subscriptable</code>. There is no first item. If you need positions, you wanted a list."),
  ("🧊","Putting lists in a set","Same unhashable rule as dict keys. <code>{[1,2]}</code> fails. Convert to tuples first — <code>{(1,2)}</code> is fine, and a set of tuples is a genuinely useful thing."),
 ]),

 s7=exercises([
  ("Easy","Given two lists of part names, print the ones that appear in both, the ones only in the first, and the combined set — three lines using set operators."),
  ("Medium","Take a paragraph of text, split it into words, and report how many words are used and how many are <em>distinct</em>. Then find the words used exactly once."),
  ("Stretch","Time the difference: build a list of 100,000 numbers and a set of the same, then test membership of a value that is not present, 1,000 times each. Use <code>time.perf_counter()</code>. Explain the gap in one sentence."),
 ]),

 s8=recap("What to carry forward",[
  "A set holds <b>unique, unordered, hashable</b> items — think dict keys with no values.",
  "<b>Fast membership</b>: <code>x in s</code> does not slow down as the set grows.",
  "<code>&amp;</code> intersection · <code>|</code> union · <code>-</code> difference · <code>^</code> symmetric difference.",
  "<code>needed - have</code> answers &ldquo;what's missing?&rdquo; in one line.",
  "<code>{}</code> is an <b>empty dict</b>. An empty set is <code>set()</code>.",
  "<code>list(set(x))</code> deduplicates but <b>loses order</b>. Use <code>sorted(set(x))</code> or <code>dict.fromkeys(x)</code>.",
 ]),
),

# ───────────────────────────────────────────────────────────── 3.6
dict(
 id="3.6", short="Comprehensions",
 title="Comprehensions — list, dict, set",
 sub="Build a collection by describing it rather than by looping and appending. This is the single most Python-looking construct in the language, and it is the answer to the loop-mutation trap from 2.3.",
 mins="12", meta3="No setup needed",
 next=("Py_Lesson_4_1.html","4.1 Defining functions"),
 cobra={
  "s1":"Three lines become one. Read it right to left first.",
  "s2":"Map and filter, in one shape.",
  "s3":"The if goes at the end. Usually.",
  "s4":"Rewrite the loop.",
  "s5":"Two ifs mean two different things.",
  "s6":"Don't nest them three deep. Please.",
  "s7":"Clean some data.",
  "s8":"Part III done. Next: functions."
 },

 s1="""<p class="lead">This pattern appears everywhere: make an empty list, loop over something, transform each item, append it.</p>
  """ + code("",
  '''<span class="n">squares</span> = []
<span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">10</span>):
    <span class="n">squares</span>.<span class="f">append</span>(<span class="n">n</span> ** <span class="n">2</span>)'''
  ) + """
  <p>Three lines, two of which are bookkeeping. A comprehension says the same thing once:</p>
  """ + code("",'<span class="n">squares</span> = [<span class="n">n</span> ** <span class="n">2</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="f">range</span>(<span class="n">10</span>)]') + """
  <p>It is not merely shorter. It states an intent — <em>this list is the squares of those numbers</em> — rather than a procedure. And because it builds a new list, it is the clean answer to the &ldquo;never modify what you are looping over&rdquo; rule from 2.3.</p>""",

 s2="""<p>The shape, and how to read it.</p>
  <div class="model">
    <svg viewBox="0 0 620 118" role="img" aria-label="A comprehension has three parts: the expression, the for clause, and an optional if clause">
      <rect x="14" y="34" width="592" height="44" rx="9" fill="#f4f5ec" stroke="#d2dacb"/>
      <text x="40" y="62" font-family="JetBrains Mono, monospace" font-size="15" fill="#2f6b4f">[</text>
      <text x="58" y="62" font-family="JetBrains Mono, monospace" font-size="15" fill="#16352a">n ** 2</text>
      <text x="140" y="62" font-family="JetBrains Mono, monospace" font-size="15" fill="#a98a4b">for n in range(10)</text>
      <text x="360" y="62" font-family="JetBrains Mono, monospace" font-size="15" fill="#7a8c80">if n % 2 == 0</text>
      <text x="540" y="62" font-family="JetBrains Mono, monospace" font-size="15" fill="#2f6b4f">]</text>
      <text x="88" y="24" font-family="EB Garamond, serif" font-size="12.5" fill="#16352a" text-anchor="middle">what to keep</text>
      <text x="240" y="24" font-family="EB Garamond, serif" font-size="12.5" fill="#a98a4b" text-anchor="middle">where it comes from</text>
      <text x="432" y="24" font-family="EB Garamond, serif" font-size="12.5" fill="#7a8c80" text-anchor="middle">which ones (optional)</text>
      <text x="310" y="102" font-family="EB Garamond, serif" font-size="13.5" fill="#41564a" text-anchor="middle">Read the middle first: &ldquo;for each n in range(10)&rdquo; — then left, then right.</text>
    </svg>
  </div>
  <p>Reading order is the trick. The <code>for</code> clause in the middle is what happens first; the expression on the left is what gets collected; the <code>if</code> on the right filters. Say it as: <em>&ldquo;for each n in range 10, if n is even, keep n squared.&rdquo;</em></p>
  <p>The same shape builds dicts and sets by changing the brackets:</p>
  """ + code("three.py",
  '''<span class="n">nums</span> = [<span class="n">1</span>, <span class="n">2</span>, <span class="n">3</span>, <span class="n">4</span>]

[<span class="n">n</span> * <span class="n">2</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span>]              <span class="c"># list  [2, 4, 6, 8]</span>
{<span class="n">n</span>: <span class="n">n</span> ** <span class="n">2</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span>}        <span class="c"># dict  {1:1, 2:4, 3:9, 4:16}</span>
{<span class="n">n</span> % <span class="n">3</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span>}            <span class="c"># set   {1, 2, 0}</span>'''),

 s3="""<p>Filtering, transforming, and both together.</p>
  """ + code("comps.py",
  '''<span class="n">readings</span> = [<span class="n">12</span>, -<span class="n">3</span>, <span class="n">45</span>, <span class="n">0</span>, -<span class="n">8</span>, <span class="n">22</span>]

<span class="c"># filter only</span>
<span class="n">valid</span> = [<span class="n">r</span> <span class="k">for</span> <span class="n">r</span> <span class="k">in</span> <span class="n">readings</span> <span class="k">if</span> <span class="n">r</span> &gt; <span class="n">0</span>]
<span class="c"># [12, 45, 22]</span>

<span class="c"># transform only</span>
<span class="n">doubled</span> = [<span class="n">r</span> * <span class="n">2</span> <span class="k">for</span> <span class="n">r</span> <span class="k">in</span> <span class="n">readings</span>]

<span class="c"># both</span>
<span class="n">scaled</span> = [<span class="n">r</span> * <span class="n">1.8</span> <span class="k">for</span> <span class="n">r</span> <span class="k">in</span> <span class="n">readings</span> <span class="k">if</span> <span class="n">r</span> &gt; <span class="n">0</span>]

<span class="c"># the 2.3 fix — build new instead of removing while looping</span>
<span class="n">odds</span> = [<span class="n">n</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span> <span class="k">if</span> <span class="n">n</span> % <span class="n">2</span>]

<span class="c"># over a dict, using .items()</span>
<span class="n">stock</span> = {<span class="s">"bolt"</span>: <span class="n">40</span>, <span class="s">"nut"</span>: <span class="n">0</span>, <span class="s">"pin"</span>: <span class="n">7</span>}
<span class="n">in_stock</span> = {<span class="n">k</span>: <span class="n">v</span> <span class="k">for</span> <span class="n">k</span>, <span class="n">v</span> <span class="k">in</span> <span class="n">stock</span>.<span class="f">items</span>() <span class="k">if</span> <span class="n">v</span> &gt; <span class="n">0</span>}

<span class="c"># cleaning text — a real one</span>
<span class="n">lines</span> = [<span class="s">"  a "</span>, <span class="s">""</span>, <span class="s">" b"</span>, <span class="s">"   "</span>]
<span class="n">clean</span> = [<span class="n">l</span>.<span class="f">strip</span>() <span class="k">for</span> <span class="n">l</span> <span class="k">in</span> <span class="n">lines</span> <span class="k">if</span> <span class="n">l</span>.<span class="f">strip</span>()]
<span class="c"># ['a', 'b']</span>'''
  ) + """
  """ + ann([
    ("filter","<code>if</code> at the end decides which items make it in. No <code>else</code> allowed here."),
    ("<code>if n % 2</code>","Truthiness from 2.2 — remainder 1 is truthy, so this reads as &ldquo;if odd&rdquo;."),
    ("dict comprehension","<code>{k: v for k, v in ...}</code>. The <code>.items()</code> plus unpacking is exactly 3.4 and 3.3 combined."),
    ("the cleaning one","Note <code>.strip()</code> appears twice — once to filter, once to transform. Slightly wasteful, perfectly readable, and the standard way to write it."),
  ]),

 s4=matcher([
  ("Keep only the positive readings.",
   [("a","[r for r in readings if r > 0]"),("b","[r > 0 for r in readings]"),("c","[if r > 0: r for r in readings]")],"a"),
  ("Make a dict of name → length for each word.",
   [("a","{w: len(w) for w in words}"),("b","[w: len(w) for w in words]"),("c","{for w in words: w, len(w)}")],"a"),
  ("Uppercase every name, keeping all of them.",
   [("a","[n.upper() if n for n in names]"),("b","[n.upper() for n in names]"),("c","[for n in names: n.upper()]")],"b"),
 ]),

 s5=quiz(
  "Two comprehensions with an <code>if</code> in different places. What does each produce?",
  code("twoifs.py",
  '''<span class="n">nums</span> = [<span class="n">1</span>, <span class="n">2</span>, <span class="n">3</span>, <span class="n">4</span>]

<span class="n">a</span> = [<span class="n">n</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span> <span class="k">if</span> <span class="n">n</span> % <span class="n">2</span> == <span class="n">0</span>]
<span class="n">b</span> = [<span class="n">n</span> <span class="k">if</span> <span class="n">n</span> % <span class="n">2</span> == <span class="n">0</span> <span class="k">else</span> <span class="n">0</span> <span class="k">for</span> <span class="n">n</span> <span class="k">in</span> <span class="n">nums</span>]'''),
  [("a","Both give [2, 4]."),
   ("b","a is [2, 4]; b is [0, 2, 0, 4]."),
   ("c","a is [2, 4]; b is a SyntaxError.")],
  "b",
  "<strong>a is [2, 4]; b is [0, 2, 0, 4].</strong> Two different constructs that look similar.<p style=\"margin:10px 0 0\"><strong>At the end</strong>, <code>if</code> is a <em>filter</em> — it decides whether an item is included at all, and the result is shorter than the input. No <code>else</code> is allowed.</p><p style=\"margin:10px 0 0\"><strong>Before the <code>for</code></strong>, it is the <em>ternary</em> from 2.2 — part of the expression, choosing what value to produce. Every item is included, so the result is the same length, and the <code>else</code> is mandatory.</p><p style=\"margin:10px 0 0\">Position tells you which you are reading: filter at the end, ternary at the front. Getting a result of the wrong length is the symptom of confusing them.</p>"),

 s6=mistakes([
  ("🌀","Nesting until it is unreadable","<code>[[y for y in row if y] for row in grid if row]</code> is at the limit. Three levels, or a comprehension spanning more than about eighty characters, should be a plain loop. Shorter is not the goal; clearer is."),
  ("🧠","Using one for its side effects","<code>[print(x) for x in items]</code> works and builds a list of <code>None</code>s that you throw away. If you are not collecting a result, write a <code>for</code> loop — that is what it is for."),
  ("💧","Building a huge list you only iterate once","<code>sum([n ** 2 for n in range(10_000_000)])</code> builds ten million items in memory first. Drop the brackets — <code>sum(n ** 2 for n in range(10_000_000))</code> — and it becomes a generator that produces them one at a time. Same answer, almost no memory."),
 ]),

 s7=exercises([
  ("Easy","Given <code>words = [\"bolt\", \"\", \"nut\", \"  \", \"pin\"]</code>, build a list of the non-blank words, stripped and uppercased. One comprehension."),
  ("Medium","Given <code>stock = {\"bolt\": 40, \"nut\": 0, \"pin\": 7}</code>, build a dict of only the items with quantity above 5, with the keys uppercased. One dict comprehension."),
  ("Stretch","Rewrite one loop from your beginner practice notebook as a comprehension — the FizzBuzz or grading one. Then write one sentence on whether it improved. There is a real answer here, and it is not always yes."),
 ]),

 s8=recap("What to carry forward",[
  "<code>[expr for x in iterable if cond]</code> — read the <b>for clause first</b>, then the expression, then the filter.",
  "Same shape builds dicts <code>{k: v for ...}</code> and sets <code>{x for ...}</code>.",
  "<b>if at the end filters</b> (result is shorter, no <code>else</code>). <b>if before the for is a ternary</b> (same length, <code>else</code> required).",
  "This is the clean answer to <b>never modify what you're looping over</b>.",
  "Don't use one for side effects, and don't nest three deep — write the loop.",
  "Drop the brackets inside <code>sum()</code> or <code>any()</code> to get a <b>generator</b> and skip the memory.",
 ]),
),
]
