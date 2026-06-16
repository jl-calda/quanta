/* Quanta templates — main app (top bar · filters · grid · preview drawer) */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge } = Q;
    const { Icons, QLogo, Thumb, NavRail } = window.QGallery;
    const { useState } = React;

    /* ---------------- data ---------------- */
    const TEMPLATES = [
      { id: 't1', title: 'EN 1993 bolt group — eccentric shear', one: 'Elastic vector method for a bolted connection under in-plane moment.', disc: 'Structural', std: 'Eurocode', type: 'Connection', author: 'Quanta', verified: true, uses: 4820, variant: 0, featured: true },
      { id: 't2', title: 'Simply-supported beam — UDL deflection', one: 'Mid-span deflection and moment for a beam under uniform load.', disc: 'Structural', std: 'AS/NZS', type: 'Member check', author: 'Quanta', verified: true, uses: 9120, variant: 1, featured: true },
      { id: 't3', title: 'Guardrail post — point load check', one: 'Bending and base-plate check for a barrier post under a 1.5 kN load.', disc: 'Structural', std: 'AS/NZS', type: 'Loading', author: 'M. Okafor', verified: false, uses: 612, variant: 2 },
      { id: 't4', title: 'Concrete anchor — pull-out (CCD)', one: 'Concrete cone breakout capacity for a single cast-in anchor.', disc: 'Civil', std: 'AISC', type: 'Connection', author: 'Quanta', verified: true, uses: 3140, variant: 3, featured: true },
      { id: 't5', title: 'AISC fillet weld group capacity', one: 'Throat stress for a fillet weld group under combined load.', disc: 'Structural', std: 'AISC', type: 'Connection', author: 'Quanta', verified: true, uses: 2705, variant: 4 },
      { id: 't6', title: 'Engineering unit conversions', one: 'Common USCS ↔ SI conversions for pressure, force, and load.', disc: 'Mechanical', std: 'BS', type: 'Conversion', author: 'R. Vasquez', verified: false, uses: 1488, variant: 5 },
      { id: 't7', title: 'EN 1993 column — flexural buckling', one: 'Buckling resistance via the χ reduction factor and slenderness.', disc: 'Structural', std: 'Eurocode', type: 'Member check', author: 'Quanta', verified: true, uses: 5360, variant: 6 },
      { id: 't8', title: 'Retaining wall — sliding stability', one: 'Active pressure and factor of safety against sliding (EC7).', disc: 'Geotech', std: 'Eurocode', type: 'Loading', author: 'Quanta', verified: true, uses: 1972, variant: 7 },
      { id: 't9', title: 'Mechanical shaft — torsion check', one: 'Shear stress and angle of twist for a solid circular shaft.', disc: 'Mechanical', std: 'BS', type: 'Member check', author: 'L. Haas', verified: false, uses: 388, variant: 4 },
    ];
    const SAVED_IDS = ['t1', 't4', 't7'];

    const FILTERS = {
      Discipline: ['Structural', 'Civil', 'Mechanical', 'Geotech'],
      Standard: ['Eurocode', 'AISC', 'AS/NZS', 'BS'],
      Type: ['Member check', 'Connection', 'Loading', 'Conversion'],
    };

    const fmtUses = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace('.0', '') + 'k' : '' + n;

    /* ---------------- byline ---------------- */
    function Byline({ t, size = 'sm' }) {
      const av = size === 'lg';
      if (t.verified) {
        return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, font: (av ? '12.5px' : '11.5px') + '/1 var(--font-sans)', color: 'var(--text-muted)' } },
          React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: av ? 22 : 18, height: av ? 22 : 18, borderRadius: 4, background: 'var(--ink)' } },
            React.createElement(QLogo, { size: av ? 14 : 12 })),
          React.createElement('span', { style: { color: 'var(--text-primary)', fontWeight: 500 } }, 'Quanta'),
          React.createElement('span', { style: { display: 'inline-flex', color: 'var(--status-pass)' } }, Icons.verified(av ? 15 : 13)),
          React.createElement('span', null, 'verified'));
      }
      const initials = t.author.replace(/[^A-Za-z. ]/g, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
      return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, font: (av ? '12.5px' : '11.5px') + '/1 var(--font-sans)', color: 'var(--text-muted)' } },
        React.createElement('span', { style: { width: av ? 22 : 18, height: av ? 22 : 18, borderRadius: '50%', background: 'var(--surface-selected)', color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 ' + (av ? 10 : 8.5) + 'px/1 var(--font-sans)' } }, initials),
        React.createElement('span', { style: { color: 'var(--text-primary)' } }, t.author),
        React.createElement('span', null, '· community'));
    }

    const Chip = ({ children, tone }) => React.createElement('span', {
      style: { display: 'inline-flex', alignItems: 'center', font: '10.5px/1 var(--font-sans)', letterSpacing: '0.01em', padding: '3px 7px', borderRadius: 4,
        border: '1px solid var(--border-hairline)', background: tone === 'accent' ? 'var(--accent-tint)' : 'var(--surface-chrome)',
        color: tone === 'accent' ? 'var(--accent)' : 'var(--text-muted)' }
    }, children);

    /* ---------------- template card ---------------- */
    function Card({ t, onPreview }) {
      return React.createElement('div', { className: 'tpl-card', style: { border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)', overflow: 'hidden', display: 'flex', flexDirection: 'column' } },
        // thumbnail
        React.createElement('div', { style: { position: 'relative', height: 168, borderBottom: '1px solid var(--border-hairline)' } },
          React.createElement(Thumb, { variant: t.variant }),
          React.createElement('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 55%, var(--surface-raised))' } }),
          t.featured && React.createElement('span', { style: { position: 'absolute', top: 10, left: 10, display: 'inline-flex', alignItems: 'center', gap: 4, font: '10px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--status-warning)', background: 'var(--status-warning-bg)', borderRadius: 4, padding: '3px 6px' } }, Icons.flame(12), 'Featured'),
          // hover actions
          React.createElement('div', { className: 'hover-actions', style: { position: 'absolute', left: 12, right: 12, bottom: 12, display: 'flex', gap: 8, zIndex: 2 } },
            React.createElement(Button, { variant: 'primary', size: 'sm', style: { flex: 1, height: 32 }, iconLeft: Icons.plus(15) }, 'Use template'),
            React.createElement(Button, { variant: 'secondary', size: 'sm', style: { height: 32 }, iconLeft: Icons.eye(15), onClick: () => onPreview(t) }, 'Preview'))),
        // body
        React.createElement('div', { style: { padding: '13px 15px 14px', display: 'flex', flexDirection: 'column', flex: 1 } },
          React.createElement('h3', { style: { margin: 0, font: '600 14px/1.32 var(--font-sans)', color: 'var(--text-primary)' } }, t.title),
          React.createElement('p', { style: { margin: '6px 0 0', font: '12px/1.45 var(--font-sans)', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, t.one),
          React.createElement('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 11 } }, React.createElement(Chip, { tone: 'accent' }, t.disc), React.createElement(Chip, null, t.std), React.createElement(Chip, null, t.type)),
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 13, paddingTop: 12, borderTop: '1px solid var(--border-hairline)' } },
            React.createElement(Byline, { t }),
            React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, font: '11.5px/1 var(--font-mono)', color: 'var(--text-muted)' } }, Icons.users(13), fmtUses(t.uses)))));
    }

    /* ---------------- filter chip row ---------------- */
    function FilterChip({ label, active, onClick }) {
      return React.createElement('button', { onClick, style: { height: 28, padding: '0 11px', borderRadius: 99, cursor: 'pointer', border: '1px solid ' + (active ? 'var(--accent)' : 'var(--border-strong)'), background: active ? 'var(--accent-tint)' : 'var(--surface-raised)', color: active ? 'var(--accent)' : 'var(--text-primary)', font: (active ? '600' : '500') + ' 12px/1 var(--font-sans)', whiteSpace: 'nowrap' } }, label);
    }

    /* ---------------- preview drawer ---------------- */
    function PreviewDrawer({ t, onClose }) {
      if (!t) return null;
      const otherVariant = (t.variant + 1) % 8;
      return React.createElement(React.Fragment, null,
        React.createElement('div', { className: 'overlay', onClick: onClose, style: { position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--ink) 42%, transparent)', zIndex: 80 } }),
        React.createElement('aside', { className: 'drawer', style: { position: 'fixed', top: 0, right: 0, bottom: 0, width: 540, maxWidth: '92vw', background: 'var(--surface-chrome)', borderLeft: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-modal)', zIndex: 81, display: 'flex', flexDirection: 'column' } },
          // header
          React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 18px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-raised)' } },
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 } }, 'Template preview'),
              React.createElement('h2', { style: { margin: 0, font: '600 17px/1.3 var(--font-sans)', color: 'var(--text-primary)' } }, t.title),
              React.createElement('p', { style: { margin: '7px 0 0', font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' } }, t.one)),
            React.createElement(IconButton, { label: 'Close preview', onClick: onClose }, Icons.close(18))),
          // metadata strip
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '12px 18px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-raised)' } },
            React.createElement(Byline, { t, size: 'lg' }),
            React.createElement('span', { style: { width: 1, height: 16, background: 'var(--border-hairline)' } }),
            React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 5, font: '12px/1 var(--font-sans)', color: 'var(--text-muted)' } }, Icons.users(14), fmtUses(t.uses) + ' uses'),
            React.createElement('div', { style: { display: 'flex', gap: 6, marginLeft: 'auto' } }, React.createElement(Chip, { tone: 'accent' }, t.disc), React.createElement(Chip, null, t.std), React.createElement(Chip, null, t.type))),
          // scrollable read-only pages
          React.createElement('div', { className: 'scroll-y', style: { flex: 1, minHeight: 0, padding: '20px 0', background: '#E7EAEF' } },
            [t.variant, otherVariant].map((v, i) => React.createElement('div', { key: i, style: { width: 392, margin: '0 auto 18px', background: 'var(--surface-paper)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-sm)' } },
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 18px', borderBottom: '1px solid var(--border-hairline)', font: '8px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' } }, React.createElement('span', null, 'Acme Safety Engineering'), React.createElement('span', null, 'Template')),
              React.createElement('div', { style: { minHeight: 300 } }, React.createElement(Thumb, { variant: v, scale: 1.7 })),
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', padding: '6px 18px', borderTop: '1px solid var(--border-hairline)', font: '8px/1 var(--font-sans)', color: 'var(--text-muted)' } }, React.createElement('span', null, 'Quanta'), React.createElement('span', null, 'Page ' + (i + 1) + ' of 2'))))),
          // sticky footer
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', borderTop: '1px solid var(--border-hairline)', background: 'var(--surface-raised)' } },
            React.createElement(IconButton, { label: 'Save template' }, Icons.bookmark(18)),
            React.createElement(IconButton, { label: 'Copy link' }, Icons.link(18)),
            React.createElement('div', { style: { flex: 1 } }),
            React.createElement(Button, { variant: 'secondary', iconLeft: Icons.download(16) }, 'Duplicate'),
            React.createElement(Button, { variant: 'primary', iconLeft: Icons.plus(16) }, 'Use template'))));
    }

    /* ---------------- main ---------------- */
    function App() {
      const [tab, setTab] = useState('all');
      const [active, setActive] = useState({ Discipline: null, Standard: null, Type: null });
      const [query, setQuery] = useState('');
      const [preview, setPreview] = useState(null);

      const toggle = (group, val) => setActive((a) => ({ ...a, [group]: a[group] === val ? null : val }));
      const anyFilter = active.Discipline || active.Standard || active.Type;

      let list = tab === 'saved' ? TEMPLATES.filter((t) => SAVED_IDS.includes(t.id)) : TEMPLATES;
      list = list.filter((t) => (!active.Discipline || t.disc === active.Discipline) && (!active.Standard || t.std === active.Standard) && (!active.Type || t.type === active.Type) && (!query || (t.title + t.one).toLowerCase().includes(query.toLowerCase())));

      const Tab = ({ id, label, count }) => React.createElement('button', { onClick: () => setTab(id), className: 'tpl-tab', style: { position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 2px', height: 38, border: 'none', background: 'none', cursor: 'pointer', color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)', font: (tab === id ? '600' : '500') + ' 13.5px/1 var(--font-sans)' } },
        label,
        React.createElement('span', { style: { font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', background: 'var(--surface-chrome)', border: '1px solid var(--border-hairline)', borderRadius: 99, padding: '2px 6px' } }, count),
        tab === id && React.createElement('span', { style: { position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: 'var(--accent)' } }));

      return React.createElement('div', { style: { display: 'flex', height: '100vh' }, 'data-screen-label': 'Template gallery' },
        React.createElement(NavRail, { active: 'templates' }),
        React.createElement('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh' } },
          // top bar
          React.createElement('header', { style: { flex: '0 0 auto', padding: '20px 32px 0', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-paper)' } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 } },
              React.createElement('div', { style: { flex: '0 0 auto' } },
                React.createElement('h1', { style: { margin: 0, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' } }, 'Templates'),
                React.createElement('div', { style: { font: '12.5px/1.3 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 } }, 'Verified, ready-to-run calculations — start in one click.')),
              React.createElement('div', { style: { flex: 1, display: 'flex', justifyContent: 'flex-end' } },
                React.createElement('div', { style: { position: 'relative', width: 320 } },
                  React.createElement('span', { style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' } }, Icons.search(16)),
                  React.createElement('input', { value: query, onChange: (ev) => setQuery(ev.target.value), placeholder: 'Search templates…', style: { width: '100%', height: 38, padding: '0 12px 0 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', font: '13.5px/1 var(--font-sans)', color: 'var(--text-primary)', outline: 'none' },
                    onFocus: (ev) => { ev.target.style.borderColor = 'var(--accent)'; ev.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)'; }, onBlur: (ev) => { ev.target.style.borderColor = 'var(--border-strong)'; ev.target.style.boxShadow = 'none'; } })))),
            // category tabs
            React.createElement('div', { style: { display: 'flex', gap: 22, marginBottom: -1 } },
              React.createElement(Tab, { id: 'all', label: 'All templates', count: TEMPLATES.length }),
              React.createElement(Tab, { id: 'saved', label: 'Your templates', count: SAVED_IDS.length }))),

          // filter bar
          React.createElement('div', { style: { flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', padding: '12px 32px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-paper)' } },
            Object.entries(FILTERS).map(([group, vals]) => React.createElement('div', { key: group, style: { display: 'flex', alignItems: 'center', gap: 8 } },
              React.createElement('span', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' } }, group),
              vals.map((v) => React.createElement(FilterChip, { key: v, label: v, active: active[group] === v, onClick: () => toggle(group, v) })))),
            anyFilter && React.createElement('button', { onClick: () => setActive({ Discipline: null, Standard: null, Type: null }), style: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', color: 'var(--accent)', font: '500 12px/1 var(--font-sans)', cursor: 'pointer' } }, 'Clear filters')),

          // grid
          React.createElement('div', { className: 'scroll-y', style: { flex: 1, minHeight: 0, background: 'var(--surface-paper)' } },
            React.createElement('div', { style: { maxWidth: 1280, margin: '0 auto', padding: '22px 32px 48px' } },
              React.createElement('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 } },
                React.createElement('span', { style: { font: '13px/1 var(--font-sans)', color: 'var(--text-muted)' } }, list.length + (list.length === 1 ? ' template' : ' templates') + (tab === 'saved' ? ' saved' : '')),
                React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)' } }, 'Sort: ', React.createElement('span', { style: { color: 'var(--text-primary)', fontWeight: 500 } }, 'Most used'), Icons.chevD(14))),
              list.length === 0
                ? React.createElement('div', { style: { textAlign: 'center', padding: '70px 0', color: 'var(--text-muted)' } },
                    React.createElement('div', { style: { font: '600 15px/1.3 var(--font-sans)', color: 'var(--text-primary)', marginBottom: 6 } }, tab === 'saved' ? 'No saved templates yet' : 'No templates match those filters'),
                    React.createElement('div', { style: { font: '13px/1.5 var(--font-sans)' } }, tab === 'saved' ? 'Save a template from any card to find it here.' : 'Try clearing a filter to widen the search.'))
                : React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(286px, 1fr))', gap: 18 } },
                    list.map((t) => React.createElement(Card, { key: t.id, t, onPreview: setPreview }))))),
        ),
        React.createElement(PreviewDrawer, { t: preview, onClose: () => setPreview(null) }));
    }

    ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));
  };
  boot();
}
