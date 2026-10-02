const { Crumb, Masthead, Seal, SectionHead, BranchCard, Colophon } = window.CommonplaceMathsDesignSystem_8899ed;
function HubScreen({ go }) {
  return (
    <div style={{ minHeight:'100vh', backgroundColor:'var(--paper)', backgroundImage:'radial-gradient(circle at 16% 10%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at 86% 80%, rgba(160,138,96,0.10) 0%, rgba(160,138,96,0) 44%), var(--paper-grain)', fontSize:18, lineHeight:1.6 }}>
      <div style={{ maxWidth:1000, margin:'0 auto', padding:'30px 32px 96px' }}>
        <Crumb size="hub" items={[{ label:'Commonplace', href:'#' }]} current="Mathematics" />
        <Masthead size="hub" kicker="Subject VI · Numbers & Proof" title="Mathematics"
          tagline="The language the sciences are written in — worked by hand, one branch at a time, with live tables and solutions where they earn their place."
          aside={<Seal rows={[['Branches','4'],['Live','Statistics'],['Tables',<>Z · t · χ² · F</>],['Practice','by hand']]} />} />
        <SectionHead size="hub" n="§" title="The Branches" />
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <BranchCard figure={"assets/figures/fig-normal-curve.svg"} figureLabel="Fig. 1 — Normal curve" status="live" title="Statistics"
            meta="22 problems · live Z / t / χ² / F tables · solve by hand"
            description="The normal distribution, inference and hypothesis tests, regression and Poisson — worked on paper with answer-checking, hints, a handwriting pad, and an in-page table calculator so you never reach for a printed table."
            cta="Open the practice" onClick={() => go('worksheet')} />
          <BranchCard figure="assets/figures/fig-tangent-area.svg" figureLabel="Fig. 2 — Tangent & area" status="planned" title="Calculus"
            meta="limits · derivatives · integrals" description="Rates of change and accumulation — from limits and the chain rule to definite integrals and the fundamental theorem." />
          <BranchCard figure="assets/figures/fig-sin-parabola.svg" figureLabel="Fig. 3 — sin x & parabola" status="started" title="Algebra & Trigonometry"
            meta="equations · identities · functions" description="The grammar of mathematics — manipulating expressions, solving equations, and the trigonometric identities that recur everywhere."
            cta="Open the first note" onClick={() => go('note')} />
          <BranchCard figure="assets/figures/fig-vectors.svg" figureLabel="Fig. 4 — Vectors" status="planned" title="Linear Algebra"
            meta="vectors · matrices · transforms" description="Vectors, matrices and the geometry of linear transformations — the backbone of graphics, data and machine learning." />
        </div>
        <Colophon backLabel="← All subjects" style={{ marginTop:60, paddingTop:22, fontSize:11 }} />
      </div>
    </div>
  );
}
Object.assign(window, { HubScreen });
