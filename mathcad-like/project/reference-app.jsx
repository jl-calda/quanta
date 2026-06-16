/* Quanta reference library — app (3-pane: categories · list · detail) */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery || !window.QRefData) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge } = Q;
    const { Sub, Sup, Frac, Op } = Q;
    const { Icons, QLogo, NavRail } = window.QGallery;
    const { TREE, FUNCTIONS, UNITS, CONSTANTS, ALL } = window.QRefData;
    const { useState, useMemo } = React;
    const e = React.createElement;

    /* extra icons */
    const sic = (children, s = 18) => e('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, children);
    const PP = (...ds) => (s) => sic(ds.map((d, i) => e('path', { key: i, d })), s);
    const X = {
      func: PP('M14.5 5.2A2.4 2.4 0 0 0 10 6.4V9', 'M7.5 12.5h6', 'M13.5 19c-2 .2-3-1-3-3.2V8'),
      unit: (s) => sic([e('rect', { key: 1, x: 3, y: 8, width: 18, height: 8, rx: 1.4 }), e('path', { key: 2, d: 'M7.5 8v3.5M11.5 8v5M15.5 8v3.5' })], s),
      constant: PP('M5 19V7.5A2.5 2.5 0 0 1 10 7v.5', 'M4 11h6', 'M13 5l6 14M19 5l-6 14'),
      search: Icons.search,
      chevD: PP('m6 9 6 6 6-6'),
      chevR: PP('m9.5 7 5 5-5 5'),
      close: PP('M6 6l12 12M18 6 6 18'),
      insert: PP('M12 5v14M5 12h14'),
      copy: (s) => sic([e('rect', { key: 1, x: 9, y: 9, width: 11, height: 11, rx: 1.6 }), e('path', { key: 2, d: 'M5 15V6a1.2 1.2 0 0 1 1.2-1.2H15' })], s),
      arrow: PP('M5 12h14M13 6l6 6-6 6'),
      book: PP('M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z', 'M8 4v15'),
    };
    const GROUP_ICON = { FUNCTIONS: X.func, UNITS: X.unit, CONSTANTS: X.constant };

    const It = ({ children }) => e('span', { style: { fontFamily: 'var(--font-math)', fontStyle: 'italic' } }, children);
    const M = ({ children, size = 18 }) => e('span', { style: { display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '0.16em', rowGap: 3, fontFamily: 'var(--font-math)', fontSize: size, color: 'var(--text-math)', lineHeight: 1.25 } }, children);
    const Res = (children, tone) => e('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: '0.18em', padding: '1px 8px', borderRadius: 4, marginLeft: '0.15em', background: tone === 'pass' ? 'var(--status-pass-bg)' : 'var(--accent-tint)', color: tone === 'pass' ? 'var(--status-pass)' : 'var(--accent)', fontWeight: 600 } }, children);
    const num = (v, u) => e(React.Fragment, null, e('span', null, v), u && e('span', { style: { fontSize: '0.8em', marginLeft: '0.12em' } }, u));

    /* highlight matched substring */
    const Hi = ({ text, q }) => {
      if (!q) return text;
      const i = text.toLowerCase().indexOf(q.toLowerCase());
      if (i < 0) return text;
      return e(React.Fragment, null, text.slice(0, i), e('mark', { className: 'hl' }, text.slice(i, i + q.length)), text.slice(i + q.length));
    };

    /* ---------------- worked examples (rendered math) ---------------- */
    const EXAMPLES = {
      'interp-wind': () => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Interpolating a wind-pressure profile at z = 17 m from a code table:'),
        // the data table
        e('div', { style: { border: '1px solid var(--border-hairline)', borderRadius: 4, overflow: 'hidden', maxWidth: 280 } },
          e('table', { style: { borderCollapse: 'collapse', width: '100%' } },
            e('thead', null, e('tr', { style: { background: 'var(--surface-chrome)' } },
              e('th', { style: thh }, 'z (m)'), e('th', { style: thh }, 'qₚ (kPa)'))),
            e('tbody', null, [['10', '0.74'], ['15', '0.86'], ['20', '0.95'], ['30', '1.08']].map((r, i) => e('tr', { key: i, style: { borderTop: '1px solid var(--border-hairline)', background: (i === 1 || i === 2) ? 'var(--accent-tint)' : 'transparent' } },
              e('td', { style: tdc }, r[0]), e('td', { style: tdc }, r[1])))))),
        e(M, { size: 16 }, e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.92em' } }, 'qp'), e(Op, null, ':='), 'interp', e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.86em', color: 'var(--text-muted)' } }, '(z, q, 17 m)')),
        e(M, { size: 18 }, e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.86em' } }, 'qp'), e(Op, null, '='), Res(num('0.90', 'kPa')))),
      'vlookup-bolt': () => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Looking up the tensile area of an M16 bolt from a property table:'),
        e('div', { style: { border: '1px solid var(--border-hairline)', borderRadius: 4, overflow: 'hidden', maxWidth: 300 } },
          e('table', { style: { borderCollapse: 'collapse', width: '100%' } },
            e('thead', null, e('tr', { style: { background: 'var(--surface-chrome)' } }, e('th', { style: thh }, 'd (mm)'), e('th', { style: thh }, 'Aₛ (mm²)'), e('th', { style: thh }, 'fᵤ (MPa)'))),
            e('tbody', null, [['12', '84.3', '800'], ['16', '157', '800'], ['20', '245', '800']].map((r, i) => e('tr', { key: i, style: { borderTop: '1px solid var(--border-hairline)', background: i === 1 ? 'var(--accent-tint)' : 'transparent' } }, e('td', { style: tdc }, r[0]), e('td', { style: tdc }, r[1]), e('td', { style: tdc }, r[2])))))),
        e(M, { size: 16 }, e(Sub, { base: 'A', sub: 's' }), e(Op, null, ':='), e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.84em', color: 'var(--text-muted)' } }, 'Vlookup(16 mm, tbl, 2)')),
        e(M, { size: 18 }, e(Sub, { base: 'A', sub: 's' }), e(Op, null, '='), Res(num('157', 'mm²')))),
      'root-quad': () => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Solving x² − 5x + 6 = 0 near a guess of x = 1:'),
        e(M, { size: 17 }, e(It, null, 'x'), e(Op, null, ':='), '1', e('span', { style: { color: 'var(--text-muted)', fontSize: '0.8em', marginLeft: 8, fontStyle: 'normal', fontFamily: 'var(--font-sans)' } }, 'guess')),
        e(M, { size: 16 }, e(It, null, 'x'), e(Op, null, ':='), e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.84em', color: 'var(--text-muted)' } }, 'root(x²−5x+6, x)')),
        e(M, { size: 18 }, e(It, null, 'x'), e(Op, null, '='), Res(e('span', null, '2.00')))),
      'mean-loads': () => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Average of four measured bay loads:'),
        e(M, { size: 16 }, e(It, null, 'P'), e(Op, null, ':='), e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.86em' } }, '[12.0  14.5  11.8  13.1]'), e('span', { style: { fontSize: '0.8em' } }, 'kN')),
        e(M, { size: 18 }, 'mean', e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.86em', color: 'var(--text-muted)' } }, '(P)'), e(Op, null, '='), Res(num('12.85', 'kN')))),
      'max-util': () => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Governing utilisation across three checks:'),
        e(M, { size: 18 }, 'UR', e('span', { style: { fontSize: '0.7em', fontStyle: 'italic' } }, 'max'), e(Op, null, '='), 'Max', e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.86em', color: 'var(--text-muted)' } }, '(0.23, 0.85, 0.61)'), e(Op, null, '='), Res(e('span', null, '0.85')))),
      'sqrt-area': () => e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Equivalent side of a 157 mm² area — note the unit takes the root:'),
        e(M, { size: 18 }, e(It, null, 'a'), e(Op, null, '='), 'Sqrt', e('span', { style: { fontFamily: 'var(--font-mono)', fontStyle: 'normal', fontSize: '0.86em', color: 'var(--text-muted)' } }, '(157 mm²)'), e(Op, null, '='), Res(num('12.53', 'mm')))),
    };
    const thh = { padding: '5px 10px', font: '600 10.5px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' };
    const tdc = { padding: '5px 10px', font: '12px/1.3 var(--font-mono)', color: 'var(--text-primary)' };

    /* ---------------- category sidebar ---------------- */
    function CatSidebar({ sel, setSel }) {
      const [openGroups, setOpenGroups] = useState({ FUNCTIONS: true, UNITS: true, CONSTANTS: true });
      return e('aside', { style: { width: 248, flex: '0 0 248px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 } },
        e('div', { style: { padding: '18px 16px 14px', borderBottom: '1px solid var(--border-hairline)' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
            e('span', { style: { color: 'var(--accent)', display: 'inline-flex' } }, X.book(20)),
            e('span', { style: { font: '600 15px/1.2 var(--font-sans)', color: 'var(--text-primary)' } }, 'Reference library')),
          e('div', { style: { font: '12px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 5 } }, 'Functions, units, and constants')),
        e('div', { className: 'scroll-y', style: { flex: 1, padding: '10px 8px', minHeight: 0 } },
          Object.entries(TREE).map(([group, subs]) => e('div', { key: group, style: { marginBottom: 6 } },
            e('button', { onClick: () => setOpenGroups((g) => ({ ...g, [group]: !g[group] })), style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer' } },
              e('span', { style: { display: 'inline-flex', color: 'var(--text-muted)', transform: openGroups[group] ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' } }, X.chevR(13)),
              e('span', { style: { display: 'inline-flex', color: 'var(--accent)' } }, GROUP_ICON[group](16)),
              e('span', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.07em', color: 'var(--text-primary)' } }, group)),
            openGroups[group] && e('div', { style: { display: 'flex', flexDirection: 'column', gap: 1, paddingLeft: 6 } },
              subs.map((s) => {
                const on = sel === s.id;
                const count = ALL.filter((it) => it.cat === s.id).length;
                return e('button', { key: s.id, onClick: () => setSel(s.id), style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 10px 6px 28px', border: 'none', background: on ? 'var(--accent-tint)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }, onMouseEnter: (ev) => { if (!on) ev.currentTarget.style.background = 'var(--surface-hover)'; }, onMouseLeave: (ev) => { if (!on) ev.currentTarget.style.background = 'transparent'; } },
                  e('span', { style: { flex: 1, font: (on ? '600 ' : '400 ') + '12.5px/1.3 var(--font-sans)', color: on ? 'var(--accent)' : 'var(--text-primary)' } }, s.label),
                  e('span', { style: { font: '11px/1 var(--font-mono)', color: 'var(--text-muted)' } }, count));
              })))))
      );
    }

    /* ---------------- center list ---------------- */
    function ItemList({ items, selId, setSelId, query, setQuery, catLabel }) {
      const Tag = ({ children }) => e('span', { style: { font: '10.5px/1 var(--font-sans)', color: 'var(--text-muted)', background: 'var(--surface-chrome)', border: '1px solid var(--border-hairline)', borderRadius: 4, padding: '3px 6px', whiteSpace: 'nowrap', flex: '0 0 auto' } }, children);
      return e('div', { style: { flex: '0 0 380px', width: 380, borderRight: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-paper)' } },
        // search
        e('div', { style: { padding: '16px 18px 12px', borderBottom: '1px solid var(--border-hairline)' } },
          e('div', { style: { position: 'relative' } },
            e('span', { style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' } }, X.search(16)),
            e('input', { value: query, onChange: (ev) => setQuery(ev.target.value), placeholder: 'Search functions, units, constants…', style: { width: '100%', height: 38, padding: '0 32px 0 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', font: '13px/1 var(--font-sans)', color: 'var(--text-primary)', outline: 'none' }, onFocus: (ev) => { ev.target.style.borderColor = 'var(--accent)'; ev.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)'; }, onBlur: (ev) => { ev.target.style.borderColor = 'var(--border-strong)'; ev.target.style.boxShadow = 'none'; } }),
            query && e('button', { onClick: () => setQuery(''), 'aria-label': 'Clear search', style: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: 'none', background: 'transparent', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' } }, X.close(14))),
          e('div', { style: { font: '12px/1 var(--font-sans)', color: 'var(--text-muted)', marginTop: 11 } }, query ? (items.length + ' result' + (items.length === 1 ? '' : 's') + ' for “' + query + '”') : catLabel)),
        // list
        e('div', { className: 'scroll-y', style: { flex: 1, minHeight: 0 } },
          items.length === 0
            ? e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '70px 30px', textAlign: 'center' } },
                e('div', { style: { width: 46, height: 46, borderRadius: '50%', border: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: 14 } }, X.search(20)),
                e('div', { style: { font: '600 14px/1.3 var(--font-sans)', color: 'var(--text-primary)', marginBottom: 6 } }, 'No matches for “' + query + '”'),
                e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, 'Check the spelling, or browse a category on the left.'))
            : items.map((it) => {
                const on = selId === it.id;
                return e('button', { key: it.id, className: 'ref-row', onClick: () => setSelId(it.id), style: { display: 'block', width: '100%', textAlign: 'left', padding: 'var(--d-row-y) var(--d-row-x)', border: 'none', borderBottom: '1px solid var(--border-hairline)', borderLeft: '2px solid ' + (on ? 'var(--accent)' : 'transparent'), background: on ? 'var(--accent-tint)' : 'transparent', cursor: 'pointer' } },
                  e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 } },
                    e('code', { style: { font: '13px/1.3 var(--font-mono)', color: on ? 'var(--accent)' : 'var(--text-primary)', fontWeight: 500 } }, e(Hi, { text: it.sig, q: query })),
                    e(Tag, null, it.tag)),
                  e('div', { style: { font: '12px/1.45 var(--font-sans)', color: 'var(--text-muted)', marginTop: 5 } }, e(Hi, { text: it.desc, q: query })));
              })));
    }

    /* ---------------- detail panel ---------------- */
    function DetailSection({ eyebrow, children, first }) {
      return e('div', { style: { padding: '16px 22px', borderTop: first ? 'none' : '1px solid var(--border-hairline)' } },
        e('div', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 } }, eyebrow),
        children);
    }
    function DetailPanel({ item, onRelated }) {
      if (!item) return null;
      const example = item.example && EXAMPLES[item.example];
      return e('div', { key: item.id, className: 'fade-rise', style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--surface-chrome)' } },
        // header
        e('div', { style: { padding: '20px 22px 18px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-paper)' } },
          e('div', { style: { display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 } },
            e(Badge, { tone: 'accent' }, item.kind === 'function' ? 'Function' : item.kind === 'unit' ? 'Unit' : 'Constant'),
            e('span', { style: { font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' } }, item.tag)),
          e('code', { style: { display: 'block', font: '600 19px/1.4 var(--font-mono)', color: 'var(--text-primary)' } }, item.sig && item.kind === 'function' ? item.sig : item.name),
          item.kind !== 'function' && e('div', { style: { font: '13px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 4 } }, item.sig),
          e('p', { style: { margin: '12px 0 0', font: '13.5px/1.6 var(--font-sans)', color: 'var(--text-primary)', maxWidth: 560 } }, item.desc),
          e('div', { style: { display: 'flex', gap: 10, marginTop: 18 } },
            e(Button, { variant: 'primary', iconLeft: X.insert(16) }, 'Insert into worksheet'),
            e(Button, { variant: 'ghost', iconLeft: X.copy(15) }, 'Copy signature'))),
        // body
        e('div', { className: 'scroll-y', style: { flex: 1, minHeight: 0 } },
          // params (functions)
          item.params && DetailSection2('Parameters',
            e('div', { style: { border: '1px solid var(--border-hairline)', borderRadius: 6, overflow: 'hidden', background: 'var(--surface-raised)' } },
              e('table', { style: { borderCollapse: 'collapse', width: '100%' } },
                e('thead', null, e('tr', { style: { background: 'var(--surface-chrome)', borderBottom: '1px solid var(--border-hairline)' } },
                  e('th', { style: { ...pth, width: 96 } }, 'Name'), e('th', { style: { ...pth, width: 110 } }, 'Type'), e('th', { style: pth }, 'Description'))),
                e('tbody', null, item.params.map((p, i) => e('tr', { key: i, style: { borderTop: i ? '1px solid var(--border-hairline)' : 'none' } },
                  e('td', { style: { ...ptd, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontWeight: 500 } }, p[0]),
                  e('td', { style: { ...ptd, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: 12 } }, p[1]),
                  e('td', { style: { ...ptd, color: 'var(--text-muted)' } }, p[2]))))))),
          // value (constants)
          item.value && DetailSection2('Value',
            e('div', { style: { display: 'flex', alignItems: 'baseline', gap: 12, padding: '14px 16px', border: '1px solid var(--border-hairline)', borderRadius: 6, background: 'var(--surface-raised)' } },
              e('span', { style: { fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: 17, color: 'var(--text-math)' } }, item.name),
              e(Op, null, '='),
              e('span', { style: { font: '16px/1 var(--font-mono)', color: 'var(--text-primary)' } }, item.value),
              e('span', { style: { font: '14px/1 var(--font-math)', color: 'var(--accent)' } }, item.unit),
              e('span', { style: { marginLeft: 'auto', font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' } }, item.source))),
          // base/dimension (units)
          item.base && DetailSection2('Conversion',
            e('div', { style: { display: 'flex', gap: 28 } },
              e('div', null, e('div', { style: { font: '11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 } }, 'Base SI'), e('span', { style: { font: '15px/1 var(--font-mono)', color: 'var(--text-primary)' } }, '1 ' + item.name + ' = ' + item.base)),
              e('div', null, e('div', { style: { font: '11px/1 var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 6 } }, 'Dimension'), e('span', { style: { font: '15px/1 var(--font-math)', color: 'var(--text-math)' } }, item.dim)))),
          // units behavior
          item.units && DetailSection2('Units behaviour', e('p', { style: { margin: 0, font: '13px/1.6 var(--font-sans)', color: 'var(--text-primary)', maxWidth: 560 } }, item.units)),
          // worked example
          example && DetailSection2('Worked example',
            e('div', { style: { padding: '16px 18px', border: '1px solid var(--border-hairline)', borderRadius: 6, background: 'var(--surface-paper)' }, className: 'q-grid-mini' }, example())),
          // related
          item.related && DetailSection2('Related',
            e('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
              item.related.map((r) => {
                const target = ALL.find((it) => it.name === r || it.id === r.toLowerCase());
                return e('button', { key: r, onClick: () => target && onRelated(target), style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', cursor: target ? 'pointer' : 'default', color: target ? 'var(--text-primary)' : 'var(--text-muted)', font: '12.5px/1 var(--font-mono)' }, onMouseEnter: (ev) => { if (target) { ev.currentTarget.style.borderColor = 'var(--accent)'; ev.currentTarget.style.color = 'var(--accent)'; } }, onMouseLeave: (ev) => { ev.currentTarget.style.borderColor = 'var(--border-hairline)'; ev.currentTarget.style.color = target ? 'var(--text-primary)' : 'var(--text-muted)'; } }, r);
              }))),
          e('div', { style: { height: 24 } })));
    }
    function DetailSection2(eyebrow, children) {
      return e('div', { style: { padding: '16px 22px', borderTop: '1px solid var(--border-hairline)' } },
        e('div', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 } }, eyebrow), children);
    }
    const pth = { padding: '8px 12px', font: '600 10.5px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', textAlign: 'left' };
    const ptd = { padding: '9px 12px', font: '12.5px/1.45 var(--font-sans)', verticalAlign: 'top' };

    /* ---------------- app ---------------- */
    function App() {
      const [cat, setCat] = useState('lookup');
      const [selId, setSelId] = useState('interp');
      const [query, setQuery] = useState('');

      const items = useMemo(() => {
        if (query.trim()) {
          const q = query.toLowerCase();
          return ALL.filter((it) => (it.name + it.sig + it.desc + it.tag).toLowerCase().includes(q));
        }
        return ALL.filter((it) => it.cat === cat);
      }, [cat, query]);

      const catLabel = useMemo(() => {
        for (const subs of Object.values(TREE)) { const f = subs.find((s) => s.id === cat); if (f) return f.label; }
        return '';
      }, [cat]);

      const selected = ALL.find((it) => it.id === selId) || items[0] || null;

      const pickRelated = (target) => { setQuery(''); setCat(target.cat); setSelId(target.id); };
      const pickCat = (c) => { setQuery(''); setCat(c); const first = ALL.find((it) => it.cat === c); if (first) setSelId(first.id); };

      return e('div', { style: { display: 'flex', height: '100vh' }, 'data-screen-label': 'Reference library' },
        e(NavRail, { active: 'reference' }),
        e(CatSidebar, { sel: cat, setSel: pickCat }),
        e(ItemList, { items, selId: selected ? selected.id : null, setSelId, query, setQuery, catLabel }),
        selected
          ? e(DetailPanel, { item: selected, onRelated: pickRelated })
          : e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-chrome)', color: 'var(--text-muted)', font: '13px/1.5 var(--font-sans)' } }, 'Select an item to see its reference.'));
    }

    ReactDOM.createRoot(document.getElementById('root')).render(e(App));
  };
  boot();
}
