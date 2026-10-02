// Statistics practice set — the older worksheet surface (IBM Plex Sans + Source Serif 4, teal).
// Recreated from the readable parts of Maths/Statistics/statistics_practice.html (header, topic nav, progress, reference card, topic banner, tables tool).
const WS = { accent:'#356b6a', ink:'#1c1b18', soft:'#56544d', mute:'#8a887f', faint:'#a8a59c', rule:'#e6e4dc', chip:'#ddd9cf', paper:'#fbfbf8', sans:"'IBM Plex Sans', sans-serif", serif:"'Source Serif 4', Georgia, serif" };
const TOPICS = [['all','All',22],['normal','Normal',7],['inference','Inference',7],['regression','Regression',4],['poisson','Poisson',4]];

function phi(z) { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp(-z * z / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; }

function TablesTool() {
  const [open, setOpen] = React.useState(false), [z, setZ] = React.useState('1.50');
  const zz = parseFloat(z), ok = !isNaN(zz), f = v => ok ? v.toFixed(4) : '—';
  const rows = [['P(Z < z)','left',f(phi(zz))],['P(Z > z)','right',f(1 - phi(zz))],['P(0 < Z < z)','mid',f(Math.abs(phi(zz) - .5))],['P(|Z| > |z|)','2-tail',f(2 * (1 - phi(Math.abs(zz))))]];
  return (
    <div style={{ position:'fixed', right:20, bottom:20, zIndex:60, fontFamily:WS.sans }}>
      {open && <div style={{ position:'absolute', right:0, bottom:54, width:344, background:'#fff', border:'1px solid #e2dfd5', borderRadius:14, boxShadow:'0 16px 44px rgba(0,0,0,0.20)', overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:WS.accent, color:'#fff' }}>
          <span style={{ fontSize:13, fontWeight:600, letterSpacing:'0.02em' }}>Statistical Tables</span>
          <button onClick={() => setOpen(false)} style={{ cursor:'pointer', border:'none', background:'rgba(255,255,255,0.18)', color:'#fff', width:24, height:24, borderRadius:'50%', fontSize:14, lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:'flex', gap:5, padding:'12px 14px 2px' }}>
          {['Z','t','χ²','F','Poisson','Binomial'].map((t, i) => <button key={t} style={{ cursor:'pointer', fontFamily:WS.sans, fontSize:11.5, fontWeight:600, padding:'6px 11px', borderRadius:7, border:'none', background: i ? 'transparent' : '#f1efe7', color: i ? '#b6b2a8' : WS.ink }}>{t}</button>)}
        </div>
        <div style={{ padding:'14px 16px 16px' }}>
          <label style={{ display:'block', fontSize:11, fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase', color:WS.accent, marginBottom:7 }}>Z → probability</label>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:13, color:WS.mute }}>z =</span>
            <input value={z} onChange={e => setZ(e.target.value)} type="number" step="0.01" style={{ flex:1, fontFamily:"'IBM Plex Mono', ui-monospace, monospace", fontSize:14, padding:'8px 10px', border:'1px solid #dcd8ce', borderRadius:8, background:'#fbfaf6', color:WS.ink }} />
          </div>
          <div style={{ marginTop:10, display:'grid', gridTemplateColumns:'1fr auto', gap:'7px 10px', fontSize:13 }}>
            {rows.map(([k, h, v]) => <React.Fragment key={k}><span style={{ color:WS.soft }}>{k} &nbsp;<span style={{ color:WS.faint }}>{h}</span></span><b style={{ fontFamily:'ui-monospace, monospace', color:WS.ink, textAlign:'right' }}>{v}</b></React.Fragment>)}
          </div>
          <p style={{ margin:'12px 0 0', fontSize:11, lineHeight:1.5, color:WS.faint }}>Values computed exactly — no printed table needed.</p>
        </div>
      </div>}
      <button onClick={() => setOpen(o => !o)} style={{ cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:WS.sans, fontSize:13, fontWeight:600, padding:'11px 16px', border:'none', borderRadius:999, background:WS.ink, color:WS.paper, boxShadow:'0 6px 20px rgba(0,0,0,0.18)' }}><span style={{ fontSize:15 }}>∑</span> Z ↔ P table</button>
    </div>
  );
}

function WorksheetScreen({ go }) {
  const [topic, setTopic] = React.useState('normal');
  const label = { fontFamily:WS.sans, fontSize:12, fontWeight:600, color:WS.soft, marginBottom:6 };
  return (
    <div style={{ minHeight:'100vh', background:WS.paper, fontFamily:WS.serif, color:WS.ink }}>
      <main style={{ maxWidth:'8.5in', margin:'0 auto', padding:'56px clamp(24px, 5vw, 0.78in) 96px' }}>
        <a href="#" onClick={e => { e.preventDefault(); go('hub'); }} style={{ fontFamily:WS.sans, fontSize:12, color:WS.mute, textDecoration:'none' }}>← Mathematics</a>
        <header style={{ margin:'18px 0 8px' }}>
          <div style={{ fontFamily:WS.sans, fontSize:11, fontWeight:600, letterSpacing:'0.16em', textTransform:'uppercase', color:WS.accent }}>Statistics · Worksheet</div>
          <h1 style={{ margin:'10px 0 0', fontFamily:WS.sans, fontWeight:600, fontSize:36, lineHeight:1.05, letterSpacing:'-0.02em', color:'#1a1a18' }}>Statistics Practice Set</h1>
          <p style={{ margin:'14px 0 0', maxWidth:'34em', fontSize:16, lineHeight:1.6, color:WS.soft }}>Twenty-two problems across the normal distribution, statistical inference, regression, and the Poisson distribution. Each gives the known quantities and leaves room to work the solution by hand.</p>
        </header>
        <div style={{ display:'flex', gap:28, margin:'22px 0 0', fontFamily:WS.sans, fontSize:12, color:WS.mute }}>
          <span><b style={{ color:WS.ink, fontWeight:600 }}>22</b>&nbsp; problems</span><span><b style={{ color:WS.ink, fontWeight:600 }}>4</b>&nbsp; sections</span><span>Work space included</span>
        </div>
        <nav style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'24px 0 0' }}>
          {TOPICS.map(([k, l, n]) => { const on = k === topic; return <button key={k} onClick={() => setTopic(k)} style={{ cursor:'pointer', fontFamily:WS.sans, fontSize:12.5, fontWeight:500, padding:'8px 14px', borderRadius:999, background: on ? WS.ink : 'transparent', color: on ? WS.paper : WS.soft, border:'1px solid ' + (on ? WS.ink : WS.chip) }}>{l}<span style={{ opacity:.55, marginLeft:7 }}>{n}</span></button>; })}
        </nav>
        <div style={{ marginTop:18 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', fontFamily:WS.sans, fontSize:11.5, color:WS.mute }}><span style={{ letterSpacing:'0.04em' }}>Study progress</span><span><b style={{ color:WS.ink }}>5</b> / 22 solved</span></div>
          <div style={{ marginTop:7, height:6, borderRadius:3, background:WS.rule, overflow:'hidden' }}><div style={{ height:'100%', width:'23%', background:WS.accent, transition:'width .35s ease' }} /></div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center', marginTop:12 }}>
            <button style={{ cursor:'pointer', fontFamily:WS.sans, fontSize:11.5, fontWeight:500, padding:'7px 13px', border:'1px solid ' + WS.accent, borderRadius:8, background:WS.accent, color:'#fff' }}>↓&nbsp; Save my work to a file</button>
            <button style={{ cursor:'pointer', fontFamily:WS.sans, fontSize:11.5, fontWeight:500, padding:'7px 13px', border:'1px solid #dcd8ce', borderRadius:8, background:'#fff', color:WS.soft }}>↑&nbsp; Load work from a file</button>
            <span style={{ fontFamily:WS.sans, fontSize:11, color:WS.faint }}>answers, marks &amp; handwriting included</span>
          </div>
        </div>
        <div style={{ height:1, background:WS.rule, margin:'28px 0 0' }} />
        <section style={{ margin:'30px 0 8px', padding:'24px 26px', background:'#f4f3ed', border:'1px solid ' + WS.rule, borderRadius:8 }}>
          <div style={{ fontFamily:WS.sans, fontSize:11, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase', color:WS.accent, marginBottom:16 }}>Quick reference</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'22px 32px' }}>
            <div><div style={label}>Standardize a value</div><M d>{'z = \\frac{x - \\mu}{\\sigma}'}</M></div>
            <div><div style={label}>Sampling distribution</div><M d>{'z = \\frac{\\bar{x} - \\mu}{\\sigma/\\sqrt{n}}'}</M></div>
            <div><div style={label}>Empirical (68–95–99.7) rule</div><p style={{ margin:0, fontSize:14, lineHeight:1.55, color:WS.soft }}>About 68% within <M>{'\\mu\\pm\\sigma'}</M>, 95% within <M>{'\\mu\\pm 2\\sigma'}</M>, and 99.7% within <M>{'\\mu\\pm 3\\sigma'}</M>.</p></div>
            <div><div style={label}>Poisson probability</div><M d>{'P(X=k) = \\frac{\\lambda^{k} e^{-\\lambda}}{k!}'}</M></div>
          </div>
        </section>
        <div style={{ position:'relative', overflow:'hidden', margin:'30px 0 0', padding:'28px 220px 28px 30px', borderRadius:12, background:'linear-gradient(180deg,#eef4f3,#e6efee)', border:'1px solid #d3e1df' }}>
          <img src="assets/figures/fig-normal-curve.svg" alt="" style={{ position:'absolute', right:20, top:'50%', transform:'translateY(-50%)', width:190, opacity:.85 }} />
          <div style={{ fontFamily:WS.sans, fontSize:10.5, fontWeight:600, letterSpacing:'0.16em', textTransform:'uppercase', color:'#2f6f6a' }}>Now practicing</div>
          <h2 style={{ margin:'8px 0 0', fontFamily:WS.sans, fontWeight:600, fontSize:27, letterSpacing:'-0.015em', color:'#16302e' }}>Normal Distribution</h2>
          <p style={{ margin:'12px 0 0', fontSize:18, lineHeight:1.45, fontStyle:'italic', color:'#2f6f6a', maxWidth:'32em' }}>Breathe. Almost everything in life clusters around its centre — and so will this.</p>
          <p style={{ margin:'12px 0 0', fontSize:14.5, lineHeight:1.6, color:'#4d5d5b', maxWidth:'40em' }}>You measure how far a value sits from the mean in steady steps of one standard deviation. Find the z, read the area, answer the question. One quiet step at a time.</p>
        </div>
        <div style={{ margin:'30px 0 0', padding:'40px 24px', border:'1px dashed #dcd8ce', borderRadius:8, textAlign:'center', fontFamily:WS.sans, fontSize:13, color:WS.mute }}>Problem cards not recreated — this part of the source file is packed and couldn't be read.</div>
      </main>
      <TablesTool />
    </div>
  );
}
Object.assign(window, { WorksheetScreen });
