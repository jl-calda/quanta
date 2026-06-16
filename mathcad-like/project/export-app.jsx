/* Quanta — Print / Export preview */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !Q.Sub) { return setTimeout(boot, 40); }
    const { Button, IconButton, Switch, Select, Input, Sub, Sup, Frac, Op } = Q;
    const { useState, useRef } = React;

    const svg = (c, s = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{c}</svg>;
    const CloseI = (s) => svg(<path d="M6 6l12 12M18 6 6 18"/>, s);
    const DownloadI = (s) => svg(<><path d="M12 3v11m0 0 4-4m-4 4-4-4"/><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17"/></>, s);
    const PrintI = (s) => svg(<><path d="M6 9V4h12v5"/><rect x="4" y="9" width="16" height="7" rx="1"/><path d="M7 16h10v4H7z"/></>, s);
    const PlusI = (s) => svg(<path d="M10 6v8M6 10h8"/>, s);
    const MinusI = (s) => svg(<path d="M6 10h8"/>, s);

    /* ---- math helpers ---- */
    const It = ({ children }) => <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic' }}>{children}</span>;
    const M = ({ children, size = 13 }) => <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', columnGap: '0.14em', rowGap: 2, fontFamily: 'var(--font-math)', fontSize: size, color: '#15181D', lineHeight: 1.3 }}>{children}</span>;
    const Res = (children, tone) => <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.16em', padding: '0.5px 6px', borderRadius: 3, marginLeft: '0.12em', background: tone === 'pass' ? 'rgba(30,142,90,0.12)' : 'rgba(31,95,191,0.10)', color: tone === 'pass' ? '#1E8E5A' : '#1F5FBF', fontWeight: 600 }}>{children}</span>;
    const u = (v, un) => <>{v}{un && <span style={{ fontSize: '0.82em', marginLeft: '0.1em' }}>{un}</span>}</>;

    const FORMATS = [
      { id: 'pdf', label: 'PDF', sub: 'Portable document', icon: (s) => svg(<><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9.5 13.5h1a1 1 0 0 1 0 2h-1zM9.5 13.5v4"/></>, s) },
      { id: 'docx', label: 'Word', sub: '.docx', icon: (s) => svg(<><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4"/><path d="M9 12l1 5 1.5-4 1.5 4 1-5"/></>, s) },
      { id: 'html', label: 'HTML', sub: 'Web page', icon: (s) => svg(<><path d="M5 4l-2 8 2 8"/><path d="M19 4l2 8-2 8"/><path d="M14 4l-4 16"/></>, s) },
      { id: 'xlsx', label: 'Excel', sub: '.xlsx', icon: (s) => svg(<><rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 9h16M10 4v16"/></>, s) },
      { id: 'print', label: 'Print', sub: 'Send to printer', icon: PrintI },
    ];

    const PAGE = { A4: { w: 794, h: 1123 }, Letter: { w: 816, h: 1056 } };

    /* ---- option panel primitives ---- */
    const Eyebrow = ({ children }) => <div style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 11 }}>{children}</div>;
    const Field = ({ label, children }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}><span style={{ font: '12px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>{label}</span>{children}</div>;
    const ToggleRow = ({ label, help, checked, set }) => (
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', cursor: 'pointer' }}>
        <span style={{ marginTop: 1 }}><Switch checked={checked} onChange={(e) => set(e.target.checked)} /></span>
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', font: '12.5px/1.3 var(--font-sans)', color: 'var(--text-primary)' }}>{label}</span>
          {help && <span style={{ display: 'block', font: '11.5px/1.4 var(--font-sans)', color: 'var(--text-muted)', marginTop: 2 }}>{help}</span>}
        </span>
      </label>
    );
    function Seg({ options, value, set }) {
      return (
        <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', overflow: 'hidden', height: 30, width: '100%' }}>
          {options.map((o, i) => {
            const on = value === o.value;
            return <button key={o.value} onClick={() => set(o.value)} style={{ flex: 1, height: '100%', border: 'none', borderLeft: i ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer', background: on ? 'var(--accent-tint)' : 'var(--surface-raised)', color: on ? 'var(--accent)' : 'var(--text-muted)', font: (on ? '600' : '500') + ' 12px/1 var(--font-sans)' }}>{o.label}</button>;
          })}
        </div>
      );
    }

    /* ===================== THE RENDERED PAGES ===================== */
    function Stamp() {
      return (
        <div style={{ width: 150, flex: '0 0 auto', border: '1px solid #9AA3AE', borderRadius: 3, padding: '7px 9px', transform: 'rotate(-1deg)' }}>
          <div style={{ font: '600 7.5px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7480', marginBottom: 5 }}>Checked &amp; approved</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: 16, color: '#1F5FBF', borderBottom: '1px solid #C8CDD4', paddingBottom: 1 }}>N. Brunel</div>
              <div style={{ font: '7px/1.4 var(--font-sans)', color: '#6B7480', marginTop: 2 }}>CPEng 4471· 14 Jun 2026</div>
            </div>
          </div>
        </div>
      );
    }

    function PageChrome({ header, footer, pageNo, pageTotal, watermark, children, dims, margin }) {
      const padX = margin === 'narrow' ? 38 : margin === 'wide' ? 84 : 58;
      const padY = margin === 'narrow' ? 30 : margin === 'wide' ? 64 : 46;
      return (
        <div className="ex-page" style={{ width: dims.w, height: dims.h, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* running header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 ' + padX + 'px', height: 34, borderBottom: '1px solid #E2E5EA', font: '8.5px/1 var(--font-sans)', letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7480', flex: '0 0 auto' }}>
            <span>{header || 'Acme Safety Engineering'}</span>
            <span>Job 24-0488</span>
          </div>
          {/* body */}
          <div style={{ flex: 1, position: 'relative', padding: padY + 'px ' + padX + 'px', overflow: 'hidden' }}>
            {watermark && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 0 }}>
                <span style={{ transform: 'rotate(-32deg)', font: '700 64px/1 var(--font-sans)', letterSpacing: '0.06em', color: 'rgba(31,95,191,0.07)', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{watermark}</span>
              </div>
            )}
            <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>{children}</div>
          </div>
          {/* running footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 ' + padX + 'px', height: 30, borderTop: '1px solid #E2E5EA', font: '8px/1 var(--font-sans)', color: '#6B7480', flex: '0 0 auto' }}>
            <span>{footer || 'Roof anchor point — pull-out check · Rev B'}</span>
            <span>Page {pageNo} of {pageTotal}</span>
          </div>
        </div>
      );
    }

    function RegionBox({ borders, children, indent }) {
      return <div style={{ padding: borders ? '7px 9px' : '5px 0', marginLeft: (indent || 0) * 22, border: borders ? '1px solid #E2E5EA' : '1px solid transparent', borderRadius: 3, marginBottom: borders ? 5 : 2 }}>{children}</div>;
    }
    const Heading = ({ children }) => <div style={{ font: '600 12px/1.3 var(--font-sans)', color: '#15181D', margin: '12px 0 6px', paddingBottom: 4, borderBottom: '1px solid #ECEEF1' }}>{children}</div>;
    const Eye = ({ children }) => <div style={{ font: '600 8.5px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#8A929C', margin: '2px 0 6px' }}>{children}</div>;
    const Note = ({ children }) => <span style={{ font: '10.5px/1.4 var(--font-sans)', color: '#6B7480', fontStyle: 'italic', marginLeft: 10 }}>{children}</span>;

    // a math result row that can show calc steps (substituted line) when steps=true
    function StepRow({ borders, name, formula, subst, result, tone, tag }) {
      return (
        <RegionBox borders={borders}>
          <M size={13}>{name}<Op>=</Op>{formula}{!subst && <>{<Op>=</Op>}{Res(result, tone)}{tag && <span style={{ marginLeft: '0.4em', font: '600 8.5px/1 var(--font-sans)', textTransform: 'uppercase', color: tone === 'pass' ? '#1E8E5A' : '#C2392B' }}>{tag}</span>}</>}</M>
          {subst && (
            <div style={{ marginTop: 4, paddingLeft: 14, borderLeft: '2px solid #ECEEF1' }}>
              <M size={12}><span style={{ color: '#8A929C', fontStyle: 'italic', marginRight: 4 }}>=</span>{subst}</M>
              <div style={{ marginTop: 3 }}><M size={13}><span style={{ color: '#8A929C', marginRight: 4 }}>=</span>{Res(result, tone)}{tag && <span style={{ marginLeft: '0.4em', font: '600 8.5px/1 var(--font-sans)', textTransform: 'uppercase', color: tone === 'pass' ? '#1E8E5A' : '#C2392B' }}>{tag}</span>}</M></div>
            </div>
          )}
        </RegionBox>
      );
    }

    function InputsSummary() {
      const rows = [['F_t', '14.5 kN', 'applied tie-back force'], ['φ', '0.67', 'resistance factor'], ['d', '16 mm', 'anchor dia · SS316'], ['f_ub', '700 MPa', 'ultimate tensile strength']];
      return (
        <div style={{ border: '1px solid #E2E5EA', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ padding: '5px 10px', background: '#F4F5F7', borderBottom: '1px solid #E2E5EA', font: '600 8.5px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6B7480' }}>Inputs summary</div>
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ borderTop: i ? '1px solid #ECEEF1' : 'none' }}>
                  <td style={{ padding: '4px 10px', width: 60, fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: 12, color: '#15181D' }} dangerouslySetInnerHTML={{ __html: r[0].replace(/_(\w+)/, '<sub>$1</sub>') }} />
                  <td style={{ padding: '4px 10px', width: 84, fontFamily: 'var(--font-mono)', fontSize: 11, color: '#15181D' }}>{r[1]}</td>
                  <td style={{ padding: '4px 10px', font: '10.5px/1.3 var(--font-sans)', color: '#6B7480' }}>{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    function Page1Body({ o }) {
      return (
        <div>
          {/* title block */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <h1 style={{ margin: 0, font: '600 18px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: '#15181D' }}>Roof anchor point — pull-out check</h1>
              <div style={{ display: 'flex', gap: 22, marginTop: 9 }}>
                {[['Project', 'Skyline Tower'], ['By', 'N. Brunel'], ['Date', '14 Jun 2026'], ['Rev', 'B']].map(([k, v]) => (
                  <div key={k}><div style={{ font: '7.5px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8A929C' }}>{k}</div><div style={{ font: '10.5px/1.2 var(--font-mono)', color: '#15181D', marginTop: 2 }}>{v}</div></div>
                ))}
              </div>
            </div>
            <Stamp />
          </div>

          {o.inputsSummary && <InputsSummary />}

          <Heading>1 · Design inputs</Heading>
          <RegionBox borders={o.borders}><M><Sub base="F" sub="t" /><Op>:=</Op>{u('14.5', 'kN')}<Note>applied tie-back force (ULS)</Note></M></RegionBox>
          <RegionBox borders={o.borders}><M><It>φ</It><Op>:=</Op>0.67<Note>resistance factor</Note></M></RegionBox>
          <RegionBox borders={o.borders}><M><It>d</It><Op>:=</Op>{u('16', 'mm')}<Note>anchor diameter · SS316 A4-70</Note></M></RegionBox>
          <RegionBox borders={o.borders}><M><Sub base="f" sub="ub" /><Op>:=</Op>{u('700', 'MPa')}<Note>ultimate tensile strength</Note></M></RegionBox>

          <Heading>2 · Anchor tensile capacity</Heading>
          <StepRow borders={o.borders}
            name={<Sub base="A" sub="s" />}
            formula={<><Frac num={<It>π</It>} den="4" /><Op>·</Op><Op>(</Op>0.85<Op>·</Op><It>d</It><Op>)</Op><Sup base="" sup="2" /></>}
            subst={o.steps ? <><Frac num={<It>π</It>} den="4" /><Op>·</Op><Op>(</Op>0.85<Op>·</Op>16{u('', 'mm')}<Op>)</Op><Sup base="" sup="2" /></> : null}
            result={u('157', 'mm²')} />
          <StepRow borders={o.borders}
            name={<Sub base="N" sub="Rd" />}
            formula={<><It>φ</It><Op>·</Op><Sub base="A" sub="s" /><Op>·</Op><Sub base="f" sub="ub" /></>}
            subst={o.steps ? <>0.67<Op>·</Op>157{u('', 'mm²')}<Op>·</Op>700{u('', 'MPa')}</> : null}
            result={u('47.2', 'kN')} tone="pass" tag="OK" />

          <Heading>3 · Utilization</Heading>
          <StepRow borders={o.borders}
            name={<span style={{ fontStyle: 'italic' }}>UR</span>}
            formula={<Frac num={<Sub base="F" sub="t" />} den={<Sub base="N" sub="Rd" />} />}
            subst={o.steps ? <Frac num={<>14.5{u('', 'kN')}</>} den={<>47.2{u('', 'kN')}</>} /> : null}
            result={<span>0.31</span>} tone="pass" tag="OK · < 1.0" />
        </div>
      );
    }

    function Page2Body({ o }) {
      const head = ['Mark', 'Qty', 'Dia', 'Force', 'Capacity', 'UR'];
      const rows = [['A1', '4', '16', '14.5', '47.2', '0.31'], ['A2', '4', '16', '18.5', '47.2', '0.39'], ['A3', '2', '12', '22.0', '26.5', '0.83']];
      return (
        <div>
          <Heading>4 · Anchor schedule</Heading>
          <div style={{ border: '1px solid #C8CDD4', borderRadius: 3, overflow: 'hidden', marginBottom: 16 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ background: '#F4F5F7' }}>{head.map((h, i) => <th key={i} style={{ padding: '5px 9px', font: '600 8px/1 var(--font-sans)', letterSpacing: '0.04em', textTransform: 'uppercase', color: '#6B7480', textAlign: i ? 'right' : 'left', borderRight: i < 5 ? '1px solid #E2E5EA' : 'none', borderBottom: '1px solid #C8CDD4' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r, ri) => <tr key={ri} style={{ borderTop: ri ? '1px solid #ECEEF1' : 'none' }}>{r.map((c, ci) => <td key={ci} style={{ padding: '5px 9px', font: '10.5px/1.2 var(--font-mono)', color: '#15181D', textAlign: ci ? 'right' : 'left', fontWeight: ci === 0 ? 600 : 400, borderRight: ci < 5 ? '1px solid #ECEEF1' : 'none' }}>{c}</td>)}</tr>)}
              </tbody>
            </table>
          </div>

          <Heading>5 · Capacity vs. edge distance</Heading>
          <div style={{ border: o.borders ? '1px solid #E2E5EA' : 'none', borderRadius: 3, padding: o.borders ? 10 : 0, marginBottom: 8 }}>
            <MiniPlot />
          </div>
          <div style={{ font: '10.5px/1.6 var(--font-sans)', color: '#3A4048', marginTop: 8 }}>
            All anchors satisfy <span style={{ fontFamily: 'var(--font-math)' }}>N<sub style={{ fontSize: '0.7em' }}>Rd</sub> ≥ F<sub style={{ fontSize: '0.7em' }}>t</sub></span> with the governing utilisation of 0.83 at mark A3. Capacity is governed by the steel anchor rather than the concrete cone at the specified edge distance.
          </div>
        </div>
      );
    }

    function MiniPlot() {
      const W = 420, H = 170, mL = 38, mB = 26, mT = 8, mR = 10;
      const x0 = mL, x1 = W - mR, y0 = H - mB, y1 = mT, xmax = 200, ymax = 60;
      const sx = (v) => x0 + (v / xmax) * (x1 - x0), sy = (v) => y0 - (v / ymax) * (y0 - y1);
      const pts = [[20, 14], [40, 27], [60, 37], [80, 44], [100, 48], [120, 47.2], [150, 49], [200, 50]];
      const d = pts.map((p, i) => (i ? 'L' : 'M') + sx(p[0]).toFixed(1) + ' ' + sy(p[1]).toFixed(1)).join(' ');
      const px = sx(120), py = sy(47.2);
      return (
        <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} style={{ display: 'block' }}>
          {[0, 20, 40, 60].map((v, i) => <line key={i} x1={x0} y1={sy(v)} x2={x1} y2={sy(v)} stroke="#ECEEF1" strokeWidth="1" />)}
          <line x1={x0} y1={y0} x2={x1} y2={y0} stroke="#9AA3AE" strokeWidth="1" /><line x1={x0} y1={y0} x2={x0} y2={y1} stroke="#9AA3AE" strokeWidth="1" />
          {[0, 50, 100, 150, 200].map((v, i) => <text key={i} x={sx(v)} y={y0 + 13} textAnchor="middle" style={{ font: '8px var(--font-mono)', fill: '#8A929C' }}>{v}</text>)}
          {[0, 20, 40, 60].map((v, i) => <text key={i} x={x0 - 6} y={sy(v) + 3} textAnchor="end" style={{ font: '8px var(--font-mono)', fill: '#8A929C' }}>{v}</text>)}
          <text x={(x0 + x1) / 2} y={H - 2} textAnchor="middle" style={{ font: '8.5px var(--font-sans)', fill: '#6B7480' }}>edge distance c (mm)</text>
          <path d={d} fill="none" stroke="#1F5FBF" strokeWidth="1.75" strokeLinejoin="round" />
          <line x1={px} y1={py} x2={px} y2={y0} stroke="#1E8E5A" strokeWidth="1" strokeDasharray="3 2" />
          <circle cx={px} cy={py} r="3.5" fill="#fff" stroke="#1E8E5A" strokeWidth="1.75" />
        </svg>
      );
    }

    /* ===================== options panel ===================== */
    function OptionsPanel({ o, set, fmt, setFmt }) {
      return (
        <aside style={{ width: 320, flex: '0 0 320px', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ font: '600 15px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>Export options</div>
          </div>
          <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: '16px 20px 20px' }}>
            <Eyebrow>Format</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {FORMATS.map((f) => {
                const on = fmt === f.id;
                return (
                  <button key={f.id} onClick={() => setFmt(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-hairline)'), borderRadius: 'var(--radius-sm)', background: on ? 'var(--accent-tint)' : 'var(--surface-raised)', cursor: 'pointer', textAlign: 'left', gridColumn: f.id === 'print' ? '1 / -1' : 'auto' }}>
                    <span style={{ display: 'inline-flex', color: on ? 'var(--accent)' : 'var(--text-muted)' }}>{f.icon(18)}</span>
                    <span style={{ minWidth: 0 }}><span style={{ display: 'block', font: '12.5px/1.2 var(--font-sans)', fontWeight: 500, color: on ? 'var(--accent)' : 'var(--text-primary)' }}>{f.label}</span><span style={{ display: 'block', font: '10.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>{f.sub}</span></span>
                  </button>
                );
              })}
            </div>

            <Eyebrow>Page</Eyebrow>
            <Field label="Page size"><Seg options={[{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'Letter' }]} value={o.size} set={(v) => set('size', v)} /></Field>
            <Field label="Orientation"><Seg options={[{ value: 'portrait', label: 'Portrait' }, { value: 'landscape', label: 'Landscape' }]} value={o.orient} set={(v) => set('orient', v)} /></Field>
            <Field label="Margins"><Seg options={[{ value: 'narrow', label: 'Narrow' }, { value: 'normal', label: 'Normal' }, { value: 'wide', label: 'Wide' }]} value={o.margin} set={(v) => set('margin', v)} /></Field>
            <Field label="Page range"><Input defaultValue="1–3" placeholder="e.g. 1–3, 5" /></Field>

            <div style={{ borderTop: '1px solid var(--border-hairline)', margin: '8px 0 14px' }} />
            <Eyebrow>Content</Eyebrow>
            <ToggleRow label="Show calc steps" help="Expand each result to show the formula with values substituted." checked={o.steps} set={(v) => set('steps', v)} />
            <ToggleRow label="Include inputs summary" help="A table of named inputs at the top of page 1." checked={o.inputsSummary} set={(v) => set('inputsSummary', v)} />
            <ToggleRow label="Include region borders" help="Outline each region — useful for checking sets." checked={o.borders} set={(v) => set('borders', v)} />

            <div style={{ borderTop: '1px solid var(--border-hairline)', margin: '8px 0 14px' }} />
            <Eyebrow>Header &amp; footer</Eyebrow>
            <Field label="Header text"><input className="ex-input" value={o.header} onChange={(e) => set('header', e.target.value)} /></Field>
            <Field label="Footer text"><input className="ex-input" value={o.footer} onChange={(e) => set('footer', e.target.value)} /></Field>
            <Field label="Watermark"><input className="ex-input" value={o.watermark} onChange={(e) => set('watermark', e.target.value)} placeholder="e.g. DRAFT — NOT FOR CONSTRUCTION" /></Field>
          </div>
        </aside>
      );
    }

    /* ===================== app ===================== */
    function App() {
      const [fmt, setFmt] = useState('pdf');
      const [zoom, setZoom] = useState(0.62);
      const [o, setO] = useState({ size: 'A4', orient: 'portrait', margin: 'normal', steps: false, inputsSummary: true, borders: false, header: 'Acme Safety Engineering', footer: 'Roof anchor point — pull-out check · Rev B', watermark: '' });
      const set = (k, v) => setO((s) => ({ ...s, [k]: v }));

      const base = PAGE[o.size];
      const dims = o.orient === 'landscape' ? { w: base.h, h: base.w } : { w: base.w, h: base.h };
      const fmtObj = FORMATS.find((f) => f.id === fmt);
      const exportLabel = fmt === 'print' ? 'Print' : 'Export ' + fmtObj.label;

      return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }} data-screen-label="Print / export preview">
          {/* top bar */}
          <header style={{ display: 'flex', alignItems: 'center', gap: 14, height: 54, flex: '0 0 54px', padding: '0 18px', background: 'var(--surface-chrome)', borderBottom: '1px solid var(--border-hairline)' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ font: '600 14px/1.2 var(--font-sans)', color: 'var(--text-primary)' }}>Export preview</div>
              <div style={{ font: '11.5px/1.2 var(--font-sans)', color: 'var(--text-muted)' }}>Roof anchor point — pull-out check</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}>{MinusI(18)}</IconButton>
              <span style={{ font: '12px/1 var(--font-mono)', color: 'var(--text-muted)', width: 42, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
              <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(1, +(z + 0.1).toFixed(2)))}>{PlusI(18)}</IconButton>
              <span style={{ width: 1, height: 22, background: 'var(--border-hairline)', margin: '0 6px' }} />
              <IconButton label="Close">{CloseI(18)}</IconButton>
            </div>
          </header>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* preview */}
            <div className="scroll-y" style={{ flex: 1, minWidth: 0, background: '#D7DBE1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 * zoom, padding: '32px 24px 80px' }}>
              {[1, 2].map((n) => (
                <div key={n} style={{ width: dims.w * zoom, height: dims.h * zoom, flex: '0 0 auto' }}>
                  <div style={{ width: dims.w, height: dims.h, transform: 'scale(' + zoom + ')', transformOrigin: 'top left' }}>
                    <PageChrome header={o.header} footer={o.footer} pageNo={n} pageTotal={3} watermark={o.watermark} dims={dims} margin={o.margin}>
                      {n === 1 ? <Page1Body o={o} /> : <Page2Body o={o} />}
                    </PageChrome>
                  </div>
                </div>
              ))}
              <div style={{ font: '12px/1 var(--font-sans)', color: 'var(--text-muted)', paddingTop: 4 }}>Page 3 continues — concrete cone breakout</div>
            </div>

            {/* options + footer */}
            <div style={{ flex: '0 0 320px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <OptionsPanel o={o} set={set} fmt={fmt} setFmt={setFmt} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px', borderTop: '1px solid var(--border-hairline)', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-chrome)' }}>
                <Button variant="secondary" style={{ flex: 1 }}>Cancel</Button>
                <Button variant="primary" iconLeft={fmt === 'print' ? PrintI(16) : DownloadI(16)} style={{ flex: 2 }}>{exportLabel}</Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<App />);
  };
  boot();
}
