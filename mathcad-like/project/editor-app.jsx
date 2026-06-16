/* Quanta editor — app shell (bar · ribbon · panels · inspector · status · keypad) */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QEdIcons || !window.QEdCanvas) { return setTimeout(boot, 40); }
    const { Button, IconButton, Badge, Input, Select, Switch } = Q;
    const Ic = window.QEdIcons;
    const Canvas = window.QEdCanvas.Canvas;
    const { useState, useRef, useEffect } = React;

    const It = ({ children }) => <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic' }}>{children}</span>;
    const Eyebrow = ({ children }) => <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{children}</div>;

    /* ============================== APP BAR ============================== */
    function AppBar({ calcMode, setCalcMode }) {
      const ghostIcon = (icon, label) => (
        <button title={label} aria-label={label} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>{icon(18)}</button>
      );
      return (
        <header style={{ display: 'flex', alignItems: 'center', gap: 14, height: 44, flex: '0 0 44px', padding: '0 12px', background: 'var(--surface-chrome)', borderBottom: '1px solid var(--border-hairline)' }}>
          {/* left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto', minWidth: 0 }}>
            {ghostIcon(Ic.menu, 'Menu')}
            <span style={{ width: 1, height: 20, background: 'var(--border-hairline)' }} />
            <span style={{ display: 'inline-flex' }}>
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect x="2.75" y="2.75" width="26.5" height="26.5" rx="4" stroke="var(--accent)" strokeWidth="1.5" /><line x1="8" y1="16" x2="24" y2="16" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" /><line x1="12.5" y1="10.25" x2="19.5" y2="10.25" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="16" cy="21.75" r="1.6" fill="var(--status-pass)" /></svg>
            </span>
            <input className="bare" defaultValue="Roof anchor point — pull-out check" spellCheck={false}
              style={{ font: '600 13.5px/1 var(--font-sans)', color: 'var(--text-primary)', width: 268, padding: '4px 6px', borderRadius: 4 }}
              onFocus={(e) => e.target.style.background = 'var(--surface-raised)'} onBlur={(e) => e.target.style.background = 'transparent'} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)', flex: '0 0 auto' }}>
              <span style={{ color: 'var(--status-pass)', display: 'inline-flex' }}>{Ic.check(13)}</span> Saved
            </span>
          </div>

          {/* center */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 28 }}>
              {['Auto', 'Manual'].map((m) => {
                const on = calcMode === m.toLowerCase();
                return <button key={m} onClick={() => setCalcMode(m.toLowerCase())} style={{ padding: '0 12px', height: '100%', border: 'none', cursor: 'pointer', background: on ? 'var(--accent-tint)' : 'var(--surface-raised)', color: on ? 'var(--accent)' : 'var(--text-muted)', font: (on ? '600' : '500') + ' 12px/1 var(--font-sans)' }}>{m}</button>;
              })}
            </div>
            <button disabled={calcMode === 'auto'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', cursor: calcMode === 'auto' ? 'not-allowed' : 'pointer', color: calcMode === 'auto' ? 'var(--text-muted)' : 'var(--text-primary)', font: '500 12px/1 var(--font-sans)', opacity: calcMode === 'auto' ? 0.55 : 1 }}>{Ic.refresh(15)} Recalculate</button>
            <Badge tone="pass" dot>All current</Badge>
          </div>

          {/* right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 10px', borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--text-muted)', font: '500 12.5px/1 var(--font-sans)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}>{Ic.play(15)} Present</button>
            <Button variant="secondary" size="sm" iconLeft={Ic.share(15)} style={{ height: 30 }}>Share</Button>
            {ghostIcon(Ic.comment, 'Comments')}
            <button title="Ask Quanta AI" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: '1px solid color-mix(in srgb, var(--accent) 35%, transparent)', background: 'var(--accent-tint)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer' }}>{Ic.sparkle(17)}</button>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)', color: 'var(--text-inverse)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', font: '600 11px/1 var(--font-sans)', marginLeft: 4 }}>NB</span>
          </div>
        </header>
      );
    }

    /* ============================== RIBBON ============================== */
    const TABS = ['Home', 'Insert', 'Math', 'Operators', 'Functions', 'Matrices', 'Plot', 'Format', 'Document', 'Calculate', 'Review'];

    function RibbonBigBtn({ icon, glyph, label, accent }) {
      return (
        <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, width: 58, height: 60, border: '1px solid transparent', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: accent ? 'var(--accent)' : 'var(--text-primary)' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span style={{ display: 'inline-flex', height: 24, alignItems: 'center', fontFamily: 'var(--font-math)', fontSize: 21 }}>{glyph || icon(22)}</span>
          <span style={{ font: '11px/1.1 var(--font-sans)', textAlign: 'center' }}>{label}</span>
        </button>
      );
    }
    function RibbonSmBtn({ icon, glyph, label }) {
      return (
        <button style={{ display: 'flex', alignItems: 'center', gap: 8, height: 22, padding: '0 8px 0 6px', border: '1px solid transparent', borderRadius: 5, background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', width: '100%', textAlign: 'left' }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <span style={{ display: 'inline-flex', width: 16, justifyContent: 'center', color: 'var(--text-muted)', fontFamily: glyph ? 'var(--font-math)' : 'inherit', fontSize: glyph ? 15 : 'inherit' }}>{glyph || icon(16)}</span>
          <span style={{ font: '12px/1 var(--font-sans)', whiteSpace: 'nowrap' }}>{label}</span>
        </button>
      );
    }
    function RibbonGroup({ label, children, width }) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '0 10px', borderRight: '1px solid var(--border-hairline)', minWidth: width }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
          <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--text-muted)', paddingBottom: 4, letterSpacing: '0.02em' }}>{label}</div>
        </div>
      );
    }
    const SmStack = ({ children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center' }}>{children}</div>;

    function Ribbon({ ribbonTab, setRibbonTab, collapsed, setCollapsed, decimals, setDecimals }) {
      return (
        <div style={{ flex: '0 0 auto', background: 'var(--surface-chrome)', borderBottom: '1px solid var(--border-hairline)' }}>
          {/* tab row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderBottom: collapsed ? 'none' : '1px solid var(--border-hairline)', height: 34 }}>
            {TABS.map((t) => {
              const on = ribbonTab === t;
              return <button key={t} className={'ed-tab' + (on ? ' on' : '')} onClick={() => setRibbonTab(t)} style={{ padding: '0 11px', height: 34, color: on ? 'var(--text-primary)' : 'var(--text-muted)', font: (on ? '600' : '500') + ' 12.5px/1 var(--font-sans)' }}>{t}</button>;
            })}
            <button onClick={() => setCollapsed((c) => !c)} title={collapsed ? 'Show ribbon' : 'Collapse ribbon'} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 5, color: 'var(--text-muted)', cursor: 'pointer' }}>{collapsed ? Ic.chevD(16) : Ic.chevU(16)}</button>
          </div>

          {/* controls row */}
          {!collapsed && (
            <div className="scroll-x" style={{ display: 'flex', alignItems: 'stretch', height: 84, padding: '0 4px' }}>
              <RibbonGroup label="Clipboard">
                <RibbonBigBtn icon={Ic.paste} label="Paste" />
                <SmStack>
                  <RibbonSmBtn icon={Ic.cut} label="Cut" />
                  <RibbonSmBtn icon={Ic.copy} label="Copy" />
                </SmStack>
              </RibbonGroup>

              <RibbonGroup label="Region">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 2px' }}>
                  <RibbonSmBtn glyph="=" label="Math" />
                  <RibbonSmBtn icon={Ic.area} label="Area" />
                  <RibbonSmBtn glyph="T" label="Text" />
                  <RibbonSmBtn icon={Ic.image} label="Image" />
                  <RibbonSmBtn icon={Ic.table} label="Table" />
                  <RibbonSmBtn icon={Ic.control} label="Control" />
                </div>
              </RibbonGroup>

              <RibbonGroup label="Math format">
                <RibbonBigBtn icon={Ic.fmt} label="Result format" />
                <SmStack>
                  <RibbonSmBtn icon={Ic.unit} label="Units display" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '1px 6px' }}>
                    <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--text-primary)' }}>Decimals</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', height: 20 }}>
                      <button onClick={() => setDecimals((d) => Math.max(0, d - 1))} style={{ width: 18, height: '100%', border: 'none', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13 }}>−</button>
                      <span style={{ width: 18, textAlign: 'center', font: '12px var(--font-mono)' }}>{decimals}</span>
                      <button onClick={() => setDecimals((d) => Math.min(6, d + 1))} style={{ width: 18, height: '100%', border: 'none', background: 'var(--surface-raised)', borderLeft: '1px solid var(--border-hairline)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13 }}>+</button>
                    </div>
                  </div>
                  <RibbonSmBtn icon={Ic.steps} label="Show steps" />
                </SmStack>
              </RibbonGroup>

              <RibbonGroup label="Text">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 10px', border: '1px solid var(--border-strong)', borderRadius: 4, background: 'var(--surface-raised)', cursor: 'pointer', minWidth: 116 }}>
                    <span style={{ font: '12.5px/1 var(--font-sans)' }}>Body</span>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', display: 'inline-flex' }}>{Ic.chevD(14)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 1 }}>
                    {[['B', 700], ['I', 400], ['U', 400]].map(([g, w], i) => (
                      <button key={i} style={{ width: 26, height: 24, border: '1px solid transparent', borderRadius: 4, background: 'transparent', cursor: 'pointer', font: w + ' 13px/1 var(--font-sans)', fontStyle: g === 'I' ? 'italic' : 'normal', textDecoration: g === 'U' ? 'underline' : 'none', color: 'var(--text-primary)' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>{g}</button>
                    ))}
                  </div>
                </div>
              </RibbonGroup>

              <RibbonGroup label="Insert" width={0}>
                <RibbonBigBtn glyph={<It>ƒ</It>} label="Function" />
                <SmStack>
                  <RibbonSmBtn icon={Ic.unit} label="Unit" />
                  <RibbonSmBtn glyph="Σ" label="Symbol" />
                  <RibbonSmBtn icon={Ic.plot} label="Plot" />
                </SmStack>
                <RibbonBigBtn icon={Ic.solve} label="Solve block" />
              </RibbonGroup>
            </div>
          )}
        </div>
      );
    }

    /* ============================== LEFT PANEL ============================== */
    function LeftPanel({ open, setOpen }) {
      const [tab, setTab] = useState('outline');
      if (!open) {
        return (
          <div style={{ width: 32, flex: '0 0 32px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
            <IconButton label="Show panel" onClick={() => setOpen(true)}>{Ic.chevR(17)}</IconButton>
          </div>
        );
      }
      const TabBtn = ({ id, label }) => (
        <button onClick={() => setTab(id)} className={'ed-tab' + (tab === id ? ' on' : '')} style={{ flex: 1, height: 34, color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)', font: (tab === id ? '600' : '500') + ' 12px/1 var(--font-sans)' }}>{label}</button>
      );
      const outline = [
        { t: 'Roof anchor point — pull-out check', p: 1, lvl: 0, tag: 'title' },
        { t: 'Design inputs', p: 1, lvl: 1 },
        { t: 'Anchor tensile capacity', p: 1, lvl: 1 },
        { t: 'Utilization', p: 1, lvl: 1 },
        { t: 'Anchor schedule', p: 1, lvl: 1, tag: 'table' },
        { t: 'Capacity vs. edge distance', p: 1, lvl: 1, tag: 'plot' },
        { t: 'Pull-out — concrete cone breakout', p: 2, lvl: 0 },
        { t: 'CCD method', p: 2, lvl: 1 },
        { t: 'Edge & spacing factors', p: 2, lvl: 1 },
        { t: 'Summary & sign-off', p: 3, lvl: 0 },
      ];
      const vars = [
        { n: <Sub2 b="F" s="t" />, v: '12.0', u: 'kN' }, { n: <It>φ</It>, v: '0.75', u: '' },
        { n: <It>d</It>, v: '16', u: 'mm' }, { n: <Sub2 b="f" s="ub" />, v: '700', u: 'MPa' },
        { n: <Sub2 b="A" s="s" />, v: '157', u: 'mm²' }, { n: <Sub2 b="N" s="Rd" />, v: '52.8', u: 'kN' },
        { n: <span style={{ fontStyle: 'italic' }}>UR</span>, v: '0.23', u: '' },
      ];
      const files = [
        { name: 'Acme Safety Engineering', folder: true, open: true },
        { name: 'Roof anchor point — pull-out check', active: true, indent: 1 },
        { name: 'Lifeline span — deflection', indent: 1 },
        { name: 'Guardrail post — point load', indent: 1 },
        { name: 'Edge Protection', folder: true },
        { name: 'Shared library', folder: true },
      ];
      return (
        <aside style={{ width: 244, flex: '0 0 244px', borderRight: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 6px', borderBottom: '1px solid var(--border-hairline)' }}>
            <TabBtn id="outline" label="Outline" />
            <TabBtn id="variables" label="Variables" />
            <TabBtn id="files" label="Files" />
            <IconButton label="Hide panel" size="sm" onClick={() => setOpen(false)}>{Ic.chevL(16)}</IconButton>
          </div>
          <div className="scroll-y" style={{ flex: 1, padding: '8px 6px', minHeight: 0 }}>
            {tab === 'outline' && outline.map((o, i) => (
              <button key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', paddingLeft: 8 + o.lvl * 16, border: 'none', background: i === 0 ? 'var(--accent-tint)' : 'transparent', borderRadius: 5, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { if (i !== 0) e.currentTarget.style.background = 'var(--surface-hover)'; }} onMouseLeave={(e) => { if (i !== 0) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ flex: 1, minWidth: 0, font: (o.lvl === 0 ? '600 ' : '400 ') + '12.5px/1.3 var(--font-sans)', color: o.lvl === 0 ? 'var(--text-primary)' : (i === 0 ? 'var(--accent)' : 'var(--text-primary)'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.t}</span>
                {o.tag && <span style={{ font: '9.5px/1 var(--font-mono)', color: 'var(--text-muted)', border: '1px solid var(--border-hairline)', borderRadius: 3, padding: '1px 3px' }}>{o.tag}</span>}
                <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', flex: '0 0 auto' }}>{o.p}</span>
              </button>
            ))}
            {tab === 'variables' && (
              <div>
                <div style={{ padding: '2px 8px 8px', font: '11px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>7 names defined · in reading order</div>
                {vars.map((v, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 5, cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flex: '0 0 auto' }} />
                    <span style={{ flex: 1, fontFamily: 'var(--font-math)', fontSize: 14 }}>{v.n}</span>
                    <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--text-primary)' }}>{v.v}</span>
                    <span style={{ font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', minWidth: 28 }}>{v.u}</span>
                  </div>
                ))}
              </div>
            )}
            {tab === 'files' && files.map((f, i) => (
              <button key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 8px', paddingLeft: 8 + (f.indent || 0) * 18, border: 'none', background: f.active ? 'var(--accent-tint)' : 'transparent', borderRadius: 5, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={(e) => { if (!f.active) e.currentTarget.style.background = 'var(--surface-hover)'; }} onMouseLeave={(e) => { if (!f.active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ color: f.folder ? 'var(--accent)' : (f.active ? 'var(--accent)' : 'var(--text-muted)'), display: 'inline-flex', flex: '0 0 auto' }}>{f.folder ? Ic.folder(16) : Ic.sheet(15)}</span>
                <span style={{ flex: 1, minWidth: 0, font: (f.folder ? '600 ' : '400 ') + '12.5px/1.3 var(--font-sans)', color: f.active ? 'var(--accent)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              </button>
            ))}
          </div>
        </aside>
      );
    }
    function Sub2({ b, s }) { return <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic' }}>{b}<sub style={{ fontSize: '0.66em', fontStyle: 'normal' }}>{s}</sub></span>; }

    /* ============================== RIGHT PANEL (INSPECTOR) ============================== */
    function InspectorGroup({ eyebrow, children }) {
      return (
        <div style={{ padding: '13px 14px', borderBottom: '1px solid var(--border-hairline)' }}>
          <Eyebrow>{eyebrow}</Eyebrow>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginTop: 11 }}>{children}</div>
        </div>
      );
    }
    const IRow = ({ label, children }) => (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ font: '12.5px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{label}</span>
        {children}
      </div>
    );
    function Stepper({ value, set }) {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', height: 28 }}>
          <button onClick={() => set(Math.max(0, value - 1))} style={{ width: 26, height: '100%', border: 'none', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14 }}>−</button>
          <span style={{ width: 30, textAlign: 'center', font: '13px var(--font-mono)' }}>{value}</span>
          <button onClick={() => set(Math.min(6, value + 1))} style={{ width: 26, height: '100%', border: 'none', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 14 }}>+</button>
        </div>
      );
    }
    function Segmented({ options, value, set }) {
      return (
        <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', height: 26 }}>
          {options.map((o, i) => {
            const on = value === o;
            return <button key={o} onClick={() => set(o)} style={{ padding: '0 9px', height: '100%', border: 'none', borderLeft: i ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer', background: on ? 'var(--accent-tint)' : 'var(--surface-raised)', color: on ? 'var(--accent)' : 'var(--text-muted)', font: (on ? '600' : '500') + ' 11.5px/1 var(--font-mono)' }}>{o}</button>;
          })}
        </div>
      );
    }
    const ToggleRow = ({ label, checked, set }) => (
      <IRow label={label}><Switch checked={checked} onChange={(e) => set(e.target.checked)} /></IRow>
    );

    function RightPanel({ open, setOpen, decimals, setDecimals, selectedId }) {
      const [radix, setRadix] = useState('Dec');
      const [notation, setNotation] = useState('auto');
      const [disp, setDisp] = useState({ name: true, formula: true, sub: false, result: true });
      const [border, setBorder] = useState(false);
      if (!open) {
        return (
          <div style={{ width: 32, flex: '0 0 32px', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8 }}>
            <IconButton label="Show inspector" onClick={() => setOpen(true)}>{Ic.chevL(17)}</IconButton>
          </div>
        );
      }
      const none = !selectedId;
      return (
        <aside style={{ width: 286, flex: '0 0 286px', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border-hairline)' }}>
            <span style={{ font: '600 13px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>Inspector</span>
            {!none && <Badge tone="accent">Math region</Badge>}
            <IconButton label="Hide inspector" size="sm" style={{ marginLeft: 'auto' }} onClick={() => setOpen(false)}>{Ic.chevR(16)}</IconButton>
          </div>
          {none ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
              <span style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>Select a region to inspect its format, units, and display.</span>
            </div>
          ) : (
            <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'var(--font-math)', fontSize: 16 }}><Sub2 b="N" s="Rd" /></span>
                <span style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>Anchor tensile capacity</span>
              </div>

              <InspectorGroup eyebrow="Result format">
                <IRow label="Decimal places"><Stepper value={decimals} set={setDecimals} /></IRow>
                <IRow label="Significant figures"><div style={{ width: 96 }}><Select defaultValue="auto" options={[{ value: 'auto', label: 'Auto' }, { value: '3', label: '3' }, { value: '4', label: '4' }]} /></div></IRow>
                <IRow label="Notation"><div style={{ width: 116 }}><Select value={notation} onChange={(e) => setNotation(e.target.value)} options={[{ value: 'auto', label: 'Auto' }, { value: 'sci', label: 'Scientific' }, { value: 'eng', label: 'Engineering' }]} /></div></IRow>
                <IRow label="Radix"><Segmented options={['Dec', 'Bin', 'Oct', 'Hex']} value={radix} set={setRadix} /></IRow>
              </InspectorGroup>

              <InspectorGroup eyebrow="Units">
                <IRow label="Target unit"><div style={{ width: 110 }}><Input mono defaultValue="kN" /></div></IRow>
                <div style={{ font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>Auto-converts from base SI. Mismatches flag inline.</div>
              </InspectorGroup>

              <InspectorGroup eyebrow="Display — show steps">
                <ToggleRow label="Name" checked={disp.name} set={(v) => setDisp({ ...disp, name: v })} />
                <ToggleRow label="Formula" checked={disp.formula} set={(v) => setDisp({ ...disp, formula: v })} />
                <ToggleRow label="Substituted values" checked={disp.sub} set={(v) => setDisp({ ...disp, sub: v })} />
                <ToggleRow label="Result" checked={disp.result} set={(v) => setDisp({ ...disp, result: v })} />
              </InspectorGroup>

              <InspectorGroup eyebrow="Conditional format">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', border: '1px solid var(--border-hairline)', borderRadius: 6, background: 'var(--surface-raised)' }}>
                  <span style={{ font: '12px/1.3 var(--font-mono)', color: 'var(--text-primary)', flex: 1 }}>if&nbsp; result &gt; 1&nbsp; →</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: '11.5px/1 var(--font-sans)', color: 'var(--status-error)' }}><span style={{ width: 9, height: 9, borderRadius: 2, background: 'var(--status-error)' }} /> red</span>
                  <IconButton label="Edit rule" size="sm">{Ic.gear(15)}</IconButton>
                </div>
                <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, alignSelf: 'flex-start', border: 'none', background: 'none', color: 'var(--accent)', font: '500 12px/1 var(--font-sans)', cursor: 'pointer', padding: 0 }}>{Ic.plusSm(13)} Add rule</button>
              </InspectorGroup>

              <InspectorGroup eyebrow="Region">
                <ToggleRow label="Show border" checked={border} set={setBorder} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ font: '12.5px/1 var(--font-sans)', color: 'var(--text-primary)' }}>Tag / label</span>
                  <Input mono defaultValue="cap-NRd" prefix="#" />
                </div>
              </InspectorGroup>
            </div>
          )}
        </aside>
      );
    }

    /* ============================== STATUS BAR ============================== */
    function StatusBar({ zoom, setZoom, leftOpen, setLeftOpen, rightOpen, setRightOpen }) {
      return (
        <footer style={{ display: 'flex', alignItems: 'center', gap: 16, height: 28, flex: '0 0 28px', padding: '0 12px', background: 'var(--surface-chrome)', borderTop: '1px solid var(--border-hairline)', font: '11.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--status-pass)' }} /> All current</span>
          <span>12 regions · 0 errors</span>
          <span style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 16 }}>
            <span style={{ fontFamily: 'var(--font-mono)' }}>Ln 4, Col 18</span>
            <span>Page 1 of 3</span>
          </span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Units</span>
            <div style={{ width: 64 }}><Select defaultValue="si" options={[{ value: 'si', label: 'SI' }, { value: 'uscs', label: 'USCS' }, { value: 'cgs', label: 'CGS' }]} /></div>
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <input type="range" min="50" max="150" value={Math.round(zoom * 100)} onChange={(e) => setZoom(Number(e.target.value) / 100)} style={{ width: 96, accentColor: 'var(--accent)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', width: 34 }}>{Math.round(zoom * 100)}%</span>
            <button title="Fit width" onClick={() => setZoom(1)} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 22, border: 'none', background: 'transparent', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>{Ic.fit(15)}</button>
          </div>
        </footer>
      );
    }

    /* ============================== FLOATING KEYPAD ============================== */
    // Build: the Mathcad type-to-math moves, each with its key hint
    const KP_BUILD = [
      { s: 'a⁄b', k: '/' }, { s: 'xⁿ', k: '^' }, { s: 'x_n', k: '_' }, { s: '√', k: '\\' },
      { s: ':=', k: ':' }, { s: '=', k: '=' }, { s: '|x|', k: '|' }, { s: 'x.t', k: '.' },
      { s: 'π', k: '⌃G' }, { s: 'x[i', k: '[' }, { s: 'a..b', k: ';' }, { s: '⎵', k: 'Spc' },
    ];
    const KP = {
      Build: KP_BUILD,
      Greek: ['α', 'β', 'γ', 'δ', 'ε', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'φ', 'ψ', 'ω', 'Δ', 'Σ', 'Ω', '∇', 'φ'],
      Operators: ['+', '−', '×', '÷', '±', '·', '=', '≠', '≤', '≥', '≈', '∝', '→', '∈', '√', '∞'],
      Fractions: ['a⁄b', 'x²', 'xⁿ', 'x_n', '√', '∛', '|x|', '⌊x⌋', '⌈x⌉', 'x̄', 'e^x', 'log'],
      Calculus: ['∫', '∮', '∂', '∑', '∏', '∇', 'lim', 'd⁄dx', '∆', '′', '″', '…'],
      Matrices: ['[ ]', '( )', '{ }', '2×2', '3×3', 'det', 'Aᵀ', 'A⁻¹', 'I', '⊗', '·', '×'],
    };
    function Keypad() {
      const [open, setOpen] = useState(false);
      const [cat, setCat] = useState('Build');
      const [pos, setPos] = useState({ x: null, y: 18 });
      const drag = useRef(null);
      const onDown = (e) => { drag.current = { sx: e.clientX, sy: e.clientY, ox: e.currentTarget.parentElement.getBoundingClientRect().left, oy: e.currentTarget.parentElement.getBoundingClientRect().top }; window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); };
      const onMove = (e) => { const d = drag.current; if (!d) return; setPos({ x: d.ox + (e.clientX - d.sx), y: window.innerHeight - (d.oy + (e.clientY - d.sy)) - 0, fixedTop: d.oy + (e.clientY - d.sy) }); };
      const onUp = () => { drag.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
      const baseStyle = pos.x == null
        ? { left: '50%', transform: 'translateX(-50%)', bottom: pos.y }
        : { left: pos.x, top: pos.fixedTop != null ? pos.fixedTop : undefined, bottom: pos.fixedTop != null ? undefined : pos.y };
      if (!open) {
        return (
          <button onClick={() => setOpen(true)} style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 18, zIndex: 40, display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 14px', borderRadius: 99, border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', boxShadow: 'var(--shadow-popover)', cursor: 'pointer', color: 'var(--text-primary)', font: '500 12.5px/1 var(--font-sans)' }}>
            <span style={{ fontFamily: 'var(--font-math)', fontSize: 15 }}>Σ</span> Math keypad <span style={{ color: 'var(--text-muted)' }}>{Ic.chevU(14)}</span>
          </button>
        );
      }
      return (
        <div style={{ position: 'fixed', zIndex: 40, width: 320, background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderRadius: 8, boxShadow: 'var(--shadow-modal)', ...baseStyle }}>
          <div onMouseDown={onDown} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid var(--border-hairline)', cursor: 'grab', background: 'var(--surface-chrome)', borderRadius: '8px 8px 0 0' }}>
            <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{Ic.grip(14)}</span>
            <span style={{ font: '600 12px/1 var(--font-sans)', color: 'var(--text-primary)' }}>Math keypad</span>
            <span style={{ font: '10.5px/1 var(--font-sans)', color: 'var(--text-muted)', background: 'var(--accent-tint)', borderRadius: 99, padding: '3px 7px' }}>Keymap: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Mathcad</span></span>
            <button onClick={() => setOpen(false)} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, border: 'none', background: 'transparent', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>{Ic.chevD(15)}</button>
          </div>
          <div style={{ display: 'flex', gap: 2, padding: '6px 8px 0' }}>
            {Object.keys(KP).map((k) => (
              <button key={k} onClick={() => setCat(k)} className={'ed-tab' + (cat === k ? ' on' : '')} style={{ padding: '5px 7px', font: (cat === k ? '600' : '500') + ' 11px/1 var(--font-sans)', color: cat === k ? 'var(--text-primary)' : 'var(--text-muted)' }}>{k}</button>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border-hairline)', marginTop: 6, padding: 8, display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 4 }}>
            {KP[cat].map((it, i) => {
              const s = typeof it === 'string' ? it : it.s;
              const hint = typeof it === 'string' ? null : it.k;
              return (
                <button key={i} className="kp-key" title={hint ? 'Key: ' + hint : undefined} style={{ position: 'relative', gridColumn: s.length > 2 ? 'span 2' : 'span 1', fontSize: s.length > 2 ? 12 : 15, fontFamily: s.length > 2 ? 'var(--font-sans)' : 'var(--font-math)' }}>
                  {s}
                  {hint && <span style={{ position: 'absolute', bottom: -1, right: -1, font: '8px/1 var(--font-mono)', color: 'var(--text-muted)', background: 'var(--surface-chrome)', border: '1px solid var(--border-hairline)', borderBottom: '2px solid var(--border-strong)', borderRadius: 3, padding: '1px 2px', minWidth: 10, textAlign: 'center' }}>{hint}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: '1px solid var(--border-hairline)', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6, font: '10.5px/1.4 var(--font-sans)', color: 'var(--text-muted)' }}>
            <span>Type to build notation.</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 5 }}>All shortcuts <kbd style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 16, height: 17, padding: '0 4px', background: 'var(--surface-raised)', border: '1px solid var(--border-strong)', borderBottom: '2px solid var(--border-strong)', borderRadius: 3, font: '600 10px/1 var(--font-mono)', color: 'var(--text-primary)' }}>/</kbd></span>
          </div>
        </div>
      );
    }
    const { Sub } = Q;

    /* ============================== APP ============================== */
    function EditorApp() {
      const [calcMode, setCalcMode] = useState('auto');
      const [ribbonTab, setRibbonTab] = useState('Home');
      const [ribbonCollapsed, setRibbonCollapsed] = useState(false);
      const [leftOpen, setLeftOpen] = useState(true);
      const [rightOpen, setRightOpen] = useState(true);
      const [selectedId, setSelectedId] = useState('cap');
      const [zoom, setZoom] = useState(1);
      const [decimals, setDecimals] = useState(1);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }} data-screen-label="Worksheet editor">
          <AppBar calcMode={calcMode} setCalcMode={setCalcMode} />
          <Ribbon ribbonTab={ribbonTab} setRibbonTab={setRibbonTab} collapsed={ribbonCollapsed} setCollapsed={setRibbonCollapsed} decimals={decimals} setDecimals={setDecimals} />
          <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
            <LeftPanel open={leftOpen} setOpen={setLeftOpen} />
            <Canvas selectedId={selectedId} onSelect={setSelectedId} zoom={zoom} />
            <RightPanel open={rightOpen} setOpen={setRightOpen} decimals={decimals} setDecimals={setDecimals} selectedId={selectedId} />
          </div>
          <StatusBar zoom={zoom} setZoom={setZoom} />
          <Keypad />
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<EditorApp />);
  };
  boot();
}
