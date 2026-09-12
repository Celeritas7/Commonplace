/* lab.js — the interactive companion figure: drag points, watch least squares move.
   Vanilla SVG, no framework. The maths here is only for the picture; the real
   numbers come from the Python cells, which read the same points via lab_points.

   window.Lab.mount(host, opts) -> { points(), destroy() }
     opts.onPush(points)  called by "send to session"
*/
(function () {
  const DEFAULT = [[0.8,1.6],[1.6,2.1],[2.3,3.4],[3.1,2.9],[3.9,4.6],[4.6,4.2],[5.3,5.9],[6.0,5.4],[6.8,7.1],[7.5,6.6],[8.3,8.4],[9.1,8.0]];
  const KEY = "aistudy.lab.points.v1";
  const NS = "http://www.w3.org/2000/svg";
  const W = 460, H = 330, P = { l: 36, r: 14, t: 14, b: 32 };

  function fit(pts, alpha) {
    const n = pts.length; let mx = 0, my = 0;
    pts.forEach(([x, y]) => { mx += x / n; my += y / n; });
    let sxx = 0, sxy = 0;
    pts.forEach(([x, y]) => { sxx += (x - mx) * (x - mx); sxy += (x - mx) * (y - my); });
    const w = sxy / (sxx + (alpha || 0)), b = my - w * mx;
    let sr = 0, st = 0;
    pts.forEach(([x, y]) => { const r = y - (w * x + b); sr += r * r; st += (y - my) * (y - my); });
    return { w: w, b: b, r2: st ? 1 - sr / st : 1, loss: sr };
  }
  const fmt = (v, d) => (Math.round(v * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d);
  const el = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };

  function mount(host, opts) {
    opts = opts || {};
    let pts;
    try { pts = JSON.parse(localStorage.getItem(KEY)) || DEFAULT.slice(); } catch (e) { pts = DEFAULT.slice(); }
    let alpha = 0, drag = -1, squares = true;

    host.innerHTML =
      '<div class="lab">' +
      '<div class="labbar"><span class="labttl">' + (opts.title || "Least squares, by hand") + '</span>' +
      '<label class="labchk"><input type="checkbox" checked data-sq> show the squares</label>' +
      '<button class="btn" data-reset>Reset points</button>' +
      '<button class="btn btn-run" data-push title="Define lab_points in the running Python session">↳ send to session</button></div>' +
      '<div class="labsvg"></div>' +
      '<label class="labalpha">&alpha; <input type="range" min="0" max="500" step="1" value="0" data-alpha><b data-alphav>0</b><i>ridge penalty — the dashed line stays OLS</i></label>' +
      '<div class="labstats"></div>' +
      '<div class="labeq"></div></div>';

    const svgHost = host.querySelector(".labsvg");
    const statsHost = host.querySelector(".labstats");
    const eqHost = host.querySelector(".labeq");
    const svg = el("svg", { viewBox: "0 0 " + W + " " + H, class: "labplot" });
    svgHost.appendChild(svg);

    const sx = x => P.l + x / 10 * (W - P.l - P.r);
    const sy = y => H - P.b - y / 10 * (H - P.t - P.b);

    function save() { try { localStorage.setItem(KEY, JSON.stringify(pts)); } catch (e) {} }

    function draw() {
      const ols = fit(pts, 0), shown = fit(pts, alpha);
      svg.innerHTML = "";
      [0, 2, 4, 6, 8, 10].forEach(v => {
        svg.appendChild(el("line", { x1: sx(v), y1: sy(0), x2: sx(v), y2: sy(10), class: "labgrid" }));
        svg.appendChild(el("line", { x1: sx(0), y1: sy(v), x2: sx(10), y2: sy(v), class: "labgrid" }));
        const tx = el("text", { x: sx(v), y: H - 11, class: "labtick", "text-anchor": "middle" }); tx.textContent = v; svg.appendChild(tx);
        const ty = el("text", { x: P.l - 8, y: sy(v) + 3, class: "labtick", "text-anchor": "end" }); ty.textContent = v; svg.appendChild(ty);
      });
      if (squares) pts.forEach(([x, y]) => {
        const r = y - (shown.w * x + shown.b), s = Math.abs(sy(r) - sy(0));
        svg.appendChild(el("rect", { x: r > 0 ? sx(x) - s : sx(x), y: r > 0 ? sy(y) : sy(y) - s, width: s, height: s, class: "labsq" }));
      });
      pts.forEach(([x, y]) => svg.appendChild(el("line", { x1: sx(x), y1: sy(y), x2: sx(x), y2: sy(shown.w * x + shown.b), class: "labres" })));
      if (alpha > 0) svg.appendChild(el("line", { x1: sx(0), y1: sy(ols.b), x2: sx(10), y2: sy(ols.w * 10 + ols.b), class: "labols" }));
      svg.appendChild(el("line", { x1: sx(0), y1: sy(shown.b), x2: sx(10), y2: sy(shown.w * 10 + shown.b), class: "labfit" }));
      pts.forEach(([x, y], i) => {
        const g = el("g", { class: "labpt" + (drag === i ? " is-drag" : "") });
        g.appendChild(el("circle", { cx: sx(x), cy: sy(y), r: 15, class: "labhit" }));
        g.appendChild(el("circle", { cx: sx(x), cy: sy(y), r: drag === i ? 7 : 5.5, class: "labdot" }));
        g.addEventListener("pointerdown", (e) => { drag = i; svg.setPointerCapture(e.pointerId); draw(); });
        svg.appendChild(g);
      });
      statsHost.innerHTML = [["w", shown.w, 3], ["b", shown.b, 3], ["R²", shown.r2, 3], ["Σr²", shown.loss, 2]]
        .map(s => '<div class="labstat"><span>' + s[0] + "</span><b>" + fmt(s[1], s[2]) + "</b></div>").join("");
      eqHost.innerHTML = "ŷ = <b>" + fmt(shown.w, 2) + "</b>·x + <b>" + fmt(shown.b, 2) +
        "</b>" + (alpha > 0 ? " · dashed = OLS · α = " + alpha : "") + '<i>drag any point</i>';
    }

    function onMove(e) {
      if (drag < 0) return;
      const r = svg.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      pts[drag] = [
        Math.max(0, Math.min(10, (x - P.l) / (W - P.l - P.r) * 10)),
        Math.max(0, Math.min(10, (H - P.b - y) / (H - P.t - P.b) * 10))
      ];
      draw();
    }
    function onUp() { if (drag >= 0) { drag = -1; save(); draw(); } }
    svg.addEventListener("pointermove", onMove);
    svg.addEventListener("pointerup", onUp);
    svg.addEventListener("pointerleave", onUp);

    host.querySelector("[data-alpha]").addEventListener("input", (e) => {
      alpha = +e.target.value; host.querySelector("[data-alphav]").textContent = alpha; draw();
    });
    host.querySelector("[data-sq]").addEventListener("change", (e) => { squares = e.target.checked; draw(); });
    host.querySelector("[data-reset]").addEventListener("click", () => { pts = DEFAULT.slice(); alpha = 0; host.querySelector("[data-alpha]").value = 0; host.querySelector("[data-alphav]").textContent = "0"; save(); draw(); });
    host.querySelector("[data-push]").addEventListener("click", (e) => {
      if (opts.onPush) opts.onPush(pts.map(p => [+fmt(p[0], 3), +fmt(p[1], 3)]), e.target);
    });

    draw();
    return { points: () => pts, destroy: () => { host.innerHTML = ""; } };
  }

  window.Lab = { mount: mount, fit: fit, DEFAULT: DEFAULT };
})();
