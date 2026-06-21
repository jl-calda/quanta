import { MathMotif } from "./math-motif";

/**
 * The dark, always-on brand panel of the split auth screen — blueprint dot-grid,
 * wordmark, value proposition, the live-math motif, and a quiet credibility line.
 *
 * It carries its own `data-theme="dark"` so it stays dark regardless of the
 * page theme; `.auth-brand-panel` (auth.css) re-aliases the semantic tokens onto
 * the dark base palette inside this scope. Ported from `Sign in.html`.
 */
export function BrandPanel() {
  return (
    <aside
      data-theme="dark"
      className="auth-brand-panel auth-brand-grid"
      style={{
        position: "relative",
        background: "var(--surface-paper)",
        color: "var(--text-primary)",
        padding: "52px 56px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "100vh",
        overflow: "hidden",
      }}
    >
      {/* wordmark — a calculation cell in miniature */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          position: "relative",
          zIndex: 1,
        }}
      >
        <svg
          width="30"
          height="30"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="2.75"
            y="2.75"
            width="26.5"
            height="26.5"
            rx="4"
            stroke="var(--accent)"
            strokeWidth="1.5"
          />
          <line x1="8" y1="16" x2="24" y2="16" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line
            x1="12.5"
            y1="10.25"
            x2="19.5"
            y2="10.25"
            stroke="var(--text-primary)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="16" cy="21.75" r="1.6" fill="var(--status-pass)" />
        </svg>
        <span
          style={{
            font: "600 20px/1 var(--font-sans)",
            letterSpacing: "-0.01em",
            color: "var(--text-primary)",
          }}
        >
          Quanta
        </span>
      </div>

      {/* hero: value prop + motif */}
      <div style={{ position: "relative", zIndex: 1, maxWidth: 430, paddingBottom: 8 }}>
        <h1
          style={{
            margin: "0 0 30px",
            font: "600 28px/1.32 var(--font-sans)",
            letterSpacing: "-0.012em",
            color: "var(--text-primary)",
            textWrap: "balance",
          }}
        >
          Engineering calculations that read like a textbook and recalculate like a
          spreadsheet.
        </h1>
        <MathMotif />
      </div>

      {/* quiet credibility line */}
      <div
        className="auth-brand-foot"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--status-pass)" }}
        />
        <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
          Built for structural, civil, and mechanical engineers.
        </span>
      </div>
    </aside>
  );
}
