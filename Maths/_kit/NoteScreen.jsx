const DSn = window.CommonplaceMathsDesignSystem_8899ed;
const { Crumb, ToggleButton, Masthead, TocChips, SectionHead, Plate, Callout, LawTable, Note, Details, ScoreBar, LevelLabel, Problem, RecallCard, Checklist, Widget, Segmented, RangeControl, Colophon } = DSn;

const PROBS = [
  ['Level 1 · Warm-up', [['01','Find the value of $3^{-2}$.','\\tfrac19'],['02','Find the value of $(-2)^{-3}$.','-\\tfrac18','— an odd power keeps the minus sign.'],['03','Evaluate $5^{0}+2^{-1}$.','1+\\tfrac12=\\tfrac32']]],
  ['Level 2 · Laws', [['06','Simplify $2^{5}\\times2^{-8}$ and give its value.','2^{-3}=\\tfrac18'],['07','Simplify $(3^{-2})^{3}$ and give its value.','3^{-6}=\\tfrac1{729}']]],
  ['Level 4 · Challenge & ML', [['19','A model\u2019s learning rate starts at $0.1$ and is multiplied by $0.1$ after epochs 10, 20 and 30. Write the rate after epoch 30 as a power of 10.','10^{-1}\\times(10^{-1})^3=10^{-4}=0.0001']]],
];
// render "text $tex$ text" into nodes
function T({ s }) { return <>{String(s).split('$').map((p, i) => i % 2 ? <M key={i}>{p}</M> : <React.Fragment key={i}>{p}</React.Fragment>)}</>; }

function Ladder() {
  const [b, setB] = React.useState(10), [e, setE] = React.useState(2);
  const val = e >= 0 ? String(Math.pow(b, e)) : '1/' + Math.pow(b, -e);
  const ex = e === 0 ? 'anything except 0, to the power 0, is 1' : e > 0 ? Array(e).fill(b).join(' × ') : '1 ÷ (' + Array(-e).fill(b).join(' × ') + ')';
  return (
    <Widget big={<>{b}<sup style={{ fontSize:'.55em' }}>{e}</sup> = {val}</>} small={ex + '  ·  one step down = ÷ ' + b}>
      <Segmented options={[{ label:'Base 2', value:2 }, { label:'Base 3', value:3 }, { label:'Base 10', value:10 }]} value={b} onChange={setB} />
      <RangeControl label="Exponent" min={-4} max={6} value={e} onChange={setE} />
    </Widget>
  );
}

