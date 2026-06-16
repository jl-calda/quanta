/* Quanta — Settings page */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge, Switch, Select, Input } = Q;
    const { Icons, QLogo, NavRail } = window.QGallery;
    const { useState, useEffect, useRef } = React;
    const e = React.createElement;

    const sic = (children, s = 18) => e('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, children);
    const PP = (...ds) => (s) => sic(ds.map((d, i) => e('path', { key: i, d })), s);
    const X = {
      account: (s) => sic([e('circle', { key: 1, cx: 12, cy: 8, r: 3.5 }), e('path', { key: 2, d: 'M5 20a7 7 0 0 1 14 0' })], s),
      appearance: PP('M12 3a9 9 0 1 0 9 9c0-.5-.5-1-1-1h-2.5A2.5 2.5 0 0 1 15 8.5V6a1 1 0 0 0-1-1z', 'M8.5 12.5h.01M12 8h.01M15.5 12.5h.01'),
      editor: PP('M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z', 'M8 8.5h7M8 12h7M8 15.5h4'),
      calc: (s) => sic([e('rect', { key: 1, x: 5, y: 3, width: 14, height: 18, rx: 1.6 }), e('path', { key: 2, d: 'M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4' })], s),
      units: (s) => sic([e('rect', { key: 1, x: 3, y: 8, width: 18, height: 8, rx: 1.4 }), e('path', { key: 2, d: 'M7.5 8v3.5M11.5 8v5M15.5 8v3.5' })], s),
      templates: (s) => sic([e('rect', { key: 1, x: 3, y: 4, width: 18, height: 16, rx: 1.5 }), e('path', { key: 2, d: 'M3 9h18M9 9v11' })], s),
      sharing: Icons.share,
      integrations: PP('M10 4 6 8l4 4', 'M14 12l4 4-4 4', 'M6 8h7a5 5 0 0 1 5 5v3'),
      workspace: PP('M3 21V7l7-4 7 4v14', 'M3 21h18M10 9h.01M14 12h.01M10 15h.01'),
      billing: (s) => sic([e('rect', { key: 1, x: 3, y: 5, width: 18, height: 14, rx: 1.6 }), e('path', { key: 2, d: 'M3 9.5h18M6.5 14.5h4' })], s),
      check: PP('M5 12l4.5 4.5L19 7'),
      info: (s) => sic([e('circle', { key: 1, cx: 12, cy: 12, r: 9 }), e('path', { key: 2, d: 'M12 11v5M12 8h.01' })], s),
      reset: PP('M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4.5V9H8'),
      external: PP('M14 4h6v6', 'M20 4 10 14', 'M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6'),
    };

    const SECTIONS = [
      { id: 'account', label: 'Account', icon: X.account },
      { id: 'appearance', label: 'Appearance', icon: X.appearance },
      { id: 'editor', label: 'Editor', icon: X.editor },
      { id: 'calculation', label: 'Calculation', icon: X.calc },
      { id: 'units', label: 'Units & formatting', icon: X.units },
      { id: 'templates', label: 'Templates & defaults', icon: X.templates },
      { id: 'sharing', label: 'Sharing & permissions', icon: X.sharing },
      { id: 'integrations', label: 'Integrations', icon: X.integrations },
      { id: 'workspace', label: 'Workspace', icon: X.workspace, admin: true },
      { id: 'billing', label: 'Billing', icon: X.billing },
    ];

    /* ---------------- toast ---------------- */
    function useToast() {
      const [toast, setToast] = useState(null);
      const timer = useRef(null);
      const show = (msg) => {
        setToast({ msg, leaving: false, id: Date.now() });
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast((t) => t ? { ...t, leaving: true } : null), 2200);
        setTimeout(() => setToast(null), 2600);
      };
      return [toast, show];
    }
    function Toast({ toast }) {
      if (!toast) return null;
      return e('div', { className: toast.leaving ? 'toast-out' : 'toast-in', style: { position: 'fixed', bottom: 26, left: 'calc(50% + 116px)', transform: 'translateX(-50%)', zIndex: 90, display: 'inline-flex', alignItems: 'center', gap: 9, padding: '10px 15px', background: 'var(--ink)', color: 'var(--text-inverse)', borderRadius: 8, boxShadow: 'var(--shadow-modal)', font: '13px/1 var(--font-sans)' } },
        e('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: 'var(--status-pass)', color: '#fff' } }, X.check(13)),
        toast.msg);
    }

    /* ---------------- form primitives ---------------- */
    function Section({ eyebrow, title, desc, children }) {
      return e('div', { style: { maxWidth: 720, margin: '0 auto' } },
        e('div', { style: { marginBottom: 4 } }, e('h1', { style: { margin: 0, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' } }, title)),
        desc && e('p', { style: { margin: '0 0 8px', font: '13.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', maxWidth: 560 } }, desc),
        children);
    }
    function Group({ title, children }) {
      return e('div', { style: { marginTop: 28 } },
        title && e('div', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid var(--border-hairline)' } }, title),
        e('div', null, children));
    }
    // a labelled row: label+help on the left, control on the right
    function Row({ label, help, children, control }) {
      return e('div', { style: { display: 'grid', gridTemplateColumns: '1fr 240px', gap: 24, alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-hairline)' } },
        e('div', { style: { minWidth: 0 } },
          e('div', { style: { font: '500 13.5px/1.3 var(--font-sans)', color: 'var(--text-primary)' } }, label),
          help && e('div', { style: { font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3, maxWidth: 400 } }, help)),
        e('div', { style: { display: 'flex', justifyContent: 'flex-end' } }, control || children));
    }

    function Radio({ options, value, set }) {
      return e('div', { style: { display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 32 } },
        options.map((o, i) => {
          const on = value === o.value;
          return e('button', { key: o.value, onClick: () => set(o.value), style: { padding: '0 14px', height: '100%', border: 'none', borderLeft: i ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer', background: on ? 'var(--accent-tint)' : 'var(--surface-raised)', color: on ? 'var(--accent)' : 'var(--text-muted)', font: (on ? '600' : '500') + ' 12.5px/1 var(--font-sans)' } }, o.label);
        }));
    }
    function Stepper({ value, set, min = 0, max = 12 }) {
      return e('div', { style: { display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 32 } },
        e('button', { onClick: () => set(Math.max(min, value - 1)), 'aria-label': 'Decrease', style: { width: 30, height: '100%', border: 'none', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 15 } }, '\u2212'),
        e('span', { style: { width: 38, textAlign: 'center', font: '13px var(--font-mono)' } }, value),
        e('button', { onClick: () => set(Math.min(max, value + 1)), 'aria-label': 'Increase', style: { width: 30, height: '100%', border: 'none', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 15 } }, '+'));
    }
    function MonoField({ value, set, suffix, width = 110 }) {
      return e('div', { style: { position: 'relative', width } },
        e('input', { value, onChange: (ev) => set(ev.target.value), style: { width: '100%', height: 32, padding: '0 ' + (suffix ? 34 : 10) + 'px 0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', font: '13px/1 var(--font-mono)', color: 'var(--text-primary)', outline: 'none' }, onFocus: (ev) => { ev.target.style.borderColor = 'var(--accent)'; ev.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)'; }, onBlur: (ev) => { ev.target.style.borderColor = 'var(--border-strong)'; ev.target.style.boxShadow = 'none'; } }),
        suffix && e('span', { style: { position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', font: '12px/1 var(--font-mono)', color: 'var(--text-muted)', pointerEvents: 'none' } }, suffix));
    }
    const selStyle = { width: 200 };

    /* ================= CALCULATION ================= */
    function CalculationSection({ s, set }) {
      return e(Section, { title: 'Calculation', desc: 'How worksheets evaluate by default. These apply to new worksheets; any worksheet can override them in its own settings.' },
        e(Group, { title: 'Recalculation' },
          e(Row, { label: 'Default calc mode', help: 'Auto recalculates dependents the moment a value changes. Manual waits for an explicit Recalculate.', control: e(Radio, { options: [{ value: 'auto', label: 'Auto' }, { value: 'manual', label: 'Manual' }], value: s.calcMode, set: (v) => set('calcMode', v) }) }),
          e(Row, { label: 'Recalculate on open', help: 'Re-evaluate the whole worksheet each time it is opened.', control: e(Switch, { checked: s.recalcOnOpen, onChange: (ev) => set('recalcOnOpen', ev.target.checked) }) }),
          e(Row, { label: 'Multithreaded evaluation', help: 'Use all available cores for large worksheets and matrix operations.', control: e(Switch, { checked: s.multithread, onChange: (ev) => set('multithread', ev.target.checked) }) })),
        e(Group, { title: 'Solving algorithms' },
          e(Row, { label: 'Nonlinear solve — find / root', help: 'Default method for solve blocks and root-finding.', control: e('div', { style: selStyle }, e(Select, { value: s.findAlgo, onChange: (ev) => set('findAlgo', ev.target.value), options: [{ value: 'lm', label: 'Levenberg–Marquardt' }, { value: 'conjgrad', label: 'Conjugate gradient' }, { value: 'quasinewton', label: 'Quasi-Newton (BFGS)' }] })) }),
          e(Row, { label: 'ODE solver — Odesolve', help: 'Integrator for ordinary differential equations.', control: e('div', { style: selStyle }, e(Select, { value: s.odeAlgo, onChange: (ev) => set('odeAlgo', ev.target.value), options: [{ value: 'rkf45', label: 'Runge–Kutta–Fehlberg (RKF45)' }, { value: 'rkfixed', label: 'Fixed-step Runge–Kutta' }, { value: 'radau', label: 'Radau (stiff)' }] })) }),
          e(Row, { label: 'Numerical integration', help: 'Quadrature rule for definite integrals.', control: e('div', { style: selStyle }, e(Select, { value: s.intAlgo, onChange: (ev) => set('intAlgo', ev.target.value), options: [{ value: 'adaptive', label: 'Adaptive (recommended)' }, { value: 'romberg', label: 'Romberg' }, { value: 'simpson', label: 'Simpson' }] })) })),
        e(Group, { title: 'Convergence' },
          e(Row, { label: 'Convergence tolerance (CTOL)', help: 'How closely constraints must be met before a solve is accepted.', control: e(MonoField, { value: s.ctol, set: (v) => set('ctol', v) }) }),
          e(Row, { label: 'Iteration tolerance (TOL)', help: 'Step-size tolerance for iterative methods.', control: e(MonoField, { value: s.tol, set: (v) => set('tol', v) }) }),
          e(Row, { label: 'Maximum iterations', help: 'Solvers stop and flag non-convergence after this many steps.', control: e(MonoField, { value: s.maxIter, set: (v) => set('maxIter', v), width: 90 }) })));
    }

    /* ================= UNITS & FORMATTING ================= */
    function formatResult(s) {
      // sample: 52800 N
      const baseN = 52800;
      // choose unit display
      let val = baseN, unit = 'N';
      if (s.unitSystem === 'si') { val = baseN / 1000; unit = 'kN'; }
      else if (s.unitSystem === 'uscs') { val = baseN / 4448.22; unit = 'kip'; }
      else if (s.unitSystem === 'cgs') { val = baseN * 100000; unit = 'dyn'; }
      else { val = baseN; unit = 'N'; }
      const dec = s.decimals;
      let text;
      if (s.notation === 'sci') {
        const exp = Math.floor(Math.log10(Math.abs(val)));
        const mant = val / Math.pow(10, exp);
        text = mant.toFixed(dec) + ' × 10' + supDigits(exp);
      } else if (s.notation === 'eng') {
        let exp = Math.floor(Math.log10(Math.abs(val)));
        exp = Math.floor(exp / 3) * 3;
        const mant = val / Math.pow(10, exp);
        text = mant.toFixed(dec) + (exp ? ' × 10' + supDigits(exp) : '');
      } else {
        text = val.toFixed(dec);
      }
      return { text, unit };
    }
    function supDigits(n) {
      const map = { '-': '\u207B', '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077', '8': '\u2078', '9': '\u2079' };
      return String(n).split('').map((c) => map[c] || c).join('');
    }
    function PreviewChip({ s }) {
      const r = formatResult(s);
      return e('div', { style: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 18px', border: '1px solid var(--border-hairline)', borderRadius: 8, background: 'var(--surface-raised)' } },
        e('div', { style: { flex: 1 } },
          e('div', { style: { font: '11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 } }, 'Live preview'),
          e('div', { style: { display: 'inline-flex', alignItems: 'baseline', gap: '0.4em', fontFamily: 'var(--font-math)', fontSize: 20, color: 'var(--text-math)' } },
            e('span', { style: { fontStyle: 'italic' } }, 'F'), e('span', { style: { fontSize: '0.7em', fontStyle: 'italic', alignSelf: 'flex-end', marginBottom: 2 } }, 'd'),
            e('span', { style: { margin: '0 0.1em' } }, '='),
            e('span', { style: { display: 'inline-flex', alignItems: 'baseline', gap: '0.22em', padding: '2px 10px', borderRadius: 4, background: 'var(--accent-tint)', color: 'var(--accent)', fontWeight: 600 } },
              e('span', null, formatResult(s).text), e('span', { style: { fontSize: '0.78em' } }, formatResult(s).unit)))),
        e('div', { style: { font: '11.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', textAlign: 'right', borderLeft: '1px solid var(--border-hairline)', paddingLeft: 16 } },
          e('div', null, 'Sample value'), e('div', { style: { fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' } }, '52 800 N')));
    }
    function UnitsSection({ s, set }) {
      return e(Section, { title: 'Units & formatting', desc: 'Default unit system and how results are displayed. The live preview shows a sample result under your current settings.' },
        e('div', { style: { marginTop: 22 } }, e(PreviewChip, { s })),
        e(Group, { title: 'Unit system' },
          e(Row, { label: 'Default unit system', help: e(React.Fragment, null, 'New worksheets start in this system. ', e('button', { className: 'q-link' }, 'Manage custom systems')), control: e(Radio, { options: [{ value: 'si', label: 'SI' }, { value: 'uscs', label: 'USCS' }, { value: 'cgs', label: 'CGS' }, { value: 'custom', label: 'Custom' }], value: s.unitSystem, set: (v) => set('unitSystem', v) }) })),
        e(Group, { title: 'Result format' },
          e(Row, { label: 'Decimal places', help: 'Digits shown after the decimal point.', control: e(Stepper, { value: s.decimals, set: (v) => set('decimals', v), min: 0, max: 8 }) }),
          e(Row, { label: 'Significant figures', help: 'Cap on total significant digits (Auto follows decimals).', control: e('div', { style: { width: 130 } }, e(Select, { value: s.sigFigs, onChange: (ev) => set('sigFigs', ev.target.value), options: [{ value: 'auto', label: 'Auto' }, { value: '3', label: '3' }, { value: '4', label: '4' }, { value: '5', label: '5' }, { value: '6', label: '6' }] })) }),
          e(Row, { label: 'Notation', help: 'How magnitudes are written.', control: e(Radio, { options: [{ value: 'auto', label: 'Auto' }, { value: 'sci', label: 'Scientific' }, { value: 'eng', label: 'Engineering' }], value: s.notation, set: (v) => set('notation', v) }) }),
          e(Row, { label: 'Radix', help: 'Number base for integer results.', control: e(Radio, { options: [{ value: 'dec', label: 'Dec' }, { value: 'bin', label: 'Bin' }, { value: 'oct', label: 'Oct' }, { value: 'hex', label: 'Hex' }], value: s.radix, set: (v) => set('radix', v) }) })),
        e(Group, { title: 'Thresholds' },
          e(Row, { label: 'Use exponential above', help: 'Results larger than this switch to scientific notation.', control: e(MonoField, { value: s.expHigh, set: (v) => set('expHigh', v), width: 120 }) }),
          e(Row, { label: 'Use exponential below', help: 'Small magnitudes switch to scientific notation.', control: e(MonoField, { value: s.expLow, set: (v) => set('expLow', v), width: 120 }) }),
          e(Row, { label: 'Show complex results as', help: 'Display form for complex numbers.', control: e('div', { style: { width: 150 } }, e(Select, { value: s.complex, onChange: (ev) => set('complex', ev.target.value), options: [{ value: 'rect', label: 'a + b i' }, { value: 'polar', label: 'Polar (r∠θ)' }] })) }),
          e(Row, { label: 'Round near-zero to zero', help: 'Snap values within tolerance of zero to exactly 0.', control: e(Switch, { checked: s.zeroSnap, onChange: (ev) => set('zeroSnap', ev.target.checked) }) })));
    }

    /* ================= generic placeholder section ================= */
    function PlaceholderSection({ section }) {
      return e(Section, { title: section.label, desc: 'This section is part of the full settings surface.' },
        e('div', { style: { marginTop: 24, padding: '48px 24px', border: '1px dashed var(--border-strong)', borderRadius: 8, textAlign: 'center', color: 'var(--text-muted)' } },
          e('div', { style: { display: 'inline-flex', color: 'var(--text-muted)', marginBottom: 12 } }, section.icon(26)),
          e('div', { style: { font: '13.5px/1.5 var(--font-sans)' } }, section.label + ' settings live here.'),
          e('div', { style: { font: '12.5px/1.5 var(--font-sans)', marginTop: 4 } }, 'Open the Calculation or Units & formatting sections to see fully-built forms.')));
    }

    /* ================= app ================= */
    function App() {
      const [active, setActive] = useState('calculation');
      const [toast, showToast] = useToast();
      const [dirty, setDirty] = useState(false);

      const [calc, setCalc] = useState({ calcMode: 'auto', recalcOnOpen: true, multithread: true, findAlgo: 'lm', odeAlgo: 'rkf45', intAlgo: 'adaptive', ctol: '1.0 × 10⁻³', tol: '1.0 × 10⁻³', maxIter: '100' });
      const [units, setUnits] = useState({ unitSystem: 'si', decimals: 2, sigFigs: 'auto', notation: 'auto', radix: 'dec', expHigh: '1.0 × 10⁶', expLow: '1.0 × 10⁻⁴', complex: 'rect', zeroSnap: true });

      // save-on-change for toggles/radios/selects (instant settings)
      const setCalcV = (k, v) => { setCalc((c) => ({ ...c, [k]: v })); if (k === 'ctol' || k === 'tol' || k === 'maxIter') setDirty(true); else showToast('Saved'); };
      const setUnitsV = (k, v) => { setUnits((u) => ({ ...u, [k]: v })); if (k === 'expHigh' || k === 'expLow') setDirty(true); else showToast('Saved'); };

      const sectionContent = () => {
        if (active === 'calculation') return e(CalculationSection, { s: calc, set: setCalcV });
        if (active === 'units') return e(UnitsSection, { s: units, set: setUnitsV });
        return e(PlaceholderSection, { section: SECTIONS.find((x) => x.id === active) });
      };

      return e('div', { style: { display: 'flex', height: '100vh' }, 'data-screen-label': 'Settings' },
        e(NavRail, { active: 'settings' }),
        // settings nav
        e('aside', { style: { width: 244, flex: '0 0 244px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 } },
          e('div', { style: { padding: '20px 18px 14px' } }, e('div', { style: { font: '600 16px/1.2 var(--font-sans)', color: 'var(--text-primary)' } }, 'Settings'), e('div', { style: { font: '12.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 } }, 'Nadia Brunel · Acme Safety')),
          e('div', { className: 'scroll-y', style: { flex: 1, padding: '4px 8px 12px', minHeight: 0 } },
            SECTIONS.map((sec) => {
              const on = active === sec.id;
              return e('button', { key: sec.id, onClick: () => { setActive(sec.id); setDirty(false); }, style: { display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '8px 10px', border: 'none', background: on ? 'var(--accent-tint)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', marginBottom: 1 }, onMouseEnter: (ev) => { if (!on) ev.currentTarget.style.background = 'var(--surface-hover)'; }, onMouseLeave: (ev) => { if (!on) ev.currentTarget.style.background = 'transparent'; } },
                e('span', { style: { display: 'inline-flex', color: on ? 'var(--accent)' : 'var(--text-muted)' } }, sec.icon(18)),
                e('span', { style: { flex: 1, font: (on ? '600 ' : '500 ') + '13px/1.2 var(--font-sans)', color: on ? 'var(--accent)' : 'var(--text-primary)' } }, sec.label),
                sec.admin && e('span', { style: { font: '9.5px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', border: '1px solid var(--border-hairline)', borderRadius: 3, padding: '2px 4px' } }, 'Admin'));
            })),
          e('div', { style: { borderTop: '1px solid var(--border-hairline)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, font: '12px/1.4 var(--font-sans)', color: 'var(--text-muted)' } }, e('span', { style: { display: 'inline-flex' } }, X.info(15)), 'Synced across your devices')),
        // content
        e('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', position: 'relative' } },
          e('div', { className: 'scroll-y', style: { flex: 1, minHeight: 0, padding: '36px 40px ' + (dirty ? 100 : 56) + 'px', background: 'var(--surface-paper)' } }, sectionContent()),
          // sticky save bar (only when fields needing explicit save are dirty)
          dirty && e('div', { className: 'bar-rise', style: { position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 40px', borderTop: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', boxShadow: '0 -2px 8px color-mix(in srgb, var(--ink) 6%, transparent)' } },
            e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, font: '13px/1.4 var(--font-sans)', color: 'var(--text-primary)' } }, e('span', { style: { width: 7, height: 7, borderRadius: '50%', background: 'var(--status-warning)' } }), 'You have unsaved changes to tolerances.'),
            e('div', { style: { marginLeft: 'auto', display: 'flex', gap: 10 } },
              e(Button, { variant: 'ghost', onClick: () => setDirty(false) }, 'Discard'),
              e(Button, { variant: 'primary', onClick: () => { setDirty(false); showToast('Changes saved'); } }, 'Save changes')))),
        e(Toast, { toast }));
    }

    ReactDOM.createRoot(document.getElementById('root')).render(e(App));
  };
  boot();
}
