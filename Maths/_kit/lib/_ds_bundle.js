/* @ds-bundle: {"format":4,"namespace":"CommonplaceMathsDesignSystem_8899ed","components":[{"name":"Badge","sourcePath":"components/catalogue/Badge.jsx"},{"name":"BranchCard","sourcePath":"components/catalogue/BranchCard.jsx"},{"name":"Callout","sourcePath":"components/content/Callout.jsx"},{"name":"Details","sourcePath":"components/content/Details.jsx"},{"name":"Figure","sourcePath":"components/content/Figure.jsx"},{"name":"LawTable","sourcePath":"components/content/LawTable.jsx"},{"name":"Plate","sourcePath":"components/content/Plate.jsx"},{"name":"RangeControl","sourcePath":"components/controls/RangeControl.jsx"},{"name":"Segmented","sourcePath":"components/controls/Segmented.jsx"},{"name":"Widget","sourcePath":"components/controls/Widget.jsx"},{"name":"Colophon","sourcePath":"components/navigation/Colophon.jsx"},{"name":"Crumb","sourcePath":"components/navigation/Crumb.jsx"},{"name":"TocChips","sourcePath":"components/navigation/TocChips.jsx"},{"name":"ToggleButton","sourcePath":"components/navigation/ToggleButton.jsx"},{"name":"Checklist","sourcePath":"components/practice/Checklist.jsx"},{"name":"LevelLabel","sourcePath":"components/practice/LevelLabel.jsx"},{"name":"Problem","sourcePath":"components/practice/Problem.jsx"},{"name":"RecallCard","sourcePath":"components/practice/RecallCard.jsx"},{"name":"ScoreBar","sourcePath":"components/practice/ScoreBar.jsx"},{"name":"Kicker","sourcePath":"components/typography/Kicker.jsx"},{"name":"Masthead","sourcePath":"components/typography/Masthead.jsx"},{"name":"Note","sourcePath":"components/typography/Note.jsx"},{"name":"Seal","sourcePath":"components/typography/Seal.jsx"},{"name":"SectionHead","sourcePath":"components/typography/SectionHead.jsx"}],"sourceHashes":{"components/catalogue/Badge.jsx":"39ee33ca0560","components/catalogue/BranchCard.jsx":"ec942c395e40","components/content/Callout.jsx":"e45c5f29dac3","components/content/Details.jsx":"8191bcf45100","components/content/Figure.jsx":"5bfcdfdcc323","components/content/LawTable.jsx":"5f5518a3a5ab","components/content/Plate.jsx":"5b723d70b1b4","components/controls/RangeControl.jsx":"65db27c386a3","components/controls/Segmented.jsx":"97ca3a11459f","components/controls/Widget.jsx":"fb4aef3d847b","components/navigation/Colophon.jsx":"a2a50c599e2f","components/navigation/Crumb.jsx":"0d7d9383fd6f","components/navigation/TocChips.jsx":"9364a9f2b231","components/navigation/ToggleButton.jsx":"09567c05baa1","components/practice/Checklist.jsx":"7dcd51db8af7","components/practice/LevelLabel.jsx":"4fde5ec02237","components/practice/Problem.jsx":"cc897be14243","components/practice/RecallCard.jsx":"b613c8a9a305","components/practice/ScoreBar.jsx":"73ca6df308be","components/typography/Kicker.jsx":"63c50a2580bf","components/typography/Masthead.jsx":"c04ce41c3229","components/typography/Note.jsx":"c73ca4303e1f","components/typography/Seal.jsx":"8e19afe08571","components/typography/SectionHead.jsx":"8f380a671971","ui_kits/commonplace-maths/HubScreen.jsx":"555d1462e499","ui_kits/commonplace-maths/Maths.jsx":"585af2513257","ui_kits/commonplace-maths/NoteScreen.jsx":"65e22d814dca","ui_kits/commonplace-maths/WorksheetScreen.jsx":"f3a91f3f9de6"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.CommonplaceMathsDesignSystem_8899ed = window.CommonplaceMathsDesignSystem_8899ed || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/catalogue/Badge.jsx
try { (() => {
function Badge({
  status = 'live',
  children,
  style
}) {
  const live = status !== 'planned';
  const glyph = status === 'live' ? '●' : status === 'started' ? '◑' : '○';
  const text = children || (status === 'live' ? 'Live' : status === 'started' ? 'Started' : 'Planned');
  return /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      padding: '3px 9px',
      borderRadius: 3,
      color: live ? 'var(--ok)' : 'var(--ink-mute)',
      border: '1px solid ' + (live ? 'var(--ok-line)' : 'var(--rule)'),
      background: live ? 'var(--ok-bg)' : 'transparent',
      ...style
    }
  }, glyph, " ", text);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalogue/Badge.jsx", error: String((e && e.message) || e) }); }

// components/content/Callout.jsx
try { (() => {
function Callout({
  label,
  variant = 'default',
  children,
  style
}) {
  const c = variant === 'warn' ? 'var(--warn)' : 'var(--oxblood)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--paper-3)',
      border: '1px solid var(--rule-soft)',
      borderLeft: 'var(--callout-bar) solid ' + c,
      borderRadius: 'var(--radius-btn)',
      padding: '12px 16px',
      margin: '16px 0',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: c,
      marginBottom: 4
    }
  }, label), children);
}
Object.assign(__ds_scope, { Callout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Callout.jsx", error: String((e && e.message) || e) }); }

// components/content/Details.jsx
try { (() => {
function Details({
  summary,
  children,
  variant = 'default',
  open,
  style
}) {
  const [isOpen, setOpen] = React.useState(!!open);
  const ans = variant === 'answer';
  return /*#__PURE__*/React.createElement("details", {
    open: isOpen,
    onToggle: e => setOpen(e.currentTarget.open),
    style: {
      background: ans ? 'var(--grid-paper)' : 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-card)',
      padding: isOpen ? '2px 14px 10px' : '2px 14px',
      margin: ans ? '10px 0 0' : '9px 0',
      ...style
    }
  }, /*#__PURE__*/React.createElement("summary", {
    style: {
      cursor: 'pointer',
      padding: '10px 0',
      listStyle: 'none',
      fontWeight: ans ? 400 : 500,
      ...(ans ? {
        fontFamily: 'var(--font-label)',
        fontSize: 11,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: 'var(--ink-mute)'
      } : {})
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--oxblood)',
      fontFamily: 'var(--font-label)',
      fontSize: 13
    }
  }, isOpen ? '▾' : '▸', "\xA0\xA0"), summary), children);
}
Object.assign(__ds_scope, { Details });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Details.jsx", error: String((e && e.message) || e) }); }

