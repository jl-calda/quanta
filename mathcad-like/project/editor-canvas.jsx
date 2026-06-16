/* Quanta editor — the worksheet canvas (page + regions). window.QEdCanvas.Canvas */
window.QEdCanvas = {};
window.QEdCanvas.Canvas = function Canvas({ selectedId, onSelect, zoom = 1 }) {
  const Q = window.QuantaDesignSystem_019e2c;
  const { Sub, Sup, Frac, Op, Unit, Badge } = Q;
  const Ic = window.QEdIcons;

  /* ---- math notation helpers ---- */
  const It = ({ children }) => <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic' }}>{children}</span>;
  const M = ({ children, size = 18 }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '0.14em', rowGap: 2, fontFamily: 'var(--font-math)', fontSize: size, color: 'var(--text-math)', lineHeight: 1.18 }}>{children}</span>
  );
  const Res = ({ children, tone = 'accent' }) => (
    <span style={{
      display: 'inline-flex', alignItems: 'baseline', gap: '0.18em', padding: '1px 8px', borderRadius: 4, marginLeft: '0.15em',
      background: tone === 'pass' ? 'var(--status-pass-bg)' : tone === 'error' ? 'var(--status-error-bg)' : 'var(--accent-tint)',
      color: tone === 'pass' ? 'var(--status-pass)' : tone === 'error' ? 'var(--status-error)' : 'var(--accent)', fontWeight: 600,
    }}>{children}</span>
  );
  const Num = ({ v, u }) => (<><span>{v}</span>{u && <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 600, color: 'inherit', fontSize: '0.74em', marginLeft: '0.18em', letterSpacing: '0.01em' }}>{u}</span>}</>);
  // first-class unit token — distinct from variables (sans, green, smaller)
  const UnitTok = ({ children }) => <span style={{ fontFamily: 'var(--font-sans)', fontStyle: 'normal', fontWeight: 500, color: 'var(--status-pass)', fontSize: '0.74em', marginLeft: '0.2em', letterSpacing: '0.01em' }}>{children}</span>;
  // editing caret + next-term placeholder for the live 2D entry state
  const Caret = () => <span style={{ display: 'inline-block', width: 2, height: '1.05em', transform: 'translateY(0.16em)', background: 'var(--accent)', margin: '0 1px', borderRadius: 1 }} className="edit-caret" />;
  const OkTag = ({ children = 'OK', tone = 'pass' }) => (
    <span style={{ marginLeft: '0.45em', font: '600 11px/1 var(--font-sans)', letterSpacing: '0.02em', textTransform: 'uppercase', color: tone === 'pass' ? 'var(--status-pass)' : 'var(--status-warning)' }}>{children}</span>
  );

  /* ---- region chrome ---- */
  const Sep = () => <span style={{ width: 1, height: 15, background: 'var(--border-hairline)', margin: '0 1px' }} />;
  const TBtn = ({ label, icon }) => (
    <button title={label} aria-label={label} onClick={(e) => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, border: 'none', background: 'transparent', borderRadius: 4, color: 'var(--text-primary)', cursor: 'pointer' }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>{icon(15)}</button>
  );

  const SelToolbar = () => (
    <div className="region-tools" style={{ position: 'absolute', top: -15, right: 8, display: 'flex', alignItems: 'center', gap: 1, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 6, boxShadow: 'var(--shadow-popover)', padding: 2, zIndex: 6 }}>
      <TBtn label="Outdent" icon={Ic.indentL} />
      <TBtn label="Indent" icon={Ic.indentR} />
      <Sep />
      <TBtn label="Span all columns" icon={Ic.spanCols} />
      <TBtn label="Toggle region border" icon={Ic.border} />
      <Sep />
      <TBtn label="More actions" icon={Ic.kebab} />
    </div>
  );
  const HoverTools = () => (
    <div className="region-tools" style={{ position: 'absolute', top: -13, right: 8, display: 'flex', alignItems: 'center', gap: 1, background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 6, boxShadow: 'var(--shadow-popover)', padding: 2, zIndex: 6 }}>
      <TBtn label="Split row into columns" icon={Ic.splitCols} />
      <TBtn label="More actions" icon={Ic.kebab} />
    </div>
  );
  const InsertBelow = () => (
    <div className="insert-below" style={{ position: 'absolute', left: 0, right: 0, bottom: -11, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
      <span style={{ position: 'absolute', left: 6, right: 6, height: 1, background: 'var(--accent)', opacity: 0.35 }} />
      <button onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 4, height: 20, padding: '0 9px', borderRadius: 99, border: '1px solid var(--accent)', background: 'var(--surface-raised)', color: 'var(--accent)', font: '500 11px/1 var(--font-sans)', cursor: 'pointer' }}>{Ic.plusSm(12)} Insert below</button>
    </div>
  );

  const ModeToggle = () => (
    <span style={{ display: 'inline-flex', border: '1px solid var(--accent)', borderRadius: 4, overflow: 'hidden', height: 20, marginLeft: 6 }} onClick={(ev) => ev.stopPropagation()}>
      <span title="Natural math (2D)" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, background: 'var(--accent)', color: '#fff', fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: 11 }}>√x</span>
      <span title="Plain formula (text)" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, background: 'var(--surface-raised)', color: 'var(--text-muted)', fontSize: 10, fontWeight: 500 }}>Aa</span>
    </span>
  );
  const Region = ({ id, indent = 0, demoHover = false, error = false, editing = false, children }) => {
    const sel = id && selectedId === id;
    const active = sel || editing;
    return (
      <div className={'region' + (sel ? ' is-selected' : '') + (editing ? ' is-editing' : '') + (demoHover ? ' demo-hover' : '') + (error ? ' is-error' : '')}
        onClick={(ev) => { if (id) { ev.stopPropagation(); onSelect(id); } }}
        style={{ position: 'relative', marginLeft: indent * 30, padding: '6px 10px' }}>
        {indent > 0 && <span className="indent-guide" />}
        {id && (
          <span className="reorder" style={{ position: 'absolute', left: -20, top: 7, color: 'var(--text-muted)', cursor: 'grab', display: 'inline-flex' }}>{Ic.grip(15)}</span>
        )}
        {editing && (
          <span style={{ position: 'absolute', top: -13, right: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-paper)', padding: '0 2px', zIndex: 7 }}>
            <span style={{ font: '9px/1 var(--font-sans)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent)' }}>editing</span>
            <ModeToggle />
          </span>
        )}
        {children}
        {sel ? <SelToolbar /> : (id && !editing ? <HoverTools /> : null)}
        {demoHover && <InsertBelow />}
      </div>
    );
  };

  const Note = ({ children }) => <span style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)' }}>{children}</span>;

  const InputRow = ({ id, name, val, unit, note, editing }) => (
    <Region id={id} editing={editing}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
        <M size={17}>{name}<Op>:=</Op><span>{val}</span>{unit && <UnitTok>{unit}</UnitTok>}{editing && <Caret />}</M>
        {note && <span style={{ font: '12px/1.4 var(--font-sans)', color: 'var(--text-muted)', fontStyle: 'italic' }}>{note}</span>}
      </div>
    </Region>
  );

  const Heading = ({ children, eyebrow }) => (
    <Region id={'h-' + children}>
      {eyebrow && <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>{eyebrow}</div>}
      <h3 style={{ margin: 0, font: '600 16px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>{children}</h3>
    </Region>
  );

  /* ---- the anchor schedule table ---- */
  const Table = () => {
    const head = ['Mark', 'Qty', 'Dia', 'Force', 'Capacity', 'UR'];
    const units = ['', '', 'mm', 'kN', 'kN', '—'];
    const rows = [
      ['A1', '4', '16', '12.0', '52.8', '0.23', false],
      ['A2', '4', '16', '18.5', '52.8', '0.35', false],
      ['A3', '2', '12', '41.0', '29.7', '1.38', true],
    ];
    const cell = { padding: '5px 12px', font: '12.5px/1.3 var(--font-mono)', color: 'var(--text-primary)', borderRight: '1px solid var(--border-hairline)', textAlign: 'right' };
    const left = { ...cell, textAlign: 'left' };
    return (
      <div style={{ border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', maxWidth: 540 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', background: 'var(--surface-raised)' }}>
          <thead>
            <tr style={{ background: 'var(--surface-chrome)', borderBottom: '1px solid var(--border-strong)' }}>
              {head.map((h, i) => <th key={i} style={{ ...(i === 0 ? left : cell), font: '600 11px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)', padding: '7px 12px', borderRight: i < 5 ? '1px solid var(--border-hairline)' : 'none' }}>{h}</th>)}
            </tr>
            <tr style={{ background: 'color-mix(in srgb, var(--surface-chrome) 50%, var(--surface-raised))', borderBottom: '1px solid var(--border-hairline)' }}>
              {units.map((u, i) => <td key={i} style={{ ...(i === 0 ? left : cell), font: '11px/1 var(--font-mono)', color: 'var(--text-muted)', padding: '3px 12px', borderRight: i < 5 ? '1px solid var(--border-hairline)' : 'none' }}>{u}</td>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? '1px solid var(--border-hairline)' : 'none' }}>
                {r.slice(0, 6).map((v, ci) => {
                  const isUR = ci === 5;
                  const red = isUR && r[6];
                  return <td key={ci} style={{ ...(ci === 0 ? left : cell), borderRight: ci < 5 ? '1px solid var(--border-hairline)' : 'none', fontWeight: ci === 0 ? 600 : 400, background: red ? 'var(--status-error-bg)' : 'transparent', color: red ? 'var(--status-error)' : (ci === 0 ? 'var(--text-primary)' : 'var(--text-primary)') }}>{v}{red && <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 10, marginLeft: 6 }}>FAIL</span>}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  /* ---- capacity vs edge-distance plot ---- */
  const Plot = () => {
    const W = 470, H = 230, mL = 46, mR = 16, mT = 14, mB = 34;
    const x0 = mL, x1 = W - mR, y0 = H - mB, y1 = mT;
    const xmax = 200, ymax = 60;
    const sx = (v) => x0 + (v / xmax) * (x1 - x0);
    const sy = (v) => y0 - (v / ymax) * (y0 - y1);
    // capacity curve: rises then plateaus ~52.8
    const pts = [[20, 14], [40, 27], [60, 37], [80, 44], [100, 49], [120, 52.8], [150, 54.5], [200, 55.2]];
    const d = pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
    const px = sx(120), py = sy(52.8);
    const gx = [0, 50, 100, 150, 200], gy = [0, 20, 40, 60];
    return (
      <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block', maxWidth: 560 }}>
        {gy.map((v, i) => <line key={'gy' + i} x1={x0} y1={sy(v)} x2={x1} y2={sy(v)} stroke="var(--border-hairline)" strokeWidth="1" />)}
        {gx.map((v, i) => <line key={'gx' + i} x1={sx(v)} y1={y0} x2={sx(v)} y2={y1} stroke="var(--border-hairline)" strokeWidth="1" />)}
        <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="var(--border-strong)" strokeWidth="1.2" />
        <line x1={x0} y1={y0} x2={x0} y2={y1} stroke="var(--border-strong)" strokeWidth="1.2" />
        {gx.map((v, i) => <text key={'tx' + i} x={sx(v)} y={y0 + 16} textAnchor="middle" style={{ font: '10px var(--font-mono)', fill: 'var(--text-muted)' }}>{v}</text>)}
        {gy.map((v, i) => <text key={'ty' + i} x={x0 - 8} y={sy(v) + 3} textAnchor="end" style={{ font: '10px var(--font-mono)', fill: 'var(--text-muted)' }}>{v}</text>)}
        <text x={(x0 + x1) / 2} y={H - 3} textAnchor="middle" style={{ font: '11px var(--font-sans)', fill: 'var(--text-muted)' }}>edge distance  c (mm)</text>
        <text x={12} y={(y0 + y1) / 2} textAnchor="middle" transform={'rotate(-90 12 ' + ((y0 + y1) / 2) + ')'} style={{ font: '11px var(--font-sans)', fill: 'var(--text-muted)' }}>N_Rd (kN)</text>
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* worksheet point */}
        <line x1={px} y1={py} x2={px} y2={y0} stroke="var(--status-pass)" strokeWidth="1" strokeDasharray="3 3" />
        <line x1={px} y1={py} x2={x0} y2={py} stroke="var(--status-pass)" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={px} cy={py} r="4.5" fill="var(--surface-paper)" stroke="var(--status-pass)" strokeWidth="2" />
        <g>
          <rect x={px - 78} y={py - 30} width="74" height="20" rx="4" fill="var(--status-pass-bg)" stroke="var(--status-pass)" strokeWidth="0.75" />
          <text x={px - 41} y={py - 16} textAnchor="middle" style={{ font: '600 10.5px var(--font-mono)', fill: 'var(--status-pass)' }}>52.8 kN</text>
        </g>
      </svg>
    );
  };

  /* ====================== PAGE 1 ====================== */
  return (
    <div className="ed-field scroll-y" onClick={() => onSelect(null)} style={{ flex: 1, height: '100%', padding: '24px 0 120px' }}>
      <div style={{ transform: 'scale(' + zoom + ')', transformOrigin: 'top center', transition: 'transform var(--dur-base) var(--ease-out)' }}>
      <article className="ed-page">
        {/* header band */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 52px', borderBottom: '1px solid var(--border-hairline)', font: '10.5px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <span>Acme Safety Engineering</span>
          <span>Job 24-0488 · Roof anchor</span>
        </div>

        <div className="ed-page-body q-grid">
          {/* margin frame */}
          <div style={{ position: 'absolute', inset: '10px 18px', border: '1px dashed var(--border-hairline)', opacity: 0.55, pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>

            {/* title + info block */}
            <Region id="title">
              <h1 style={{ margin: '2px 0 0', font: '600 27px/1.2 var(--font-sans)', letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>Roof anchor point — pull-out check</h1>
              <div style={{ display: 'flex', gap: 28, marginTop: 12, flexWrap: 'wrap' }}>
                {[['Project', 'Skyline Tower — roof access'], ['By', 'N. Brunel'], ['Date', '14 Jun 2026'], ['Rev', 'B']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ font: '10px/1 var(--font-sans)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ font: '12.5px/1.2 var(--font-mono)', color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </Region>

            <div style={{ height: 14 }} />

            {/* collapsible AREA — design inputs */}
            <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 6, overflow: 'hidden', background: 'color-mix(in srgb, var(--surface-chrome) 40%, var(--surface-paper))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
                <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{Ic.chevD(16)}</span>
                <span style={{ font: '600 12px/1 var(--font-sans)', letterSpacing: '0.02em', color: 'var(--text-primary)' }}>Design inputs</span>
                <span style={{ font: '11px/1 var(--font-sans)', color: 'var(--text-muted)', background: 'var(--surface-raised)', border: '1px solid var(--border-hairline)', borderRadius: 99, padding: '2px 7px' }}>4 regions</span>
                <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', display: 'inline-flex' }}>{Ic.kebab(15)}</span>
              </div>
              <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <InputRow id="ft" name={<Sub base="F" sub="t" />} val="12" unit="kN" note="applied tie-back force (ULS)" />
                <InputRow id="phi" name={<It>φ</It>} val="0.75" note="resistance factor" editing />
                <InputRow id="dia" name={<It>d</It>} val="16" unit="mm" note="anchor diameter · SS316 A4-70" />
                <InputRow id="fub" name={<Sub base="f" sub="ub" />} val="700" unit="MPa" note="ultimate tensile strength" />
              </div>
            </div>

            <div style={{ height: 16 }} />
            <Heading>Anchor tensile capacity</Heading>

            {/* 2-COLUMN ROW: capacity (left) + note (right) with gutter */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.25fr 0.9fr', position: 'relative', marginTop: 2 }}>
              <div style={{ paddingRight: 26 }}>
                <Region id="cap">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <M size={18}><Sub base="A" sub="s" /><Op>=</Op><Frac num={<It>π</It>} den="4" /><Op>·</Op><Op>(</Op><span>0.85</span><Op>·</Op><It>d</It><Op>)</Op><Sup base="" sup="2" /><Op>=</Op><Res><Num v="157" u="mm²" /></Res></M>
                    <M size={18}><Sub base="N" sub="Rd" /><Op>=</Op><It>φ</It><Op>·</Op><Sub base="A" sub="s" /><Op>·</Op><Sub base="f" sub="ub" /><Op>=</Op><Res tone="pass"><Num v="52.8" u="kN" /></Res><OkTag /></M>
                  </div>
                </Region>
              </div>
              <div style={{ paddingLeft: 26, borderLeft: '1px dashed var(--border-strong)' }}>
                <Region id="note">
                  <Note>Tensile stress area taken at the thread root for SS316 A4-70 stainless anchors. Capacity governed by the bolt, not the concrete cone, at this edge distance.</Note>
                  <div style={{ marginTop: 9 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: '11px/1 var(--font-mono)', color: 'var(--accent)', background: 'var(--accent-tint)', borderRadius: 4, padding: '4px 7px' }}>{Ic.link(12)} EN 1993-1-8 · §3.6</span>
                  </div>
                </Region>
              </div>
            </div>

            {/* indented sub-step with dashed guide */}
            <Region id="check" indent={1}>
              <M size={16}><span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>check:&nbsp;</span><Sub base="N" sub="Rd" /><Op>≥</Op><Sub base="F" sub="t" /><Op>→</Op><span>52.8</span><span style={{ fontSize: '0.82em' }}>kN</span><Op>≥</Op><span>12.0</span><span style={{ fontSize: '0.82em' }}>kN</span><span style={{ marginLeft: '0.4em', color: 'var(--status-pass)', fontWeight: 600 }}>✓</span></M>
            </Region>

            <div style={{ height: 12 }} />
            <Heading>Utilization</Heading>
            <Region id="ur" demoHover>
              <M size={18}><span style={{ fontStyle: 'italic' }}>UR</span><Op>:=</Op><Frac num={<Sub base="F" sub="t" />} den={<Sub base="N" sub="Rd" />} /><Op>=</Op><Res tone="pass"><span>0.23</span></Res><OkTag>OK · &lt; 1.0</OkTag></M>
            </Region>

            {/* ERROR region */}
            <div style={{ height: 10 }} />
            <Region id="err" error>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-math)', fontSize: 17, color: 'var(--text-math)', display: 'inline-flex', alignItems: 'baseline', columnGap: '0.14em' }}>
                  <Sub base="M" sub="a" /><Op>:=</Op>
                  <span style={{ textDecoration: 'underline wavy var(--status-error)', textDecorationThickness: '1.5px', textUnderlineOffset: '4px', paddingBottom: 1 }}><Sub base="F" sub="t" /><Op>+</Op><It>d</It></span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, font: '11.5px/1 var(--font-sans)', color: 'var(--status-error)', background: 'var(--status-error-bg)', border: '1px solid color-mix(in srgb, var(--status-error) 30%, transparent)', borderRadius: 4, padding: '4px 7px' }}>{Ic.alertCirc(13)} Units don’t match: left is kN, right is mm</span>
              </div>
            </Region>

            <div style={{ height: 18 }} />
            <Heading>Anchor schedule</Heading>
            <Region id="table"><Table /></Region>

            <div style={{ height: 20 }} />
            <Heading>Capacity vs. edge distance</Heading>
            <Region id="plot">
              <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 6, padding: '12px 14px 6px', background: 'var(--surface-raised)', maxWidth: 560 }}>
                <Plot />
              </div>
            </Region>
          </div>
        </div>

        {/* footer band */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 52px', borderTop: '1px solid var(--border-hairline)', font: '10.5px/1 var(--font-sans)', color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{Ic.dot(10)} Quanta</span>
          <span>Page 1 of 3</span>
          <span>Printed 14 Jun 2026</span>
        </div>
      </article>

      {/* page 2 (stack hint) */}
      <article className="ed-page" style={{ marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 52px', borderBottom: '1px solid var(--border-hairline)', font: '10.5px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          <span>Acme Safety Engineering</span>
          <span>Job 24-0488 · Roof anchor</span>
        </div>
        <div className="ed-page-body q-grid" style={{ minHeight: 320 }}>
          <div style={{ position: 'absolute', inset: '10px 18px', border: '1px dashed var(--border-hairline)', opacity: 0.55, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>2 · Concrete cone</div>
            <h3 style={{ margin: 0, font: '600 16px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>Pull-out — concrete cone breakout</h3>
            <p style={{ font: '12.5px/1.5 var(--font-sans)', color: 'var(--text-muted)', maxWidth: 460 }}>Continues on this page — CCD method per the concrete capacity design approach.</p>
          </div>
        </div>
      </article>
      </div>
    </div>
  );
};
