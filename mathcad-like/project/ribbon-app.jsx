/* Quanta ribbon spec — primitives + all 11 tabs + collapsed + quick-access */
{
  const boot = () => {
    const Q = window.QuantaDesignSystem_019e2c;
    if (!Q || !Q.Button || !window.QRibIcons) { return setTimeout(boot, 40); }
    const RB = window.QRibIcons;
    const { useState } = React;

    const TABS = ['Home', 'Insert', 'Math', 'Operators', 'Functions', 'Matrices', 'Plot', 'Format', 'Document', 'Calculate', 'Review'];

    /* ---------- glyph helpers (STIX math) ---------- */
    const It = ({ children, s = 13 }) => <span style={{ fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: s, lineHeight: 1 }}>{children}</span>;
    const Up = ({ children }) => <sup style={{ fontSize: '0.66em', fontStyle: 'normal' }}>{children}</sup>;
    const Dn = ({ children }) => <sub style={{ fontSize: '0.66em', fontStyle: 'normal' }}>{children}</sub>;
    const Big = ({ children, s = 20 }) => <span style={{ fontFamily: 'var(--font-math)', fontSize: s, lineHeight: 1 }}>{children}</span>;
    const MiniFrac = ({ n, d }) => (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'var(--font-math)', fontStyle: 'italic', fontSize: 11, lineHeight: 1.04 }}>
        <span>{n}</span><span style={{ borderTop: '1px solid currentColor', padding: '0 2px' }}>{d}</span>
      </span>
    );

    /* ---------- control primitives ---------- */
    const hoverIn = (e) => e.currentTarget.style.background = 'var(--surface-hover)';
    const hoverOut = (e) => e.currentTarget.style.background = 'transparent';

    function BigBtn({ icon, glyph, label, dropdown, tip }) {
      return (
        <span className="tt" data-tt={tip || label}>
          <button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, width: 60, height: 62, border: '1px solid transparent', borderRadius: 6, background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', padding: '6px 2px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 24, color: 'var(--text-primary)' }}>{glyph || icon(22)}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, font: '11px/1.1 var(--font-sans)', textAlign: 'center', color: 'var(--text-primary)' }}>{label}{dropdown && <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{RB.chevD(11)}</span>}</span>
          </button>
        </span>
      );
    }
    function SmBtn({ icon, glyph, label, dropdown, toggle, on, disabled }) {
      return (
        <button disabled={disabled} onMouseEnter={(e) => { if (!disabled) hoverIn(e); }} onMouseLeave={(e) => { if (!disabled) hoverOut(e); }} style={{ display: 'flex', alignItems: 'center', gap: 8, height: 23, padding: '0 8px 0 6px', border: '1px solid transparent', borderRadius: 5, background: toggle && on ? 'var(--accent-tint)' : 'transparent', cursor: disabled ? 'not-allowed' : 'pointer', color: disabled ? 'var(--text-muted)' : (toggle && on ? 'var(--accent)' : 'var(--text-primary)'), width: '100%', textAlign: 'left', opacity: disabled ? 0.5 : 1 }}>
          <span style={{ display: 'inline-flex', width: 17, justifyContent: 'center', color: toggle && on ? 'var(--accent)' : 'var(--text-muted)' }}>{glyph || icon(16)}</span>
          <span style={{ font: '11.5px/1 var(--font-sans)', whiteSpace: 'nowrap', flex: 1 }}>{label}</span>
          {dropdown && <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{RB.chevD(12)}</span>}
        </button>
      );
    }
    const SmStack = ({ children, w }) => <div style={{ display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center', minWidth: w || 124 }}>{children}</div>;

    function Stepper({ label, value }) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 6px', height: 23 }}>
          <span style={{ font: '11.5px/1 var(--font-sans)' }}>{label}</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', height: 19 }}>
            <button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ width: 17, height: '100%', border: 'none', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 12 }}>−</button>
            <span style={{ width: 18, textAlign: 'center', font: '11px var(--font-mono)' }}>{value}</span>
            <button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ width: 17, height: '100%', border: 'none', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-raised)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 12 }}>+</button>
          </div>
        </div>
      );
    }

    function DropField({ label, glyph, w = 128 }) {
      return (
        <button onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: 28, padding: '0 9px', border: '1px solid var(--border-strong)', borderRadius: 4, background: 'var(--surface-raised)', cursor: 'pointer', width: w }}>
          {glyph && <span style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>{glyph}</span>}
          <span style={{ font: '12px/1 var(--font-sans)', color: 'var(--text-primary)', flex: 1, textAlign: 'left' }}>{label}</span>
          <span style={{ color: 'var(--text-muted)', display: 'inline-flex' }}>{RB.chevD(13)}</span>
        </button>
      );
    }

    function Group({ caption, children, minW }) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '0 10px', borderRight: '1px solid var(--border-hairline)', minWidth: minW, flex: '0 0 auto' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
          <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--text-muted)', paddingBottom: 5, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>{caption}</div>
        </div>
      );
    }
    const ContextGroup = ({ caption, children, minW }) => (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', padding: '0 10px', borderRight: '1px solid var(--border-hairline)', minWidth: minW, flex: '0 0 auto', background: 'color-mix(in srgb, var(--accent-tint) 35%, transparent)' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>{children}</div>
        <div style={{ font: '10px/1 var(--font-sans)', color: 'var(--accent)', paddingBottom: 5, letterSpacing: '0.01em', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>{caption}</div>
      </div>
    );

    /* special widgets */
    function ColorBtn() {
      return (
        <button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: 30, height: 23, border: '1px solid transparent', borderRadius: 5, background: 'transparent', cursor: 'pointer', justifyContent: 'center' }}>
          <span style={{ display: 'inline-flex', color: 'var(--text-primary)' }}>{RB.color(15)}</span>
          <span style={{ width: 17, height: 3, borderRadius: 1, background: 'var(--accent)' }} />
        </button>
      );
    }
    function AlignCluster() {
      return (
        <div style={{ display: 'flex', gap: 1 }}>
          {[RB.alignLeft, RB.alignCenter, RB.alignRight].map((ic, i) => (
            <button key={i} onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ width: 24, height: 23, border: '1px solid transparent', borderRadius: 4, background: i === 0 ? 'var(--accent-tint)' : 'transparent', cursor: 'pointer', color: i === 0 ? 'var(--accent)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{ic(16)}</button>
          ))}
        </div>
      );
    }
    function ColumnsPicker() {
      const cols = [1, 2, 3];
      return (
        <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', height: 30 }}>
          {cols.map((n) => {
            const on = n === 2;
            return (
              <button key={n} className="tt" data-tt={n + ' column' + (n > 1 ? 's' : '')} onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'var(--surface-hover)'; }} onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'var(--surface-raised)'; }} style={{ width: 34, height: '100%', border: 'none', borderLeft: n > 1 ? '1px solid var(--border-hairline)' : 'none', background: on ? 'var(--accent-tint)' : 'var(--surface-raised)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2, color: on ? 'var(--accent)' : 'var(--text-muted)' }}>
                {Array.from({ length: n }).map((_, i) => <span key={i} style={{ width: n === 1 ? 14 : n === 2 ? 6 : 4, height: 16, border: '1px solid currentColor', borderRadius: 1 }} />)}
              </button>
            );
          })}
        </div>
      );
    }
    function RowsColsPicker() {
      const R = 4, C = 5, selR = 2, selC = 3;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + C + ', 11px)', gridAutoRows: '11px', gap: 2, padding: 4, border: '1px solid var(--border-strong)', borderRadius: 4, background: 'var(--surface-raised)' }}>
            {Array.from({ length: R * C }).map((_, i) => { const r = Math.floor(i / C), cc = i % C; const on = r < selR && cc < selC; return <span key={i} style={{ width: 11, height: 11, borderRadius: 2, background: on ? 'var(--accent)' : 'var(--surface-chrome)', border: '1px solid ' + (on ? 'var(--accent)' : 'var(--border-hairline)') }} />; })}
          </div>
          <span style={{ font: '10px/1 var(--font-mono)', color: 'var(--text-muted)' }}>{selR} × {selC}</span>
        </div>
      );
    }

    /* ============================ TAB CONTENTS ============================ */
    function HomeTab() {
      return (<>
        <Group caption="Clipboard"><BigBtn icon={RB.paste} label="Paste" dropdown /><SmStack w={92}><SmBtn icon={RB.cut} label="Cut" /><SmBtn icon={RB.copy} label="Copy" /></SmStack></Group>
        <Group caption="Region"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 4px' }}><SmBtn glyph={<Big s={15}>=</Big>} label="Math" /><SmBtn icon={RB.area} label="Area" /><SmBtn icon={RB.text} label="Text" /><SmBtn icon={RB.image} label="Image" /><SmBtn icon={RB.table} label="Table" /><SmBtn icon={RB.control} label="Control" /></div></Group>
        <Group caption="Math format"><BigBtn icon={RB.fmt} label="Result format" dropdown /><SmStack w={150}><SmBtn icon={RB.units} label="Units display" dropdown /><Stepper label="Decimals" value="2" /><SmBtn icon={RB.steps} label="Show steps" toggle on /></SmStack></Group>
        <Group caption="Text styles"><DropField label="Body" w={130} /></Group>
        <Group caption="Editing"><BigBtn icon={RB.find} label="Find" /></Group>
      </>);
    }

    function InsertTab() {
      return (<>
        <Group caption="Regions"><BigBtn glyph={<Big s={20}>=</Big>} label="Math" /><SmStack w={92}><SmBtn icon={RB.text} label="Text" /><SmBtn icon={RB.table} label="Table" /></SmStack><BigBtn icon={RB.solve} label="Solve block" /></Group>
        <Group caption="Visuals"><BigBtn icon={RB.plot} label="Plot" dropdown /><SmStack w={104}><SmBtn icon={RB.image} label="Image" /><SmBtn icon={RB.sketch} label="Sketch" /></SmStack></Group>
        <Group caption="Controls"><BigBtn icon={RB.control} label="Control" dropdown /></Group>
        <Group caption="Reference"><SmStack w={150}><SmBtn icon={RB.include} label="Include worksheet" /><SmBtn glyph={<Big s={15}>Σ</Big>} label="Symbol" /><SmBtn icon={RB.link} label="Link / tag" /></SmStack></Group>
      </>);
    }

    function MathTab() {
      return (<>
        <Group caption="Palettes"><BigBtn icon={RB.palette} label="Operators" dropdown /><BigBtn glyph={<Big s={18}>ƒ(x)</Big>} label="Functions" dropdown /></Group>
        <Group caption="Result"><BigBtn icon={RB.fmt} label="Result format" dropdown /><SmStack w={132}><SmBtn icon={RB.units} label="Units" dropdown /><Stepper label="Decimals" value="2" /></SmStack></Group>
        <Group caption="Evaluation"><SmStack w={150}><SmBtn glyph={<Big s={13}>:=</Big>} label="Assignment  ( := )" /><SmBtn glyph={<Big s={13}>=</Big>} label="Evaluate  ( = )" /><SmBtn glyph={<Big s={13}>≡</Big>} label="Global  ( ≡ )" /></SmStack></Group>
        <Group caption="Modifiers"><SmStack w={140}><SmBtn icon={RB.vectorize} label="Vectorize" /><SmBtn icon={RB.label} label="Label / identifier" /></SmStack></Group>
      </>);
    }

    function OperatorsTab() {
      const tile = (glyph, label, tip) => <span className="tt" data-tt={tip || label}><button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, width: 46, height: 56, border: '1px solid transparent', borderRadius: 6, background: 'transparent', cursor: 'pointer' }}><span style={{ display: 'inline-flex', alignItems: 'center', height: 22, color: 'var(--text-math)' }}>{glyph}</span><span style={{ font: '9.5px/1.1 var(--font-sans)', color: 'var(--text-muted)', textAlign: 'center' }}>{label}</span></button></span>;
      return (<>
        <Group caption="Structures">{tile(<MiniFrac n="a" d="b" />, 'Fraction')}{tile(<Big s={16}><It>x</It><Up>n</Up></Big>, 'Exponent')}{tile(<Big s={16}>√<span style={{ borderTop: '1px solid currentColor' }}><It>x</It></span></Big>, 'Root')}{tile(<Big s={15}><It>x</It><Dn>n</Dn></Big>, 'Subscript')}{tile(<Big s={16}>|<It>x</It>|</Big>, 'Absolute')}{tile(<Big s={15}><It>n</It>!</Big>, 'Factorial')}</Group>
        <Group caption="Large operators">{tile(<Big s={20}>Σ</Big>, 'Summation')}{tile(<Big s={20}>∏</Big>, 'Product')}{tile(<Big s={20}>∫</Big>, 'Integral')}</Group>
        <Group caption="Calculus">{tile(<MiniFrac n="d" d="dx" />, 'Derivative')}{tile(<MiniFrac n="∂" d="∂x" />, 'Partial')}{tile(<Big s={13}>lim</Big>, 'Limit')}</Group>
        <Group caption="Ranges">{tile(<Big s={13}><It>m</It>‥<It>n</It></Big>, 'Range variable')}{tile(<Big s={14}>[ ]</Big>, 'Index')}</Group>
      </>);
    }

    function FunctionsTab() {
      return (<>
        <Group caption="Categories"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}><DropField label="Math" w={120} /><DropField label="Statistics" w={120} /><DropField label="Solving" w={120} /><DropField label="Matrix" w={120} /></div></Group>
        <Group caption="More categories"><SmStack w={150}><SmBtn icon={RB.fx} label="Lookup & data" dropdown /><SmBtn icon={RB.fx} label="Programming" dropdown /><SmBtn icon={RB.fx} label="Engineering" dropdown /></SmStack></Group>
        <Group caption="Insert"><BigBtn icon={RB.fx} label="Insert function…" /></Group>
      </>);
    }

    function MatricesTab() {
      return (<>
        <Group caption="Insert" minW={92}><div className="tt" data-tt="Pick rows × columns"><RowsColsPicker /></div></Group>
        <Group caption="Operations"><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px 4px' }}><SmBtn icon={RB.transpose} label="Transpose" /><SmBtn icon={RB.identity} label="Identity" /><SmBtn icon={RB.inverse} label="Inverse" /><SmBtn icon={RB.determinant} label="Determinant" /></div></Group>
        <Group caption="Build"><SmStack w={132}><SmBtn icon={RB.augment} label="Augment" /><SmBtn icon={RB.augment} label="Stack" /><SmBtn icon={RB.indexing} label="Indexing" /></SmStack></Group>
      </>);
    }

    function PlotTab() {
      return (<>
        <Group caption="Insert plot"><BigBtn icon={RB.plot} label="2D plot" /><SmStack w={104}><SmBtn icon={RB.polar} label="Polar" /><SmBtn icon={RB.contour} label="Contour" /></SmStack><SmStack w={96}><SmBtn icon={RB.plot3d} label="3D" /><SmBtn icon={RB.chart} label="Chart" /></SmStack></Group>
        <ContextGroup caption={<>{RB.dot ? null : null}Traces · selected</>} minW={0}><SmStack w={132}><SmBtn icon={RB.plot} label="Add trace" /><SmBtn icon={RB.color} label="Trace style" dropdown /><SmBtn icon={RB.label} label="Legend" toggle on /></SmStack></ContextGroup>
        <ContextGroup caption="Axes · selected"><SmStack w={128}><SmBtn icon={RB.gridlines} label="Gridlines" toggle on /><SmBtn icon={RB.units} label="Scale (lin/log)" dropdown /><SmBtn icon={RB.label} label="Axis labels" /></SmStack></ContextGroup>
        <ContextGroup caption="Chart · selected"><SmStack w={120}><SmBtn icon={RB.fmt} label="Title" /><SmBtn icon={RB.border} label="Frame" toggle on /></SmStack></ContextGroup>
      </>);
    }

    function FormatTab() {
      return (<>
        <Group caption="Text"><DropField label="Body" w={108} /><Stepper label="" value="13" /><div style={{ display: 'flex', gap: 1 }}><SmBtn icon={RB.bold} label="" disabled /><SmBtn icon={RB.italic} label="" disabled /><SmBtn icon={RB.underline} label="" disabled /></div></Group>
        <Group caption="Color"><ColorBtn /></Group>
        <Group caption="Align"><AlignCluster /></Group>
        <Group caption="Indent"><div style={{ display: 'flex', gap: 1 }}><span className="tt" data-tt="Outdent"><button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ width: 28, height: 28, border: '1px solid transparent', borderRadius: 5, background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{RB.indentL(18)}</button></span><span className="tt" data-tt="Indent"><button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ width: 28, height: 28, border: '1px solid transparent', borderRadius: 5, background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{RB.indentR(18)}</button></span></div></Group>
        <Group caption="Row columns" minW={0}><ColumnsPicker /><span className="tt" data-tt="Span all columns" style={{ marginLeft: 4 }}><button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ width: 28, height: 28, border: '1px solid transparent', borderRadius: 5, background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{RB.spanCols(18)}</button></span></Group>
        <Group caption="Region"><SmStack w={132}><SmBtn icon={RB.border} label="Region border" toggle /><SmBtn icon={RB.condfmt} label="Conditional format" /></SmStack></Group>
      </>);
    }

    function DocumentTab() {
      return (<>
        <Group caption="Setup"><BigBtn icon={RB.pagesetup} label="Page setup" dropdown /><SmStack w={120}><SmBtn icon={RB.margins} label="Margins" dropdown /><SmBtn icon={RB.header} label="Headers / footers" /></SmStack></Group>
        <Group caption="Columns"><BigBtn icon={RB.columns} label="Default columns" dropdown tip="Default columns — page / section" /></Group>
        <Group caption="Show"><SmStack w={150}><SmBtn icon={RB.gridlines} label="Gridlines" toggle on /><SmBtn icon={RB.frameToggle} label="Page-body frame" toggle /><SmBtn icon={RB.header} label="Header / footer frame" toggle /></SmStack></Group>
        <Group caption="Navigate"><SmStack w={120}><SmBtn icon={RB.toc} label="Table of contents" /><SmBtn icon={RB.gotopage} label="Go to page…" /></SmStack></Group>
      </>);
    }

    function CalculateTab() {
      return (<>
        <Group caption="Mode"><div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 4, overflow: 'hidden', height: 28 }}>{['Auto', 'Manual'].map((m, i) => <button key={m} style={{ padding: '0 11px', height: '100%', border: 'none', borderLeft: i ? '1px solid var(--border-hairline)' : 'none', cursor: 'pointer', background: i ? 'var(--accent-tint)' : 'var(--surface-raised)', color: i ? 'var(--accent)' : 'var(--text-muted)', font: (i ? '600' : '500') + ' 12px/1 var(--font-sans)' }}>{m}</button>)}</div></Group>
        <Group caption="Recalculate"><BigBtn icon={RB.refresh} label="Recalculate" /><BigBtn icon={RB.refreshHere} label="To here" /></Group>
        <Group caption="Engine"><SmStack w={150}><SmBtn icon={RB.units} label="Units system  (SI)" dropdown /><SmBtn icon={RB.thread} label="Multithreading" toggle on /><SmBtn icon={RB.algo} label="Solver options…" /></SmStack></Group>
      </>);
    }

    function ReviewTab() {
      return (<>
        <Group caption="Comments"><BigBtn icon={RB.commentPlus} label="New comment" /><SmStack w={112}><SmBtn icon={RB.comment} label="Show all" toggle on /><SmBtn icon={RB.comment} label="Resolve" /></SmStack></Group>
        <Group caption="Changes"><SmStack w={170}><SmBtn icon={RB.track} label="Track changes" toggle /><SmBtn icon={RB.redefine} label="Redefinition warnings" toggle on /><SmBtn icon={RB.compare} label="Compare versions" /></SmStack></Group>
        <Group caption="Proofing"><BigBtn icon={RB.spell} label="Spell check" /></Group>
        <Group caption="Protect"><BigBtn icon={RB.protect} label="Lock area" dropdown /></Group>
      </>);
    }

    const TAB_CONTENT = { Home: HomeTab, Insert: InsertTab, Math: MathTab, Operators: OperatorsTab, Functions: FunctionsTab, Matrices: MatricesTab, Plot: PlotTab, Format: FormatTab, Document: DocumentTab, Calculate: CalculateTab, Review: ReviewTab };

    /* ---------- tab strip + ribbon frame ---------- */
    function TabStrip({ active, collapsed, onToggle }) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px', borderBottom: collapsed ? 'none' : '1px solid var(--border-hairline)', height: 34, background: 'var(--surface-chrome)' }}>
          {TABS.map((t) => { const on = t === active; return <button key={t} className={'rb-tab' + (on ? ' on' : '')} style={{ padding: '0 11px', height: 34, color: on ? 'var(--text-primary)' : 'var(--text-muted)', font: (on ? '600' : '500') + ' 12.5px/1 var(--font-sans)' }}>{t}</button>; })}
          <span className="tt" data-tt={collapsed ? 'Expand ribbon' : 'Collapse ribbon'} style={{ marginLeft: 'auto' }}><button onClick={onToggle} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, border: 'none', background: 'transparent', borderRadius: 5, color: 'var(--text-muted)', cursor: 'pointer' }} onMouseEnter={hoverIn} onMouseLeave={hoverOut}>{collapsed ? RB.chevD(16) : RB.chevU(16)}</button></span>
        </div>
      );
    }
    function RibbonFrame({ tab }) {
      const Content = TAB_CONTENT[tab];
      return (
        <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-chrome)', boxShadow: 'var(--shadow-sm)' }}>
          <TabStrip active={tab} collapsed={false} onToggle={() => {}} />
          <div className="scroll-x" style={{ display: 'flex', alignItems: 'stretch', height: 86, padding: '0 2px' }}><Content /></div>
        </div>
      );
    }

    /* ---------- collapsed + quick-access ---------- */
    function CollapsedRibbon() {
      const [active] = useState('Home');
      return <div style={{ border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--surface-chrome)', boxShadow: 'var(--shadow-sm)' }}><TabStrip active="Home" collapsed onToggle={() => {}} /></div>;
    }
    function QuickAccess() {
      const tool = (icon, glyph, tip) => <span className="tt" data-tt={tip}><button onMouseEnter={hoverIn} onMouseLeave={hoverOut} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, border: 'none', background: 'transparent', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer' }}>{glyph || icon(18)}</button></span>;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 40, padding: '0 6px', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', background: 'var(--surface-chrome)', boxShadow: 'var(--shadow-sm)' }}>
          <span style={{ display: 'inline-flex', marginRight: 4 }}><svg width="18" height="18" viewBox="0 0 32 32" fill="none"><rect x="2.75" y="2.75" width="26.5" height="26.5" rx="4" stroke="var(--accent)" strokeWidth="1.5" /><line x1="8" y1="16" x2="24" y2="16" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" /><line x1="12.5" y1="10.25" x2="19.5" y2="10.25" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="16" cy="21.75" r="1.6" fill="var(--status-pass)" /></svg></span>
          <span style={{ width: 1, height: 20, background: 'var(--border-hairline)', margin: '0 3px' }} />
          {tool(null, <Big s={15}>=</Big>, 'Insert math')}
          {tool(RB.refresh, null, 'Recalculate')}
          {tool(RB.fmt, null, 'Result format')}
          {tool(RB.columns, null, 'Row columns')}
          <span style={{ width: 1, height: 20, background: 'var(--border-hairline)', margin: '0 3px' }} />
          {tool(RB.more, null, 'More tools')}
        </div>
      );
    }

    /* ---------- board ---------- */
    const Label = ({ children, sub }) => <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '0 0 10px' }}><span style={{ font: '600 12px/1 var(--font-sans)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-primary)' }}>{children}</span>{sub && <span style={{ font: '12px/1.3 var(--font-sans)', color: 'var(--text-muted)' }}>{sub}</span>}</div>;

    function Board() {
      return (
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px 36px 72px' }} data-screen-label="Ribbon spec">
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 6 }}>
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none"><rect x="2.75" y="2.75" width="26.5" height="26.5" rx="4" stroke="var(--accent)" strokeWidth="1.5" /><line x1="8" y1="16" x2="24" y2="16" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" /><line x1="12.5" y1="10.25" x2="19.5" y2="10.25" stroke="var(--ink)" strokeWidth="1.5" strokeLinecap="round" /><circle cx="16" cy="21.75" r="1.6" fill="var(--status-pass)" /></svg>
            <span style={{ font: '600 11px/1 var(--font-sans)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Quanta · Editor chrome</span>
          </div>
          <h1 style={{ margin: 0, font: '600 26px/1.2 var(--font-sans)', letterSpacing: '-0.015em', color: 'var(--text-primary)' }}>Ribbon</h1>
          <p style={{ margin: '8px 0 0', font: '14px/1.6 var(--font-sans)', color: 'var(--text-muted)', maxWidth: 660 }}>The primary editor chrome: two rows — a tab strip (active tab underlined in Blueprint) over a content row of captioned groups. Each of the 11 tabs is shown below with its full contents. Hover any control for its tooltip.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 30, marginTop: 32 }}>
            {TABS.map((t) => <div key={t}><Label sub={t === 'Plot' ? 'contextual Traces / Axes / Chart groups appear when a plot is selected (shown tinted)' : null}>{t}</Label><RibbonFrame tab={t} /></div>)}
          </div>

          <div style={{ borderTop: '1px solid var(--border-hairline)', margin: '44px 0 0', paddingTop: 36 }}>
            <h2 style={{ margin: 0, font: '600 18px/1.2 var(--font-sans)', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Space-saving states</h2>
            <p style={{ margin: '6px 0 0', font: '13.5px/1.6 var(--font-sans)', color: 'var(--text-muted)', maxWidth: 640 }}>Secondary states for reclaiming vertical room — not replacements for the ribbon.</p>

            <div style={{ marginTop: 26 }}>
              <Label sub="tabs only — content hidden via the chevron; click a tab or the chevron to expand">Collapsed ribbon</Label>
              <CollapsedRibbon />
            </div>
            <div style={{ marginTop: 26 }}>
              <Label sub="a slim strip of the most-used tools with an overflow ⋯ — for focused, full-height worksheets">Quick-access strip</Label>
              <QuickAccess />
            </div>
          </div>
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById('root')).render(<Board />);
  };
  boot();
}