// components/content/Figure.jsx
try { (() => {
function Figure({
  src,
  label,
  height = 196,
  size = 'hub',
  style
}) {
  const line = size === 'hub' ? 'var(--grid-line-hub)' : 'var(--grid-line)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      minHeight: height,
      backgroundColor: 'var(--grid-paper)',
      backgroundImage: 'linear-gradient(' + line + ' 1px, transparent 1px), linear-gradient(90deg, ' + line + ' 1px, transparent 1px)',
      backgroundSize: '19px 19px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      position: 'absolute',
      left: 21,
      top: 0,
      bottom: 0,
      width: 2,
      background: 'var(--grid-margin)',
      opacity: .75
    }
  }), /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: label || '',
    style: {
      position: 'absolute',
      inset: 0,
      width: '100%',
      height: '100%',
      paddingLeft: 30
    }
  }), label && /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      left: 30,
      top: 14,
      fontFamily: 'var(--font-label)',
      fontSize: 9.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'var(--axis)'
    }
  }, label));
}
Object.assign(__ds_scope, { Figure });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Figure.jsx", error: String((e && e.message) || e) }); }

// components/catalogue/BranchCard.jsx
try { (() => {
function BranchCard({
  href = '#',
  figure,
  figureLabel,
  status = 'live',
  title,
  meta,
  description,
  cta,
  onClick,
  style
}) {
  const [hov, setHov] = React.useState(false);
  const soon = status === 'planned';
  const lift = hov && !soon;
  return /*#__PURE__*/React.createElement("a", {
    href: href,
    onClick: e => {
      if (onClick) {
        e.preventDefault();
        onClick();
      }
    },
    onMouseEnter: () => setHov(true),
    onMouseLeave: () => setHov(false),
    style: {
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      textDecoration: 'none',
      color: 'inherit',
      background: 'var(--paper-2)',
      border: '1px solid ' + (lift ? 'var(--ink-mute)' : 'var(--rule)'),
      borderRadius: 5,
      overflow: 'hidden',
      boxShadow: lift ? 'var(--shadow-branch-hover)' : 'var(--shadow-branch)',
      transform: lift ? 'translateY(-3px)' : 'none',
      transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
      opacity: soon ? .6 : 1,
      pointerEvents: soon ? 'none' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Figure, {
    src: figure,
    label: figureLabel
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '24px 28px',
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 11,
      marginBottom: 9
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Badge, {
    status: status
  })), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-display)',
      fontSize: 34,
      lineHeight: 1,
      letterSpacing: -.4,
      margin: '0 0 8px'
    }
  }, title), meta && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      letterSpacing: .5,
      color: 'var(--ink-mute)',
      marginBottom: 10
    }
  }, meta), description && /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--ink-soft)',
      margin: 0,
      maxWidth: '56ch',
      textWrap: 'pretty'
    }
  }, description), /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 'auto',
      paddingTop: 16,
      fontFamily: 'var(--font-label)',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: 'var(--oxblood)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    }
  }, cta || (soon ? 'In preparation' : 'Open'), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      transition: 'transform .2s',
      transform: lift ? 'translateX(5px)' : 'none'
    }
  }, "\u2192"))));
}
Object.assign(__ds_scope, { BranchCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/catalogue/BranchCard.jsx", error: String((e && e.message) || e) }); }

// components/content/LawTable.jsx
try { (() => {
function LawTable({
  columns = [],
  rows = [],
  style
}) {
  const cell = {
    borderBottom: '1px solid var(--rule-soft)',
    padding: '9px 6px',
    textAlign: 'left',
    verticalAlign: 'middle'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: 'auto',
      margin: '10px 0',
      ...style
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: 'collapse',
      width: '100%',
      fontSize: 17
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map((c, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      ...cell,
      fontFamily: 'var(--font-label)',
      fontSize: 10,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: 'var(--ink-mute)',
      fontWeight: 600
    }
  }, c)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, r.map((d, j) => /*#__PURE__*/React.createElement("td", {
    key: j,
    style: cell
  }, d)))))));
}
Object.assign(__ds_scope, { LawTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/LawTable.jsx", error: String((e && e.message) || e) }); }

// components/content/Plate.jsx
try { (() => {
function Plate({
  children,
  center,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      backgroundColor: 'var(--grid-paper)',
      backgroundImage: 'linear-gradient(var(--grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--grid-line) 1px, transparent 1px)',
      backgroundSize: '19px 19px',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-plate)',
      padding: '12px 14px 12px 34px',
      margin: '14px 0',
      overflowX: 'auto',
      textAlign: center ? 'center' : undefined,
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": true,
    style: {
      position: 'absolute',
      left: 22,
      top: 0,
      bottom: 0,
      width: 2,
      background: 'var(--grid-margin)',
      opacity: .7
    }
  }), children);
}
Object.assign(__ds_scope, { Plate });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content/Plate.jsx", error: String((e && e.message) || e) }); }

// components/controls/RangeControl.jsx
try { (() => {
function RangeControl({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      margin: '14px 0 4px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: 'var(--ink-mute)'
    }
  }, label), /*#__PURE__*/React.createElement("input", {
    type: "range",
    min: min,
    max: max,
    step: step,
    value: value,
    onChange: e => onChange && onChange(+e.target.value),
    style: {
      flex: 1,
      accentColor: 'var(--oxblood)',
      height: 30,
      margin: 0
    }
  }), /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'var(--font-label)',
      minWidth: 28,
      textAlign: 'right'
    }
  }, value));
}
Object.assign(__ds_scope, { RangeControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/RangeControl.jsx", error: String((e && e.message) || e) }); }

// components/controls/Segmented.jsx
try { (() => {
function Segmented({
  options = [],
  value,
  onChange,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      ...style
    }
  }, options.map((o, i) => {
    const on = o.value === value;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      type: "button",
      onClick: () => onChange && onChange(o.value),
      style: {
        flex: 1,
        fontFamily: 'var(--font-label)',
        fontSize: 11,
        letterSpacing: 1,
        textTransform: 'uppercase',
        padding: '9px 4px',
        background: 'var(--paper-3)',
        border: '1px solid ' + (on ? 'var(--oxblood)' : 'var(--rule)'),
        borderRadius: 'var(--radius-btn)',
        color: on ? 'var(--oxblood)' : 'var(--ink-soft)',
        fontWeight: on ? 700 : 400,
        cursor: 'pointer'
      }
    }, o.label);
  }));
}
Object.assign(__ds_scope, { Segmented });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Segmented.jsx", error: String((e && e.message) || e) }); }

// components/controls/Widget.jsx
try { (() => {
function Widget({
  children,
  big,
  small,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-card)',
      padding: 14,
      margin: '14px 0',
      ...style
    }
  }, children, big != null && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-display)',
      fontSize: 40,
      fontWeight: 'var(--weight-display)',
      textAlign: 'center',
      margin: '8px 0 0',
      lineHeight: 1.1,
      overflowX: 'auto',
      overflowY: 'hidden',
      paddingBottom: 2
    }
  }, big), small != null && /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'center',
      color: 'var(--ink-soft)',
      fontSize: 16,
      overflowWrap: 'anywhere'
    }
  }, small));
}
Object.assign(__ds_scope, { Widget });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Widget.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Colophon.jsx
try { (() => {
function Colophon({
  motto = '“Work it by hand, then check it.”',
  backHref = '#',
  backLabel = '← Mathematics',
  style
}) {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      marginTop: 56,
      paddingTop: 20,
      borderTop: '1px solid var(--rule)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      letterSpacing: 1,
      color: 'var(--ink-mute)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-body)',
      fontStyle: 'italic',
      letterSpacing: 0,
      fontSize: 16,
      color: 'var(--ink-soft)'
    }
  }, motto), /*#__PURE__*/React.createElement("a", {
    href: backHref,
    style: {
      color: 'var(--oxblood)',
      textDecoration: 'none'
    }
  }, backLabel));
}
Object.assign(__ds_scope, { Colophon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Colophon.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Crumb.jsx
try { (() => {
function Crumb({
  items = [],
  current,
  children,
  size = 'note',
  style
}) {
  const hub = size === 'hub';
  const base = {
    display: 'flex',
    alignItems: 'center',
    gap: hub ? 10 : 8,
    flexWrap: 'wrap',
    fontFamily: 'var(--font-label)',
    fontSize: hub ? 11 : 10.5,
    letterSpacing: hub ? 1.5 : 1.3,
    textTransform: 'uppercase',
    color: 'var(--ink-mute)',
    marginBottom: hub ? 38 : 30,
    ...style
  };
  return /*#__PURE__*/React.createElement("nav", {
    style: base
  }, items.map((it, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, it.href ? /*#__PURE__*/React.createElement("a", {
    href: it.href,
    style: {
      color: 'var(--ink-mute)',
      textDecoration: 'none'
    }
  }, it.label) : /*#__PURE__*/React.createElement("span", null, it.label), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--rule)'
    }
  }, "/"))), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink)'
    }
  }, current), children && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), children);
}
Object.assign(__ds_scope, { Crumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Crumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/TocChips.jsx
try { (() => {
function TocChips({
  items = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 6,
      margin: '26px 0 6px',
      ...style
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: it.href,
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 11,
      letterSpacing: .6,
      textDecoration: 'none',
      color: 'var(--ink-soft)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-chip)',
      padding: '6px 9px',
      background: 'var(--paper-2)'
    }
  }, it.label)));
}
Object.assign(__ds_scope, { TocChips });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/TocChips.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ToggleButton.jsx
try { (() => {
function ToggleButton({
  children,
  onClick,
  style
}) {
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      background: 'transparent',
      color: 'var(--ink-soft)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-btn)',
      padding: '6px 10px',
      cursor: 'pointer',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { ToggleButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ToggleButton.jsx", error: String((e && e.message) || e) }); }

// components/practice/Checklist.jsx
try { (() => {
function Checklist({
  items = [],
  checked,
  onToggle,
  style
}) {
  const [local, setLocal] = React.useState(() => items.map(() => false));
  const state = checked || local;
  const set = (i, v) => onToggle ? onToggle(i, v) : setLocal(s => s.map((x, j) => j === i ? v : x));
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
      ...style
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      padding: '6px 0'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!state[i],
    onChange: e => set(i, e.target.checked),
    style: {
      width: 19,
      height: 19,
      accentColor: 'var(--oxblood)',
      marginRight: 8,
      verticalAlign: -3
    }
  }), it))));
}
Object.assign(__ds_scope, { Checklist });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/practice/Checklist.jsx", error: String((e && e.message) || e) }); }

// components/practice/LevelLabel.jsx
try { (() => {
function LevelLabel({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: 'var(--ink-mute)',
      margin: '30px 0 4px',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { LevelLabel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/practice/LevelLabel.jsx", error: String((e && e.message) || e) }); }

// components/practice/Problem.jsx
try { (() => {
function Problem({
  no,
  question,
  answer,
  done,
  onToggle,
  checkLabel = 'Check answer',
  doneLabel = 'I got it right',
  style
}) {
  const [local, setLocal] = React.useState(!!done);
  const ok = onToggle ? !!done : local;
  const toggle = e => {
    onToggle ? onToggle(e.target.checked) : setLocal(e.target.checked);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: ok ? 'linear-gradient(var(--ok-bg), var(--ok-bg)), var(--paper-2)' : 'var(--paper-2)',
      border: '1px solid ' + (ok ? 'var(--ok-line)' : 'var(--rule)'),
      borderRadius: 'var(--radius-card)',
      padding: '12px 14px',
      margin: '10px 0',
      boxShadow: 'var(--shadow-prob)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      alignItems: 'baseline'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 12,
      fontWeight: 700,
      color: 'var(--oxblood)',
      minWidth: 26
    }
  }, no), /*#__PURE__*/React.createElement("span", null, question)), /*#__PURE__*/React.createElement(__ds_scope.Details, {
    variant: "answer",
    summary: checkLabel
  }, answer), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: ok ? 'var(--ok)' : 'var(--ink-mute)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: ok,
    onChange: toggle,
    style: {
      width: 20,
      height: 20,
      accentColor: 'var(--ok)',
      margin: 0
    }
  }), doneLabel));
}
Object.assign(__ds_scope, { Problem });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/practice/Problem.jsx", error: String((e && e.message) || e) }); }

// components/practice/RecallCard.jsx
try { (() => {
function RecallCard({
  prompt,
  answer,
  tapLabel = 'Tap',
  style
}) {
  const [flip, setFlip] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: () => setFlip(f => !f),
    style: {
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 'var(--radius-card)',
      padding: '12px 14px',
      cursor: 'pointer',
      minHeight: 78,
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 9.5,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      color: 'var(--ink-mute)'
    }
  }, tapLabel), prompt, flip && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      color: 'var(--ink-soft)',
      borderTop: '1px dashed var(--rule)',
      paddingTop: 6
    }
  }, answer));
}
Object.assign(__ds_scope, { RecallCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/practice/RecallCard.jsx", error: String((e && e.message) || e) }); }

// components/practice/ScoreBar.jsx
try { (() => {
function ScoreBar({
  solved = 0,
  total = 0,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'sticky',
      top: 0,
      zIndex: 5,
      background: 'var(--paper)',
      borderBottom: '1px solid var(--rule)',
      fontFamily: 'var(--font-label)',
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
      color: 'var(--ink-soft)',
      padding: '10px 0',
      ...style
    }
  }, "Solved ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--oxblood)'
    }
  }, solved), " / ", total, total > 0 && solved === total ? ' \u00a0· all done' : '');
}
Object.assign(__ds_scope, { ScoreBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/practice/ScoreBar.jsx", error: String((e && e.message) || e) }); }

// components/typography/Kicker.jsx
try { (() => {
function Kicker({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: 'var(--oxblood)',
      marginBottom: 8,
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Kicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/typography/Kicker.jsx", error: String((e && e.message) || e) }); }

// components/typography/Masthead.jsx
try { (() => {
function Masthead({
  kicker,
  title,
  tagline,
  source,
  size = 'note',
  aside,
  style
}) {
  const hub = size === 'hub';
  const block = /*#__PURE__*/React.createElement("div", null, kicker && /*#__PURE__*/React.createElement(__ds_scope.Kicker, {
    style: hub ? {
      marginBottom: 10
    } : undefined
  }, kicker), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-display)',
      fontSize: hub ? 'clamp(58px,11vw,104px)' : 'clamp(46px,11vw,78px)',
      lineHeight: hub ? .9 : .92,
      letterSpacing: -1,
      margin: 0
    }
  }, title), tagline && /*#__PURE__*/React.createElement("p", {
    style: {
      fontStyle: 'italic',
      fontSize: 20,
      color: 'var(--ink-soft)',
      margin: '14px 0 0',
      maxWidth: hub ? '46ch' : undefined,
      textWrap: 'pretty'
    }
  }, tagline), source && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10.5,
      letterSpacing: .5,
      color: 'var(--ink-mute)',
      marginTop: 14
    }
  }, source));
  if (!hub) return /*#__PURE__*/React.createElement("header", {
    style: style
  }, block);
  return /*#__PURE__*/React.createElement("header", {
    style: {
      display: 'grid',
      gridTemplateColumns: aside ? '1fr auto' : '1fr',
      gap: 28,
      alignItems: 'end',
      marginBottom: 16,
      ...style
    }
  }, block, aside);
}
Object.assign(__ds_scope, { Masthead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/typography/Masthead.jsx", error: String((e && e.message) || e) }); }

// components/typography/Note.jsx
try { (() => {
function Note({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 16,
      color: 'var(--ink-mute)',
      fontStyle: 'italic',
      margin: '10px 0',
      textWrap: 'pretty',
      ...style
    }
  }, children);
}
Object.assign(__ds_scope, { Note });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/typography/Note.jsx", error: String((e && e.message) || e) }); }

// components/typography/Seal.jsx
try { (() => {
function Seal({
  rows = [],
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 10,
      letterSpacing: 1.5,
      lineHeight: 1.7,
      color: 'var(--ink-mute)',
      textAlign: 'right',
      border: '1px solid var(--rule)',
      borderRadius: 3,
      padding: '10px 14px',
      whiteSpace: 'nowrap',
      ...style
    }
  }, rows.map(([k, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      textTransform: 'uppercase'
    }
  }, k), " \xB7 ", /*#__PURE__*/React.createElement("b", {
    style: {
      color: 'var(--ink-soft)'
    }
  }, v))));
}
Object.assign(__ds_scope, { Seal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/typography/Seal.jsx", error: String((e && e.message) || e) }); }

// components/typography/SectionHead.jsx
try { (() => {
function SectionHead({
  n,
  title,
  id,
  size = 'note',
  style
}) {
  const hub = size === 'hub';
  return /*#__PURE__*/React.createElement("div", {
    id: id,
    style: {
      display: 'flex',
      alignItems: 'baseline',
      gap: hub ? 16 : 12,
      margin: hub ? '52px 0 22px' : '50px 0 16px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-label)',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: 1,
      color: 'var(--oxblood)'
    }
  }, n), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-display)',
      fontSize: hub ? 32 : 30,
      lineHeight: hub ? 1 : 1.05,
      letterSpacing: hub ? -.4 : -.3,
      margin: 0,
      whiteSpace: hub ? 'nowrap' : undefined
    }
  }, title), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: 'var(--rule)',
      transform: 'translateY(-4px)',
      minWidth: 20
    }
  }));
}
Object.assign(__ds_scope, { SectionHead });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/typography/SectionHead.jsx", error: String((e && e.message) || e) }); }

// ui_kits/commonplace-maths/HubScreen.jsx
try { (() => {
const {
  Crumb,
  Masthead,
  Seal,
  SectionHead,
  BranchCard,
  Colophon
} = window.CommonplaceMathsDesignSystem_8899ed;
function HubScreen({
  go
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      backgroundColor: 'var(--paper)',
      backgroundImage: 'radial-gradient(circle at 16% 10%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 38%), radial-gradient(circle at 86% 80%, rgba(160,138,96,0.10) 0%, rgba(160,138,96,0) 44%), var(--paper-grain)',
      fontSize: 18,
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1000,
      margin: '0 auto',
      padding: '30px 32px 96px'
    }
  }, /*#__PURE__*/React.createElement(Crumb, {
    size: "hub",
    items: [{
      label: 'Commonplace',
      href: '#'
    }],
    current: "Mathematics"
  }), /*#__PURE__*/React.createElement(Masthead, {
    size: "hub",
    kicker: "Subject VI \xB7 Numbers & Proof",
    title: "Mathematics",
    tagline: "The language the sciences are written in \u2014 worked by hand, one branch at a time, with live tables and solutions where they earn their place.",
    aside: /*#__PURE__*/React.createElement(Seal, {
      rows: [['Branches', '4'], ['Live', 'Statistics'], ['Tables', /*#__PURE__*/React.createElement(React.Fragment, null, "Z \xB7 t \xB7 \u03C7\xB2 \xB7 F")], ['Practice', 'by hand']]
    })
  }), /*#__PURE__*/React.createElement(SectionHead, {
    size: "hub",
    n: "\xA7",
    title: "The Branches"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(BranchCard, {
    figure: "../../assets/figures/fig-normal-curve.svg",
    figureLabel: "Fig. 1 \u2014 Normal curve",
    status: "live",
    title: "Statistics",
    meta: "22 problems \xB7 live Z / t / \u03C7\xB2 / F tables \xB7 solve by hand",
    description: "The normal distribution, inference and hypothesis tests, regression and Poisson \u2014 worked on paper with answer-checking, hints, a handwriting pad, and an in-page table calculator so you never reach for a printed table.",
    cta: "Open the practice",
    onClick: () => go('worksheet')
  }), /*#__PURE__*/React.createElement(BranchCard, {
    figure: "../../assets/figures/fig-tangent-area.svg",
    figureLabel: "Fig. 2 \u2014 Tangent & area",
    status: "planned",
    title: "Calculus",
    meta: "limits \xB7 derivatives \xB7 integrals",
    description: "Rates of change and accumulation \u2014 from limits and the chain rule to definite integrals and the fundamental theorem."
  }), /*#__PURE__*/React.createElement(BranchCard, {
    figure: "../../assets/figures/fig-sin-parabola.svg",
    figureLabel: "Fig. 3 \u2014 sin x & parabola",
    status: "started",
    title: "Algebra & Trigonometry",
    meta: "equations \xB7 identities \xB7 functions",
    description: "The grammar of mathematics \u2014 manipulating expressions, solving equations, and the trigonometric identities that recur everywhere.",
    cta: "Open the first note",
    onClick: () => go('note')
  }), /*#__PURE__*/React.createElement(BranchCard, {
    figure: "../../assets/figures/fig-vectors.svg",
    figureLabel: "Fig. 4 \u2014 Vectors",
    status: "planned",
    title: "Linear Algebra",
    meta: "vectors \xB7 matrices \xB7 transforms",
    description: "Vectors, matrices and the geometry of linear transformations \u2014 the backbone of graphics, data and machine learning."
  })), /*#__PURE__*/React.createElement(Colophon, {
    backLabel: "\u2190 All subjects",
    style: {
      marginTop: 60,
      paddingTop: 22,
      fontSize: 11
    }
  })));
}
Object.assign(window, {
  HubScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/commonplace-maths/HubScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/commonplace-maths/Maths.jsx
try { (() => {
// KaTeX helper: inline <M>…</M>, display <M d>…</M>, or <M tex="…" />. Extracts TeX recursively from children.
const texOf = c => c == null || typeof c === 'boolean' ? '' : typeof c === 'string' || typeof c === 'number' ? String(c) : Array.isArray(c) ? c.map(texOf).join('') : c.props ? texOf(c.props.children) : '';
function M({
  children,
  d,
  tex
}) {
  const src = tex != null ? String(tex) : texOf(React.Children.toArray(children));
  const html = React.useMemo(() => {
    try {
      return window.katex.renderToString(src, {
        displayMode: !!d,
        throwOnError: false
      });
    } catch (e) {
      return src;
    }
  }, [src, d]);
  return /*#__PURE__*/React.createElement("span", {
    dangerouslySetInnerHTML: {
      __html: html
    }
  });
}
Object.assign(window, {
  M,
  texOf
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/commonplace-maths/Maths.jsx", error: String((e && e.message) || e) }); }

// ui_kits/commonplace-maths/NoteScreen.jsx
try { (() => {
const DSn = window.CommonplaceMathsDesignSystem_8899ed;
const {
  Crumb,
  ToggleButton,
  Masthead,
  TocChips,
  SectionHead,
  Plate,
  Callout,
  LawTable,
  Note,
  Details,
  ScoreBar,
  LevelLabel,
  Problem,
  RecallCard,
  Checklist,
  Widget,
  Segmented,
  RangeControl,
  Colophon
} = DSn;
const PROBS = [['Level 1 · Warm-up', [['01', 'Find the value of $3^{-2}$.', '\\tfrac19'], ['02', 'Find the value of $(-2)^{-3}$.', '-\\tfrac18', '— an odd power keeps the minus sign.'], ['03', 'Evaluate $5^{0}+2^{-1}$.', '1+\\tfrac12=\\tfrac32']]], ['Level 2 · Laws', [['06', 'Simplify $2^{5}\\times2^{-8}$ and give its value.', '2^{-3}=\\tfrac18'], ['07', 'Simplify $(3^{-2})^{3}$ and give its value.', '3^{-6}=\\tfrac1{729}']]], ['Level 4 · Challenge & ML', [['19', 'A model\u2019s learning rate starts at $0.1$ and is multiplied by $0.1$ after epochs 10, 20 and 30. Write the rate after epoch 30 as a power of 10.', '10^{-1}\\times(10^{-1})^3=10^{-4}=0.0001']]]];
// render "text $tex$ text" into nodes
function T({
  s
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, String(s).split('$').map((p, i) => i % 2 ? /*#__PURE__*/React.createElement(M, {
    key: i
  }, p) : /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, p)));
}
function Ladder() {
  const [b, setB] = React.useState(10),
    [e, setE] = React.useState(2);
  const val = e >= 0 ? String(Math.pow(b, e)) : '1/' + Math.pow(b, -e);
  const ex = e === 0 ? 'anything except 0, to the power 0, is 1' : e > 0 ? Array(e).fill(b).join(' × ') : '1 ÷ (' + Array(-e).fill(b).join(' × ') + ')';
  return /*#__PURE__*/React.createElement(Widget, {
    big: /*#__PURE__*/React.createElement(React.Fragment, null, b, /*#__PURE__*/React.createElement("sup", {
      style: {
        fontSize: '.55em'
      }
    }, e), " = ", val),
    small: ex + '  ·  one step down = ÷ ' + b
  }, /*#__PURE__*/React.createElement(Segmented, {
    options: [{
      label: 'Base 2',
      value: 2
    }, {
      label: 'Base 3',
      value: 3
    }, {
      label: 'Base 10',
      value: 10
    }],
    value: b,
    onChange: setB
  }), /*#__PURE__*/React.createElement(RangeControl, {
    label: "Exponent",
    min: -4,
    max: 6,
    value: e,
    onChange: setE
  }));
}
function NoteScreen({
  go,
  style,
  theme,
  toggleStyle,
  toggleTheme
}) {
  const flat = PROBS.flatMap(([, ps]) => ps);
  const [done, setDone] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cp-kit:A1') || '{}');
    } catch (e) {
      return {};
    }
  });
  const mark = (no, v) => {
    const n = {
      ...done,
      [no]: v
    };
    setDone(n);
    try {
      localStorage.setItem('cp-kit:A1', JSON.stringify(n));
    } catch (e) {}
  };
  const solved = flat.filter(p => done[p[0]]).length;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: 'var(--paper)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-body)',
      fontSize: style === 'clean' ? 18 : 19,
      lineHeight: style === 'clean' ? 1.75 : 1.65
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 760,
      margin: '0 auto',
      padding: '26px 20px 96px'
    },
    onClickCapture: e => {
      if (e.target.tagName === 'A' && e.target.closest('nav') && e.target.textContent === 'Mathematics') {
        e.preventDefault();
        go('hub');
      }
    }
  }, /*#__PURE__*/React.createElement(Crumb, {
    items: [{
      label: 'Commonplace',
      href: '#'
    }, {
      label: 'Mathematics',
      href: '#'
    }, {
      label: 'Algebra & Trig'
    }],
    current: "A1"
  }, /*#__PURE__*/React.createElement(ToggleButton, {
    onClick: toggleStyle
  }, style === 'clean' ? 'Style: Paper' : 'Style: Clean'), /*#__PURE__*/React.createElement(ToggleButton, {
    onClick: toggleTheme
  }, theme === 'night' ? '◐ Day' : '◐ Night')), /*#__PURE__*/React.createElement(Masthead, {
    kicker: "Module A \xB7 Note A1",
    title: /*#__PURE__*/React.createElement(React.Fragment, null, "Exponents & Powers"),
    tagline: "A power is repeated multiplication written short. Zero and negative powers follow from one rule: each step down the ladder divides by the base.",
    source: "NCERT VII Ch 13 \xB7 VIII Ch 12 \xB7 ~20 min reading \xB7 ~40 min solving"
  }), /*#__PURE__*/React.createElement(TocChips, {
    items: [['§1 Learn', 'learn'], ['§2 Laws', 'laws'], ['§4 Examples', 'ex'], ['§5 Solve by hand', 'solve'], ['§7 Recall', 'recall']].map(([label, id]) => ({
      label,
      href: '#' + id
    }))
  }), /*#__PURE__*/React.createElement(SectionHead, {
    n: "\xA71",
    id: "learn",
    title: "What a power is"
  }), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement(M, null, "2^5"), " means multiply 2 by itself five times:"), /*#__PURE__*/React.createElement(Plate, null, /*#__PURE__*/React.createElement(M, {
    d: true
  }, '2^5 = 2\\times2\\times2\\times2\\times2 = 32')), /*#__PURE__*/React.createElement("p", null, "The ", /*#__PURE__*/React.createElement("b", null, "base"), " is the number being multiplied (2). The ", /*#__PURE__*/React.createElement("b", null, "exponent"), " says how many times (5). Read it as \u201C2 to the power 5\u201D."), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 600,
      fontSize: 24,
      margin: '26px 0 6px'
    }
  }, "Walk the ladder yourself"), /*#__PURE__*/React.createElement(Ladder, null), /*#__PURE__*/React.createElement(Callout, {
    label: "Two rules from the ladder"
  }, /*#__PURE__*/React.createElement(M, null, 'a^0 = 1'), "\xA0 for any ", /*#__PURE__*/React.createElement(M, null, 'a\\neq0'), /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement(M, null, 'a^{-m} = \\dfrac{1}{a^m}'), "\xA0\u2014 a negative power means \u201Cone over\u201D"), /*#__PURE__*/React.createElement(Callout, {
    label: "Common traps",
    variant: "warn"
  }, "\u2022 ", /*#__PURE__*/React.createElement(M, null, '2^{-3}'), " is ", /*#__PURE__*/React.createElement("b", null, "not negative"), ": it equals ", /*#__PURE__*/React.createElement(M, null, '\\tfrac18'), ".", /*#__PURE__*/React.createElement("br", null), "\u2022 ", /*#__PURE__*/React.createElement(M, null, '(-2)^4 = 16'), " but ", /*#__PURE__*/React.createElement(M, null, '-2^4 = -16'), " \u2014 the bracket decides what is raised."), /*#__PURE__*/React.createElement(SectionHead, {
    n: "\xA72",
    id: "laws",
    title: "The laws"
  }), /*#__PURE__*/React.createElement(Note, null, "These hold for any integer exponents, positive, zero or negative."), /*#__PURE__*/React.createElement(LawTable, {
    columns: ['Law', 'Example'],
    rows: [[/*#__PURE__*/React.createElement(M, null, 'a^m \\times a^n = a^{m+n}'), /*#__PURE__*/React.createElement(M, null, '3^2\\times3^{-5}=3^{-3}')], [/*#__PURE__*/React.createElement(M, null, 'a^m \\div a^n = a^{m-n}'), /*#__PURE__*/React.createElement(M, null, '7^4\\div7^6=7^{-2}')], [/*#__PURE__*/React.createElement(M, null, '(a^m)^n = a^{mn}'), /*#__PURE__*/React.createElement(M, null, '(2^{-2})^3=2^{-6}')], [/*#__PURE__*/React.createElement(M, null, 'a^0=1'), /*#__PURE__*/React.createElement(M, null, '(-17)^0=1')]]
  }), /*#__PURE__*/React.createElement(SectionHead, {
    n: "\xA74",
    id: "ex",
    title: "Worked examples"
  }), /*#__PURE__*/React.createElement(Note, null, "Try each one in your notebook first, then open the steps."), /*#__PURE__*/React.createElement(Details, {
    summary: /*#__PURE__*/React.createElement(React.Fragment, null, "Example 2 \u2014 Find ", /*#__PURE__*/React.createElement(M, null, "m"), " if ", /*#__PURE__*/React.createElement(M, null, '3^m\\times3^{-4}=3^{2}'))
  }, /*#__PURE__*/React.createElement(Plate, null, "Left side is ", /*#__PURE__*/React.createElement(M, null, '3^{m-4}'), ". Equal bases, so equal exponents: ", /*#__PURE__*/React.createElement(M, null, 'm-4=2'), ".", /*#__PURE__*/React.createElement("br", null), "Answer: ", /*#__PURE__*/React.createElement(M, null, 'm=6'), ".")), /*#__PURE__*/React.createElement(Details, {
    summary: /*#__PURE__*/React.createElement(React.Fragment, null, "Example 4 \u2014 ", /*#__PURE__*/React.createElement(M, null, '(6\\times10^{4})\\times(5\\times10^{-7})'), " in standard form")
  }, /*#__PURE__*/React.createElement(Plate, null, "Numbers: ", /*#__PURE__*/React.createElement(M, null, '6\\times5=30'), ". Powers: ", /*#__PURE__*/React.createElement(M, null, '4+(-7)=-3'), ". So ", /*#__PURE__*/React.createElement(M, null, '30\\times10^{-3}=3\\times10^{-2}'), ".")), /*#__PURE__*/React.createElement(SectionHead, {
    n: "\xA75",
    id: "solve",
    title: "Solve by hand"
  }), /*#__PURE__*/React.createElement("p", null, "Copy each problem into your notebook and solve it fully. ", /*#__PURE__*/React.createElement("b", null, "Then"), " tap to check, and tick it if you got it right."), /*#__PURE__*/React.createElement(ScoreBar, {
    solved: solved,
    total: flat.length
  }), PROBS.map(([lvl, ps]) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: lvl
  }, /*#__PURE__*/React.createElement(LevelLabel, null, lvl), ps.map(([no, q, a, tail]) => /*#__PURE__*/React.createElement(Problem, {
    key: no,
    no: no,
    question: /*#__PURE__*/React.createElement(T, {
      s: q
    }),
    answer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(M, null, a), tail ? ' ' + tail : ''),
    done: !!done[no],
    onToggle: v => mark(no, v)
  })))), /*#__PURE__*/React.createElement(SectionHead, {
    n: "\xA77",
    id: "recall",
    title: "Quick recall"
  }), /*#__PURE__*/React.createElement(Note, null, "Tap a card to reveal. Use these for a two-minute revision next week."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 8,
      margin: '12px 0'
    }
  }, /*#__PURE__*/React.createElement(RecallCard, {
    prompt: /*#__PURE__*/React.createElement(React.Fragment, null, "What is ", /*#__PURE__*/React.createElement(M, null, 'a^0'), "?"),
    answer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(M, null, "1"), ", for ", /*#__PURE__*/React.createElement(M, null, 'a\\neq0'))
  }), /*#__PURE__*/React.createElement(RecallCard, {
    prompt: /*#__PURE__*/React.createElement(React.Fragment, null, "What does ", /*#__PURE__*/React.createElement(M, null, 'a^{-m}'), " mean?"),
    answer: /*#__PURE__*/React.createElement(M, null, '\\dfrac{1}{a^m}')
  }), /*#__PURE__*/React.createElement(RecallCard, {
    prompt: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(M, null, 'a^m\\times a^n=\\,?')),
    answer: /*#__PURE__*/React.createElement(M, null, 'a^{m+n}')
  }), /*#__PURE__*/React.createElement(RecallCard, {
    prompt: /*#__PURE__*/React.createElement(React.Fragment, null, "Is ", /*#__PURE__*/React.createElement(M, null, '2^{-3}'), " negative?"),
    answer: /*#__PURE__*/React.createElement(React.Fragment, null, "No, it is ", /*#__PURE__*/React.createElement(M, null, '\\tfrac18'), ".")
  })), /*#__PURE__*/React.createElement(SectionHead, {
    n: "\xA78",
    title: "I can\u2026"
  }), /*#__PURE__*/React.createElement(Checklist, {
    items: [/*#__PURE__*/React.createElement(React.Fragment, null, "explain why ", /*#__PURE__*/React.createElement(M, null, 'a^0=1'), " using the ladder"), 'simplify expressions with negative exponents', 'convert numbers to and from standard form', /*#__PURE__*/React.createElement(React.Fragment, null, "read Python's ", /*#__PURE__*/React.createElement("code", null, "1e-3"), " notation")]
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      if (e.target.tagName === 'A') {
        e.preventDefault();
        go('hub');
      }
    }
  }, /*#__PURE__*/React.createElement(Colophon, {
    backHref: "#",
    backLabel: "\u2190 Mathematics"
  }))));
}
Object.assign(window, {
  NoteScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/commonplace-maths/NoteScreen.jsx", error: String((e && e.message) || e) }); }

// ui_kits/commonplace-maths/WorksheetScreen.jsx
try { (() => {
// Statistics practice set — the older worksheet surface (IBM Plex Sans + Source Serif 4, teal).
// Recreated from the readable parts of Maths/Statistics/statistics_practice.html (header, topic nav, progress, reference card, topic banner, tables tool).
const WS = {
  accent: '#356b6a',
  ink: '#1c1b18',
  soft: '#56544d',
  mute: '#8a887f',
  faint: '#a8a59c',
  rule: '#e6e4dc',
  chip: '#ddd9cf',
  paper: '#fbfbf8',
  sans: "'IBM Plex Sans', sans-serif",
  serif: "'Source Serif 4', Georgia, serif"
};
const TOPICS = [['all', 'All', 22], ['normal', 'Normal', 7], ['inference', 'Inference', 7], ['regression', 'Regression', 4], ['poisson', 'Poisson', 4]];
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z)),
    d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
function TablesTool() {
  const [open, setOpen] = React.useState(false),
    [z, setZ] = React.useState('1.50');
  const zz = parseFloat(z),
    ok = !isNaN(zz),
    f = v => ok ? v.toFixed(4) : '—';
  const rows = [['P(Z < z)', 'left', f(phi(zz))], ['P(Z > z)', 'right', f(1 - phi(zz))], ['P(0 < Z < z)', 'mid', f(Math.abs(phi(zz) - .5))], ['P(|Z| > |z|)', '2-tail', f(2 * (1 - phi(Math.abs(zz))))]];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      right: 20,
      bottom: 20,
      zIndex: 60,
      fontFamily: WS.sans
    }
  }, open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      right: 0,
      bottom: 54,
      width: 344,
      background: '#fff',
      border: '1px solid #e2dfd5',
      borderRadius: 14,
      boxShadow: '0 16px 44px rgba(0,0,0,0.20)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 16px',
      background: WS.accent,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      letterSpacing: '0.02em'
    }
  }, "Statistical Tables"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(false),
    style: {
      cursor: 'pointer',
      border: 'none',
      background: 'rgba(255,255,255,0.18)',
      color: '#fff',
      width: 24,
      height: 24,
      borderRadius: '50%',
      fontSize: 14,
      lineHeight: 1
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5,
      padding: '12px 14px 2px'
    }
  }, ['Z', 't', 'χ²', 'F', 'Poisson', 'Binomial'].map((t, i) => /*#__PURE__*/React.createElement("button", {
    key: t,
    style: {
      cursor: 'pointer',
      fontFamily: WS.sans,
      fontSize: 11.5,
      fontWeight: 600,
      padding: '6px 11px',
      borderRadius: 7,
      border: 'none',
      background: i ? 'transparent' : '#f1efe7',
      color: i ? '#b6b2a8' : WS.ink
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px 16px'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'block',
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: WS.accent,
      marginBottom: 7
    }
  }, "Z \u2192 probability"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: WS.mute
    }
  }, "z ="), /*#__PURE__*/React.createElement("input", {
    value: z,
    onChange: e => setZ(e.target.value),
    type: "number",
    step: "0.01",
    style: {
      flex: 1,
      fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
      fontSize: 14,
      padding: '8px 10px',
      border: '1px solid #dcd8ce',
      borderRadius: 8,
      background: '#fbfaf6',
      color: WS.ink
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: '7px 10px',
      fontSize: 13
    }
  }, rows.map(([k, h, v]) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: k
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: WS.soft
    }
  }, k, " \xA0", /*#__PURE__*/React.createElement("span", {
    style: {
      color: WS.faint
    }
  }, h)), /*#__PURE__*/React.createElement("b", {
    style: {
      fontFamily: 'ui-monospace, monospace',
      color: WS.ink,
      textAlign: 'right'
    }
  }, v)))), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 11,
      lineHeight: 1.5,
      color: WS.faint
    }
  }, "Values computed exactly \u2014 no printed table needed."))), /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: WS.sans,
      fontSize: 13,
      fontWeight: 600,
      padding: '11px 16px',
      border: 'none',
      borderRadius: 999,
      background: WS.ink,
      color: WS.paper,
      boxShadow: '0 6px 20px rgba(0,0,0,0.18)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15
    }
  }, "\u2211"), " Z \u2194 P table"));
}
function WorksheetScreen({
  go
}) {
  const [topic, setTopic] = React.useState('normal');
  const label = {
    fontFamily: WS.sans,
    fontSize: 12,
    fontWeight: 600,
    color: WS.soft,
    marginBottom: 6
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: '100vh',
      background: WS.paper,
      fontFamily: WS.serif,
      color: WS.ink
    }
  }, /*#__PURE__*/React.createElement("main", {
    style: {
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '56px clamp(24px, 5vw, 0.78in) 96px'
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    onClick: e => {
      e.preventDefault();
      go('hub');
    },
    style: {
      fontFamily: WS.sans,
      fontSize: 12,
      color: WS.mute,
      textDecoration: 'none'
    }
  }, "\u2190 Mathematics"), /*#__PURE__*/React.createElement("header", {
    style: {
      margin: '18px 0 8px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: WS.sans,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: WS.accent
    }
  }, "Statistics \xB7 Worksheet"), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '10px 0 0',
      fontFamily: WS.sans,
      fontWeight: 600,
      fontSize: 36,
      lineHeight: 1.05,
      letterSpacing: '-0.02em',
      color: '#1a1a18'
    }
  }, "Statistics Practice Set"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '14px 0 0',
      maxWidth: '34em',
      fontSize: 16,
      lineHeight: 1.6,
      color: WS.soft
    }
  }, "Twenty-two problems across the normal distribution, statistical inference, regression, and the Poisson distribution. Each gives the known quantities and leaves room to work the solution by hand.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 28,
      margin: '22px 0 0',
      fontFamily: WS.sans,
      fontSize: 12,
      color: WS.mute
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: WS.ink,
      fontWeight: 600
    }
  }, "22"), "\xA0 problems"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: WS.ink,
      fontWeight: 600
    }
  }, "4"), "\xA0 sections"), /*#__PURE__*/React.createElement("span", null, "Work space included")), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      margin: '24px 0 0'
    }
  }, TOPICS.map(([k, l, n]) => {
    const on = k === topic;
    return /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTopic(k),
      style: {
        cursor: 'pointer',
        fontFamily: WS.sans,
        fontSize: 12.5,
        fontWeight: 500,
        padding: '8px 14px',
        borderRadius: 999,
        background: on ? WS.ink : 'transparent',
        color: on ? WS.paper : WS.soft,
        border: '1px solid ' + (on ? WS.ink : WS.chip)
      }
    }, l, /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: .55,
        marginLeft: 7
      }
    }, n));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      fontFamily: WS.sans,
      fontSize: 11.5,
      color: WS.mute
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      letterSpacing: '0.04em'
    }
  }, "Study progress"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", {
    style: {
      color: WS.ink
    }
  }, "5"), " / 22 solved")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 7,
      height: 6,
      borderRadius: 3,
      background: WS.rule,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: '23%',
      background: WS.accent,
      transition: 'width .35s ease'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 8,
      alignItems: 'center',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      cursor: 'pointer',
      fontFamily: WS.sans,
      fontSize: 11.5,
      fontWeight: 500,
      padding: '7px 13px',
      border: '1px solid ' + WS.accent,
      borderRadius: 8,
      background: WS.accent,
      color: '#fff'
    }
  }, "\u2193\xA0 Save my work to a file"), /*#__PURE__*/React.createElement("button", {
    style: {
      cursor: 'pointer',
      fontFamily: WS.sans,
      fontSize: 11.5,
      fontWeight: 500,
      padding: '7px 13px',
      border: '1px solid #dcd8ce',
      borderRadius: 8,
      background: '#fff',
      color: WS.soft
    }
  }, "\u2191\xA0 Load work from a file"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: WS.sans,
      fontSize: 11,
      color: WS.faint
    }
  }, "answers, marks & handwriting included"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: WS.rule,
      margin: '28px 0 0'
    }
  }), /*#__PURE__*/React.createElement("section", {
    style: {
      margin: '30px 0 8px',
      padding: '24px 26px',
      background: '#f4f3ed',
      border: '1px solid ' + WS.rule,
      borderRadius: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: WS.sans,
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: WS.accent,
      marginBottom: 16
    }
  }, "Quick reference"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      gap: '22px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: label
  }, "Standardize a value"), /*#__PURE__*/React.createElement(M, {
    d: true
  }, 'z = \\frac{x - \\mu}{\\sigma}')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: label
  }, "Sampling distribution"), /*#__PURE__*/React.createElement(M, {
    d: true
  }, 'z = \\frac{\\bar{x} - \\mu}{\\sigma/\\sqrt{n}}')), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: label
  }, "Empirical (68\u201395\u201399.7) rule"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 14,
      lineHeight: 1.55,
      color: WS.soft
    }
  }, "About 68% within ", /*#__PURE__*/React.createElement(M, null, '\\mu\\pm\\sigma'), ", 95% within ", /*#__PURE__*/React.createElement(M, null, '\\mu\\pm 2\\sigma'), ", and 99.7% within ", /*#__PURE__*/React.createElement(M, null, '\\mu\\pm 3\\sigma'), ".")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: label
  }, "Poisson probability"), /*#__PURE__*/React.createElement(M, {
    d: true
  }, 'P(X=k) = \\frac{\\lambda^{k} e^{-\\lambda}}{k!}')))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      overflow: 'hidden',
      margin: '30px 0 0',
      padding: '28px 220px 28px 30px',
      borderRadius: 12,
      background: 'linear-gradient(180deg,#eef4f3,#e6efee)',
      border: '1px solid #d3e1df'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/figures/fig-normal-curve.svg",
    alt: "",
    style: {
      position: 'absolute',
      right: 20,
      top: '50%',
      transform: 'translateY(-50%)',
      width: 190,
      opacity: .85
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: WS.sans,
      fontSize: 10.5,
      fontWeight: 600,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color: '#2f6f6a'
    }
  }, "Now practicing"), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '8px 0 0',
      fontFamily: WS.sans,
      fontWeight: 600,
      fontSize: 27,
      letterSpacing: '-0.015em',
      color: '#16302e'
    }
  }, "Normal Distribution"), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 18,
      lineHeight: 1.45,
      fontStyle: 'italic',
      color: '#2f6f6a',
      maxWidth: '32em'
    }
  }, "Breathe. Almost everything in life clusters around its centre \u2014 and so will this."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '12px 0 0',
      fontSize: 14.5,
      lineHeight: 1.6,
      color: '#4d5d5b',
      maxWidth: '40em'
    }
  }, "You measure how far a value sits from the mean in steady steps of one standard deviation. Find the z, read the area, answer the question. One quiet step at a time.")), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '30px 0 0',
      padding: '40px 24px',
      border: '1px dashed #dcd8ce',
      borderRadius: 8,
      textAlign: 'center',
      fontFamily: WS.sans,
      fontSize: 13,
      color: WS.mute
    }
  }, "Problem cards not recreated \u2014 this part of the source file is packed and couldn't be read.")), /*#__PURE__*/React.createElement(TablesTool, null));
}
Object.assign(window, {
  WorksheetScreen
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/commonplace-maths/WorksheetScreen.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.BranchCard = __ds_scope.BranchCard;

__ds_ns.Callout = __ds_scope.Callout;

__ds_ns.Details = __ds_scope.Details;

__ds_ns.Figure = __ds_scope.Figure;

__ds_ns.LawTable = __ds_scope.LawTable;

__ds_ns.Plate = __ds_scope.Plate;

__ds_ns.RangeControl = __ds_scope.RangeControl;

__ds_ns.Segmented = __ds_scope.Segmented;

__ds_ns.Widget = __ds_scope.Widget;

__ds_ns.Colophon = __ds_scope.Colophon;

__ds_ns.Crumb = __ds_scope.Crumb;

__ds_ns.TocChips = __ds_scope.TocChips;

__ds_ns.ToggleButton = __ds_scope.ToggleButton;

__ds_ns.Checklist = __ds_scope.Checklist;

__ds_ns.LevelLabel = __ds_scope.LevelLabel;

__ds_ns.Problem = __ds_scope.Problem;

__ds_ns.RecallCard = __ds_scope.RecallCard;

__ds_ns.ScoreBar = __ds_scope.ScoreBar;

__ds_ns.Kicker = __ds_scope.Kicker;

__ds_ns.Masthead = __ds_scope.Masthead;

__ds_ns.Note = __ds_scope.Note;

__ds_ns.Seal = __ds_scope.Seal;

__ds_ns.SectionHead = __ds_scope.SectionHead;

})();
