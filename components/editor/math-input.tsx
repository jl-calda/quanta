"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { applyColonAssign, type Keymap } from "@/lib/keymap";
import { useKeymap } from "@/lib/preferences/provider";
import { latexToSource, looksLikeLatex } from "@/lib/calc";
import { MathField } from "./math-field";
import { insertIntoActiveField } from "./math-entry";
import { MATH_PALETTE } from "./regions/math-display";

/**
 * MathInput — the reusable math-entry seam. One typed contract for entering a
 * unit-aware formula: the PRIMARY surface is MathLive's natural 2D editor
 * (Mathcad-style), with a plain-text mono field as a secondary sub-mode. Both
 * modes round-trip through the engine's plain-text `source` (never LaTeX in the
 * content tree); the keymap comes from `/lib/keymap`; pasted LaTeX converts to
 * source in the mono field and renders as 2D in the math field; and the inline
 * palette + a keyboard button (which summons the shared Quanta keypad) cover
 * click-driven entry.
 *
 * The math region drives all of its entry through this seam; other regions adopt
 * it as their own refinement rows land. It owns only the entry chrome — commit
 * semantics (Enter/blur) and cancel (Esc) are reported to the caller.
 */
export interface MathInputProps {
  /** Canonical engine-plain-text source to seed entry with. */
  value: string;
  keymap: Keymap;
  /** Committed (Enter / blur) — receives engine plain-text source. */
  onCommit: (source: string) => void;
  /** Escape — discard and leave entry. */
  onCancel: () => void;
  /** Live source as it changes (e.g. for an external preview). Optional. */
  onChange?: (source: string) => void;
  /** Toggle the floating Quanta keypad; when omitted the keyboard button hides. */
  onToggleKeypad?: () => void;
  /** Mono-mode placeholder. */
  placeholder?: string;
}

type EntryMode = "math" | "text";

export function MathInput({
  value,
  keymap,
  onCommit,
  onCancel,
  onChange,
  onToggleKeypad,
  placeholder,
}: MathInputProps) {
  // `draft` is the canonical engine-plain-text source for both modes; MathLive is
  // seeded from it and commits back to it. Natural 2D entry is primary; the mono
  // field is the secondary toggle (CLAUDE.md / Func §2).
  const [draft, setDraft] = useState(value);
  const [mode, setMode] = useState<EntryMode>("math");
  const liveLatex = useRef("");

  const updateDraft = (source: string) => {
    setDraft(source);
    onChange?.(source);
  };

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        {mode === "math" ? (
          <MathField
            value={draft}
            keymap={keymap}
            onLatexChange={(latex) => {
              liveLatex.current = latex;
              onChange?.(latexToSource(latex));
            }}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        ) : (
          <PlainTextEntry
            source={draft}
            placeholder={placeholder}
            onChangeDraft={updateDraft}
            onCommit={onCommit}
            onCancel={onCancel}
          />
        )}

        <EntryModeToggle
          mode={mode}
          toMath={() => setMode("math")}
          toText={() => {
            // Carry the in-progress 2D formula across to the mono field.
            if (liveLatex.current) updateDraft(latexToSource(liveLatex.current));
            setMode("text");
          }}
        />

        {onToggleKeypad && (
          <button
            type="button"
            title="Math keypad"
            aria-label="Toggle math keypad"
            // Never steal focus from the active field — keeps the edit alive.
            onMouseDown={(e) => e.preventDefault()}
            onClick={onToggleKeypad}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 26,
              height: 22,
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-raised)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-math)",
              fontSize: 14,
            }}
          >
            Σ
          </button>
        )}
      </div>

      <MathPalette />
    </div>
  );
}

/**
 * Inline math-input bar shown beneath the field (Mockup 6.1 Frame A). Click a
 * key to drop a structure at the caret of the active field, or type the shortcut
 * shown. Insertion goes through the shared math-entry bridge so it targets the
 * MathLive field or the mono input automatically; keys fire on `onMouseDown` +
 * `preventDefault` so they never blur/commit the edit.
 */
