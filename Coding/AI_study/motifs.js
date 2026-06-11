/* motifs.js — a small 4D-projection renderer.
   Every plate is a set of points / edges living in 4-space. We rotate them
   through several planes (including the w-planes) and project 4D -> 3D -> 2D.
   The 4th coordinate (w) is encoded as COLOUR TEMPERATURE and dot size, so the
   extra dimension is literally visible as it breathes.

   window.Motifs.mount(canvas, opts) -> cleanup()
     opts.type : tesseract | lattice | scatter | hyperplane | margin |
                 neighbors | clusters | anomaly | tree | axes | project
     opts.seed : integer, varies the arrangement
     opts.speed: rotation speed multiplier (default 1)
     opts.hero : boolean, richer rendering for the cover hero
*/
(function () {
  // ---- palette: the w-axis as a 5-stop hyperspectrum ----------------------
  // far in w -> near in w : cyan -> electric blue -> violet -> magenta -> solar
  const SPECTRUM = [
    [95, 208, 230],   // #5fd0e6 luminous cyan
    [124, 155, 240],  // #7c9bf0 electric blue
    [155, 140, 240],  // #9b8cf0 violet
    [224, 106, 212],  // #e06ad4 magenta
    [255, 146, 100]   // #ff9264 solar coral
  ];
  function spectrumRGB(w) {
    const t = Math.max(0, Math.min(1, (w + 1.4) / 2.8));
    const seg = Math.min(SPECTRUM.length - 2, Math.floor(t * (SPECTRUM.length - 1)));
    const k = t * (SPECTRUM.length - 1) - seg;
    const A = SPECTRUM[seg], B = SPECTRUM[seg + 1];
    return [A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k];
  }
  function wColor(w, a) {
    const c = spectrumRGB(w);
    return "rgba(" + (c[0] | 0) + "," + (c[1] | 0) + "," + (c[2] | 0) + "," + a + ")";
  }
  function hexRGB(h) {
    const m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---- seeded RNG ----------------------------------------------------------
  function rng(seed) {
    let s = (seed * 2654435761) >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  // ---- 4D rotation + projection -------------------------------------------
  function rot4(p, a) {
    let [x, y, z, w] = p, c, s, t;
    c = Math.cos(a.xy); s = Math.sin(a.xy); t = x * c - y * s; y = x * s + y * c; x = t;
    c = Math.cos(a.xz); s = Math.sin(a.xz); t = x * c - z * s; z = x * s + z * c; x = t;
    c = Math.cos(a.xw); s = Math.sin(a.xw); t = x * c - w * s; w = x * s + w * c; x = t;
    c = Math.cos(a.yw); s = Math.sin(a.yw); t = y * c - w * s; w = y * s + w * c; y = t;
    c = Math.cos(a.zw); s = Math.sin(a.zw); t = z * c - w * s; w = z * s + w * c; z = t;
    return [x, y, z, w];
  }
  function project(p) {
    const [x, y, z, w] = p;
    const dw = 2.6, k4 = dw / (dw - w);          // 4D -> 3D
    let X = x * k4, Y = y * k4, Z = z * k4;
    const dz = 3.4, k3 = dz / (dz - Z);          // 3D -> 2D
    return { x: X * k3, y: Y * k3, depth: k3, w: w };
  }

  // ---- geometry builders ---------------------------------------------------
  function tesseract() {
    const v = [], e = [];
    for (let i = 0; i < 16; i++) {
      v.push([
        (i & 1 ? 1 : -1) * 0.8,
        (i & 2 ? 1 : -1) * 0.8,
        (i & 4 ? 1 : -1) * 0.8,
        (i & 8 ? 1 : -1) * 0.8
      ]);
    }
    for (let i = 0; i < 16; i++)
      for (let b = 0; b < 4; b++) {
        const j = i ^ (1 << b);
        if (j > i) e.push([i, j]);
      }
    return { v, e };
  }

  function lattice(seed) {
    const r = rng(seed), v = [], e = [], n = 6, idx = {};
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const x = (i / (n - 1) - 0.5) * 1.7;
        const y = (j / (n - 1) - 0.5) * 1.7;
        const w = Math.sin(i * 0.9 + seed) * 0.5 + Math.cos(j * 0.9) * 0.5;
        idx[i + "," + j] = v.length;
        v.push([x, y, 0.15 * Math.sin(i + j), w]);
      }
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i < n - 1) e.push([idx[i + "," + j], idx[(i + 1) + "," + j]]);
        if (j < n - 1) e.push([idx[i + "," + j], idx[i + "," + (j + 1)]]);
      }
    return { v, e };
  }

  function cloud(seed, n, opts) {
    opts = opts || {};
    const r = rng(seed), v = [], e = [], groups = opts.groups || 1;
    const centers = [];
    for (let g = 0; g < groups; g++)
      centers.push([(r() - 0.5) * 1.7, (r() - 0.5) * 1.7, (r() - 0.5) * 1.2, (r() - 0.5) * 1.7]);
    // recentre the group centers so the cloud fills the plate
    const mean = [0, 0, 0, 0];
    centers.forEach(c => { for (let k = 0; k < 4; k++) mean[k] += c[k] / centers.length; });
    centers.forEach(c => { for (let k = 0; k < 4; k++) c[k] -= mean[k]; });
    for (let i = 0; i < n; i++) {
      const g = i % groups, c = centers[g];
      const spread = opts.spread || 0.5;
      v.push([
        c[0] + (r() - 0.5) * spread,
        c[1] + (r() - 0.5) * spread,
        c[2] + (r() - 0.5) * spread,
        c[3] + (r() - 0.5) * spread,
        g
      ]);
    }
    return { v, e, centers };
  }

  function tree(seed) {
    const r = rng(seed), v = [], e = [];
    // root
    v.push([0, -1.1, 0, 0]);
    let level = [0], depth = 3;
    for (let d = 0; d < depth; d++) {
      const next = [];
      for (const parent of level) {
        const kids = d === 0 ? 2 : 2;
        for (let k = 0; k < kids; k++) {
          const px = v[parent][0];
          const spreadX = 1.3 / Math.pow(2, d);
          const x = px + (k === 0 ? -spreadX : spreadX);
          const y = v[parent][1] + 0.75;
          const w = (r() - 0.5) * 1.6;
          const id = v.length;
          v.push([x, y, (r() - 0.5) * 0.4, w]);
          e.push([parent, id]);
          next.push(id);
        }
      }
      level = next;
    }
    return { v, e };
  }

  function axes(seed) {
    const r = rng(seed), v = [], e = [];
    const A = [[1.15, 0, 0, 0], [0, 1.15, 0, 0], [0, 0, 1.15, 0], [0, 0, 0, 1.15]];
    v.push([0, 0, 0, 0]);            // origin = 0
    for (let i = 0; i < 4; i++) { v.push(A[i]); e.push([0, v.length - 1]); v.push(A[i].map(x => -x)); e.push([0, v.length - 1]); }
    // a faint cloud projecting onto the axes
    const c = cloud(seed + 99, 26, { groups: 2, spread: 0.5 });
    const base = v.length;
    c.v.forEach(p => v.push(p));
    return { v, e, axisCount: 9, cloudStart: base };
  }

  // ---- main mount ----------------------------------------------------------
  function mount(canvas, opts) {
    opts = opts || {};
    const ctx = canvas.getContext("2d");
    const speed = opts.speed || 1;
    const seed = opts.seed || 1;
    const type = opts.type || "tesseract";
    const hero = !!opts.hero;

    // chapter theme: blend the w-spectrum toward the chapter's accent colour,
    // so each topic owns a hue while the 4th-dim gradient stays visible
    const accent = hexRGB(opts.accent);
    const themeColor = accent
      ? function (w, a) {
          const c = spectrumRGB(w), K = 0.62;
          return "rgba(" + ((c[0] + (accent[0] - c[0]) * K) | 0) + "," +
            ((c[1] + (accent[1] - c[1]) * K) | 0) + "," +
            ((c[2] + (accent[2] - c[2]) * K) | 0) + "," + a + ")";
        }
      : wColor;

    let geo, isCloud = false, isAxes = false, boundary = null;
    if (type === "tesseract") geo = tesseract();
    else if (type === "lattice") geo = lattice(seed);
    else if (type === "tree") geo = tree(seed);
    else if (type === "axes" || type === "project") { geo = axes(seed); isAxes = true; }
    else {
      isCloud = true;
      const map = {
        scatter: { groups: 2, n: 30 }, hyperplane: { groups: 2, n: 30, line: true },
        margin: { groups: 2, n: 26, line: true, margin: true },
        neighbors: { groups: 3, n: 30, ring: true }, clusters: { groups: 3, n: 42 },
        anomaly: { groups: 1, n: 34, outlier: true }
      };
      const cfg = map[type] || { groups: 2, n: 30 };
      geo = cloud(seed, cfg.n, { groups: cfg.groups, spread: hero ? 0.5 : 0.42 });
      boundary = cfg;
    }

    let raf = 0, running = true, dpr = 1, W = 0, H = 0, scale = 1;
    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(W, H) * (hero ? 0.30 : 0.34);
    }
    resize();
    const ro = new ResizeObserver(resize); ro.observe(canvas);

    const a = { xy: 0.2, xz: -0.3, xw: 0, yw: 0, zw: 0 };
    let t = seed * 0.7;

    function frame() {
      if (!running) return;
      t += 0.0045 * speed;
      a.xy = 0.18 + Math.sin(t * 0.5) * 0.25;
      a.xz = -0.3 + t * 0.18;
      a.xw = t * 0.33;                 // <- the 4th-dimension rotations
      a.yw = t * 0.21 + seed;
      a.zw = Math.sin(t * 0.7) * 0.6;

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2;

      const P = geo.v.map(p => {
        const pr = project(rot4(p, a));
        return { x: cx + pr.x * scale, y: cy + pr.y * scale, depth: pr.depth, w: pr.w, g: p[4] };
      });

      // edges
      if (geo.e && geo.e.length) {
        for (const [i, j] of geo.e) {
          const A1 = P[i], B1 = P[j];
          const w = (A1.w + B1.w) / 2;
          const isAxis = isAxes && geo.axisCount && (i === 0);
          ctx.beginPath();
          ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y);
          ctx.strokeStyle = themeColor(w, isAxis ? 0.55 : (hero ? 0.42 : 0.34));
          ctx.lineWidth = isAxis ? 1.4 : (hero ? 1.1 : 0.85);
          ctx.stroke();
        }
      }

      // boundary line for hyperplane / margin (perpendicular bisector of centers)
      if (isCloud && boundary && (boundary.line) && geo.centers.length >= 2) {
        const c0 = project(rot4([geo.centers[0][0], geo.centers[0][1], geo.centers[0][2], geo.centers[0][3]], a));
        const c1 = project(rot4([geo.centers[1][0], geo.centers[1][1], geo.centers[1][2], geo.centers[1][3]], a));
        const mx = cx + (c0.x + c1.x) / 2 * scale, my = cy + (c0.y + c1.y) / 2 * scale;
        let dx = (c1.x - c0.x), dy = (c1.y - c0.y);
        const len = Math.hypot(dx, dy) || 1; dx /= len; dy /= len;
        const px = -dy, py = dx, L = Math.min(W, H) * 0.5;
        const drawLine = (off, dash, alpha) => {
          ctx.save(); ctx.setLineDash(dash ? [4, 5] : []);
          ctx.beginPath();
          ctx.moveTo(mx + px * L + dx * off * scale, my + py * L + dy * off * scale);
          ctx.lineTo(mx - px * L + dx * off * scale, my - py * L + dy * off * scale);
          ctx.strokeStyle = "rgba(220,228,240," + alpha + ")"; ctx.lineWidth = dash ? 0.9 : 1.3;
          ctx.stroke(); ctx.restore();
        };
        drawLine(0, false, 0.5);
        if (boundary.margin) { drawLine(0.32, true, 0.28); drawLine(-0.32, true, 0.28); }
      }

      // points
      if (isCloud || isAxes) {
        const start = isAxes ? geo.cloudStart : 0;
        for (let i = start; i < P.length; i++) {
          const p = P[i];
          let r = (hero ? 3.0 : 2.1) * (0.6 + (p.depth - 0.7) * 0.9);
          r = Math.max(1, r);
          let alpha = hero ? 0.95 : 0.85;
          let col = themeColor(p.w, alpha);
          if (boundary && boundary.outlier && i === P.length - 1) {
            // force a vivid outlier
            col = "rgba(232,108,86,1)"; r *= 1.9;
            ctx.save(); ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, 7);
            ctx.strokeStyle = "rgba(232,108,86,0.35)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.shadowBlur = hero ? 10 : 6; ctx.shadowColor = col;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      } else {
        // vertices of frames (tesseract / lattice / tree)
        for (let i = 0; i < P.length; i++) {
          const p = P[i];
          const r = (hero ? 2.6 : 1.8) * (0.6 + (p.depth - 0.7) * 0.8);
          const col = themeColor(p.w, 0.95);
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.8, r), 0, Math.PI * 2);
          ctx.fillStyle = col;
          ctx.shadowBlur = hero ? 9 : 5; ctx.shadowColor = col;
          ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      raf = requestAnimationFrame(frame);
    }

    // pause only on real cleanup; rAF is auto-throttled offscreen/hidden ----
    function stop() { running = false; cancelAnimationFrame(raf); }

    // paint one frame synchronously so a static frame always exists
    // (covers print, PDF export, reduced-motion, and hidden-tab first paint);
    // the rAF loop then animates whenever the tab is visible.
    frame();

    return function cleanup() {
      stop(); ro.disconnect();
    };
  }

  /* ---- full-viewport 4D background field --------------------------------- */
  function mountField(canvas, readoutEl) {
    const ctx = canvas.getContext("2d");
    let dpr = 1, W = 0, H = 0;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    // safe perspective (gentle, no blow-ups)
    function proj(p, dw, dz) {
      const [x, y, z, w] = p;
      const k4 = dw / Math.max(0.6, dw - w);
      let X = x * k4, Y = y * k4, Z = z * k4;
      const k3 = dz / Math.max(0.6, dz - Z);
      return { x: X * k3, y: Y * k3, depth: k3, w: w };
    }

    const r = rng(917);
    // fall back to sane dims if the window reports zero at boot; clamp N ≥ 24
    const fw = W || 1280, fh = H || 800;
    const N = Math.max(24, Math.min(110, Math.round((fw * fh) / 16000)));
    const pts = [];
    for (let i = 0; i < N; i++) {
      pts.push([
        (r() - 0.5) * 2.6, (r() - 0.5) * 2.6, (r() - 0.5) * 2.6, (r() - 0.5) * 2.6,
        (r() - 0.5) * 0.0016, (r() - 0.5) * 0.0016, (r() - 0.5) * 0.0016, (r() - 0.5) * 0.0016
      ]);
    }
    const cube = tesseract();

    let mx = 0, my = 0, tmx = 0, tmy = 0;
    window.addEventListener("mousemove", (e) => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = e.clientY / window.innerHeight - 0.5;
    }, { passive: true });

    let t = 0, raf = 0, running = true, fcount = 0;
    const a = { xy: 0, xz: 0, xw: 0, yw: 0, zw: 0 };

    // drifting nebulae — slow colour weather behind the field
    const NEB = [
      { rgb: "95,208,230",  spd: 1.3, ph: 0.0 },
      { rgb: "155,140,240", spd: 0.9, ph: 2.1 },
      { rgb: "224,106,212", spd: 1.1, ph: 4.2 },
      { rgb: "255,146,100", spd: 0.7, ph: 5.5 }
    ];

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);   // schedule first — a transient error can't kill the loop
      // recover from a zero-size boot (hidden iframe/background tab): the
      // window may never fire 'resize' when it simply becomes visible later
      if (W !== window.innerWidth || H !== window.innerHeight) resize();
      if (!W || !H) return;
      t += 0.0016;
      mx += (tmx - mx) * 0.04; my += (tmy - my) * 0.04;
      a.xy = 0.05 + t * 0.025;
      a.xz = t * 0.018;
      a.xw = t * 0.10 + mx * 0.7;
      a.yw = t * 0.07 + my * 0.7;
      a.zw = Math.sin(t * 0.28) * 0.5;

      ctx.clearRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.40;

      // nebulae
      for (const nb of NEB) {
        const nx = cx + Math.cos(t * nb.spd * 10 + nb.ph) * W * 0.34;
        const ny = cy + Math.sin(t * nb.spd * 7 + nb.ph * 1.7) * H * 0.32;
        const rad = Math.min(W, H) * 0.45;
        const grd = ctx.createRadialGradient(nx, ny, 0, nx, ny, rad);
        grd.addColorStop(0, "rgba(" + nb.rgb + ",0.055)");
        grd.addColorStop(1, "rgba(" + nb.rgb + ",0)");
        ctx.fillStyle = grd;
        ctx.fillRect(nx - rad, ny - rad, rad * 2, rad * 2);
      }

      // giant ghost tesseract
      const cp = cube.v.map(p => {
        const pr = proj(rot4(p.map(v => v * 1.55), a), 4.4, 7.5);
        return { x: cx + pr.x * scale, y: cy + pr.y * scale, w: pr.w };
      });
      for (const [i, j] of cube.e) {
        const A1 = cp[i], B1 = cp[j];
        ctx.beginPath(); ctx.moveTo(A1.x, A1.y); ctx.lineTo(B1.x, B1.y);
        ctx.strokeStyle = wColor((A1.w + B1.w) / 2, 0.09);
        ctx.lineWidth = 1; ctx.stroke();
      }
      for (const q of cp) {
        ctx.beginPath(); ctx.arc(q.x, q.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = wColor(q.w, 0.18); ctx.fill();
      }

      // drifting point field
      const P = new Array(N);
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        for (let k = 0; k < 4; k++) {
          p[k] += p[k + 4];
          if (p[k] > 1.4) p[k] = -1.4; else if (p[k] < -1.4) p[k] = 1.4;
        }
        const pr = proj(rot4([p[0], p[1], p[2], p[3]], a), 4.0, 6.5);
        P[i] = { x: cx + pr.x * scale, y: cy + pr.y * scale, depth: pr.depth, w: pr.w };
      }
      // constellation links
      const LIM = Math.min(W, H) * 0.13, LIM2 = LIM * LIM;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = P[i].x - P[j].x, dy = P[i].y - P[j].y, d2 = dx * dx + dy * dy;
          if (d2 < LIM2) {
            const al = (1 - Math.sqrt(d2) / LIM) * 0.15;
            ctx.beginPath(); ctx.moveTo(P[i].x, P[i].y); ctx.lineTo(P[j].x, P[j].y);
            ctx.strokeStyle = wColor((P[i].w + P[j].w) / 2, al);
            ctx.lineWidth = 0.7; ctx.stroke();
          }
        }
      }
      // points
      for (let i = 0; i < N; i++) {
        const p = P[i];
        const rad = Math.max(0.6, 1.5 * (0.5 + (p.depth - 0.7)));
        ctx.beginPath(); ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
        ctx.fillStyle = wColor(p.w, 0.6);
        ctx.fill();
      }
      // twinkle flares — a few stars pulse with cross-shaped glints
      for (let i = 0; i < 7 && N > 0; i++) {
        const p = P[(i * 13) % N];
        if (!p) continue;
        const tw = 0.5 + 0.5 * Math.sin(t * 60 + i * 1.9);
        const len = 4 + tw * 8;
        ctx.strokeStyle = wColor(p.w, 0.18 + tw * 0.4);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x - len, p.y); ctx.lineTo(p.x + len, p.y);
        ctx.moveTo(p.x, p.y - len); ctx.lineTo(p.x, p.y + len);
        ctx.stroke();
      }

      if (readoutEl && (fcount++ % 5 === 0)) {
        const f = (x) => (x >= 0 ? "+" : "") + x.toFixed(2);
        readoutEl.textContent =
          "◢ HYPERFIELD · ACTIVE · N=" + N + "\n" +
          "4D ROTATION · XW " + f(a.xw % (Math.PI * 2)) +
          "  YW " + f(a.yw % (Math.PI * 2)) +
          "  ZW " + f(a.zw) + "\n" +
          "W-SPECTRUM · CYAN → VIOLET → MAGENTA → SOLAR";
      }
    }
    frame();

    return function cleanup() {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }

  window.Motifs = { mount: mount, mountField: mountField, wColor: wColor };
})();
