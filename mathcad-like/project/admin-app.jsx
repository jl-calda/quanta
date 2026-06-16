/* Quanta — Workspace admin */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge, Select, Input } = Q;
    const { NavRail } = window.QGallery;
    const { useState, useRef, useEffect } = React;

    const svg = (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{c}</svg>;
    const X = {
      members: (s) => svg(<><circle cx="9" cy="9" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17.5" cy="9.5" r="2.3"/><path d="M16 19a4.4 4.4 0 0 1 5.5-3.7"/></>, s),
      roles: (s) => svg(<><path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9.5 11.5l1.8 1.8 3.5-3.8"/></>, s),
      projects: (s) => svg(<path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v8A1.5 1.5 0 0 1 17.5 19.5h-13A1.5 1.5 0 0 1 3 18z"/>, s),
      templates: (s) => svg(<><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M9 9v11"/></>, s),
      branding: (s) => svg(<><circle cx="13" cy="11" r="8"/><path d="M13 7v8M9 11h8"/><circle cx="5" cy="19" r="1.5"/></>, s),
      security: (s) => svg(<><rect x="5" y="10.5" width="14" height="9.5" rx="1.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></>, s),
      audit: (s) => svg(<><path d="M5 4h10l4 4v12H5z"/><path d="M14 4v4h4M8 13h7M8 16.5h5"/></>, s),
      billing: (s) => svg(<><rect x="3" y="5" width="18" height="14" rx="1.6"/><path d="M3 9.5h18M6.5 14.5h4"/></>, s),
      plus: (s) => svg(<path d="M12 6v12M6 12h12"/>, s),
      search: (s) => svg(<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></>, s),
      close: (s) => svg(<path d="M6 6l12 12M18 6 6 18"/>, s),
      kebab: (s) => svg(<><circle cx="12" cy="5" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="19" r="1.3"/></>, s),
      check: (s) => svg(<path d="M5 12l4.5 4.5L19 7"/>, s),
      partial: (s) => svg(<path d="M7 12h10"/>, s),
      chevD: (s) => svg(<path d="m6 9 6 6 6-6"/>, s),
      external: (s) => svg(<><path d="M14 4h6v6"/><path d="M20 4 10 14"/></>, s),
    };

    const SECTIONS = [
      { id: 'members', label: 'Members', icon: X.members },
      { id: 'roles', label: 'Roles & permissions', icon: X.roles },
      { id: 'projects', label: 'Projects', icon: X.projects },
      { id: 'templates', label: 'Templates', icon: X.templates },
      { id: 'branding', label: 'Branding', icon: X.branding },
      { id: 'security', label: 'Security', icon: X.security, sub: 'SSO · 2FA' },
      { id: 'audit', label: 'Audit log', icon: X.audit },
      { id: 'billing', label: 'Billing & seats', icon: X.billing },
    ];

    /* ---- people ---- */
    const COLORS = ['var(--accent)', '#1E8E5A', '#7A5BBF', '#B5722B', '#C2392B', '#0E7C86', '#C6890B'];
    const ini = (n) => n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const Avatar = ({ name, i, sz = 28 }) => <span title={name} style={{ width: sz, height: sz, borderRadius: '50%', background: COLORS[i % COLORS.length], color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 ' + (sz * 0.38) + 'px/1 var(--font-sans)', flex: '0 0 auto' }}>{ini(name)}</span>;

    const MEMBERS = [
      { name: 'Nadia Brunel', email: 'nadia.brunel@acme-eng.com', role: 'Owner', projects: 12, status: 'active', last: 'Active now' },
      { name: 'Marcus Okafor', email: 'm.okafor@acme-eng.com', role: 'Admin', projects: 9, status: 'active', last: '8 min ago' },
      { name: 'Rosa Vasquez', email: 'r.vasquez@acme-eng.com', role: 'Engineer', projects: 6, status: 'active', last: '2 hours ago' },
      { name: 'Ben Adler', email: 'b.adler@acme-eng.com', role: 'Engineer', projects: 4, status: 'active', last: 'Yesterday' },
      { name: 'Toshiko Sato', email: 't.sato@acme-eng.com', role: 'Reviewer', projects: 7, status: 'active', last: 'Yesterday' },
      { name: 'Lena Haas', email: 'l.haas@acme-eng.com', role: 'Engineer', projects: 3, status: 'invited', last: 'Invited 2 days ago' },
      { name: 'Priya Anand', email: 'p.anand@acme-eng.com', role: 'Viewer', projects: 2, status: 'active', last: '5 days ago' },
      { name: 'Devon Wright', email: 'devon@northpoint-qa.com', role: 'Reviewer', projects: 1, status: 'invited', last: 'Invited 6 days ago' },
      { name: 'Sam Cole', email: 'finance@acme-eng.com', role: 'Billing', projects: 0, status: 'active', last: '3 weeks ago' },
    ];
    const ROLE_OPTS = ['Owner', 'Admin', 'Engineer', 'Reviewer', 'Viewer', 'Billing'].map((r) => ({ value: r, label: r }));

    /* ===================== seat usage ===================== */
    function SeatUsage() {
      const used = 18, total = 25, pct = used / total;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 'var(--d-row-y) var(--d-row-x)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface-raised)' }}>
          <div style={{ minWidth: 132 }}>
            <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 5 }}><strong style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{used} of {total}</strong> seats used</div>
            <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-chrome)', overflow: 'hidden' }}>
              <div style={{ width: (pct * 100) + '%', height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
            </div>
          </div>
          <span style={{ width: 1, height: 28, background: 'var(--border-hairline)' }} />
          <div style={{ font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>{total - used} seats available<br /><button className="q-link">Add seats</button></div>
        </div>
      );
    }

    /* ---- status pill ---- */
    const StatusPill = ({ status }) => status === 'active'
      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '11.5px/1 var(--font-sans)', color: 'var(--status-pass)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-pass)' }} />Active</span>
      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '11.5px/1 var(--font-sans)', color: 'var(--status-warning)' }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-warning)' }} />Invited</span>;

    /* ===================== members ===================== */
    const MCOLS = '1fr 132px 124px 96px 130px 40px';
    function MemberRow({ m, i, openKebab, setOpenKebab }) {
      return (
        <div className="adm-row" style={{ display: 'grid', gridTemplateColumns: MCOLS, gap: 16, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: '1px solid var(--border-hairline)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            <Avatar name={m.name} i={i} />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', font: '500 13px/1.3 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
              <span style={{ display: 'block', font: '11.5px/1.3 var(--font-sans)', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</span>
            </span>
          </span>
          <span>{m.role === 'Owner' ? <span style={{ font: '12.5px/1 var(--font-sans)', color: 'var(--text-muted)', padding: '0 9px' }}>Owner</span> : <Select size="sm" defaultValue={m.role} options={ROLE_OPTS} />}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, font: '12.5px/1 var(--font-sans)', color: 'var(--text-primary)' }}>{m.projects} {m.projects === 1 ? 'project' : 'projects'}<button className="q-link" style={{ fontSize: 11.5 }}>manage</button></span>
          <span><StatusPill status={m.status} /></span>
          <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--text-muted)' }}>{m.last}</span>
          <span style={{ display: 'flex', justifyContent: 'flex-end', position: 'relative' }} onClick={(e) => e.stopPropagation()}>
            <span className="row-kebab"><IconButton label="Actions" size="sm" active={openKebab === i} onClick={() => setOpenKebab(openKebab === i ? null : i)}>{X.kebab(17)}</IconButton></span>
            {openKebab === i && <KebabMenu status={m.status} onClose={() => setOpenKebab(null)} />}
          </span>
        </div>
      );
    }
    function KebabMenu({ status, onClose }) {
      const ref = useRef(null);
      useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
      const items = status === 'invited' ? [['Resend invite', false], ['Edit role', false], ['Revoke invite', true]] : [['Edit member', false], ['Manage projects', false], ['Suspend access', false], ['Remove from workspace', true]];
      return (
        <div ref={ref} style={{ position: 'absolute', top: 'calc(100% + 4px)', right: 0, width: 184, zIndex: 50, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-popover)', padding: 5 }}>
          {items.map(([label, danger]) => <button key={label} onClick={onClose} style={{ display: 'block', width: '100%', padding: '7px 9px', border: 'none', background: 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', color: danger ? 'var(--status-error)' : 'var(--text-primary)', font: '12.5px/1 var(--font-sans)' }} onMouseEnter={(e) => e.currentTarget.style.background = danger ? 'var(--status-error-bg)' : 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>{label}</button>)}
        </div>
      );
    }

    function MembersSection({ onInvite }) {
      const [q, setQ] = useState('');
      const [openKebab, setOpenKebab] = useState(null);
      const rows = MEMBERS.filter((m) => !q || (m.name + m.email).toLowerCase().includes(q.toLowerCase()));
      const Head = ({ children }) => <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</span>;
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Members</h1>
              <p style={{ margin: '4px 0 0', font: '13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>People in the Acme Safety Engineering workspace.</p>
            </div>
            <Button variant="primary" iconLeft={X.plus(16)} onClick={onInvite}>Invite members</Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <SeatUsage />
            <div style={{ position: 'relative', flex: 1, maxWidth: 300, marginLeft: 'auto' }}>
              <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>{X.search(16)}</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members…" style={{ width: '100%', height: 36, padding: '0 12px 0 34px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', font: '13px/1 var(--font-sans)', color: 'var(--text-primary)', outline: 'none' }} onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)'; }} onBlur={(e) => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }} />
            </div>
          </div>
          <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-raised)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: MCOLS, gap: 16, padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
              <Head>Member</Head><Head>Role</Head><Head>Projects</Head><Head>Status</Head><Head>Last active</Head><span></span>
            </div>
            {rows.map((m, i) => <MemberRow key={m.email} m={m} i={MEMBERS.indexOf(m)} openKebab={openKebab} setOpenKebab={setOpenKebab} />)}
          </div>
        </div>
      );
    }

    /* ===================== invite modal ===================== */
    function InviteModal({ open, onClose }) {
      const [rows, setRows] = useState([{ email: '', role: 'Engineer' }]);
      if (!open) return null;
      const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => j === i ? { ...r, [k]: v } : r));
      return (
        <>
          <div className="overlay-in" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--ink) 42%, transparent)', zIndex: 80 }} />
          <div className="dialog-in" role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 560, maxWidth: '94vw', zIndex: 81, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '18px 20px 14px', borderBottom: '1px solid var(--border-hairline)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ font: '600 16px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>Invite members</div>
                <div style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 }}>They’ll get an email invite. Seats are used when an invite is accepted.</div>
              </div>
              <IconButton label="Close" onClick={onClose}>{X.close(18)}</IconButton>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 136px', gap: 8, marginBottom: 6 }}>
                <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email address</span>
                <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Role</span>
              </div>
              {rows.map((r, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 136px', gap: 8, marginBottom: 8 }}>
                  <Input value={r.email} onChange={(e) => setRow(i, 'email', e.target.value)} placeholder="name@company.com" />
                  <Select value={r.role} onChange={(e) => setRow(i, 'role', e.target.value)} options={ROLE_OPTS.filter((o) => o.value !== 'Owner')} />
                </div>
              ))}
              <button className="q-link" onClick={() => setRows((rs) => [...rs, { email: '', role: 'Engineer' }])} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 2, color: 'var(--accent)', font: '12.5px/1 var(--font-sans)' }}>{X.plus(14)} Add another</button>

              <div style={{ marginTop: 18 }}>
                <span style={{ display: 'block', font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>Assign to projects</span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Zoo lifeline retrofit', 'Edge Protection', 'Plant 7 Retrofit', 'Shared library'].map((p, i) => (
                    <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 11px', border: '1px solid ' + (i < 2 ? 'var(--accent)' : 'var(--border-strong)'), borderRadius: 99, cursor: 'pointer', background: i < 2 ? 'var(--accent-tint)' : 'var(--surface-raised)', color: i < 2 ? 'var(--accent)' : 'var(--text-primary)', font: '12px/1 var(--font-sans)' }}>
                      <span style={{ width: 14, height: 14, borderRadius: 3, border: '1px solid ' + (i < 2 ? 'var(--accent)' : 'var(--border-strong)'), background: i < 2 ? 'var(--accent)' : 'transparent', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i < 2 && X.check(11)}</span>
                      {p}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
              <span style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>{rows.length} invite{rows.length > 1 ? 's' : ''} · 7 seats remain</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <Button variant="secondary" onClick={onClose}>Cancel</Button>
                <Button variant="primary" onClick={onClose}>Send invites</Button>
              </div>
            </div>
          </div>
        </>
      );
    }

    /* ===================== roles & permissions matrix ===================== */
    const CAPS = [
      { group: 'Worksheets', items: ['Create worksheets', 'Edit shared worksheets', 'Approve / sign', 'Export'] },
      { group: 'Workspace', items: ['Manage templates', 'Manage members', 'Manage billing', 'View audit log'] },
    ];
    // matrix[capability] = { role: 'full' | 'partial' | 'none' }
    const ROLES = ['Owner', 'Admin', 'Engineer', 'Reviewer', 'Viewer', 'Billing'];
    const MATRIX = {
      'Create worksheets': ['full', 'full', 'full', 'none', 'none', 'none'],
      'Edit shared worksheets': ['full', 'full', 'full', 'partial', 'none', 'none'],
      'Approve / sign': ['full', 'full', 'partial', 'full', 'none', 'none'],
      'Export': ['full', 'full', 'full', 'full', 'partial', 'none'],
      'Manage templates': ['full', 'full', 'partial', 'none', 'none', 'none'],
      'Manage members': ['full', 'full', 'none', 'none', 'none', 'none'],
      'Manage billing': ['full', 'none', 'none', 'none', 'none', 'full'],
      'View audit log': ['full', 'full', 'none', 'none', 'none', 'partial'],
    };
    function Cell({ state }) {
      if (state === 'full') return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, background: 'var(--accent)', color: '#fff' }}>{X.check(15)}</span>;
      if (state === 'partial') return <span title="Partial — limited to assigned projects" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: 5, background: 'var(--status-warning-bg)', color: 'var(--status-warning)', border: '1px solid color-mix(in srgb, var(--status-warning) 30%, transparent)' }}>{X.partial(15)}</span>;
      return <span style={{ display: 'inline-flex', width: 22, height: 22, borderRadius: 5, border: '1px solid var(--border-hairline)' }} />;
    }
    function RolesSection() {
      const RCOLS = '1fr repeat(6, 84px)';
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Roles &amp; permissions</h1>
              <p style={{ margin: '4px 0 0', font: '13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>What each role can do across the workspace.</p>
            </div>
            <Button variant="secondary" iconLeft={X.plus(16)}>Add custom role</Button>
          </div>

          {/* legend */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18, padding: '7px 14px', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-raised)', marginBottom: 16 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}><Cell state="full" />Allowed</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}><Cell state="partial" />Assigned projects only</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}><Cell state="none" />Not allowed</span>
          </div>

          <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-raised)' }}>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: RCOLS, alignItems: 'end', padding: '12px 18px', borderBottom: '1px solid var(--border-strong)', background: 'var(--surface-chrome)', position: 'sticky', top: 0 }}>
              <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Capability</span>
              {ROLES.map((r) => <span key={r} style={{ textAlign: 'center', font: '600 12px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{r}</span>)}
            </div>
            {CAPS.map((g) => (
              <div key={g.group}>
                <div style={{ padding: '8px 18px', background: 'color-mix(in srgb, var(--surface-chrome) 50%, var(--surface-raised))', borderBottom: '1px solid var(--border-hairline)', font: '600 10.5px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{g.group}</div>
                {g.items.map((cap, ri) => (
                  <div key={cap} className="adm-row" style={{ display: 'grid', gridTemplateColumns: RCOLS, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: '1px solid var(--border-hairline)' }}>
                    <span style={{ font: '13px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>{cap}</span>
                    {MATRIX[cap].map((state, ci) => <span key={ci} style={{ display: 'flex', justifyContent: 'center' }}><Cell state={state} /></span>)}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ===================== audit log ===================== */
    const AUDIT = [
      { time: '14 Jun, 14:22:08', actor: 'Marcus Okafor', action: 'Edited worksheet', target: 'Anchor schedule — Block B', ip: '203.0.113.42', tone: 'accent' },
      { time: '14 Jun, 13:55:11', actor: 'Nadia Brunel', action: 'Shared worksheet', target: 'Roof anchor point → m.okafor', ip: '198.51.100.7', tone: 'pass' },
      { time: '14 Jun, 11:30:02', actor: 'Nadia Brunel', action: 'Changed member role', target: 'r.vasquez → Engineer', ip: '198.51.100.7', tone: 'warning' },
      { time: '14 Jun, 09:48:40', actor: 'Toshiko Sato', action: 'Signed / approved', target: 'Mast base plate — wind · Rev C', ip: '203.0.113.88', tone: 'pass' },
      { time: '13 Jun, 17:02:19', actor: 'System', action: 'SSO login', target: 'b.adler via Okta', ip: '192.0.2.55', tone: 'muted' },
      { time: '13 Jun, 16:40:55', actor: 'Nadia Brunel', action: 'Invited member', target: 'l.haas@acme-eng.com · Engineer', ip: '198.51.100.7', tone: 'accent' },
      { time: '13 Jun, 10:12:03', actor: 'Rosa Vasquez', action: 'Exported PDF', target: 'Guardrail post — point load', ip: '203.0.113.21', tone: 'muted' },
      { time: '12 Jun, 15:31:47', actor: 'Marcus Okafor', action: 'Deleted worksheet', target: 'Superseded — rev A draft', ip: '203.0.113.42', tone: 'error' },
    ];
    function AuditSection() {
      const ACOLS = '152px 150px 150px 1fr 120px';
      const toneColor = (t) => t === 'accent' ? 'var(--accent)' : t === 'pass' ? 'var(--status-pass)' : t === 'warning' ? 'var(--status-warning)' : t === 'error' ? 'var(--status-error)' : 'var(--text-muted)';
      const Head = ({ children }) => <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</span>;
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 18 }}>
            <div>
              <h1 style={{ margin: 0, font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Audit log</h1>
              <p style={{ margin: '4px 0 0', font: '13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>Every workspace action, retained for 2 years.</p>
            </div>
            <Button variant="secondary" iconLeft={X.external(15)}>Export log</Button>
          </div>
          <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-raised)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: ACOLS, gap: 16, padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
              <Head>Timestamp</Head><Head>Actor</Head><Head>Action</Head><Head>Target</Head><Head>IP address</Head>
            </div>
            {AUDIT.map((a, i) => (
              <div key={i} className="adm-row" style={{ display: 'grid', gridTemplateColumns: ACOLS, gap: 16, alignItems: 'center', padding: 'var(--d-row-y) var(--d-row-x)', borderBottom: i < AUDIT.length - 1 ? '1px solid var(--border-hairline)' : 'none' }}>
                <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--text-muted)' }}>{a.time}</span>
                <span style={{ font: '12.5px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{a.actor}</span>
                <span style={{ font: '12.5px/1 var(--font-sans)', color: toneColor(a.tone), fontWeight: 500 }}>{a.action}</span>
                <span style={{ font: '12.5px/1.3 var(--font-sans)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.target}</span>
                <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--text-muted)' }}>{a.ip}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* ===================== placeholder ===================== */
    function Placeholder({ section }) {
      return (
        <div>
          <h1 style={{ margin: '0 0 4px', font: '600 22px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{section.label}</h1>
          <p style={{ margin: 0, font: '13px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>Workspace administration.</p>
          <div style={{ marginTop: 24, padding: '48px 24px', border: '1px dashed var(--border-strong)', borderRadius: 'var(--radius-md)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-flex', color: 'var(--text-muted)', marginBottom: 12 }}>{section.icon(26)}</div>
            <div style={{ font: '13.5px/1.5 var(--font-sans)' }}>{section.label} settings live here.</div>
            <div style={{ font: '12.5px/1.5 var(--font-sans)', marginTop: 4 }}>Open Members, Roles &amp; permissions, or Audit log to see fully-built admin views.</div>
          </div>
        </div>
      );
    }

    /* ===================== app ===================== */
    function App() {
      const [active, setActive] = useState('members');
      const [inviteOpen, setInviteOpen] = useState(false);

      const content = () => {
        if (active === 'members') return <MembersSection onInvite={() => setInviteOpen(true)} />;
        if (active === 'roles') return <RolesSection />;
        if (active === 'audit') return <AuditSection />;
        return <Placeholder section={SECTIONS.find((s) => s.id === active)} />;
      };

      return (
        <div style={{ display: 'flex', height: '100vh' }} data-screen-label="Workspace admin">
          <NavRail active="workspace" />
          {/* admin nav */}
          <aside style={{ width: 244, flex: '0 0 244px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '20px 18px 14px' }}>
              <div style={{ font: '600 16px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>Workspace</div>
              <div style={{ font: '12.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 3 }}>Acme Safety Engineering</div>
            </div>
            <div className="scroll-y" style={{ flex: 1, padding: '4px 8px 12px', minHeight: 0 }}>
              {SECTIONS.map((sec) => {
                const on = active === sec.id;
                return (
                  <button key={sec.id} onClick={() => setActive(sec.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '8px 10px', border: 'none', background: on ? 'var(--accent-tint)' : 'transparent', borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left', marginBottom: 1 }} onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'var(--surface-hover)'; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                    <span style={{ display: 'inline-flex', color: on ? 'var(--accent)' : 'var(--text-muted)' }}>{sec.icon(18)}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: 'block', font: (on ? '600 ' : '500 ') + '13px/1.2 var(--font-sans)', color: on ? 'var(--accent)' : 'var(--text-primary)' }}>{sec.label}</span>
                      {sec.sub && <span style={{ display: 'block', font: '11px/1.2 var(--font-sans)', color: 'var(--text-muted)', marginTop: 1 }}>{sec.sub}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border-hairline)', padding: '12px 16px', font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>Plan: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Team</strong> · 25 seats</div>
          </aside>
          {/* content */}
          <div className="scroll-y" style={{ flex: 1, minWidth: 0, padding: '36px 40px 60px', background: 'var(--surface-paper)' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto' }}>{content()}</div>
          </div>
          <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  };
  boot();
}
