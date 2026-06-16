/* Quanta templates — thumbnails, icons, nav rail. window.QGallery */
window.QGallery = (function () {
  const Q = window.QuantaDesignSystem_019e2c;
  const { Sub, Sup, Frac, Op, Sqrt } = Q;
  const e = React.createElement;

  /* ---- icons (Lucide, 1.5px) ---- */
  const ic = (children, s = 18) => e('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, children);
  const P = (...ds) => (s) => ic(ds.map((d, i) => e('path', { key: i, d })), s);
  const Icons = {
    home: P('M3 10.5 12 4l9 6.5', 'M5 9.5V20h14V9.5', 'M9.5 20v-5h5v5'),
    sheet: (s = 18) => ic([e('rect', { key: 1, x: 5, y: 3, width: 14, height: 18, rx: 1.5 }), e('path', { key: 2, d: 'M8.5 8h7M8.5 12h7M8.5 16h4' })], s),
    tpl: (s = 18) => ic([e('rect', { key: 1, x: 3, y: 4, width: 18, height: 16, rx: 1.5 }), e('path', { key: 2, d: 'M3 9h18M9 9v11' })], s),
    share: (s = 18) => ic([e('circle', { key: 1, cx: 9, cy: 8, r: 3 }), e('path', { key: 2, d: 'M3.5 19a5.5 5.5 0 0 1 11 0' }), e('circle', { key: 3, cx: 17.5, cy: 9.5, r: 2.3 }), e('path', { key: 4, d: 'M16 19a4.4 4.4 0 0 1 5.5-3.7' })], s),
    trash: P('M4 7h16M9.5 7V5h5v2M6 7l1 13h10l1-13', 'M10 11v5M14 11v5'),
    search: (s = 18) => ic([e('circle', { key: 1, cx: 11, cy: 11, r: 7 }), e('path', { key: 2, d: 'm20 20-3.2-3.2' })], s),
    chevD: P('m6 9 6 6 6-6'),
    chevR: P('m9.5 6 6 6-6 6'),
    close: P('M6 6l12 12M18 6 6 18'),
    verified: (s = 18) => ic([e('path', { key: 1, d: 'm12 2.5 2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.7 2.6.7 2.6-2.3 1.4-1 2.5-2.7-.2L12 21.5l-2.2-1.6-2.7.2-1-2.5-2.3-1.4.7-2.6-.7-2.6 2.3-1.4 1-2.5 2.7.2z' }), e('path', { key: 2, d: 'm8.8 12 2.2 2.2 4.2-4.4' })], s),
    users: (s = 18) => ic([e('circle', { key: 1, cx: 9, cy: 9, r: 3 }), e('path', { key: 2, d: 'M3.5 19a5.5 5.5 0 0 1 11 0' }), e('path', { key: 3, d: 'M16 7.5a3 3 0 0 1 0 5.8M16.5 19a5.4 5.4 0 0 1 4 0' })], s),
    plus: P('M12 6v12M6 12h12'),
    eye: (s = 18) => ic([e('path', { key: 1, d: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z' }), e('circle', { key: 2, cx: 12, cy: 12, r: 3 })], s),
    bookmark: P('M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z'),
    kebab: (s = 18) => ic([e('circle', { key: 1, cx: 12, cy: 5, r: 1.3 }), e('circle', { key: 2, cx: 12, cy: 12, r: 1.3 }), e('circle', { key: 3, cx: 12, cy: 19, r: 1.3 })], s),
    flame: P('M12 3c.5 3-2 4-2 6.5A2 2 0 0 0 12 11.5 2 2 0 0 0 13.2 8C15 9 16 11 16 13.5a4 4 0 0 1-8 0C8 10.5 10 8 12 3z'),
    gear: (s = 18) => ic([e('circle', { key: 1, cx: 12, cy: 12, r: 3 }), e('path', { key: 2, d: 'M12 2.5v3M12 18.5v3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M2.5 12h3M18.5 12h3M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1' })], s),
    download: P('M12 3v11m0 0 4-4m-4 4-4-4', 'M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17'),
    link: P('M9.5 14.5 14.5 9.5', 'M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1', 'M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1'),
  };

  const QLogo = ({ size = 24 }) => e('svg', { width: size, height: size, viewBox: '0 0 32 32', fill: 'none', 'aria-hidden': true },
    e('rect', { x: 2.75, y: 2.75, width: 26.5, height: 26.5, rx: 4, stroke: 'var(--accent)', strokeWidth: 1.5 }),
    e('line', { x1: 8, y1: 16, x2: 24, y2: 16, stroke: 'var(--accent)', strokeWidth: 1.5, strokeLinecap: 'round' }),
    e('line', { x1: 12.5, y1: 10.25, x2: 19.5, y2: 10.25, stroke: 'var(--ink)', strokeWidth: 1.5, strokeLinecap: 'round' }),
    e('circle', { cx: 16, cy: 21.75, r: 1.6, fill: 'var(--status-pass)' }));

  /* ---- math notation helpers for thumbnails ---- */
  const It = ({ children }) => React.createElement('span', { style: { fontFamily: 'var(--font-math)', fontStyle: 'italic' } }, children);
  const chip = (val, unit, tone) => React.createElement('span', {
    style: { display: 'inline-flex', alignItems: 'baseline', gap: '0.16em', padding: '0.5px 5px', borderRadius: 3,
      background: tone === 'warn' ? 'var(--status-warning-bg)' : tone === 'fail' ? 'var(--status-error-bg)' : 'var(--status-pass-bg)',
      color: tone === 'warn' ? 'var(--status-warning)' : tone === 'fail' ? 'var(--status-error)' : 'var(--status-pass)', fontWeight: 600 }
  }, React.createElement('span', null, val), unit && React.createElement('span', { style: { fontSize: '0.8em' } }, unit));

  /* ---- the rendered first-page thumbnail. variant 0..7 ---- */
  function Thumb({ variant = 0, scale = 1, title }) {
    const fs = 9 * scale;
    const row = { display: 'flex', alignItems: 'center', gap: '0.3em', font: fs + 'px/1.35 var(--font-math)', color: 'var(--text-math)', whiteSpace: 'nowrap' };
    const eyebrow = (t) => e('div', { style: { font: '600 ' + (6.2 * scale) + 'px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 3px' } }, t);
    const heading = (t) => e('div', { style: { font: '600 ' + (8.5 * scale) + 'px/1.2 var(--font-sans)', color: 'var(--text-primary)', margin: '5px 0 4px' } }, t);
    const rule = () => e('div', { style: { height: 1, background: 'var(--border-hairline)', margin: '5px 0' } });

    const sets = [
      // 0 — bolt group eccentric shear
      e(React.Fragment, null,
        eyebrow('EN 1993-1-8 · §3.12'),
        heading('Bolt group — eccentric shear'),
        e('div', { style: row }, e(Sub, { base: 'V', sub: 'Ed' }), e(Op, null, ':='), '84 ', e('span', { style: { fontSize: '0.8em' } }, 'kN')),
        e('div', { style: row }, e(Sub, { base: 'r', sub: 'max' }), e(Op, null, '='), e(Sqrt, null, e('span', null, e(Sup, { base: 'x', sup: '2' }), e(Op, null, '+'), e(Sup, { base: 'y', sup: '2' })))),
        e('div', { style: row }, e(Sub, { base: 'F', sub: 'v,Ed' }), e(Op, null, '='), chip('19.2', 'kN'), React.createElement('span', { style: { marginLeft: '0.3em', font: '600 ' + (6.5 * scale) + 'px/1 var(--font-sans)', color: 'var(--status-pass)' } }, 'OK'))),
      // 1 — beam deflection
      e(React.Fragment, null,
        eyebrow('AS 1170 · SLS'),
        heading('Simply-supported beam'),
        e('div', { style: row }, e(It, null, 'w'), e(Op, null, ':='), '1.8 ', e('span', { style: { fontSize: '0.8em' } }, 'kN/m')),
        e('div', { style: row }, React.createElement('span', { style: { fontStyle: 'italic' } }, 'δ'), e(Op, null, '='), e(Frac, { num: e('span', null, '5', e(It, null, 'w'), e(Sup, { base: 'L', sup: '4' })), den: e('span', null, '384', e(It, null, 'EI')) }), e(Op, null, '='), chip('38', 'mm', 'warn'))),
      // 2 — guardrail point load
      e(React.Fragment, null,
        eyebrow('AS 1657 · barriers'),
        heading('Guardrail post'),
        e('div', { style: row }, e(It, null, 'P'), e(Op, null, ':='), '1.5 ', e('span', { style: { fontSize: '0.8em' } }, 'kN')),
        e('div', { style: row }, e(Sub, { base: 'M', sub: 'Ed' }), e(Op, null, '='), e(It, null, 'P'), e(Op, null, '·'), e(It, null, 'h'), e(Op, null, '='), chip('1.65', 'kN·m')),
        e('div', { style: row }, e(Sub, { base: 'σ', sub: 'b' }), e(Op, null, '='), chip('142', 'MPa'))),
      // 3 — anchor pull-out
      e(React.Fragment, null,
        eyebrow('ACI 318 · CCD'),
        heading('Anchor pull-out'),
        e('div', { style: row }, e(Sub, { base: 'N', sub: 'cb' }), e(Op, null, '='), e(Frac, { num: e(Sub, { base: 'A', sub: 'Nc' }), den: e(Sub, { base: 'A', sub: 'Nc0' }) }), e(Op, null, '·'), e(Sub, { base: 'N', sub: 'b' })),
        e('div', { style: row }, e(Sub, { base: 'N', sub: 'Rd' }), e(Op, null, '='), chip('29.7', 'kN'))),
      // 4 — weld group
      e(React.Fragment, null,
        eyebrow('AISC 360 · welds'),
        heading('Fillet weld group'),
        e('div', { style: row }, e(It, null, 'a'), e(Op, null, ':='), '6 ', e('span', { style: { fontSize: '0.8em' } }, 'mm')),
        e('div', { style: row }, e(Sub, { base: 'f', sub: 'w' }), e(Op, null, '='), e(Frac, { num: e(It, null, 'V'), den: e('span', null, '0.707', e(It, null, 'a'), e(It, null, 'L')) }), e(Op, null, '='), chip('118', 'MPa'))),
      // 5 — unit conversion
      e(React.Fragment, null,
        eyebrow('Conversion'),
        heading('Pressure & load units'),
        e('div', { style: row }, '1 ', e('span', { style: { fontSize: '0.8em' } }, 'ksi'), e(Op, null, '='), chip('6.895', 'MPa')),
        e('div', { style: row }, '1 ', e('span', { style: { fontSize: '0.8em' } }, 'kip'), e(Op, null, '='), chip('4.448', 'kN')),
        e('div', { style: row }, '1 ', e('span', { style: { fontSize: '0.8em' } }, 'psf'), e(Op, null, '='), chip('47.88', 'Pa'))),
      // 6 — column buckling
      e(React.Fragment, null,
        eyebrow('EN 1993-1-1 · §6.3'),
        heading('Column buckling'),
        e('div', { style: row }, e(Sub, { base: 'N', sub: 'cr' }), e(Op, null, '='), e(Frac, { num: e('span', null, e(Sup, { base: 'π', sup: '2' }), e(It, null, 'EI')), den: e(Sup, { base: 'L', sup: '2' }) })),
        e('div', { style: row }, React.createElement('span', { style: { fontStyle: 'italic' } }, 'λ̄'), e(Op, null, '='), chip('0.84', '')),
        e('div', { style: row }, React.createElement('span', { style: { fontStyle: 'italic' } }, 'χ'), e(Op, null, '·'), e(Sub, { base: 'N', sub: 'pl' }), e(Op, null, '='), chip('612', 'kN'))),
      // 7 — retaining wall
      e(React.Fragment, null,
        eyebrow('Geotech · EC7'),
        heading('Retaining wall — sliding'),
        e('div', { style: row }, e(Sub, { base: 'K', sub: 'a' }), e(Op, null, '='), e(Frac, { num: e('span', null, '1−sin', e(It, null, 'φ')), den: e('span', null, '1+sin', e(It, null, 'φ')) })),
        e('div', { style: row }, 'FoS', e(Op, null, '='), chip('1.62', ''), React.createElement('span', { style: { marginLeft: '0.3em', font: '600 ' + (6.5 * scale) + 'px/1 var(--font-sans)', color: 'var(--status-pass)' } }, 'OK'))),
    ];

    return e('div', { className: 'q-grid-mini', style: { height: '100%', width: '100%', background: 'var(--surface-paper)', padding: 13 * scale + 'px ' + 14 * scale + 'px', overflow: 'hidden' } }, sets[variant]);
  }

  /* ---- nav rail (shared across screens) ---- */
  function NavRail({ active = 'templates' }) {
    const items = [
      { id: 'home', label: 'Home', icon: Icons.home },
      { id: 'worksheets', label: 'Worksheets', icon: Icons.sheet },
      { id: 'templates', label: 'Templates', icon: Icons.tpl },
      { id: 'shared', label: 'Shared with me', icon: Icons.share },
      { id: 'trash', label: 'Trash', icon: Icons.trash },
    ];
    return e('nav', { style: { width: 232, flex: '0 0 232px', height: '100vh', background: 'var(--surface-chrome)', borderRight: '1px solid var(--border-hairline)', display: 'flex', flexDirection: 'column', padding: '18px 12px 12px' } },
      e('div', { style: { display: 'flex', alignItems: 'center', gap: 9, padding: '4px 8px 18px' } }, e(QLogo, { size: 24 }), e('span', { style: { font: '600 18px/1 var(--font-sans)', letterSpacing: '-0.01em' } }, 'Quanta')),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
        items.map((it) => {
          const on = active === it.id;
          return e('button', { key: it.id, style: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer', background: on ? 'var(--accent-tint)' : 'transparent', color: on ? 'var(--accent)' : 'var(--text-primary)', font: (on ? '600' : '500') + ' 13px/1 var(--font-sans)', textAlign: 'left' },
            onMouseEnter: (ev) => { if (!on) ev.currentTarget.style.background = 'var(--surface-hover)'; }, onMouseLeave: (ev) => { if (!on) ev.currentTarget.style.background = 'transparent'; } },
            e('span', { style: { display: 'inline-flex', color: on ? 'var(--accent)' : 'var(--text-muted)' } }, it.icon(19)), it.label);
        })),
      e('div', { style: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-hairline)' } },
        e('button', { style: { display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', cursor: 'pointer', width: '100%', textAlign: 'left' } },
          e('span', { style: { width: 22, height: 22, borderRadius: 4, background: 'var(--ink)', color: 'var(--text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--font-sans)', flex: '0 0 auto' } }, 'A'),
          e('span', { style: { flex: 1, minWidth: 0 } },
            e('span', { style: { display: 'block', font: '600 12px/1.2 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Acme Safety Eng.'),
            e('span', { style: { display: 'block', font: '11px/1.2 var(--font-sans)', color: 'var(--text-muted)' } }, 'Team · 14 seats')),
          e('span', { style: { color: 'var(--text-muted)' } }, Icons.chevD(15))),
        e('div', { style: { display: 'flex', alignItems: 'center', gap: 9, padding: '4px 8px' } },
          e('span', { style: { width: 26, height: 26, borderRadius: '50%', background: 'var(--accent)', color: 'var(--text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--font-sans)', flex: '0 0 auto' } }, 'NB'),
          e('span', { style: { flex: 1, minWidth: 0, font: '12.5px/1.2 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, 'Nadia Brunel'),
          e('span', { style: { color: 'var(--text-muted)', display: 'inline-flex' } }, Icons.gear(17)))));
  }

  return { Icons, QLogo, Thumb, NavRail };
})();
