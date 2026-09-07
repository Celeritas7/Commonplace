/* Reading-progress adapter.
   The launcher needs a map { "0.1": {pct, at}, … } of lesson ids → progress.
   reading-sync.js lives outside this folder, so instead of assuming one key
   we probe every plausible source and normalise whatever is found.

   Console diagnostic (paste in a lesson page or the launcher):
     PYPROGRESS.debug()
   It prints the keys it found and what it parsed out of them. */
window.PYPROGRESS = (function () {

/* py_0_1 / py-0-1 / Py_Lesson_0_1 / lesson 0.1 → "0.1" */
function toId(s) {
  var m = String(s).match(/(?:py|lesson)[^0-9]{0,9}(\d{1,2})[._-](\d{1,2})/i);
  return m ? m[1] + "." + m[2] : null;
}
function pctOf(v) {
  if (typeof v === "number") return v <= 1 ? Math.round(v * 100) : Math.round(v);
  if (v && typeof v === "object") {
    if (typeof v.pct === "number") return v.pct;
    if (typeof v.percent === "number") return v.percent;
    if (typeof v.progress === "number") return v.progress <= 1 ? Math.round(v.progress * 100) : Math.round(v.progress);
    if (Array.isArray(v.seen) && typeof v.total === "number" && v.total) return Math.round(v.seen.length / v.total * 100);
    if (v.seen && typeof v.seen === "object" && typeof v.total === "number" && v.total) return Math.round(Object.keys(v.seen).length / v.total * 100);
  }
  return null;
}
function atOf(v) {
  if (v && typeof v === "object") {
    var t = v.at || v.ts || v.updated || v.updatedAt || v.time;
    if (typeof t === "number") return t < 1e12 ? t * 1000 : t;
    if (typeof t === "string") { var d = Date.parse(t); if (!isNaN(d)) return d; }
  }
  return Date.now();
}
function keys() {
  var out = [];
  try { for (var i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); } catch (e) {}
  return out;
}
function parse(raw) { try { return JSON.parse(raw); } catch (e) { return raw; } }

function collect() {
  var found = {}, notes = [];
  /* 1 — the canonical shape this launcher writes */
  var direct = null;
  try { direct = JSON.parse(localStorage.getItem("cp_py_read") || "null"); } catch (e) {}
  if (direct && typeof direct === "object") {
    notes.push("cp_py_read: " + Object.keys(direct).length + " entries");
    for (var k in direct) { var p = pctOf(direct[k]); if (p != null) found[k] = { pct: p, at: atOf(direct[k]) }; }
  }
  /* 2 — anything reading-sync or a lesson page left behind */
  keys().forEach(function (key) {
    if (key === "cp_py_read") return;
    if (!/read|progress|lesson|^py|sync/i.test(key)) return;
    var val = parse(localStorage.getItem(key));
    var idFromKey = toId(key);
    if (idFromKey) {
      var p1 = pctOf(val);
      if (p1 != null) { notes.push(key + " → " + idFromKey + " " + p1 + "%"); if (!found[idFromKey] || found[idFromKey].pct < p1) found[idFromKey] = { pct: p1, at: atOf(val) }; }
      return;
    }
    if (val && typeof val === "object" && !Array.isArray(val)) {
      Object.keys(val).forEach(function (sub) {
        var id = toId(sub) || (/^\d{1,2}\.\d{1,2}$/.test(sub) ? sub : null);
        if (!id) return;
        var p2 = pctOf(val[sub]);
        if (p2 == null) return;
        notes.push(key + "." + sub + " → " + id + " " + p2 + "%");
        if (!found[id] || found[id].pct < p2) found[id] = { pct: p2, at: atOf(val[sub]) };
      });
    }
  });
  return { map: found, notes: notes };
}

return {
  /* {} when nothing is stored — callers then show the "Begin" state */
  read: function () { return collect().map; },
  /* call from a lesson page to write the canonical key */
  write: function (id, pct) {
    try {
      var m = JSON.parse(localStorage.getItem("cp_py_read") || "{}");
      var prev = m[id] && m[id].pct || 0;
      m[id] = { pct: Math.max(prev, Math.round(pct)), at: Date.now() };
      localStorage.setItem("cp_py_read", JSON.stringify(m));
    } catch (e) {}
  },
  debug: function () {
    var c = collect();
    console.log("PYPROGRESS — sources seen:\n" + (c.notes.length ? c.notes.join("\n") : "(none)"));
    console.log("PYPROGRESS — normalised:", c.map);
    console.log("PYPROGRESS — all storage keys:", keys());
    return c.map;
  }
};
})();
