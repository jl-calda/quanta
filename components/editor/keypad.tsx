"use client";

import { useRef, useState } from "react";
import { useKeymap } from "@/lib/preferences/provider";
import { insertIntoActiveField } from "./math-entry";
import { Icon } from "./icons";

/**
 * Floating math keypad — a draggable palette that inserts notation into the
 * focused formula field. Buttons use mousedown+preventDefault so they never
 * steal focus from the editor; insertion goes through the shared math-entry
 * bridge so it works in both the MathLive field and the mono input. Tabs mirror
 * the design mockup.
 */
interface Key {
  s: string;
  insert: string;
  hint?: string;
}

const CATEGORIES: Record<string, Key[]> = {
  Build: [
    { s: "a⁄b", insert: "/", hint: "/" },
    { s: "xⁿ", insert: "^", hint: "^" },
    { s: "x_n", insert: "_", hint: "_" },
    { s: "√", insert: "sqrt(", hint: "\\" },
    { s: ":=", insert: ":=", hint: ":" },
    { s: "·", insert: "*" },
    { s: "|x|", insert: "abs(" },
    { s: "π", insert: "pi" },
    { s: "(", insert: "(" },
    { s: ")", insert: ")" },
    { s: "[", insert: "[" },
    { s: "]", insert: "]" },
  ],
  Greek: ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "ρ", "σ", "τ", "φ", "ψ", "ω", "Δ", "Σ", "Ω"].map((g) => ({ s: g, insert: g })),
  Operators: [
    { s: "+", insert: "+" }, { s: "−", insert: "-" }, { s: "×", insert: "*" }, { s: "÷", insert: "/" },
    { s: "±", insert: "+-" }, { s: "=", insert: "==" }, { s: "≠", insert: "!=" }, { s: "≤", insert: "<=" },
    { s: "≥", insert: ">=" }, { s: "<", insert: "<" }, { s: ">", insert: ">" }, { s: "^", insert: "^" },
  ],
  Fractions: [
    { s: "a⁄b", insert: "/" }, { s: "x²", insert: "^2" }, { s: "xⁿ", insert: "^" }, { s: "√", insert: "sqrt(" },
    { s: "∛", insert: "cbrt(" }, { s: "|x|", insert: "abs(" }, { s: "eˣ", insert: "exp(" }, { s: "ln", insert: "log(" },
    { s: "log", insert: "log10(" }, { s: "%", insert: "%" },
  ],
  Functions: [
    { s: "sin", insert: "sin(" }, { s: "cos", insert: "cos(" }, { s: "tan", insert: "tan(" }, { s: "max", insert: "max(" },
    { s: "min", insert: "min(" }, { s: "round", insert: "round(" }, { s: "floor", insert: "floor(" }, { s: "ceil", insert: "ceil(" },
  ],
};

export function Keypad() {
  const { keymap } = useKeymap();
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<keyof typeof CATEGORIES>("Build");
  const [pos, setPos] = useState<{ x: number | null; bottom: number; top?: number }>({ x: null, bottom: 18 });
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onDown = (e: React.MouseEvent) => {
    const panel = (e.currentTarget as HTMLElement).parentElement!;
    const rect = panel.getBoundingClientRect();
    drag.current = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top };
    const move = (ev: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      setPos({ x: d.ox + (ev.clientX - d.sx), bottom: 0, top: d.oy + (ev.clientY - d.sy) });
    };
    const up = () => {
      drag.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const insert = (text: string) => {
    insertIntoActiveField({ text });
  };

  const panelStyle: React.CSSProperties =
    pos.x == null
      ? { left: "50%", transform: "translateX(-50%)", bottom: pos.bottom }
      : { left: pos.x, top: pos.top };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ position: "fixed", left: "50%", transform: "translateX(-50%)", bottom: 18, zIndex: 40, display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px", borderRadius: "var(--radius-full)", border: "1px solid var(--border-strong)", background: "var(--surface-raised)", boxShadow: "var(--shadow-popover)", cursor: "pointer", color: "var(--text-primary)", font: "500 12.5px/1 var(--font-sans)" }}
      >
        <span style={{ fontFamily: "var(--font-math)", fontSize: 15 }}>Σ</span> Math keypad <span style={{ color: "var(--text-muted)" }}><Icon name="chevU" size={14} /></span>
      </button>
    );
  }

  return (
    <div style={{ position: "fixed", zIndex: 40, width: 320, background: "var(--surface-raised)", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-lg)", boxShadow: "var(--shadow-modal)", ...panelStyle }}>
      <div onMouseDown={onDown} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderBottom: "1px solid var(--border-hairline)", cursor: "grab", background: "var(--surface-chrome)", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }}>
        <span style={{ color: "var(--text-muted)", display: "inline-flex" }}><Icon name="grip" size={14} /></span>
        <span style={{ font: "600 12px/1 var(--font-sans)", color: "var(--text-primary)" }}>Math keypad</span>
        <span style={{ font: "10.5px/1 var(--font-sans)", color: "var(--text-muted)", background: "var(--accent-tint)", borderRadius: "var(--radius-full)", padding: "3px 7px" }}>
          Keymap: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{keymap.name}</span>
        </span>
        <button onClick={() => setOpen(false)} style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, border: "none", background: "transparent", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer" }}>
          <Icon name="chevD" size={15} />
        </button>
      </div>
      <div style={{ display: "flex", gap: 2, padding: "6px 8px 0", flexWrap: "wrap" }}>
        {Object.keys(CATEGORIES).map((k) => (
          <button key={k} onClick={() => setCat(k as keyof typeof CATEGORIES)} className={"ed-tab" + (cat === k ? " on" : "")} style={{ padding: "5px 7px", font: (cat === k ? "600" : "500") + " 11px/1 var(--font-sans)", color: cat === k ? "var(--text-primary)" : "var(--text-muted)" }}>
            {k}
          </button>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--border-hairline)", marginTop: 6, padding: 8, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4 }}>
        {CATEGORIES[cat].map((key, i) => (
          <button
            key={i}
            className="kp-key"
            title={key.hint ? `Key: ${key.hint}` : key.insert}
            onMouseDown={(e) => {
              e.preventDefault();
              insert(key.insert);
            }}
            style={{ position: "relative", gridColumn: key.s.length > 2 ? "span 2" : "span 1", fontSize: key.s.length > 2 ? 12 : 15, fontFamily: key.s.length > 2 ? "var(--font-sans)" : "var(--font-math)" }}
          >
            {key.s}
            {key.hint && (
              // Inline key hint chip (mockup) — 2px bottom border, so the
              // keyboard path is always discoverable: click to learn, type next time.
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  bottom: -1,
                  right: -1,
                  font: "8px/1 var(--font-mono)",
                  color: "var(--text-muted)",
                  background: "var(--surface-chrome)",
                  border: "1px solid var(--border-hairline)",
                  borderBottom: "2px solid var(--border-strong)",
                  borderRadius: 3,
                  padding: "1px 2px",
                  minWidth: 11,
                  textAlign: "center",
                }}
              >
                {key.hint}
              </span>
            )}
          </button>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--border-hairline)", padding: "6px 10px", font: "10.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
        Type to build notation — click a key to insert it at the cursor.
      </div>
    </div>
  );
}