function NoteScreen({ go, style, theme, toggleStyle, toggleTheme }) {
  const flat = PROBS.flatMap(([, ps]) => ps);
  const [done, setDone] = React.useState(() => { try { return JSON.parse(localStorage.getItem('cp-kit:A1') || '{}'); } catch (e) { return {}; } });
  const mark = (no, v) => { const n = { ...done, [no]: v }; setDone(n); try { localStorage.setItem('cp-kit:A1', JSON.stringify(n)); } catch (e) {} };
  const solved = flat.filter(p => done[p[0]]).length;
  return (
    <div style={{ minHeight:'100vh', background:'var(--paper)', color:'var(--ink)', fontFamily:'var(--font-body)', fontSize: style === 'clean' ? 18 : 19, lineHeight: style === 'clean' ? 1.75 : 1.65 }}>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'26px 20px 96px' }} onClickCapture={e => { if (e.target.tagName === 'A' && e.target.closest('nav') && e.target.textContent === 'Mathematics') { e.preventDefault(); go('hub'); } }}>
        <Crumb items={[{ label:'Commonplace', href:'#' }, { label:'Mathematics', href:'#' }, { label:'Algebra & Trig' }]} current="A1">
          <ToggleButton onClick={toggleStyle}>{style === 'clean' ? 'Style: Paper' : 'Style: Clean'}</ToggleButton>
          <ToggleButton onClick={toggleTheme}>{theme === 'night' ? '◐ Day' : '◐ Night'}</ToggleButton>
        </Crumb>
        <Masthead kicker="Module A · Note A1" title={<>Exponents &amp; Powers</>}
          tagline="A power is repeated multiplication written short. Zero and negative powers follow from one rule: each step down the ladder divides by the base."
          source="NCERT VII Ch 13 · VIII Ch 12 · ~20 min reading · ~40 min solving" />
        <TocChips items={[['§1 Learn','learn'],['§2 Laws','laws'],['§4 Examples','ex'],['§5 Solve by hand','solve'],['§7 Recall','recall']].map(([label, id]) => ({ label, href:'#' + id }))} />

        <SectionHead n="§1" id="learn" title="What a power is" />
        <p><M>2^5</M> means multiply 2 by itself five times:</p>
        <Plate><M d>{'2^5 = 2\\times2\\times2\\times2\\times2 = 32'}</M></Plate>
        <p>The <b>base</b> is the number being multiplied (2). The <b>exponent</b> says how many times (5). Read it as “2 to the power 5”.</p>
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:600, fontSize:24, margin:'26px 0 6px' }}>Walk the ladder yourself</h3>
        <Ladder />
        <Callout label="Two rules from the ladder"><M>{'a^0 = 1'}</M>&nbsp; for any <M>{'a\\neq0'}</M><br /><M>{'a^{-m} = \\dfrac{1}{a^m}'}</M>&nbsp;— a negative power means “one over”</Callout>
        <Callout label="Common traps" variant="warn">• <M>{'2^{-3}'}</M> is <b>not negative</b>: it equals <M>{'\\tfrac18'}</M>.<br />• <M>{'(-2)^4 = 16'}</M> but <M>{'-2^4 = -16'}</M> — the bracket decides what is raised.</Callout>

        <SectionHead n="§2" id="laws" title="The laws" />
        <Note>These hold for any integer exponents, positive, zero or negative.</Note>
        <LawTable columns={['Law', 'Example']} rows={[
          [<M>{'a^m \\times a^n = a^{m+n}'}</M>, <M>{'3^2\\times3^{-5}=3^{-3}'}</M>],
          [<M>{'a^m \\div a^n = a^{m-n}'}</M>, <M>{'7^4\\div7^6=7^{-2}'}</M>],
          [<M>{'(a^m)^n = a^{mn}'}</M>, <M>{'(2^{-2})^3=2^{-6}'}</M>],
          [<M>{'a^0=1'}</M>, <M>{'(-17)^0=1'}</M>]]} />

        <SectionHead n="§4" id="ex" title="Worked examples" />
        <Note>Try each one in your notebook first, then open the steps.</Note>
        <Details summary={<>Example 2 — Find <M>m</M> if <M>{'3^m\\times3^{-4}=3^{2}'}</M></>}><Plate>Left side is <M>{'3^{m-4}'}</M>. Equal bases, so equal exponents: <M>{'m-4=2'}</M>.<br />Answer: <M>{'m=6'}</M>.</Plate></Details>
        <Details summary={<>Example 4 — <M>{'(6\\times10^{4})\\times(5\\times10^{-7})'}</M> in standard form</>}><Plate>Numbers: <M>{'6\\times5=30'}</M>. Powers: <M>{'4+(-7)=-3'}</M>. So <M>{'30\\times10^{-3}=3\\times10^{-2}'}</M>.</Plate></Details>

        <SectionHead n="§5" id="solve" title="Solve by hand" />
        <p>Copy each problem into your notebook and solve it fully. <b>Then</b> tap to check, and tick it if you got it right.</p>
        <ScoreBar solved={solved} total={flat.length} />
        {PROBS.map(([lvl, ps]) => (
          <React.Fragment key={lvl}>
            <LevelLabel>{lvl}</LevelLabel>
            {ps.map(([no, q, a, tail]) => <Problem key={no} no={no} question={<T s={q} />} answer={<><M>{a}</M>{tail ? ' ' + tail : ''}</>} done={!!done[no]} onToggle={v => mark(no, v)} />)}
          </React.Fragment>
        ))}

        <SectionHead n="§7" id="recall" title="Quick recall" />
        <Note>Tap a card to reveal. Use these for a two-minute revision next week.</Note>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:8, margin:'12px 0' }}>
          <RecallCard prompt={<>What is <M>{'a^0'}</M>?</>} answer={<><M>1</M>, for <M>{'a\\neq0'}</M></>} />
          <RecallCard prompt={<>What does <M>{'a^{-m}'}</M> mean?</>} answer={<M>{'\\dfrac{1}{a^m}'}</M>} />
          <RecallCard prompt={<><M>{'a^m\\times a^n=\\,?'}</M></>} answer={<M>{'a^{m+n}'}</M>} />
          <RecallCard prompt={<>Is <M>{'2^{-3}'}</M> negative?</>} answer={<>No, it is <M>{'\\tfrac18'}</M>.</>} />
        </div>

        <SectionHead n="§8" title="I can…" />
        <Checklist items={[<>explain why <M>{'a^0=1'}</M> using the ladder</>, 'simplify expressions with negative exponents', 'convert numbers to and from standard form', <>read Python's <code>1e-3</code> notation</>]} />
        <div onClick={e => { if (e.target.tagName === 'A') { e.preventDefault(); go('hub'); } }}><Colophon backHref="#" backLabel="← Mathematics" /></div>
      </div>
    </div>
  );
}
Object.assign(window, { NoteScreen });