function MathPalette() {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 9px",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-chrome)",
        flexWrap: "wrap",
      }}
    >
      {MATH_PALETTE.map((p) => (
        <button
          key={p.label}
          type="button"
          className="palette-key"
          title={`${p.label}  (${p.hint})`}
          aria-label={p.label}
          onMouseDown={(e) => {
            e.preventDefault();
            insertIntoActiveField({ latex: p.latex, text: p.text });
          }}
          style={{
            display: "inline-flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
            minWidth: 34,
            padding: "4px 6px",
            border: "1px solid var(--border-hairline)",
            borderRadius: 5,
            background: "var(--surface-raised)",
            cursor: "pointer",
          }}
        >
          <span style={{ fontFamily: "var(--font-math)", fontSize: 15, color: "var(--text-math)", lineHeight: 1 }}>
            {p.glyph}
          </span>
          <span style={{ font: "8.5px/1 var(--font-mono)", color: "var(--text-muted)" }}>{p.hint}</span>
        </button>
      ))}
      <span style={{ flex: 1 }} />
      <span style={{ font: "11px/1.4 var(--font-sans)", color: "var(--text-muted)", maxWidth: 150, textAlign: "right" }}>
        Type <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>/ ^ _ :</code> or{" "}
        <code style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>space</code> to build notation
      </span>
    </div>
  );
}

/** Secondary entry: the raw Mathcad-style mono field with the `:` → `:=` move
 *  and LaTeX-aware paste (pasted `\frac{a}{b}` converts to engine source). */
function PlainTextEntry({
  source,
  placeholder,
  onChangeDraft,
  onCommit,
  onCancel,
}: {
  source: string;
  placeholder?: string;
  onChangeDraft: (value: string) => void;
  onCommit: (source: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(source);
  const inputRef = useRef<HTMLInputElement>(null);
  const { keymapId } = useKeymap();

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const update = (value: string) => {
    setDraft(value);
    onChangeDraft(value);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === ":" && keymapId === "mathcad") {
      const el = e.currentTarget;
      const edit = applyColonAssign(el.value, el.selectionStart ?? el.value.length);
      if (edit) {
        e.preventDefault();
        update(edit.value);
        requestAnimationFrame(() => el.setSelectionRange(edit.caret, edit.caret));
      }
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text || !looksLikeLatex(text)) return; // plain source pastes natively
    e.preventDefault();
    const el = e.currentTarget;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const insert = latexToSource(text);
    const next = el.value.slice(0, start) + insert + el.value.slice(end);
    update(next);
    const caret = start + insert.length;
    requestAnimationFrame(() => el.setSelectionRange(caret, caret));
  };

  return (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => update(e.target.value)}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      onBlur={() => onCommit(draft)}
      onClick={(e) => e.stopPropagation()}
      spellCheck={false}
      placeholder={placeholder ?? "e.g. N_Rd := 0.75 · A_s · f_ub"}
      style={{
        font: "var(--text-14)/1.3 var(--font-mono)",
        color: "var(--text-primary)",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-focus)",
        boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent)",
        borderRadius: "var(--radius-sm)",
        padding: "4px 8px",
        minWidth: Math.max(220, (draft.length + 6) * 8.4),
        outline: "none",
      }}
    />
  );
}

/** Switch between natural 2D (√x) and plain text (Aa); preserves the edit. */
function EntryModeToggle({
  mode,
  toMath,
  toText,
}: {
  mode: EntryMode;
  toMath: () => void;
  toText: () => void;
}) {
  const seg = (active: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 20,
    border: "none",
    cursor: "pointer",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text-muted)",
  });

  return (
    <span
      role="group"
      aria-label="Entry mode"
      style={{
        display: "inline-flex",
        border: "1px solid var(--accent)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        title="Natural math (2D)"
        aria-pressed={mode === "math"}
        // Don't steal focus from the active field — keeps the edit alive.
        onMouseDown={(e) => e.preventDefault()}
        onClick={toMath}
        style={{ ...seg(mode === "math"), fontFamily: "var(--font-math)", fontStyle: "italic", fontSize: 11 }}
      >
        √x
      </button>
      <button
        type="button"
        title="Plain formula (text)"
        aria-pressed={mode === "text"}
        onMouseDown={(e) => e.preventDefault()}
        onClick={toText}
        style={{ ...seg(mode === "text"), fontSize: 10, fontWeight: 600 }}
      >
        Aa
      </button>
    </span>
  );
}
