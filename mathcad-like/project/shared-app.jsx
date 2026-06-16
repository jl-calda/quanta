/* Quanta — Shared page */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge, Select, Input } = Q;
    const { Icons, QLogo, NavRail } = window.QGallery;
    const { useState, useEffect, useRef } = React;

    /* ---- icons ---- */
    const svg = (children, s = 18) => (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    );
    const SheetI = (s) => svg(<><rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/></>, s);
    const FolderI = (s) => svg(<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v8A1.5 1.5 0 0 1 17.5 19.5h-13A1.5 1.5 0 0 1 3 18z"/>, s);
    const KebabI = (s) => svg(<><circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/></>, s);
    const SearchI = (s) => svg(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></>, s);
    const CloseI = (s) => svg(<path d="M6 6l12 12M18 6 6 18"/>, s);
    const ChevDI = (s) => svg(<path d="m6 9 6 6 6-6"/>, s);
    const LinkI = (s) => svg(<><path d="M9.5 14.5 14.5 9.5"/><path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1"/><path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1"/></>, s);
    const CommentI = (s) => svg(<path d="M5 5h14a1.2 1.2 0 0 1 1.2 1.2v8.4A1.2 1.2 0 0 1 19 15.8H9.5L5.5 19.5V6.2A1.2 1.2 0 0 1 6.7 5z"/>, s);
    const EditI = (s) => svg(<><path d="M4 20h4L18.5 9.5a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L5 17z"/></>, s);
    const ShareEvtI = (s) => svg(<><circle cx="18" cy="5.5" r="2.3"/><circle cx="6" cy="12" r="2.3"/><circle cx="18" cy="18.5" r="2.3"/><path d="M8.1 10.8 15.9 6.7M8.1 13.2l7.8 4.1"/></>, s);
    const ManageI = (s) => svg(<><circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="9.5" r="2.3"/><path d="M16 19a4.4 4.4 0 0 1 5.5-3.7"/></>, s);
    const CheckI = (s) => svg(<path d="M5 12l4.5 4.5L19 7"/>, s);
    const PanelI = (s) => svg(<><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M14 4v16"/></>, s);

    /* ---- people ---- */
    const PEOPLE = {
      nb: { name: 'Nadia Brunel', color: 'var(--accent)' },
      mo: { name: 'M. Okafor', color: '#1E8E5A' },
      rv: { name: 'R. Vasquez', color: '#7A5BBF' },
      ba: { name: 'B. Adler', color: '#B5722B' },
      lh: { name: 'L. Haas', color: '#C2392B' },
      ts: { name: 'T. Sato', color: '#0E7C86' },
    };
    const ini = (n) => n.replace(/[^A-Za-z. ]/g, '').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const Avatar = ({ id, sz = 24, ring }) => {
      const p = PEOPLE[id]; if (!p) return null;
      return <span title={p.name} style={{ width: sz, height: sz, borderRadius: '50%', background: p.color, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 ' + (sz * 0.4) + 'px/1 var(--font-sans)', flex: '0 0 auto', boxShadow: ring ? '0 0 0 2px var(--surface-raised)' : 'none' }}>{ini(p.name)}</span>;
    };
    const AvatarStack = ({ ids }) => {
      const shown = ids.slice(0, 3), extra = ids.length - shown.length;
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex' }}>
            {shown.map((id, i) => <span key={id} style={{ marginLeft: i ? -8 : 0, zIndex: 3 - i }}><Avatar id={id} sz={24} ring /></span>)}
            {extra > 0 && <span style={{ marginLeft: -8, width: 24, height: 24, borderRadius: '50%', background: 'var(--surface-chrome)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 10px/1 var(--font-sans)', boxShadow: '0 0 0 2px var(--surface-raised)' }}>+{extra}</span>}
          </span>
        </span>
      );
    };

    /* ---- role chip ---- */
    const RoleChip = ({ role }) => {
      const map = { Owner: 'accent', Editor: 'pass', Commenter: 'warning', Viewer: 'muted' };
      const tone = map[role];
      const styles = {
        accent: { c: 'var(--accent)', b: 'var(--accent-tint)' },
        pass: { c: 'var(--status-pass)', b: 'var(--status-pass-bg)' },
        warning: { c: 'var(--status-warning)', b: 'var(--status-warning-bg)' },
        muted: { c: 'var(--text-muted)', b: 'var(--surface-chrome)' },
      }[tone];
      return <span style={{ display: 'inline-flex', alignItems: 'center', font: '11px/1 var(--font-sans)', fontWeight: 500, color: styles.c, background: styles.b, border: '1px solid color-mix(in srgb, ' + styles.c + ' 22%, transparent)', borderRadius: 4, padding: '3px 8px' }}>{role}</span>;
    };
    const StatusChip = ({ status }) => {
      if (status === 'pass') return <Badge tone="pass" dot>Current</Badge>;
      if (status === 'warning') return <Badge tone="warning" dot>Recalculate</Badge>;
      if (status === 'error') return <Badge tone="error" dot>Errors</Badge>;
      return <span style={{ color: 'var(--text-muted)', font: '12px var(--font-sans)' }}>—</span>;
    };

    /* ---- data ---- */
    const WITH_ME = [
      { id: 'a', kind: 'sheet', name: 'Anchor schedule — Block B', by: 'mo', role: 'Editor', status: 'warning', activity: '20 min ago' },
      { id: 'b', kind: 'sheet', name: 'Lifeline span — bay 3 review', by: 'rv', role: 'Commenter', status: 'pass', activity: '2 hours ago' },
      { id: 'c', kind: 'folder', name: 'Zoo retrofit — checking set', by: 'ba', role: 'Viewer', status: null, activity: 'Yesterday' },
      { id: 'd', kind: 'sheet', name: 'Mast base plate — wind', by: 'ts', role: 'Editor', status: 'pass', activity: 'Yesterday' },
      { id: 'e', kind: 'sheet', name: 'Bolt group — eccentric shear', by: 'lh', role: 'Viewer', status: 'error', activity: '3 days ago' },
    ];
    const BY_ME = [
      { id: 'f', kind: 'sheet', name: 'Roof anchor point — pull-out check', withWho: ['mo', 'rv', 'ba'], role: 'Owner', status: 'pass', activity: '1 hour ago' },
      { id: 'g', kind: 'sheet', name: 'Guardrail post — point load', withWho: ['ts'], role: 'Owner', status: 'pass', activity: 'Yesterday' },
      { id: 'h', kind: 'folder', name: 'Plant 7 Retrofit', withWho: ['mo', 'rv', 'ba', 'lh', 'ts'], role: 'Owner', status: null, activity: '2 days ago' },
      { id: 'i', kind: 'sheet', name: 'Ladder cage — rung loading', withWho: ['lh'], role: 'Owner', status: 'warning', activity: '4 days ago' },
    ];

    const ACTIVITY = [
      { who: 'mo', icon: EditI, text: 'edited Anchor schedule — Block B', detail: 'Changed F_t from 12 kN to 14.5 kN', time: '20 min ago', tone: 'accent' },
      { who: 'rv', icon: CommentI, text: 'commented on Lifeline span — bay 3', detail: '“Should this use the SLS combination?”', time: '2 hours ago', tone: 'warning' },
      { who: 'nb', icon: ShareEvtI, text: 'shared Roof anchor point with M. Okafor', detail: 'Role: Editor', time: '1 hour ago', tone: 'pass' },
      { who: 'ba', icon: EditI, text: 'recalculated Zoo retrofit — checking set', detail: '42 regions · 0 errors', time: 'Yesterday', tone: 'accent' },
      { who: 'ts', icon: CommentI, text: 'resolved a comment on Mast base plate', detail: 'Thread closed', time: 'Yesterday', tone: 'pass' },
      { who: 'lh', icon: ShareEvtI, text: 'was added to Bolt group — eccentric shear', detail: 'Role: Viewer', time: '3 days ago', tone: 'muted' },
    ];

    /* ---- Share dialog ---- */
    function ShareDialog({ row, onClose }) {
      const [role, setRole] = useState('editor');
      if (!row) return null;
      const members = row.withWho ? ['nb', ...row.withWho] : ['nb', row.by];
      const roleOf = (id) => id === 'nb' ? 'Owner' : (id === row.by ? row.role : 'Editor');
      return (
        <>
          <div className="overlay-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--ink) 42%, transparent)', zIndex: 80 }} />
          <div className="dialog-in" role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 480, maxWidth: '92vw', zIndex: 81, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 14px', borderBottom: '1px solid var(--border-hairline)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>Share worksheet</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: row.kind === 'folder' ? 'var(--accent)' : 'var(--text-muted)', display: 'inline-flex' }}>{row.kind === 'folder' ? FolderI(18) : SheetI(18)}</span>
                  <span style={{ font: '600 15px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>{row.name}</span>
                </div>
              </div>
              <IconButton label="Close" onClick={onClose}>{CloseI(18)}</IconButton>
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* invite row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}><Input placeholder="Add people by name or email…" /></div>
                <div style={{ width: 116 }}>
                  <Select value={role} onChange={(e) => setRole(e.target.value)} options={[{ value: 'editor', label: 'Editor' }, { value: 'commenter', label: 'Commenter' }, { value: 'viewer', label: 'Viewer' }]} />
                </div>
                <Button variant="primary">Invite</Button>
              </div>

              {/* members */}
              <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '20px 0 10px' }}>People with access</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {members.map((id) => (
                  <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 4px' }}>
                    <Avatar id={id} sz={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ font: '500 13px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>{PEOPLE[id].name}{id === 'nb' && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (you)</span>}</div>
                      <div style={{ font: '11.5px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>{PEOPLE[id].name.toLowerCase().replace(/[^a-z]/g, '.')}@acme-eng.com</div>
                    </div>
                    {roleOf(id) === 'Owner'
                      ? <span style={{ font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)', paddingRight: 8 }}>Owner</span>
                      : <div style={{ width: 124 }}><Select size="sm" defaultValue={roleOf(id).toLowerCase()} options={[{ value: 'editor', label: 'Editor' }, { value: 'commenter', label: 'Commenter' }, { value: 'viewer', label: 'Viewer' }, { value: 'remove', label: 'Remove access' }]} /></div>}
                  </div>
                ))}
              </div>
            </div>

            {/* footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
              <button className="q-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)' }}>{LinkI(16)} Copy link</button>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={onClose}>Done</Button>
              </div>
            </div>
          </div>
        </>
      );
    }

    /* ---- table ---- */
    const COLS_WITH = '30px 1fr 188px 116px 132px 120px 76px';
    const COLS_BY = '30px 1fr 150px 116px 132px 120px 76px';
    function ShareTable({ tab, rows, onManage, openKebab, setOpenKebab }) {
      const isWith = tab === 'with';
      const cols = isWith ? COLS_WITH : COLS_BY;
      const Head = ({ children }) => <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</span>;
      return (
        <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-raised)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 16, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
            <span></span><Head>Name</Head><Head>{isWith ? 'Shared by' : 'Shared with'}</Head><Head>Your role</Head><Head>Calc status</Head><Head>Last activity</Head><span></span>
          </div>
          {rows.map((r, i) => (
            <div key={r.id} className="sh-row" style={{ display: 'grid', gridTemplateColumns: cols, gap: 16, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: i < rows.length - 1 ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer' }}>
              <span style={{ display: 'inline-flex', color: r.kind === 'folder' ? 'var(--accent)' : 'var(--text-muted)' }}>{r.kind === 'folder' ? FolderI(18) : SheetI(17)}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ font: (r.kind === 'folder' ? '600 ' : '500 ') + '13px/1.3 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              </span>
              {isWith
                ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}><Avatar id={r.by} /><span style={{ font: '12.5px/1.2 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{PEOPLE[r.by].name}</span></span>
                : <span style={{ display: 'flex', alignItems: 'center' }}><AvatarStack ids={r.withWho} /></span>}
              <span><RoleChip role={r.role} /></span>
              <span><StatusChip status={r.status} /></span>
              <span style={{ font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}>{r.activity}</span>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <button className="row-manage" onClick={() => onManage(r)} title="Manage access" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 5, color: 'var(--text-muted)', cursor: 'pointer' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--accent)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>{ManageI(17)}</button>
                <span className="row-kebab"><IconButton label="More" size="sm" active={openKebab === r.id} onClick={() => setOpenKebab(openKebab === r.id ? null : r.id)}>{KebabI(17)}</IconButton></span>
                {openKebab === r.id && <KebabMenu row={r} onManage={onManage} onClose={() => setOpenKebab(null)} />}
              </span>
            </div>
          ))}
        </div>
      );
    }

    function KebabMenu({ row, onManage, onClose }) {
      const ref = useRef(null);
      useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
      const items = [['Open', false], ['Manage access', false, true], ['Copy link', false], ['Make a copy', false], ['Leave / remove', true]];
      return (
        <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 180, zIndex: 50, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-popover)', padding: 5 }}>
          {items.map(([label, danger, manage]) => (
            <button key={label} onClick={() => { onClose(); if (manage) onManage(row); }} style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '7px 9px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', color: danger ? 'var(--status-error)' : 'var(--text-primary)', font: '12.5px/1 var(--font-sans)' }} onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'var(--status-error-bg)' : 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>{label}</button>
          ))}
        </div>
      );
    }

    /* ---- activity feed ---- */
    function ActivityFeed({ open, setOpen }) {
      if (!open) {
        return (
          <div style={{ width: 36, flex: '0 0 36px', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
            <IconButton label="Show activity" onClick={() => setOpen(true)}>{PanelI(18)}</IconButton>
          </div>
        );
      }
      const toneColor = (t) => t === 'accent' ? 'var(--accent)' : t === 'pass' ? 'var(--status-pass)' : t === 'warning' ? 'var(--status-warning)' : 'var(--text-muted)';
      return (
        <aside style={{ width: 312, flex: '0 0 312px', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--border-hairline)' }}>
            <span style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>Recent activity</span>
            <IconButton label="Hide" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)}>{svg(<path d="m9.5 6 6 6-6 6"/>, 16)}</IconButton>
          </div>
          <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: '6px 8px' }}>
            {ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 8px', borderBottom: i < ACTIVITY.length - 1 ? '1px solid var(--border-hairline)' : 'none' }}>
                <span style={{ position: 'relative', flex: '0 0 auto' }}>
                  <Avatar id={a.who} sz={28} />
                  <span style={{ position: 'absolute', bottom: -2, right: -3, width: 16, height: 16, borderRadius: '50%', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: toneColor(a.tone) }}>{a.icon(11)}</span>
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ font: '12.5px/1.45 var(--font-sans)', color: 'var(--text-primary)' }}><span style={{ fontWeight: 600 }}>{PEOPLE[a.who].name}</span> {a.text.replace(/^\w+ /, (m) => m)}</div>
                  <div style={{ font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{a.detail}</div>
                  <div style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', marginTop: 5 }}>{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      );
    }

    /* ---- empty state ---- */
    function EmptyState({ tab }) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '90px 0', textAlign: 'center' }}>
          <div style={{ width: 54, height: 54, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: 18 }}>{ManageI(26)}</div>
          <h3 style={{ margin: '0 0 7px', font: '600 16px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>{tab === 'with' ? 'Nothing shared with you yet' : 'You haven’t shared anything yet'}</h3>
          <p style={{ margin: '0 auto 20px', maxWidth: 340, font: '13px/1.55 var(--font-sans)', color: 'var(--text-muted)' }}>{tab === 'with' ? 'When a colleague shares a worksheet or project, it shows up here.' : 'Open any worksheet and choose Share to give your team access.'}</p>
          {tab === 'by' && <Button variant="primary">Open a worksheet to share</Button>}
        </div>
      );
    }

    /* ---- app ---- */
    function App() {
      const [tab, setTab] = useState('with');
      const [feedOpen, setFeedOpen] = useState(true);
      const [shareRow, setShareRow] = useState(null);
      const [openKebab, setOpenKebab] = useState(null);
      const [empty, setEmpty] = useState(false);
      const rows = tab === 'with' ? WITH_ME : BY_ME;

      const Tab = ({ id, label, count }) => (
        <button onClick={() => { setTab(id); setOpenKebab(null); }} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 7, padding: '0 2px', height: 40, border: 'none', background: 'none', cursor: 'pointer', color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)', font: (tab === id ? '600' : '500') + ' 14px/1 var(--font-sans)' }}>
          {label}
          <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', background: 'var(--surface-chrome)', border: '1px solid var(--border-hairline)', borderRadius: 99, padding: '2px 6px' }}>{count}</span>
          {tab === id && <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: 'var(--accent)' }} />}
        </button>
      );

      return (
        <div style={{ display: 'flex', height: '100vh' }} data-screen-label="Shared">
          <NavRail active="shared" />
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}>
            {/* top bar */}
            <header style={{ flex: '0 0 auto', padding: '20px 28px 0', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-paper)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 14 }}>
                <div style={{ flex: '0 0 auto' }}>
                  <h1 style={{ margin: 0, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Shared</h1>
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative', width: 260 }}>
                    <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>{SearchI(16)}</span>
                    <input placeholder="Search shared items…" style={{ width: '100%', height: 36, padding: '0 12px 0 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', font: '13px/1 var(--font-sans)', color: 'var(--text-primary)', outline: 'none' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }} />
                  </div>
                  <button onClick={() => setEmpty((x) => !x)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: empty ? 'var(--accent-tint)' : 'var(--surface-raised)', color: empty ? 'var(--accent)' : 'var(--text-muted)', font: '500 11.5px/1 var(--font-sans)', cursor: 'pointer' }}>{empty ? 'Empty' : 'Populated'}</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 22, marginBottom: -1 }}>
                <Tab id="with" label="Shared with me" count={WITH_ME.length} />
                <Tab id="by" label="Shared by me" count={BY_ME.length} />
              </div>
            </header>

            {/* content + feed */}
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
              <div className="scroll-y" style={{ flex: 1, minWidth: 0, padding: '22px 28px 40px', background: 'var(--surface-paper)' }}>
                {empty ? <EmptyState tab={tab} /> : (
                  <div style={{ maxWidth: 1180, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
                      <span style={{ font: '13px/1 var(--font-sans)', color: 'var(--text-muted)' }}>{rows.length + (tab === 'with' ? ' items shared with you' : ' items you’ve shared')}</span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}>Sort: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Last activity</span>{ChevDI(14)}</span>
                    </div>
                    <ShareTable tab={tab} rows={rows} onManage={setShareRow} openKebab={openKebab} setOpenKebab={setOpenKebab} />
                  </div>
                )}
              </div>
              <ActivityFeed open={feedOpen} setOpen={setFeedOpen} />
            </div>
          </div>
          <ShareDialog row={shareRow} onClose={() => setShareRow(null)} />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  };
  boot();
}
