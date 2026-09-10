"""Phase 6, device side: rename 12.4 -> 12.9, fix 12.3's nav, rebuild all lesson counters.

The new lessons (0.4, 0.5, 12.5-12.8), index.html and TOPIC_LIST.md are delivered as
files; this script only does the parts that must be applied in place.

    python3 phase6_device.py <path-to-c_and_cpp_study> [--apply]
"""
import re, os, sys, glob

ROOT = sys.argv[1]
L = os.path.join(ROOT, 'lessons')
APPLY = '--apply' in sys.argv
log = []
warn = []


def rw(path, fn, optional=False):
    raw = open(path, 'rb').read(); crlf = b'\r\n' in raw
    t = raw.decode('utf-8').replace('\r\n', '\n')
    t2 = fn(t)
    if t2 is None or t2 == t:
        if not optional: warn.append('no change: ' + os.path.basename(path))
        return False
    if APPLY: open(path, 'wb').write((t2.replace('\n', '\r\n') if crlf else t2).encode('utf-8'))
    return True


# ---------------- 1. 12.4 -> 12.9 ----------------
old_p = os.path.join(L, 'Cpp_Book_Lesson_12_4.html')
new_p = os.path.join(L, 'Cpp_Book_Lesson_12_9.html')
if os.path.exists(old_p):
    raw = open(old_p, 'rb').read(); crlf = b'\r\n' in raw
    t = raw.decode('utf-8').replace('\r\n', '\n')
    subs = [
        ('<title>Lesson 12.4 — Where to Go Next · The C++ Book</title>',
         '<title>Lesson 12.9 — Where to Go Next · The C++ Book</title>'),
        ('<span class="crumb-cpp">THE C++ BOOK &middot; 12.4</span>',
         '<span class="crumb-cpp">THE C++ BOOK &middot; 12.9</span>'),
        ('window.READING_SYNC={resourceSet:"cpp_12_4",mode:"page",items:"section.lesson-section",pageName:"C++ Lesson 12.4"};',
         'window.READING_SYNC={resourceSet:"cpp_12_9",mode:"page",items:"section.lesson-section",pageName:"C++ Lesson 12.9"};'),
        ('''    <a href="Cpp_Book_Lesson_12_3.html" class="nav-btn prev">
      <small>← Previous</small>
      12.3  An expression evaluator
    </a>''',
         '''    <a href="Cpp_Book_Lesson_12_8.html" class="nav-btn prev">
      <small>← Previous</small>
      12.8  The Core Guidelines
    </a>'''),
        ('<tr><td class="mono">Build &amp; tooling</td><td class="mono plain">CMake, package managers, debuggers, sanitizers, CI — shipping real projects</td></tr>',
         '<tr><td class="mono">Build &amp; tooling</td><td class="mono plain">package managers, debuggers, CI — the rest of shipping real projects (12.5–12.8 covered warnings, sanitizers, CMake and tests)</td></tr>'),
        ("Run with <code>-fsanitize=address,undefined</code> to catch memory and UB errors the compiler can't see (recall Part X / 10.5).",
         "Run with <code>-fsanitize=address,undefined</code> to catch memory and UB errors the compiler can't see — lesson 12.5."),
    ]
    for a, b in subs:
        if t.count(a) != 1:
            warn.append('12.4->12.9 sub matched %d times: %s' % (t.count(a), a[:60]))
        t = t.replace(a, b)
    if APPLY:
        open(new_p, 'wb').write((t.replace('\n', '\r\n') if crlf else t).encode('utf-8'))
        try:
            os.remove(old_p)
            log.append('12.4 -> 12.9 (old file removed)')
        except OSError as e:
            log.append('12.9 written; could NOT delete Cpp_Book_Lesson_12_4.html (%s) — delete it by hand' % e.__class__.__name__)
    else:
        log.append('12.4 -> 12.9 (dry run)')
elif os.path.exists(new_p):
    log.append('12.9 already present — skipping rename')


# ---------------- 2. 12.3 next -> 12.5 ----------------
def e123(t):
    old = '''    <a href="Cpp_Book_Lesson_12_4.html" class="nav-btn next">
      <small>Next: finale →</small>
      12.4  Where to go next
    </a>'''
    new = '''    <a href="Cpp_Book_Lesson_12_5.html" class="nav-btn next">
      <small>Next lesson →</small>
      12.5  Warnings &amp; sanitizers
    </a>'''
    if t.count(old) != 1: return None
    log.append('12.3 next -> 12.5')
    return t.replace(old, new)
rw(os.path.join(L, 'Cpp_Book_Lesson_12_3.html'), e123, optional=True)


# ---------------- 3. counters ----------------
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
        if rw(os.path.join(L, fn), ecount, optional=True): log.append(f'counter {fn} -> {i}/{total}')
    print(f'  {book} book: {total} lessons')

print('MODE', 'APPLY' if APPLY else 'DRY')
for x in log:
    if not x.startswith('counter'): print('  ', x)
n = sum(1 for x in log if x.startswith('counter'))
print(f'   ... {n} lesson counters renumbered')
for w in warn: print('  !!', w)
print('total changes:', len(log))
