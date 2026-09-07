/* learn-shelf.js — replaces the Learn pane of Coding/Python/index.html with the
   three-shelf folder view.

   Install — files:
     Coding/Python/shelf.html          (page, stays at root beside index.html)
     Coding/Python/css/shelf.css
     Coding/Python/js/shelf-data.js
     Coding/Python/js/progress-adapter.js
     Coding/Python/js/shelf-page.js
     Coding/Python/js/learn-shelf.js   (this file)

   Install — one paste in index.html, before </body>:

     <script src="js/progress-adapter.js"></script>
     <script src="js/shelf-data.js"></script>
     <script src="js/learn-shelf.js" defer></script>

   Order matters: shelf-data.js and progress-adapter.js must load first.
   Nothing else in index.html changes. The old daily-focus strip and the four
   § sections in the Learn pane are removed here at runtime, so setupLearnRotation()
   can stay in place — it simply has nothing left to decorate. */
(function () {
if (!window.PYSHELF) { console.error("learn-shelf.js: shelf-data.js must load first"); return; }
var P = window.PYSHELF;

var CSS = ''
+ '.shelf-block{margin-top:44px}'
+ '.shelf-kick{font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--ink-mute);display:flex;align-items:baseline;gap:10px;margin:0 0 16px}'
+ '.shelf-kick b{color:var(--green-dk)}'
+ '.shelf-kick i{font-family:"EB Garamond",serif;font-style:italic;font-size:14px;letter-spacing:0;text-transform:none;color:var(--ink-mute)}'
+ '.shelf-kick::after{content:"";flex:1;height:1px;background:var(--line);transform:translateY(-4px)}'
+ '.folders{display:grid;grid-template-columns:repeat(auto-fill,minmax(214px,1fr));gap:16px}'
+ '.folder{position:relative;display:flex;flex-direction:column;min-height:150px;margin-top:11px;padding:15px 17px 14px;background:var(--card);border:1px solid var(--line);border-top:1px solid var(--accent);border-radius:0 10px 10px 10px;text-decoration:none;color:var(--ink);transition:transform .14s,box-shadow .16s,border-color .16s}'
+ '.folder::before{content:"";position:absolute;left:-1px;top:-11px;width:78px;height:12px;background:var(--accent);border:1px solid var(--accent);border-bottom:none;border-radius:3px 9px 0 0}'
+ '.folder:hover{transform:translateY(-2px);box-shadow:0 14px 30px -20px rgba(20,40,30,.55);color:var(--ink);border-color:var(--accent)}'
+ '.f-mark{width:40px;height:40px;color:var(--accent);margin:-2px 0 8px}'
+ '.f-mark svg{width:100%;height:100%;display:block}'
+ '.f-name{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:23px;line-height:1.05;letter-spacing:-.2px}'
+ '.f-sub{font-family:"EB Garamond",serif;font-style:italic;font-size:14px;line-height:1.4;color:var(--ink-mute);margin-top:5px;text-wrap:pretty}'
+ '.f-bar{width:100%;height:3px;background:var(--line-soft);border-radius:2px;overflow:hidden;margin-top:12px}'
+ '.f-bar i{display:block;height:100%;background:var(--accent)}'
+ '.f-foot{margin-top:auto;padding-top:14px;display:flex;align-items:center;gap:9px;flex-wrap:wrap}'
+ '.f-count{font-family:"JetBrains Mono",monospace;font-size:10.5px;color:var(--ink-soft);letter-spacing:.2px}'
+ '.f-count b{color:var(--green-dk);font-weight:700}'
+ '.f-tag{font-family:"JetBrains Mono",monospace;font-size:9.5px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--green-dk);background:var(--tint);border-radius:5px;padding:2px 7px}'
+ '.f-go{margin-left:auto;font-family:"JetBrains Mono",monospace;font-size:12px;color:var(--line)}'
+ '.folder:hover .f-go{color:var(--accent)}'
+ '.folder.empty .f-name{color:var(--ink)}'
+ '.mark{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:22px;background:var(--card);border:1px solid var(--line);border-left:3px solid var(--green);border-radius:12px;padding:16px 22px 16px 20px;text-decoration:none;color:var(--ink);transition:box-shadow .15s,transform .14s}'
+ '.mark:hover{transform:translateY(-1px);box-shadow:0 12px 26px -18px rgba(20,40,30,.6);color:var(--ink)}'
+ '.mark-k{font-family:"JetBrains Mono",monospace;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--green-dk);writing-mode:vertical-rl;transform:rotate(180deg);border-left:1px solid var(--line-soft);padding-left:10px;line-height:1}'
+ '.mark-t{font-family:"Cormorant Garamond",serif;font-weight:600;font-size:24px;line-height:1.05;letter-spacing:-.2px}'
+ '.mark-m{font-family:"JetBrains Mono",monospace;font-size:11px;color:var(--ink-mute);margin-top:6px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}'
+ '.mark-m b{color:var(--ink-soft);font-weight:600;white-space:nowrap}'
+ '.mark-bar{width:120px;height:3px;background:var(--line-soft);border-radius:2px;overflow:hidden}.mark-bar i{display:block;height:100%;background:var(--green)}'
+ '.mark-go{font-family:"JetBrains Mono",monospace;font-size:11px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:#eaf2ea;background:var(--green-dk);border-radius:8px;padding:10px 14px;white-space:nowrap}'
+ '.mark:hover .mark-go{background:var(--green-deep)}'
+ '@media (max-width:720px){.mark{grid-template-columns:1fr;gap:12px}.mark-k{writing-mode:horizontal-tb;transform:none;border-left:none;padding-left:0;border-bottom:1px solid var(--line-soft);padding-bottom:6px}.mark-go{justify-self:start}}';

function fcard(o) {
  var pct = o.total ? Math.round(o.read / o.total * 100) : 0, m = P.shelfMeta(o.id);
  return '<a class="folder' + (o.written ? "" : " empty") + '" style="--accent:' + m.accent + ';--tint:' + m.tint + '" href="' + o.href + '">'
    + '<span class="f-mark">' + m.mark + '</span>'
    + '<span class="f-name">' + o.name + '</span><span class="f-sub">' + o.sub + '</span>'
    + (o.written && o.read ? '<span class="f-bar"><i style="width:' + pct + '%"></i></span>' : '')
    + '<span class="f-foot">' + (o.tag ? '<span class="f-tag">' + o.tag + '</span>' : '')
    + '<span class="f-count">' + o.count + '</span><span class="f-go">&rsaquo;</span></span></a>';
}

function build() {
  var pane = document.querySelector('.mode-pane[data-pane="learn"]');
  if (!pane) return;
  if (!document.getElementById("learn-shelf-css")) {
    var st = document.createElement("style"); st.id = "learn-shelf-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }
  var S = P.state("live");
  var b = P.bookmark(S);
  var books = fcard({ id: "python-book", name: "The Python Book", sub: "13 parts &middot; the spine, read in order",
    href: "shelf.html?s=python-book", written: S.book.written, read: S.book.read, total: S.book.total,
    count: S.book.read ? '<b>' + S.book.read + '</b> read &middot; ' + S.book.written + ' / ' + S.book.total + ' written'
                       : '<b>' + S.book.written + '</b> / ' + S.book.total + ' written' });
  var nbs = P.NBFOLDERS.map(function (f) {
    return fcard({ id: f.id, name: f.t, sub: f.sub, href: "shelf.html?s=" + f.id, written: 1, read: 0, total: 0,
      tag: "runnable", count: '<b>' + f.n + '</b> notebooks' });
  }).join("");

  pane.innerHTML =
      '<a class="mark" href="' + b.href + '"><span class="mark-k">' + b.kick + '</span>'
    + '<span><span class="mark-t">' + b.title + '</span><span class="mark-m">' + b.meta + '</span></span>'
    + '<span class="mark-go">' + b.cta + '</span></a>'
    + '<div class="shelf-block"><div class="shelf-kick"><b>The book</b> <i>written from your own notebooks and notes</i></div><div class="folders">' + books + '</div></div>'
    + '<div class="shelf-block"><div class="shelf-kick"><b>Notebooks</b> <i>runnable, no reading</i></div><div class="folders">' + nbs + '</div></div>';

}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
else build();
})();
