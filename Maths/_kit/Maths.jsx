// KaTeX helper: inline <M>…</M>, display <M d>…</M>, or <M tex="…" />. Extracts TeX recursively from children.
const texOf = c => c == null || typeof c === 'boolean' ? '' : (typeof c === 'string' || typeof c === 'number') ? String(c) : Array.isArray(c) ? c.map(texOf).join('') : (c.props ? texOf(c.props.children) : '');
function M({ children, d, tex }) {
  const src = tex != null ? String(tex) : texOf(React.Children.toArray(children));
  const html = React.useMemo(() => { try { return window.katex.renderToString(src, { displayMode: !!d, throwOnError: false }); } catch (e) { return src; } }, [src, d]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
Object.assign(window, { M, texOf });
