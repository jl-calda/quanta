"use client";

import { useState } from "react";
import { useKeymap } from "@/lib/preferences/provider";
import { insertIntoActiveField, OPERATOR_TEMPLATES } from "./math-entry";
import { useEditor } from "./state/editor-provider";
import { Icon } from "./icons";

/**
 * Math keypad — a persistent toolbar docked at the bottom of the editor (the
 * lower toolbar area), never an overlay over the canvas. Its Build tab is the
 * build-notation palette (a/b, x², √, _, ^, π, Σ, ∫, ∂, ≤) moved out of the
 * worksheet flow so nothing covers the formula while typing; further tabs cover
 * Greek / Operators / Fractions / Functions.
 *
 * Buttons use mousedown+preventDefault so they never steal focus from the active
 * field; insertion goes through the shared math-entry bridge so it works in the
 * MathLive field and in plain inputs (table cells, text). Structural keys carry a
 * `/lib/keymap` operator template — the single source — so a click drops the same
 * 2D structure the ribbon and keyboard shortcuts do. The grid collapses to the
 * tab strip via the editor UI reducer (`keypadOpen`), so the ribbon's palette
 * button still toggles it.
 */
interface Key {
  s: string;
  insert: string;
  hint?: string;
  /** Operator template key — its LaTeX builds a 2D structure, its source seeds plain inputs. */
  op?: keyof typeof OPERATOR_TEMPLATES;
}

const CATEGORIES: Record<string, Key[]> = {
  Build: [
    { s: "a⁄b", insert: "/", hint: "/", op: "fraction" },
    { s: "x²", insert: "^", hint: "^", op: "exponent" },
    { s: "xⁿ", insert: "^", hint: "^", op: "exponent" },
    { s: "x_n", insert: "_", hint: "_", op: "subscript" },
    { s: "√", insert: "sqrt(", hint: "\\", op: "root" },
    { s: "π", insert: "pi", hint: ":p" },
    { s: "Σ", insert: "summation(", op: "summation" },
    { s: "∫", insert: "integral(", op: "integral" },
    { s: "∂", insert: "diff(", op: "partial" },
    { s: "≤", insert: "<=", hint: "<=" },
    { s: ":=", insert: ":=", hint: ":", op: "assign" },
    { s: "·", insert: "*" },
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
  const { state, dispatch } = useEditor();
  const open = state.ui.keypadOpen; // controls whether the key grid is expanded
  const editing = state.editingId != null; // keys act on the focused field
  const [cat, setCat] = useState<keyof typeof CATEGORIES>("Build");

  const insert = (key: Key) => {
    // Structural keys carry an operator template (single source: /lib/keymap):
    // its LaTeX builds the 2D form in the MathLive field, its source is the plain
    // fallback for inputs. Other keys insert their literal token.
    if (key.op) {
      const tpl = OPERATOR_TEMPLATES[key.op];
      insertIntoActiveField({ latex: tpl.latex, text: tpl.source });
      return;
    }
    insertIntoActiveField({ text: key.insert });
  };

  return (
    <div
      className="ed-keypad-dock"
      style={{
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-chrome)",
        borderTop: "1px solid var(--border-hairline)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "5px 12px 0" }}>
        {Object.keys(CATEGORIES).map((k) => (
          <button
            key={k}
            onClick={() => setCat(k as keyof typeof CATEGORIES)}
            className={"ed-tab" + (cat === k ? " on" : "")}
            style={{ padding: "5px 8px", font: (cat === k ? "600" : "500") + " 11px/1 var(--font-sans)", color: cat === k ? "var(--text-primary)" : "var(--text-muted)" }}
          >
            {k}
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ font: "10.5px/1 var(--font-sans)", color: "var(--text-muted)", background: "var(--accent-tint)", borderRadius: "var(--radius-full)", padding: "3px 7px" }}>
          Keymap: <span style={{ color: "var(--accent)", fontWeight: 600 }}>{keymap.name}</span>
        </span>
        <button
          onClick={() => dispatch({ type: "SET_KEYPAD", open: !open })}
          aria-label={open ? "Collapse math keypad" : "Expand math keypad"}
          title={open ? "Collapse math keypad" : "Expand math keypad"}
          style={{ marginLeft: 6, display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, height: 22, border: "none", background: "transparent", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer" }}
        >
          <Icon name={open ? "chevD" : "chevU"} size={15} />
        </button>
      </div>

      {open && (
        <div
          // Keys are no-ops without a focused field — dim to signal that.
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4, padding: "8px 12px", borderTop: "1px solid var(--border-hairline)", marginTop: 5, opacity: editing ? 1 : 0.55, transition: "opacity var(--dur-fast) var(--ease-out)" }}
        >
          {CATEGORIES[cat].map((key, i) => (
            <button
              key={i}
              className="kp-key"
              title={key.hint ? `Key: ${key.hint}` : key.insert}
              onMouseDown={(e) => {
                e.preventDefault();
                insert(key);
              }}
              style={{ position: "relative", minWidth: key.s.length > 2 ? 44 : 34, fontSize: key.s.length > 2 ? 12 : 15, fontFamily: key.s.length > 2 ? "var(--font-sans)" : "var(--font-math)" }}
            >
              {key.s}
              {key.hint && (
                // Inline key-hint chip — the keyboard path is always discoverable:
                // click to learn, type next time.
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
          <span style={{ flex: 1 }} />
          <span style={{ font: "11px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            Type{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>/ ^ _ :</code> or{" "}
            <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>space</code> to build notation
          </span>
        </div>
      )}
    </div>
  );
}
