"""Phase 5 wiring: nav for 2.9, enum-class box in 3.2, index entry, TOPIC_LIST, lesson counters."""
import re, os, sys, glob

ROOT = sys.argv[1]                      # .../c_and_cpp_study
L = os.path.join(ROOT, 'lessons')
APPLY = '--apply' in sys.argv
log = []

def rw(path, fn):
    raw = open(path, 'rb').read(); crlf = b'\r\n' in raw
    t = raw.decode('utf-8').replace('\r\n', '\n')
    t2 = fn(t)
    if t2 is None or t2 == t: return False
    if APPLY: open(path, 'wb').write((t2.replace('\n', '\r\n') if crlf else t2).encode('utf-8'))
    return True

# ---------------- 1. nav: 2.8 next -> 2.9, 3.1 prev -> 2.9 ----------------
def e28(t):
    old = '''    <a href="Cpp_Book_Lesson_3_1.html" class="nav-btn next">
      <small>Next lesson →</small>
      3.1  if, else, and if-init (C++17)
    </a>'''
    new = '''    <a href="Cpp_Book_Lesson_2_9.html" class="nav-btn next">
      <small>Next lesson →</small>
      2.9  References and pointers
    </a>'''
    assert t.count(old) == 1; log.append('2.8 next -> 2.9'); return t.replace(old, new)
rw(os.path.join(L, 'Cpp_Book_Lesson_2_8.html'), e28)

def e31(t):
    old = '''    <a href="Cpp_Book_Lesson_2_8.html" class="nav-btn prev">
      <small>← Previous</small>
      2.8  Namespaces and using
    </a>'''
    new = '''    <a href="Cpp_Book_Lesson_2_9.html" class="nav-btn prev">
      <small>← Previous</small>
      2.9  References and pointers
    </a>'''
    assert t.count(old) == 1; log.append('3.1 prev -> 2.9'); return t.replace(old, new)
rw(os.path.join(L, 'Cpp_Book_Lesson_3_1.html'), e31)

# ---------------- 2. enum class explainer in 3.2 ----------------
def e32(t):
    anchor = '''    <p>The most idiomatic use of <code>switch</code> in C++ is over an <code>enum</code> — a named set of states. The cases become self-documenting, and the compiler becomes your safety net:</p>
'''
    box = '''    <p>The most idiomatic use of <code>switch</code> in C++ is over an <code>enum</code> — a named set of states. The cases become self-documenting, and the compiler becomes your safety net:</p>

    <div class="new-content">
      <strong>First, what is an <code>enum class</code>?</strong> It is how you invent a type whose value can only be one of a fixed list of names. <code>enum class Light { Red, Yellow, Green };</code> creates a type called <code>Light</code>, and a <code>Light</code> variable can hold <code>Light::Red</code>, <code>Light::Yellow</code> or <code>Light::Green</code> — nothing else. You always write the names qualified, <code>Light::Red</code> rather than bare <code>Red</code>, which is exactly what the <code>class</code> part buys you: the names live inside <code>Light</code> instead of leaking into the surrounding scope, so a <code>Colour::Red</code> elsewhere never collides. It also refuses to convert silently to <code>int</code>, so you cannot accidentally compare a traffic light to the number 2. (The older, looser <code>enum Light { Red, … };</code> does leak and does convert — prefer <code>enum class</code>.)
    </div>
'''
    assert t.count(anchor) == 1; log.append('3.2 enum class explainer added'); return t.replace(anchor, box)
rw(os.path.join(L, 'Cpp_Book_Lesson_3_2.html'), e32)

# ---------------- 3. index.html: insert the 2.9 card after 2.8 ----------------
def eidx(t):
    m = re.search(r'        <a href="lessons/Cpp_Book_Lesson_2_8\.html" class="lesson">.*?\n        </a>\n', t, re.S)
    assert m, 'no 2.8 card'
    card = '''        <a href="lessons/Cpp_Book_Lesson_2_9.html" class="lesson">
          <div class="lesson-num">2.9</div>
          <div class="lesson-body">
            <p class="lesson-title">References and pointers <span class="badge new">NEW</span></p>
            <p class="lesson-teaser">A live memory picture — run <code>r = y</code> and <code>p = &amp;y</code> and watch which box actually changes — plus four situations asking which of the three you'd reach for.</p>
          </div>
          <span class="lesson-arrow">→</span>
        </a>
'''
    log.append('index.html: 2.9 card added')
    return t[:m.end()] + card + t[m.end():]
rw(os.path.join(ROOT, 'index.html'), eidx)

# ---------------- 4. TOPIC_LIST: add 2.9 ----------------
def etl(t):
    old = '| 2.8 | Namespaces and `using` | New |\n'
    assert t.count(old) == 1
    log.append('TOPIC_LIST: 2.9 row added')
    return t.replace(old, old + '| 2.9 | References and pointers — aliases, addresses, and which to reach for | New |\n')
rw(os.path.join(ROOT, 'TOPIC_LIST.md'), etl)

# ---------------- 5. rebuild the "Lesson N / TOTAL" counters ----------------
def key(fn):
    m = re.match(r'(C|Cpp)_Book_Lesson_(\d+)_(\d+)', fn); return (int(m.group(2)), int(m.group(3)))
for book in ('C', 'Cpp'):
    files = sorted([os.path.basename(f) for f in glob.glob(os.path.join(L, book + '_Book_Lesson_*.html'))], key=key)
    total = len(files)
    for i, fn in enumerate(files, 1):
        def ecount(t, i=i, total=total):
            m = re.search(r'<span>Lesson [^<]*</span>', t)
            if not m: return None
            new = (f'<span>Lesson {i} / {total} &middot; FINALE</span>' if i == total
                   else f'<span>Lesson {i} / {total}</span>')
            return t.replace(m.group(0), new, 1) if m.group(0) != new else None
        if rw(os.path.join(L, fn), ecount): log.append(f'counter {fn} -> {i}/{total}')

print('MODE', 'APPLY' if APPLY else 'DRY')
for x in log[:6]: print(' ', x)
n = sum(1 for x in log if x.startswith('counter'))
print(f'  ... {n} lesson counters renumbered (C book and C++ book totals corrected)')
print('total changes:', len(log))
