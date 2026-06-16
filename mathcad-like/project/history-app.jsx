/* Quanta — Version history view */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QGallery) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge, Sub, Sup, Frac, Op } = Q;
    const { QLogo } = window.QGallery;
    const { useState, useRef, useEffect } = React;

    const svg = (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{c}</svg>;
    const BackI = (s) => svg(<path d="M14.5 6l-6 6 6 6"/>, s);
    const CompareI = (s) => svg(<><rect x="3" y="5" width="7" height="14" rx="1"/><rect x="14" y="5" width="7" height="14" rx="1"/><path d="M12 3v18"/></>, s);
    const RestoreI = (s) => svg(<><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5V9H8"/></>, s);
    const TagI = (s) => svg(<><path d="M4 4h7l9 9-7 7-9-9z"/><path d="M8 8h.01"/></>, s);
    const CloseI = (s) => svg(<path d="M6 6l12 12M18 6 6 18"/>, s);
    const CheckI = (s) => svg(<path d="M5 12l4.5 4.5L19 7"/>, s);
    const DotI = (s) => svg(<circle cx="12" cy="12" r="4"/>, s);

    /* ---- people ---- */
    const PEOPLE = { nb: { name: 'Nadia Brunel', c: 'var(--accent)' }, mo: { name: 'M. Okafor', c: '#1E8E5A' }, rv: { name: 'R. Vasquez', c: '#7A5BBF' } };
    const ini = (n) => n.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
    const Avatar = ({ id, sz = 22 }) => { const p = PEOPLE[id]; return <span title={p.name} style={{ width: sz, height: sz, borderRadius: '50%', background: p.c, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 ' + (sz * 0.4) + 'px/1 var(--font-sans)', flex: '0 0 auto' }}>{ini(p.name)}</span>; };

    /* ---- math helpers ---- */
    const It = ({ children }) => <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic' }}>{children}</span>;
    const M = ({ children, size = 17 }) => <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '0.14em', rowGap: 3, fontFamily: 'var(--font-math)', fontSize: size, color: 'var(--text-math)', lineHeight: 1.25 }}>{children}</span>;
    const Res = (children, tone) => <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.18em', padding: '1px 8px', borderRadius: 4, marginLeft: '0.15em', background: tone === 'pass' ? 'var(--status-pass-bg)' : 'var(--accent-tint)', color: tone === 'pass' ? 'var(--status-pass)' : 'var(--accent)', fontWeight: 600 }}>{children}</span>;
    const numU = (v, u) => <>{v}{u && <span style={{ fontSize: '0.82em', marginLeft: '0.12em' }}>{u}</span>}</>;

    /* ---- region renderers (value-driven) ---- */
    const REGIONS = [
      { id: 'title', kind: 'title', render: () => <h1 style={{ margin: 0, font: '600 22px/1.25 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Roof anchor point — pull-out check</h1> },
      { id: 'hInputs', kind: 'eyebrow', render: () => <Eyebrow>1 · Design inputs</Eyebrow> },
      { id: 'ft', label: 'F_t', render: (v) => <M><Sub base="F" sub="t" /><Op>:=</Op>{numU(v, 'kN')}<Note>applied tie-back force</Note></M> },
      { id: 'phi', label: 'φ', render: (v) => <M><It>φ</It><Op>:=</Op>{v}<Note>resistance factor</Note></M> },
      { id: 'dia', label: 'd', render: (v) => <M><It>d</It><Op>:=</Op>{numU(v, 'mm')}<Note>anchor diameter · SS316</Note></M> },
      { id: 'fub', label: 'f_ub', render: (v) => <M><Sub base="f" sub="ub" /><Op>:=</Op>{numU(v, 'MPa')}<Note>ultimate tensile strength</Note></M> },
      { id: 'hCap', kind: 'eyebrow', render: () => <Eyebrow>2 · Anchor tensile capacity</Eyebrow> },
      { id: 'as', render: (v) => <M><Sub base="A" sub="s" /><Op>=</Op><Frac num={<It>π</It>} den="4" /><Op>·</Op><Op>(</Op>0.85<Op>·</Op><It>d</It><Op>)</Op><Sup base="" sup="2" /><Op>=</Op>{Res(numU(v, 'mm²'))}</M> },
      { id: 'nrd', render: (v) => <M><Sub base="N" sub="Rd" /><Op>=</Op><It>φ</It><Op>·</Op><Sub base="A" sub="s" /><Op>·</Op><Sub base="f" sub="ub" /><Op>=</Op>{Res(numU(v, 'kN'), 'pass')}</M> },
      { id: 'hUtil', kind: 'eyebrow', render: () => <Eyebrow>3 · Utilization</Eyebrow> },
      { id: 'ur', render: (v) => <M><span style={{ fontStyle: 'italic' }}>UR</span><Op>:=</Op><Frac num={<Sub base="F" sub="t" />} den={<Sub base="N" sub="Rd" />} /><Op>=</Op>{Res(<span>{v}</span>, Number(v) < 1 ? 'pass' : 'accent')}<span style={{ marginLeft: '0.4em', font: '600 11px/1 var(--font-sans)', textTransform: 'uppercase', color: Number(v) < 1 ? 'var(--status-pass)' : 'var(--status-error)' }}>{Number(v) < 1 ? 'OK' : 'FAIL'}</span></M> },
      { id: 'note', kind: 'text', render: (v) => <span style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>{v}</span> },
    ];
    const Eyebrow = ({ children }) => <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</div>;
    const Note = ({ children }) => <span style={{ font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: 12 }}>{children}</span>;

    /* ---- versions (newest first); each has a snapshot map id->value (absent = not present) ---- */
    const base = { hInputs: 1, hCap: 1, hUtil: 1 }; // headings always present
    const VERSIONS = [
      { id: 'v5', label: null, who: 'nb', time: 'Today, 14:22', rel: 'Current draft', snap: { ...base, title: 1, ft: '14.5', phi: '0.67', dia: '16', fub: '700', as: '157', nrd: '47.2', ur: '0.31', note: 'Tensile stress area at thread root; SS316 A4-70.' } },
      { id: 'v4', label: 'Issued for review — Rev B', who: 'nb', time: 'Today, 09:48', rel: null, snap: { ...base, title: 1, ft: '12', phi: '0.67', dia: '16', fub: '700', as: '157', nrd: '47.2', ur: '0.25', note: 'Tensile stress area at thread root; SS316 A4-70.' } },
      { id: 'v3', label: null, who: 'mo', time: 'Yesterday, 17:02', rel: 'Autosave', snap: { ...base, title: 1, ft: '12', phi: '0.75', dia: '20', fub: '700', as: '245', nrd: '82.4', ur: '0.15' } },
      { id: 'v2', label: 'Rev A baseline', who: 'nb', time: '12 Jun, 11:30', rel: null, snap: { ...base, title: 1, ft: '12', phi: '0.75', dia: '16', fub: '700', as: '157', nrd: '52.8', ur: '0.23' } },
      { id: 'v1', label: null, who: 'nb', time: '12 Jun, 09:15', rel: 'Created', snap: { ...base, title: 1, ft: '10', phi: '0.75', dia: '16', fub: '700', as: '157', nrd: '52.8', ur: '0.19' } },
    ];
    const olderOf = (vid) => { const i = VERSIONS.findIndex((v) => v.id === vid); return i >= 0 && i < VERSIONS.length - 1 ? VERSIONS[i + 1] : null; };

    // diff status for region id between old snap and new snap
    function statusOf(oldSnap, newSnap, id) {
      const inOld = oldSnap && oldSnap[id] != null, inNew = newSnap && newSnap[id] != null;
      if (inNew && !inOld) return 'added';
      if (inOld && !inNew) return 'removed';
      if (inOld && inNew && String(oldSnap[id]) !== String(newSnap[id])) return 'changed';
      return 'same';
    }
    function summarize(oldSnap, newSnap) {
      let changed = 0, added = 0, removed = 0;
      REGIONS.forEach((r) => { if (r.kind === 'eyebrow') return; const s = statusOf(oldSnap, newSnap, r.id); if (s === 'changed') changed++; else if (s === 'added') added++; else if (s === 'removed') removed++; });
      const parts = [];
      if (changed) parts.push(changed + ' changed');
      if (added) parts.push(added + ' added');
      if (removed) parts.push(removed + ' removed');
      return parts.length ? parts.join(', ') : 'No region changes';
    }

    const STATUS_STYLE = {
      added: { rule: 'var(--status-pass)', bg: 'var(--status-pass-bg)' },
      changed: { rule: 'var(--status-warning)', bg: 'var(--status-warning-bg)' },
      removed: { rule: 'var(--status-error)', bg: 'var(--status-error-bg)' },
      same: null,
    };

    /* ---- a rendered region with diff chrome ---- */
    function RegionView({ region, value, status }) {
      const st = STATUS_STYLE[status];
      const removed = status === 'removed';
      return (
        <div style={{ position: 'relative', padding: '7px 12px', marginLeft: -12, borderRadius: 'var(--radius-sm)', background: st ? 'color-mix(in srgb, ' + st.bg + ' 60%, transparent)' : 'transparent', borderLeft: st ? '2px solid ' + st.rule : '2px solid transparent', opacity: removed ? 0.55 : 1 }}>
          <div style={{ textDecoration: removed ? 'line-through' : 'none', textDecorationColor: 'var(--status-error)' }}>
            {region.render(value)}
          </div>
          {status !== 'same' && (
            <span style={{ position: 'absolute', top: 6, right: 8, font: '9.5px/1 var(--font-sans)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: st.rule }}>{status}</span>
          )}
        </div>
      );
    }

    /* ---- a page rendering a snapshot, diffed against a reference ---- */
    function PageView({ snap, refSnap, narrow, showRemoved }) {
      // union of regions: those present in snap, plus removed ones (in refSnap not in snap) if showRemoved
      return (
        <article className={'vh-page' + (narrow ? ' narrow' : '')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 28px', borderBottom: '1px solid var(--border-hairline)', font: '10px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            <span>Acme Safety Engineering</span><span>Job 24-0488</span>
          </div>
          <div className="q-grid" style={{ padding: '22px 30px 30px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REGIONS.map((r) => {
              const present = snap[r.id] != null;
              const status = statusOf(refSnap, snap, r.id);
              if (!present) {
                if (showRemoved && status === 'removed') return <RegionView key={r.id} region={r} value={refSnap[r.id]} status="removed" />;
                return null;
              }
              if (r.kind === 'eyebrow') return <div key={r.id} style={{ marginTop: 8 }}><RegionView region={r} value={1} status={status === 'changed' ? 'same' : status} /></div>;
              return <RegionView key={r.id} region={r} value={snap[r.id]} status={status} />;
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 28px', borderTop: '1px solid var(--border-hairline)', font: '10px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
            <span>Quanta</span><span>Page 1 of 3</span>
          </div>
        </article>
      );
    }

    /* ---- diff legend ---- */
    function Legend() {
      const item = (color, label) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: color }} />{label}</span>;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, padding: '6px 12px', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-raised)' }}>
          {item('var(--status-pass)', 'Added')}
          {item('var(--status-warning)', 'Changed')}
          {item('var(--status-error)', 'Removed')}
        </div>
      );
    }

    /* ---- version timeline item ---- */
    function VersionItem({ v, idx, active, compareSel, compareMode, onClick, onPickCompare }) {
      const older = olderOf(v.id);
      const summary = summarize(older ? older.snap : null, v.snap);
      const inCompare = compareMode && (compareSel.a === v.id || compareSel.b === v.id);
      const cmpRole = compareSel.a === v.id ? 'New' : compareSel.b === v.id ? 'Old' : null;
      return (
        <div className="ver-item" onClick={() => onClick(v.id)} style={{ position: 'relative', display: 'flex', gap: 12, padding: '12px 14px 12px 16px', cursor: 'pointer', background: (active || inCompare) ? 'var(--accent-tint)' : 'transparent', borderLeft: '2px solid ' + ((active || inCompare) ? 'var(--accent)' : 'transparent') }}>
          {/* timeline rail */}
          <div style={{ position: 'relative', flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar id={v.who} sz={26} />
            {idx < VERSIONS.length - 1 && <span style={{ position: 'absolute', top: 30, bottom: -16, width: 1, background: 'var(--border-hairline)' }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ font: '12.5px/1.2 var(--font-sans)', fontWeight: v.label ? 600 : 500, color: 'var(--text-primary)' }}>{v.label || v.rel}</span>
              {v.rel === 'Current draft' && <Badge tone="accent">Current</Badge>}
              {cmpRole && compareMode && <span style={{ font: '9.5px/1 var(--font-sans)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 3, padding: '2px 4px' }}>{cmpRole}</span>}
            </div>
            {v.label && <div style={{ font: '11.5px/1.3 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{v.rel || 'Named version'}</div>}
            <div style={{ font: '11.5px/1 var(--font-mono)', color: 'var(--text-muted)', marginTop: 4 }}>{v.time} · {PEOPLE[v.who].name}</div>
            <div style={{ font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 5 }}>{summary}</div>
            {compareMode && (
              <button onClick={(e) => { e.stopPropagation(); onPickCompare(v.id); }} style={{ marginTop: 7, font: '11px/1 var(--font-sans)', color: 'var(--accent)', border: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>Set as {compareSel.a === v.id ? 'old' : 'new/old'}</button>
            )}
          </div>
        </div>
      );
    }

    /* ---- name dialog ---- */
    function NameDialog({ open, onClose }) {
      if (!open) return null;
      return (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--ink) 42%, transparent)', zIndex: 80 }} />
          <div role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 420, maxWidth: '92vw', zIndex: 81, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', padding: 20 }}>
            <div style={{ font: '600 15px/1.3 var(--font-sans)', marginBottom: 4 }}>Name this version</div>
            <div style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 16 }}>A named version is pinned in the timeline and easy to return to — e.g. an issue or a checkpoint.</div>
            <Q.Input placeholder="e.g. Issued for construction — Rev C" autoFocus />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={onClose}>Name version</Button>
            </div>
          </div>
        </>
      );
    }

    /* ---- restore confirm ---- */
    function RestoreDialog({ version, onClose }) {
      if (!version) return null;
      return (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--ink) 42%, transparent)', zIndex: 80 }} />
          <div role="dialog" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 440, maxWidth: '92vw', zIndex: 81, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-modal)', padding: 20 }}>
            <div style={{ font: '600 15px/1.3 var(--font-sans)', marginBottom: 4 }}>Restore this version?</div>
            <div style={{ font: '12.5px/1.55 var(--font-sans)', color: 'var(--text-muted)', marginBottom: 18 }}>This makes <strong style={{ color: 'var(--text-primary)' }}>{version.label || version.rel} · {version.time}</strong> the current worksheet. Your present draft is kept in history, so nothing is lost.</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button variant="secondary" onClick={onClose}>Cancel</Button>
              <Button variant="primary" iconLeft={RestoreI(16)} onClick={onClose}>Restore version</Button>
            </div>
          </div>
        </>
      );
    }

    /* ---- synced-scroll panes ---- */
    function SyncPanes({ left, right }) {
      const lRef = useRef(null), rRef = useRef(null), lock = useRef(false);
      const mk = (src, dst) => () => {
        if (lock.current) { lock.current = false; return; }
        if (!src.current || !dst.current) return;
        lock.current = true;
        dst.current.scrollTop = src.current.scrollTop;
      };
      return (
        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          <div ref={lRef} onScroll={mk(lRef, rRef)} className="scroll-y vh-field" style={{ flex: 1, minWidth: 0, padding: '22px 20px 60px', borderRight: '1px solid var(--border-strong)' }}>
            <PaneLabel tone="error">Old</PaneLabel>{left}
          </div>
          <div ref={rRef} onScroll={mk(rRef, lRef)} className="scroll-y vh-field" style={{ flex: 1, minWidth: 0, padding: '22px 20px 60px' }}>
            <PaneLabel tone="pass">New</PaneLabel>{right}
          </div>
        </div>
      );
    }
    const PaneLabel = ({ tone, children }) => <div style={{ width: '100%', maxWidth: 560, margin: '0 auto 12px', display: 'flex', justifyContent: 'center' }}><span style={{ font: '10.5px/1 var(--font-sans)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: tone === 'pass' ? 'var(--status-pass)' : 'var(--status-error)', background: tone === 'pass' ? 'var(--status-pass-bg)' : 'var(--status-error-bg)', borderRadius: 99, padding: '4px 12px' }}>{tone === 'pass' ? 'Newer version' : 'Older version'}</span></div>;

    /* ---- app ---- */
    function App() {
      const [selected, setSelected] = useState('v4');
      const [compareMode, setCompareMode] = useState(false);
      const [compareSel, setCompareSel] = useState({ a: 'v5', b: 'v2' }); // a=new, b=old
      const [nameOpen, setNameOpen] = useState(false);
      const [restoreVer, setRestoreVer] = useState(null);

      const selVer = VERSIONS.find((v) => v.id === selected);
      const older = olderOf(selected);
      const newVer = VERSIONS.find((v) => v.id === compareSel.a);
      const oldVer = VERSIONS.find((v) => v.id === compareSel.b);

      const onItemClick = (id) => {
        if (compareMode) {
          // toggle into compare slots: clicking sets the 'new' (a); previous a becomes b
          setCompareSel((cs) => cs.a === id ? cs : { a: id, b: cs.a });
        } else setSelected(id);
      };
      const onPickCompare = (id) => setCompareSel((cs) => ({ a: cs.a === id ? cs.a : id, b: cs.a === id ? cs.b : cs.a }));

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }} data-screen-label="Version history">
          {/* app bar */}
          <header style={{ display: 'flex', alignItems: 'center', gap: 14, height: 52, flex: '0 0 52px', padding: '0 16px', background: 'var(--surface-chrome)', borderBottom: '1px solid var(--border-hairline)' }}>
            <button className="q-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', font: '13px/1 var(--font-sans)' }}>{BackI(17)} Back to worksheet</button>
            <span style={{ width: 1, height: 22, background: 'var(--border-hairline)' }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '600 13.5px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>Version history</div>
              <div style={{ font: '11.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>Roof anchor point — pull-out check</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
              {(compareMode || true) && <Legend />}
              <button onClick={() => setCompareMode((c) => !c)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 34, padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid ' + (compareMode ? 'var(--accent)' : 'var(--border-strong)'), background: compareMode ? 'var(--accent-tint)' : 'var(--surface-raised)', color: compareMode ? 'var(--accent)' : 'var(--text-primary)', font: '500 13px/1 var(--font-sans)', cursor: 'pointer' }}>{CompareI(16)} Compare</button>
              <span style={{ width: 1, height: 22, background: 'var(--border-hairline)' }} />
              <Button variant="secondary" iconLeft={TagI(15)} onClick={() => setNameOpen(true)}>Name this version</Button>
              <Button variant="primary" iconLeft={RestoreI(15)} onClick={() => setRestoreVer(compareMode ? oldVer : selVer)}>Restore this version</Button>
            </div>
          </header>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* timeline */}
            <aside style={{ width: 308, flex: '0 0 308px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ font: '600 12px/1 var(--font-sans)', letterSpacing: '0.04em', color: 'var(--text-primary)' }}>{VERSIONS.length} versions</span>
                {compareMode && <span style={{ font: '11.5px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>· pick two to compare</span>}
              </div>
              <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: '6px 0' }}>
                {VERSIONS.map((v, i) => <VersionItem key={v.id} v={v} idx={i} active={!compareMode && selected === v.id} compareSel={compareSel} compareMode={compareMode} onClick={onItemClick} onPickCompare={onPickCompare} />)}
              </div>
            </aside>

            {/* preview */}
            {!compareMode ? (
              <div className="scroll-y vh-field" style={{ flex: 1, minWidth: 0, padding: '26px 0 80px' }}>
                <div style={{ width: 720, maxWidth: '94%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ font: '12.5px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>Showing <strong style={{ color: 'var(--text-primary)' }}>{selVer.label || selVer.rel}</strong>{older && <> · changes vs. {older.label || older.rel}</>}</span>
                  <span style={{ font: '11.5px/1 var(--font-mono)', color: 'var(--text-muted)' }}>{selVer.time}</span>
                </div>
                <PageView snap={selVer.snap} refSnap={older ? older.snap : selVer.snap} showRemoved />
              </div>
            ) : (
              <SyncPanes
                left={<PageView snap={oldVer.snap} refSnap={oldVer.snap} narrow />}
                right={<PageView snap={newVer.snap} refSnap={oldVer.snap} narrow showRemoved />}
              />
            )}
          </div>

          <NameDialog open={nameOpen} onClose={() => setNameOpen(false)} />
          <RestoreDialog version={restoreVer} onClose={() => setRestoreVer(null)} />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  };
  boot();
}
