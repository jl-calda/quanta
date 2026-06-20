"use client";

import { Frac } from "@/components/ds";
import { insertIntoActiveField } from "@/components/editor/math-entry";

/**
 * Math input bar with inline key hints (design mockup, §7). Each tool shows its
 * key hint as a small keycap chip (fraction = /, exponent = ^, subscript = _,
 * root = backslash, assign = :, Greek = Ctrl+G) so the keyboard path is always
 * discoverable — click to learn the key, then type it next time. The same hints
 * ride the floating editor keypad. Clicking inserts the structure into the
 * focused field (no-op on the standalone board, where no field is focused).
 */
interface Tool {
  sym: React.ReactNode;
  hint: string | null;
  label: string;
  insert: string;
}

const TOOLS: Tool[] = [
  { sym: <Frac num={<span style={{ fontSize: "0.7em" }}>a</span>} den={<span style={{ fontSize: "0.7em" }}>b</span>} />, hint: "/", label: "Fraction", insert: "/" },
  { sym: <span style={{ fontFamily: "var(--font-math)" }}>x<sup style={{ fontSize: "0.7em" }}>n</sup></span>, hint: "^", label: "Exponent", insert: "^" },
  { sym: <span style={{ fontFamily: "var(--font-math)" }}>x<sub style={{ fontSize: "0.7em" }}>i</sub></span>, hint: "_", label: "Subscript", insert: "_" },
  { sym: <span style={{ fontFamily: "var(--font-math)" }}>√</span>, hint: "\\", label: "Root", insert: "sqrt(" },
  { sym: <span style={{ fontFamily: "var(--font-math)" }}>:=</span>, hint: ":", label: "Assign", insert: ":=" },
  { sym: <span style={{ fontFamily: "var(--font-math)" }}>|x|</span>, hint: "|", label: "Absolute", insert: "abs(" },
  { sym: <span style={{ fontFamily: "var(--font-math)" }}>π</span>, hint: "⌃G", label: "Greek", insert: "pi" },
  { sym: <span style={{ fontFamily: "var(--font-math)", fontSize: 18 }}>Σ</span>, hint: null, label: "Sum", insert: "sum(" },
  { sym: <span style={{ fontFamily: "var(--font-math)", fontSize: 18 }}>∫</span>, hint: null, label: "Integral", insert: "integral(" },
  { sym: <span style={{ fontFamily: "var(--font-math)", fontSize: 18 }}>∂</span>, hint: null, label: "Partial", insert: "diff(" },
];

export function MathBar() {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: 5, background: "var(--surface-raised)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}>
      {TOOLS.map((t, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center" }}>
          {i === 7 && <span style={{ width: 1, height: 26, background: "var(--border-hairline)", margin: "0 3px" }} />}
          <button
            type="button"
            title={t.label + (t.hint ? "  (" + t.hint + ")" : "")}
            aria-label={t.label}
            onMouseDown={(e) => {
              e.preventDefault();
              insertIntoActiveField({ text: t.insert });
            }}
            style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 34, border: "1px solid transparent", borderRadius: "var(--radius-sm)", background: "transparent", cursor: "pointer", color: "var(--text-primary)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ fontSize: 15, color: "var(--text-math)" }}>{t.sym}</span>
            {t.hint && (
              <span style={{ position: "absolute", bottom: -1, right: -1, font: "8px/1 var(--font-mono)", color: "var(--text-muted)", background: "var(--surface-chrome)", border: "1px solid var(--border-hairline)", borderBottom: "2px solid var(--border-strong)", borderRadius: 3, padding: "1px 2px", minWidth: 11, textAlign: "center" }}>
                {t.hint}
              </span>
            )}
          </button>
        </span>
      ))}
    </div>
  );
}
