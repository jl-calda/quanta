/* Quanta — file browser / Worksheets page */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge, Checkbox } = Q;
    const { Icons, QLogo, Thumb, NavRail } = window.QGallery;
    const { useState, useRef, useEffect } = React;
    const e = React.createElement;

    /* ---- extra icons not in QGallery ---- */
    const sic = (children, s = 18) => e('svg', { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' }, children);
    const PP = (...ds) => (s) => sic(ds.map((d, i) => e('path', { key: i, d })), s);
    const X = {
      folder: PP('M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v8A1.5 1.5 0 0 1 17.5 19.5h-13A1.5 1.5 0 0 1 3 18z'),
      folderOpen: PP('M3.5 18.5 6 11a1.4 1.4 0 0 1 1.3-1h12.2a.9.9 0 0 1 .85 1.2l-2 6.5a1.4 1.4 0 0 1-1.34 1H4.5A1 1 0 0 1 3.5 18.5z', 'M3.2 17V7.5A1.5 1.5 0 0 1 4.7 6h3.6l2 2.5h6.7A1.5 1.5 0 0 1 18.5 10v1.5'),
      chevR: PP('m9.5 7 5 5-5 5'),
      list: PP('M8 6h12M8 12h12M8 18h12', 'M4 6h.01M4 12h.01M4 18h.01'),
      grid: (s) => sic([e('rect', { key: 1, x: 4, y: 4, width: 7, height: 7, rx: 1 }), e('rect', { key: 2, x: 13, y: 4, width: 7, height: 7, rx: 1 }), e('rect', { key: 3, x: 4, y: 13, width: 7, height: 7, rx: 1 }), e('rect', { key: 4, x: 13, y: 13, width: 7, height: 7, rx: 1 })], s),
      filter: PP('M4 5h16l-6 7v6l-4 2v-8z'),
      plus: PP('M12 6v12M6 12h12'),
      chevD: PP('m6 9 6 6 6-6'),
      open: PP('M14 4h6v6', 'M20 4 10 14', 'M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6'),
      rename: PP('M4 20h16', 'M14.5 5.5l3 3', 'M6 17l1-4 9.5-9.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L10 16z'),
      move: PP('M5 9 2 12l3 3', 'M9 5l3-3 3 3', 'M15 19l-3 3-3-3', 'M19 9l3 3-3 3', 'M2 12h20M12 2v20'),
      duplicate: (s) => sic([e('rect', { key: 1, x: 9, y: 9, width: 11, height: 11, rx: 1.6 }), e('path', { key: 2, d: 'M5 15V6a1.2 1.2 0 0 1 1.2-1.2H15' })], s),
      share: Icons.share,
      history: PP('M3.5 12a8.5 8.5 0 1 0 2.6-6.1', 'M3.5 4.5V9H8', 'M12 8v4.5l3 1.8'),
      export: PP('M12 3v11m0-11 4 4m-4-4-4 4', 'M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15'),
      trash: PP('M4 7h16M9.5 7V5h5v2M6 7l1 13h10l1-13', 'M10 11v5M14 11v5'),
      tag: PP('M4 4h7l9 9-7 7-9-9z', 'M8 8h.01'),
      kebab: Icons.kebab,
      search: Icons.search,
      close: PP('M6 6l12 12M18 6 6 18'),
      check: PP('M5 12l4.5 4.5L19 7'),
      users: Icons.users,
      sortArrow: PP('M12 5v14', 'M7 10l5-5 5 5'),
    };

    /* ---------------- data ---------------- */
    const TREE = [
      { id: 'p1', name: 'Zoo lifeline retrofit', count: 12, open: true, active: true, children: [
        { id: 'f1', name: 'Anchors', count: 5 },
        { id: 'f2', name: 'Spans', count: 4 },
        { id: 'f3', name: 'Calc check log', count: 3 },
      ] },
      { id: 'p2', name: 'Edge Protection', count: 8, open: false, children: [] },
      { id: 'p3', name: 'Plant 7 Retrofit', count: 21, open: false, children: [] },
      { id: 'p4', name: 'Shared library', count: 34, open: false, children: [] },
    ];

    const ownerColor = (n) => n === 'You' ? 'var(--accent)' : /^M/.test(n) ? '#1E8E5A' : /^R/.test(n) ? '#7A5BBF' : '#B5722B';
    const initials = (n) => n === 'You' ? 'NB' : n.replace(/[^A-Za-z. ]/g, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

    const ROWS = [
      { id: 'r1', kind: 'folder', name: 'Calc check log', tags: ['QA'], owner: 'You', status: null, size: '3 items', modified: 'Today, 14:22', variant: 0 },
      { id: 'r2', kind: 'sheet', name: 'Column anchors — grid A', tags: ['ULS', 'rev B'], owner: 'You', status: 'pass', size: '128 KB', modified: 'Today, 11:05', variant: 3 },
      { id: 'r3', kind: 'sheet', name: 'Column anchors — grid B', tags: ['ULS'], owner: 'M. Okafor', status: 'warning', size: '116 KB', modified: 'Yesterday', variant: 3 },
      { id: 'r4', kind: 'sheet', name: 'Lifeline span — bay 3', tags: ['SLS', 'deflection'], owner: 'You', status: 'pass', size: '204 KB', modified: 'Yesterday', variant: 1 },
      { id: 'r5', kind: 'sheet', name: 'Lifeline span — bay 4', tags: ['SLS'], owner: 'R. Vasquez', status: 'error', size: '198 KB', modified: '2 days ago', variant: 1 },
      { id: 'r6', kind: 'sheet', name: 'Guardrail point-load', tags: ['barriers'], owner: 'You', status: 'pass', size: '92 KB', modified: '12 Jun', variant: 2 },
      { id: 'r7', kind: 'folder', name: 'Superseded — rev A', tags: [], owner: 'You', status: null, size: '6 items', modified: '8 Jun', variant: 0 },
      { id: 'r8', kind: 'sheet', name: 'Mast base plate — wind', tags: ['wind', 'rev C'], owner: 'B. Adler', status: 'pass', size: '156 KB', modified: '5 Jun', variant: 6 },
    ];

    /* ---------------- shared bits ---------------- */
    const Avatar = ({ name, sz = 22 }) => e('span', { title: name, style: { width: sz, height: sz, borderRadius: '50%', background: ownerColor(name), color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 ' + (sz * 0.4) + 'px/1 var(--font-sans)', flex: '0 0 auto' } }, initials(name));

    const StatusChip = ({ status }) => {
      if (status === 'pass') return e(Badge, { tone: 'pass', dot: true }, 'Current');
      if (status === 'warning') return e(Badge, { tone: 'warning', dot: true }, 'Recalculate');
      if (status === 'error') return e(Badge, { tone: 'error', dot: true }, 'Errors');
      return e('span', { style: { color: 'var(--text-muted)', font: '12px var(--font-sans)' } }, '—');
    };
    const TagChip = ({ children }) => e('span', { style: { font: '10.5px/1 var(--font-sans)', color: 'var(--text-muted)', background: 'var(--surface-chrome)', border: '1px solid var(--border-hairline)', borderRadius: 4, padding: '3px 6px', whiteSpace: 'nowrap' } }, children);

    const TypeIcon = ({ row, sz = 18 }) => row.kind === 'folder'
      ? e('span', { style: { color: 'var(--accent)', display: 'inline-flex' } }, X.folder(sz))
      : e('span', { style: { color: 'var(--text-muted)', display: 'inline-flex' } }, Icons.sheet(sz));

    /* ---------------- kebab menu ---------------- */
    const MENU = [
      [['Open', X.open], ['Rename', X.rename], ['Move to…', X.move], ['Duplicate', X.duplicate]],
      [['Share', X.share], ['Version history', X.history], ['Export', X.export]],
      [['Move to trash', X.trash, true]],
    ];
    function KebabMenu({ onClose, anchorRight = false }) {
      const ref = useRef(null);
      useEffect(() => {
        const h = (ev) => { if (ref.current && !ref.current.contains(ev.target)) onClose(); };
        document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
      }, []);
      return e('div', { ref, className: 'pop-in', style: { position: 'absolute', top: 'calc(100% + 4px)', right: anchorRight ? 0 : 'auto', left: anchorRight ? 'auto' : 0, width: 196, zIndex: 50, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-popover)', padding: 5 } },
        MENU.map((group, gi) => e('div', { key: gi, style: { borderTop: gi ? '1px solid var(--border-hairline)' : 'none', marginTop: gi ? 4 : 0, paddingTop: gi ? 4 : 0 } },
          group.map(([label, icon, danger]) => e('button', { key: label, onClick: (ev) => { ev.stopPropagation(); onClose(); }, style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '7px 9px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', color: danger ? 'var(--status-error)' : 'var(--text-primary)', font: '12.5px/1 var(--font-sans)' },
            onMouseEnter: (ev) => ev.currentTarget.style.background = danger ? 'var(--status-error-bg)' : 'var(--surface-hover)', onMouseLeave: (ev) => ev.currentTarget.style.background = 'transparent' },
            e('span', { style: { display: 'inline-flex', color: danger ? 'var(--status-error)' : 'var(--text-muted)' } }, icon(16)), label)))));
    }

    /* ---------------- New split-button ---------------- */
    function NewButton() {
      const [open, setOpen] = useState(false);
      const ref = useRef(null);
      useEffect(() => { const h = (ev) => { if (ref.current && !ref.current.contains(ev.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
      const items = [['Worksheet', Icons.sheet], ['Folder', X.folder], ['From template', Icons.tpl]];
      return e('div', { ref, style: { position: 'relative', flex: '0 0 auto' } },
        e('div', { style: { display: 'inline-flex', height: 36, borderRadius: 'var(--radius-sm)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' } },
          e('button', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 13px', background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', font: '500 13px/1 var(--font-sans)', cursor: 'pointer' }, onMouseEnter: (ev) => ev.currentTarget.style.background = 'var(--accent-press)', onMouseLeave: (ev) => ev.currentTarget.style.background = 'var(--accent)' }, X.plus(16), 'New'),
          e('button', { 'aria-label': 'More new options', onClick: () => setOpen((o) => !o), style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, background: 'var(--accent)', color: 'var(--text-inverse)', border: 'none', borderLeft: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer' }, onMouseEnter: (ev) => ev.currentTarget.style.background = 'var(--accent-press)', onMouseLeave: (ev) => ev.currentTarget.style.background = 'var(--accent)' }, e('span', { style: { transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--dur-fast)' } }, X.chevD(15)))),
        open && e('div', { className: 'pop-in', style: { position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 188, zIndex: 50, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-popover)', padding: 5 } },
          items.map(([label, icon]) => e('button', { key: label, onClick: () => setOpen(false), style: { display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 9px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', color: 'var(--text-primary)', font: '13px/1 var(--font-sans)' }, onMouseEnter: (ev) => ev.currentTarget.style.background = 'var(--surface-hover)', onMouseLeave: (ev) => ev.currentTarget.style.background = 'transparent' },
            e('span', { style: { display: 'inline-flex', color: 'var(--text-muted)' } }, icon(16)), label))));
    }

    /* ---------------- filter pill ---------------- */
    function FilterPill({ label, value }) {
      return e('button', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', cursor: 'pointer', font: '12.5px/1 var(--font-sans)', color: value ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }, onMouseEnter: (ev) => ev.currentTarget.style.borderColor = 'var(--accent)', onMouseLeave: (ev) => ev.currentTarget.style.borderColor = 'var(--border-strong)' },
        e('span', { style: { color: 'var(--text-muted)' } }, label, value ? ':' : ''), value && e('span', { style: { fontWeight: 500 } }, value), X.chevD(13));
    }

    /* ---------------- tree pane ---------------- */
    function TreePane({ open, setOpen }) {
      const [tree, setTree] = useState(TREE);
      if (!open) {
        return e('div', { style: { width: 34, flex: '0 0 34px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', justifyContent: 'center', paddingTop: 10 } },
          e(IconButton, { label: 'Show tree', onClick: () => setOpen(true) }, X.chevR(17)));
      }
      const toggle = (id) => setTree((t) => t.map((p) => p.id === id ? { ...p, open: !p.open } : p));
      return e('aside', { style: { width: 256, flex: '0 0 256px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 } },
        e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px 8px' } },
          e('span', { style: { font: '600 11px/1 var(--font-sans)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' } }, 'Projects'),
          e(IconButton, { label: 'Collapse', size: 'sm', onClick: () => setOpen(false) }, e('span', { style: { transform: 'scaleX(-1)', display: 'inline-flex' } }, X.chevR(15)))),
        e('div', { className: 'scroll-y', style: { flex: 1, padding: '0 8px 10px', minHeight: 0 } },
          tree.map((p) => e('div', { key: p.id },
            e('button', { onClick: () => toggle(p.id), style: { display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '7px 8px', border: 'none', background: (p.active && !p.open) ? 'var(--accent-tint)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }, onMouseEnter: (ev) => { if (!(p.active && !p.open)) ev.currentTarget.style.background = 'var(--surface-hover)'; }, onMouseLeave: (ev) => { if (!(p.active && !p.open)) ev.currentTarget.style.background = 'transparent'; } },
              e('span', { style: { display: 'inline-flex', color: 'var(--text-muted)', transform: p.open ? 'rotate(90deg)' : 'none', transition: 'transform var(--dur-fast)' } }, X.chevR(14)),
              e('span', { style: { display: 'inline-flex', color: 'var(--accent)' } }, (p.open ? X.folderOpen : X.folder)(17)),
              e('span', { style: { flex: 1, minWidth: 0, font: '600 12.5px/1.2 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, p.name),
              e('span', { style: { font: '11px/1 var(--font-mono)', color: 'var(--text-muted)' } }, p.count)),
            p.open && p.children.map((c) => e('button', { key: c.id, style: { display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '6px 8px 6px 30px', border: 'none', background: c.id === 'f3' ? 'var(--accent-tint)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left' }, onMouseEnter: (ev) => { if (c.id !== 'f3') ev.currentTarget.style.background = 'var(--surface-hover)'; }, onMouseLeave: (ev) => { if (c.id !== 'f3') ev.currentTarget.style.background = 'transparent'; } },
              e('span', { style: { display: 'inline-flex', color: c.id === 'f3' ? 'var(--accent)' : 'var(--text-muted)' } }, X.folder(15)),
              e('span', { style: { flex: 1, minWidth: 0, font: '12.5px/1.2 var(--font-sans)', color: c.id === 'f3' ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, c.name),
              e('span', { style: { font: '11px/1 var(--font-mono)', color: 'var(--text-muted)' } }, c.count)))))),
        e('div', { style: { borderTop: '1px solid var(--border-hairline)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)' } },
          e('span', { style: { display: 'inline-flex' } }, X.trash(15)), 'Trash · 4 items'));
    }

    /* ---------------- list view (data table) ---------------- */
    const COLS = '38px 30px 1fr 150px 132px 120px 92px 132px 40px';
    function ListView({ rows, sel, setSel, openKebab, setOpenKebab }) {
      const anySel = sel.size > 0;
      const allSel = sel.size === rows.length;
      const toggleAll = () => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)));
      const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
      const HeadCell = ({ children, sort }) => e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', cursor: sort ? 'pointer' : 'default' } }, children, sort && e('span', { style: { color: 'var(--accent)' } }, X.sortArrow(12)));
      return e('div', { style: { border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-raised)' } },
        // header
        e('div', { style: { display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' } },
          e('span', { style: { display: 'inline-flex' } }, e(Checkbox, { checked: allSel, indeterminate: anySel && !allSel, onChange: toggleAll })),
          e('span', null), e(HeadCell, { sort: true }, 'Name'), e(HeadCell, null, 'Tags'), e(HeadCell, null, 'Owner'), e(HeadCell, null, 'Calc status'), e(HeadCell, null, 'Size'), e(HeadCell, { sort: true }, 'Modified'), e('span', null)),
        // rows
        rows.map((r, i) => {
          const isSel = sel.has(r.id);
          return e('div', { key: r.id, className: 'fb-row' + (isSel ? ' is-sel any-sel' : '') + (anySel ? ' any-sel' : ''), style: { display: 'grid', gridTemplateColumns: COLS, gap: 12, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: i < rows.length - 1 ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer', background: isSel ? 'var(--surface-selected)' : 'transparent' } },
            e('span', { className: 'row-check', style: { display: 'inline-flex' }, onClick: (ev) => ev.stopPropagation() }, e(Checkbox, { checked: isSel, onChange: () => toggle(r.id) })),
            e('span', { style: { display: 'inline-flex' } }, e(TypeIcon, { row: r })),
            e('span', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } }, e('span', { style: { font: (r.kind === 'folder' ? '600 ' : '500 ') + '13px/1.3 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name)),
            e('span', { style: { display: 'flex', gap: 5, overflow: 'hidden' } }, r.tags.length ? r.tags.map((t) => e(TagChip, { key: t }, t)) : e('span', { style: { color: 'var(--text-muted)' } }, '—')),
            e('span', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } }, e(Avatar, { name: r.owner }), e('span', { style: { font: '12.5px/1.2 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.owner)),
            e('span', null, e(StatusChip, { status: r.status })),
            e('span', { style: { font: '12px/1 var(--font-mono)', color: 'var(--text-muted)' } }, r.size),
            e('span', { style: { font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)' } }, r.modified),
            e('span', { className: 'row-kebab', style: { position: 'relative', display: 'flex', justifyContent: 'flex-end' }, onClick: (ev) => ev.stopPropagation() },
              e(IconButton, { label: 'Actions', size: 'sm', active: openKebab === r.id, onClick: () => setOpenKebab(openKebab === r.id ? null : r.id) }, X.kebab(17)),
              openKebab === r.id && e(KebabMenu, { anchorRight: true, onClose: () => setOpenKebab(null) })));
        }));
    }

    /* ---------------- grid view ---------------- */
    function GridView({ rows, sel, setSel, openKebab, setOpenKebab }) {
      const toggle = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
      return e('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 } },
        rows.map((r) => {
          const isSel = sel.has(r.id);
          if (r.kind === 'folder') {
            return e('div', { key: r.id, className: 'fb-grid-card' + (isSel ? ' is-sel' : ''), onClick: () => toggle(r.id), style: { border: '1px solid ' + (isSel ? 'var(--accent)' : 'var(--border-hairline)'), borderRadius: 'var(--radius-md)', background: isSel ? 'var(--surface-selected)' : 'var(--surface-raised)', padding: '14px 15px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, position: 'relative', minHeight: 90 } },
              e('span', { className: 'card-check', style: { position: 'absolute', top: 10, left: 10 }, onClick: (ev) => ev.stopPropagation() }, e(Checkbox, { checked: isSel, onChange: () => toggle(r.id) })),
              e('span', { style: { color: 'var(--accent)', display: 'inline-flex' } }, X.folder(34)),
              e('span', { style: { minWidth: 0 } }, e('span', { style: { display: 'block', font: '600 13.5px/1.3 var(--font-sans)', color: 'var(--text-primary)' } }, r.name), e('span', { style: { display: 'block', font: '11.5px/1.3 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 } }, r.size + ' · ' + r.modified)));
          }
          return e('div', { key: r.id, className: 'fb-grid-card' + (isSel ? ' is-sel' : ''), style: { border: '1px solid ' + (isSel ? 'var(--accent)' : 'var(--border-hairline)'), borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)', overflow: 'hidden', cursor: 'pointer', position: 'relative', display: 'flex', flexDirection: 'column' } },
            e('span', { className: 'card-check', style: { position: 'absolute', top: 10, left: 10, zIndex: 3, background: 'var(--surface-raised)', borderRadius: 4 }, onClick: (ev) => ev.stopPropagation() }, e(Checkbox, { checked: isSel, onChange: () => toggle(r.id) })),
            e('span', { style: { position: 'absolute', top: 8, right: 8, zIndex: 3 }, onClick: (ev) => ev.stopPropagation() },
              e(IconButton, { label: 'Actions', size: 'sm', onClick: () => setOpenKebab(openKebab === r.id ? null : r.id) }, X.kebab(16)),
              openKebab === r.id && e(KebabMenu, { anchorRight: true, onClose: () => setOpenKebab(null) })),
            e('div', { style: { height: 128, borderBottom: '1px solid var(--border-hairline)', position: 'relative' } }, e(Thumb, { variant: r.variant }), e('div', { style: { position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 62%, var(--surface-raised))' } })),
            e('div', { style: { padding: '11px 13px 12px' } },
              e('div', { style: { font: '600 13px/1.32 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, r.name),
              e('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 } },
                e('span', { style: { display: 'flex', alignItems: 'center', gap: 6 } }, e(Avatar, { name: r.owner, sz: 18 }), e('span', { style: { font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' } }, r.modified)),
                e(StatusChip, { status: r.status }))));
        }));
    }

    /* ---------------- contextual action bar ---------------- */
    function ActionBar({ count, onClear }) {
      const act = (label, icon, danger) => e('button', { key: label, style: { display: 'inline-flex', alignItems: 'center', gap: 7, height: 32, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'transparent', color: danger ? '#FF9B8F' : 'var(--text-inverse)', font: '500 12.5px/1 var(--font-sans)', cursor: 'pointer' }, onMouseEnter: (ev) => ev.currentTarget.style.background = 'rgba(255,255,255,0.12)', onMouseLeave: (ev) => ev.currentTarget.style.background = 'transparent' }, icon(16), label);
      return e('div', { className: 'bar-in', style: { position: 'fixed', left: 'calc(50% + 110px)', bottom: 26, zIndex: 60, display: 'flex', alignItems: 'center', gap: 4, padding: '7px 8px 7px 14px', background: 'var(--ink)', borderRadius: 10, boxShadow: 'var(--shadow-modal)' } },
        e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 9, font: '13px/1 var(--font-sans)', color: 'var(--text-inverse)', paddingRight: 6 } },
          e('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, padding: '0 6px', borderRadius: 6, background: 'var(--accent)', color: '#fff', font: '600 12px/1 var(--font-mono)' } }, count), 'selected'),
        e('span', { style: { width: 1, height: 22, background: 'rgba(255,255,255,0.18)', margin: '0 4px' } }),
        act('Move', X.move), act('Tag', X.tag), act('Export', X.export), act('Delete', X.trash, true),
        e('span', { style: { width: 1, height: 22, background: 'rgba(255,255,255,0.18)', margin: '0 4px' } }),
        e('button', { onClick: onClear, 'aria-label': 'Clear selection', style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 6, color: 'var(--text-inverse)', cursor: 'pointer' }, onMouseEnter: (ev) => ev.currentTarget.style.background = 'rgba(255,255,255,0.12)', onMouseLeave: (ev) => ev.currentTarget.style.background = 'transparent' }, X.close(17)));
    }

    /* ---------------- empty state ---------------- */
    function EmptyFolder() {
      return e('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '90px 0', textAlign: 'center' } },
        e('div', { style: { width: 54, height: 54, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', marginBottom: 18 } }, X.folderOpen(28)),
        e('h3', { style: { margin: '0 0 7px', font: '600 16px/1.3 var(--font-sans)', color: 'var(--text-primary)' } }, 'This folder is empty'),
        e('p', { style: { margin: '0 auto 20px', maxWidth: 340, font: '13px/1.55 var(--font-sans)', color: 'var(--text-muted)' } }, 'Create a worksheet here, or import an existing .xlsx or Mathcad file to get started.'),
        e('div', { style: { display: 'flex', gap: 10 } }, e(Button, { variant: 'primary', iconLeft: X.plus(16) }, 'New worksheet'), e(Button, { variant: 'secondary', iconLeft: X.export(16) }, 'Import a file')));
    }

    /* ---------------- main ---------------- */
    function App() {
      const [view, setView] = useState('list');
      const [treeOpen, setTreeOpen] = useState(true);
      const [sel, setSel] = useState(new Set());
      const [openKebab, setOpenKebab] = useState(null);
      const [empty, setEmpty] = useState(false);
      const rows = ROWS;

      const Crumb = ({ children, last }) => e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 8 } }, e('span', { className: last ? '' : 'q-link', style: { font: (last ? '600 ' : '500 ') + '14px/1 var(--font-sans)', color: last ? 'var(--text-primary)' : 'var(--text-muted)', cursor: last ? 'default' : 'pointer' } }, children), !last && e('span', { style: { color: 'var(--border-strong)' } }, X.chevR(13)));

      const ViewToggle = () => e('div', { style: { display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 36 } },
        [['list', X.list], ['grid', X.grid]].map(([v, icon], i) => e('button', { key: v, onClick: () => setView(v), 'aria-label': v + ' view', style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: '100%', border: 'none', borderLeft: i ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer', background: view === v ? 'var(--accent-tint)' : 'var(--surface-raised)', color: view === v ? 'var(--accent)' : 'var(--text-muted)' } }, icon(18))));

      return e('div', { style: { display: 'flex', height: '100vh' }, 'data-screen-label': 'File browser' },
        e(NavRail, { active: 'worksheets' }),
        e('div', { style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh' } },
          // top bar
          e('header', { style: { flex: '0 0 auto', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-paper)' } },
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 16, padding: '16px 28px 14px' } },
              e('div', { style: { flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 } }, e(Crumb, null, 'Workspace'), e(Crumb, null, 'Projects'), e(Crumb, { last: true }, 'Zoo lifeline retrofit')),
              e(ViewToggle, null), e(NewButton, null)),
            // search + filters
            e('div', { style: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '0 28px 14px' } },
              e('div', { style: { position: 'relative', width: 280 } },
                e('span', { style: { position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' } }, X.search(16)),
                e('input', { placeholder: 'Search in this folder…', style: { width: '100%', height: 36, padding: '0 12px 0 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', font: '13px/1 var(--font-sans)', color: 'var(--text-primary)', outline: 'none' }, onFocus: (ev) => { ev.target.style.borderColor = 'var(--accent)'; ev.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)'; }, onBlur: (ev) => { ev.target.style.borderColor = 'var(--border-strong)'; ev.target.style.boxShadow = 'none'; } })),
              e('span', { style: { width: 1, height: 22, background: 'var(--border-hairline)' } }),
              e(FilterPill, { label: 'Owner' }), e(FilterPill, { label: 'Modified' }), e(FilterPill, { label: 'Calc status' }), e(FilterPill, { label: 'Tag' }),
              e('button', { onClick: () => setEmpty((x) => !x), style: { marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: empty ? 'var(--accent-tint)' : 'var(--surface-raised)', color: empty ? 'var(--accent)' : 'var(--text-muted)', font: '500 11.5px/1 var(--font-sans)', cursor: 'pointer' } }, empty ? 'Empty folder' : 'Populated'))),
          // content
          e('div', { className: 'scroll-y', style: { flex: 1, minHeight: 0, display: 'flex' } },
            e(TreePane, { open: treeOpen, setOpen: setTreeOpen }),
            e('div', { className: 'scroll-y', style: { flex: 1, minWidth: 0, padding: '20px 28px 80px', background: 'var(--surface-paper)' } },
              empty ? e(EmptyFolder, null) : e('div', { style: { maxWidth: 1320, margin: '0 auto' } },
                e('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 } },
                  e('span', { style: { font: '13px/1 var(--font-sans)', color: 'var(--text-muted)' } }, rows.filter((r) => r.kind === 'folder').length + ' folders · ' + rows.filter((r) => r.kind === 'sheet').length + ' worksheets'),
                  e('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)' } }, 'Sort: ', e('span', { style: { color: 'var(--text-primary)', fontWeight: 500 } }, 'Modified'), X.chevD(14))),
                view === 'list'
                  ? e(ListView, { rows, sel, setSel, openKebab, setOpenKebab })
                  : e(GridView, { rows, sel, setSel, openKebab, setOpenKebab })))),
        ),
        sel.size > 0 && e(ActionBar, { count: sel.size, onClear: () => setSel(new Set()) }));
    }

    ReactDOM.createRoot(document.getElementById('root')).render(e(App));
  };
  boot();
}
