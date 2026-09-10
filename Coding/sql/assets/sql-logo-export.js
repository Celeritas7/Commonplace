(() => {
const CREAM = '#fbf8ef', INK = '#211b13', MUTE = '#56503f', RULE = '#cdbfa3';
const PALETTE = [
  { n: 'Oxblood', c: '#8a2f22', d: '#6f2317' },
  { n: 'Pine', c: '#1f5132', d: '#173e26' },
  { n: 'Verdigris', c: '#2f6b5e', d: '#245349' },
  { n: 'Moss', c: '#4a6b2f', d: '#3a5424' }
];
const st = { which: 'lock', dark: false, i: 0 };
const AC = () => PALETTE[st.i].c;

// three-layer database drum, letters S / Q / L one per layer, in a 100x100 box
function glyph(ctx, s, ox) {
  ctx.save(); ctx.scale(s, s);
  ctx.fillStyle = CREAM;
  ctx.beginPath(); ctx.moveTo(22, 20); ctx.lineTo(22, 80); ctx.ellipse(50, 80, 28, 9, 0, Math.PI, 0, true); ctx.lineTo(78, 20); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(50, 20, 28, 9, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = ox; ctx.lineWidth = 2.2;
  for (const y of [40, 60]) { ctx.beginPath(); ctx.ellipse(50, y, 28, 9, 0, 0, Math.PI); ctx.stroke(); }
  ctx.fillStyle = ox; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.font = '900 14px Archivo, "Libre Franklin", Arial, sans-serif';
  ['S', 'Q', 'L'].forEach((ch, k) => ctx.fillText(ch, 50, 44 + k * 20));
  ctx.textAlign = 'left'; ctx.restore();
}
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function mark(size, bg, ox = AC()) {
  const c = cv(size, size), ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, size, size); }
  ctx.fillStyle = ox; ctx.beginPath(); ctx.arc(size / 2, size / 2, size / 2, 0, 7); ctx.fill();
  glyph(ctx, size / 100, ox);
  return c;
}
function icon(size, ox = AC()) {
  const c = cv(size, size), ctx = c.getContext('2d');
  ctx.fillStyle = ox; ctx.fillRect(0, 0, size, size);
  ctx.save(); ctx.translate(size * 0.5, size * 0.5); ctx.scale(0.84, 0.84); ctx.translate(-size * 0.5, -size * 0.5);
  glyph(ctx, size / 100, ox); ctx.restore();
  return c;
}
function lockup(w, bg, ox = AC()) {
  const s = w / 460, c = cv(w, Math.round(120 * s)), ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
  const dark = bg === '#0e1116';
  ctx.drawImage(mark(Math.round(88 * s), null, ox), Math.round(6 * s), Math.round(16 * s));
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = dark ? '#f4efe3' : INK;
  ctx.font = `600 ${72 * s}px "Cormorant Garamond", Garamond, Georgia, serif`;
  ctx.fillText('SQL', 118 * s, 76 * s);
  ctx.fillStyle = dark ? 'rgba(220,210,200,.45)' : RULE;
  ctx.fillRect(252 * s, 30 * s, Math.max(1, 1.2 * s), 52 * s);
  ctx.fillStyle = dark ? CREAM : ox;
  ctx.font = `600 ${13 * s}px "JetBrains Mono", ui-monospace, monospace`;
  ctx.letterSpacing = `${3.4 * s}px`;
  ctx.fillText('THE LAB', 266 * s, 48 * s);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = dark ? '#b7ab97' : MUTE;
  ctx.font = `italic ${19 * s}px "EB Garamond", Georgia, serif`;
  ctx.fillText('practice & drills', 267 * s, 72 * s);
  return c;
}

const drumSVG = ox => `<g fill="${CREAM}"><path d="M22 20v60a28 9 0 0 0 56 0V20z"/><ellipse cx="50" cy="20" rx="28" ry="9"/></g><g fill="none" stroke="${ox}" stroke-width="2.2"><path d="M22 40a28 9 0 0 0 56 0"/><path d="M22 60a28 9 0 0 0 56 0"/></g><g fill="${ox}" text-anchor="middle" font-family="Archivo,'Libre Franklin',Arial,sans-serif" font-weight="900" font-size="14"><text x="50" y="44">S</text><text x="50" y="64">Q</text><text x="50" y="84">L</text></g>`;
const markSVG = ox => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" role="img" aria-label="SQL mark"><circle cx="50" cy="50" r="50" fill="${ox}"/>${drumSVG(ox)}</svg>`;
const lockupSVG = ox => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 120" width="460" height="120" role="img" aria-label="SQL — The Lab"><g transform="translate(6 16) scale(0.88)"><circle cx="50" cy="50" r="50" fill="${ox}"/>${drumSVG(ox)}</g><text x="118" y="76" font-family="'Cormorant Garamond',Garamond,Georgia,serif" font-size="72" font-weight="600" letter-spacing="-1" fill="${INK}">SQL</text><text x="266" y="48" font-family="'JetBrains Mono',ui-monospace,monospace" font-size="13" font-weight="600" letter-spacing="3.4" fill="${ox}">THE LAB</text><text x="267" y="72" font-family="'EB Garamond',Georgia,serif" font-size="19" font-style="italic" fill="${MUTE}">practice &amp; drills</text><rect x="252" y="30" width="1.2" height="52" fill="${RULE}"/></svg>`;

const toBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
const svgOf = str => new Blob([str], { type: 'image/svg+xml' });
async function save(getBlob, name) {
  const blob = await getBlob();
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
const slug = () => PALETTE[st.i].n.toLowerCase();

const ITEMS = [
  { t: 'Mark', d: 'PNG · 512 · transparent', f: () => `sql-mark-512-${slug()}.png`, get: () => toBlob(mark(512, null)) },
  { t: 'Mark', d: 'PNG · 1024 · transparent', f: () => `sql-mark-1024-${slug()}.png`, get: () => toBlob(mark(1024, null)) },
  { t: 'App icon', d: 'PNG · 1024 · full bleed', f: () => `sql-app-icon-1024-${slug()}.png`, get: () => toBlob(icon(1024)) },
  { t: 'Lockup', d: 'PNG · 1600 · transparent', f: () => `sql-lockup-1600-${slug()}.png`, get: () => toBlob(lockup(1600, null)) },
  { t: 'Lockup', d: 'PNG · 1600 · dark', f: () => `sql-lockup-1600-dark-${slug()}.png`, get: () => toBlob(lockup(1600, '#0e1116')) },
  { t: 'Mark', d: 'SVG · vector', f: () => `sql-mark-${slug()}.svg`, get: async () => svgOf(markSVG(AC())) },
  { t: 'Lockup', d: 'SVG · vector', f: () => `sql-lockup-${slug()}.svg`, get: async () => svgOf(lockupSVG(AC())) }
];

const dls = document.getElementById('dls');
for (const it of ITEMS) {
  const a = document.createElement('a');
  a.className = 'dl'; a.href = '#'; a.innerHTML = `<div><b>${it.t}</b><span>${it.d}</span></div><em>Save</em>`;
  a.addEventListener('click', async e => {
    e.preventDefault(); const em = a.querySelector('em'); em.textContent = '…';
    try { await save(it.get, it.f()); em.textContent = 'Saved'; }
    catch (err) { em.textContent = 'Failed'; console.error(err); }
    setTimeout(() => { em.textContent = 'Save'; }, 1800);
  });
  dls.appendChild(a);
}

const bar = document.getElementById('savebar');
function fill() {
  bar.innerHTML = '';
  [['Mark', mark(600, null)], ['App icon', icon(600)], ['Lockup', lockup(1200, null)]].forEach(([label, canvas]) => {
    const fig = document.createElement('figure');
    fig.innerHTML = `<img alt="${label}" src="${canvas.toDataURL('image/png')}" /><figcaption>${label}</figcaption>`;
    bar.appendChild(fig);
  });
}

const sw = document.getElementById('swatches');
PALETTE.forEach((p, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'sw'; b.style.setProperty('--c', p.c);
  b.setAttribute('aria-pressed', String(i === st.i));
  b.innerHTML = `<i></i><span>${p.n}</span>`;
  b.onclick = () => { st.i = i; paint(); fill(); };
  sw.appendChild(b);
});

const stage = document.getElementById('stage'), pv = document.getElementById('preview');
function paint() {
  const p = PALETTE[st.i];
  document.documentElement.style.setProperty('--ox', p.c);
  document.documentElement.style.setProperty('--ox2', p.d);
  stage.classList.toggle('dark', st.dark);
  const c = st.which === 'lock' ? lockup(1200, st.dark ? '#0e1116' : null) : mark(600, null);
  pv.src = c.toDataURL('image/png');
  pv.width = st.which === 'lock' ? 460 : 200;
  for (const [id, on] of [['b-lock', st.which === 'lock'], ['b-mark', st.which === 'mark'], ['b-dark', st.dark]])
    document.getElementById(id).setAttribute('aria-pressed', String(on));
  [...sw.children].forEach((b, i) => b.setAttribute('aria-pressed', String(i === st.i)));
}
document.getElementById('b-lock').onclick = () => { st.which = 'lock'; paint(); };
document.getElementById('b-mark').onclick = () => { st.which = 'mark'; paint(); };
document.getElementById('b-dark').onclick = () => { st.dark = !st.dark; paint(); };

const fonts = ['900 14px Archivo', '600 72px "Cormorant Garamond"', '600 13px "JetBrains Mono"', 'italic 19px "EB Garamond"'];
Promise.all(fonts.map(f => document.fonts.load(f).catch(() => {})))
  .then(() => document.fonts.ready)
  .then(() => { paint(); fill(); });
})();
