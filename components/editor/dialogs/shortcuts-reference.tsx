"use client";

import { useMemo, useState } from "react";
import { useKeymap } from "@/lib/preferences/provider";
import {
  detectPlatform,
  formatKeys,
  formatKeyToken,
  groupBindings,
  type KeyBinding,
  type KeyBindingGroup,
  type Platform,
} from "@/lib/keymap";

/**
 * The keyboard-shortcuts reference panel (design mockup 7.25) — a dense,
 * searchable, multi-column reference rendered straight from the active
 * `/lib/keymap` keymap (the SAME bindings that configure the MathLive editor, so
 * there is no drift). Keys render as keycap chips, platform-aware (⌘ vs Ctrl).
 *
 * This is the bare panel; `ShortcutsDialog` wraps it in a scrim overlay for the
 * editor, and the `/keyboard-shortcuts` design board embeds it inline.
 */

const GROUP_NOTES: Partial<Record<KeyBindingGroup, string>> = {
  "Math entry": "Notation builds as you type — natural 2D math.",
  "Operators & Greek": "Type a letter, then convert.",
  "Selection & navigation": "Move through placeholders.",
  Regions: "Build a worksheet region by region.",
};

function svg(children: React.ReactNode, size = 16) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
const KbdIcon = ({ size = 19 }: { size?: number }) =>
  svg(<><rect x="3" y="6" width="18" height="12" rx="1.6" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></>, size);
const SearchIcon = ({ size = 15 }: { size?: number }) =>
  svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>, size);
const CloseIcon = ({ size = 18 }: { size?: number }) => svg(<path d="M6 6l12 12M18 6 6 18" />, size);
const StarIcon = ({ size = 13 }: { size?: number }) =>
  svg(<path d="M12 3l2.2 5.6L20 9.2l-4.4 3.7L17 19l-5-3.3L7 19l1.4-6.1L4 9.2l5.8-.6z" />, size);

/** A single keycap chip — 2px bottom border (spec). */
function Key({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: wide ? "auto" : 22,
        height: 22,
        padding: wide ? "0 8px" : "0 5px",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        borderBottom: "2px solid var(--border-strong)",
        borderRadius: 4,
        font: "600 11px/1 var(--font-mono)",
        color: "var(--text-primary)",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </kbd>
  );
}

function Combo({ keys, platform }: { keys: string[]; platform: Platform }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
      {keys.map((k, i) => {
        if (k === "+") return <span key={i} style={{ color: "var(--text-muted)", font: "11px var(--font-sans)" }}>+</span>;
        if (k === "or") return <span key={i} style={{ color: "var(--text-muted)", font: "10.5px var(--font-sans)", margin: "0 1px" }}>or</span>;
        const label = formatKeyToken(k, platform);
        return <Key key={i} wide={label.length > 2}>{label}</Key>;
      })}
    </span>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: "color-mix(in srgb, var(--status-warning) 32%, transparent)", color: "inherit", borderRadius: 2 }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function Row({ it, q, platform }: { it: KeyBinding; q: string; platform: Platform }) {
  return (
    <div className="sc-row" style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 8px", borderRadius: "var(--radius-sm)" }}>
      <span style={{ flex: 1, minWidth: 0, font: "12.5px/1.4 var(--font-sans)", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
        {it.signature && <span style={{ display: "inline-flex", color: "var(--accent)", flex: "0 0 auto" }}><StarIcon /></span>}
        <span><Highlight text={it.label} q={q} /></span>
      </span>
      <Combo keys={it.keys} platform={platform} />
    </div>
  );
}

export interface ShortcutsReferenceProps {
  /** Renders the close button + footer hint when provided (the modal case). */
  onClose?: () => void;
  /** Embedded boards drop the modal shadow and let the height flow. */
  embedded?: boolean;
}

export function ShortcutsReference({ onClose, embedded }: ShortcutsReferenceProps) {
  const { keymap } = useKeymap();
  const [q, setQ] = useState("");
  const platform = useMemo(() => detectPlatform(), []);

  const groups = useMemo(() => groupBindings(keymap), [keymap]);
  const filtered = useMemo(() => {
    const lc = q.trim().toLowerCase();
    if (!lc) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (it) =>
            it.label.toLowerCase().includes(lc) ||
            g.group.toLowerCase().includes(lc) ||
            formatKeys(it, platform).toLowerCase().includes(lc),
        ),
      }))
      .filter((g) => g.items.length);
  }, [groups, q, platform]);
  const count = filtered.reduce((n, g) => n + g.items.length, 0);

  return (
    <div
      role="dialog"
      aria-modal={onClose ? "true" : undefined}
      aria-label="Keyboard shortcuts"
      style={{
        width: 880,
        maxWidth: "95vw",
        height: 600,
        maxHeight: embedded ? "none" : "90vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-raised)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-lg)",
        boxShadow: embedded ? "none" : "var(--shadow-modal)",
        overflow: "hidden",
      }}
    >
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: "1px solid var(--border-hairline)", flex: "0 0 auto" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
          <span style={{ display: "inline-flex", color: "var(--accent)" }}><KbdIcon /></span>
          <span style={{ font: "600 15px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Keyboard shortcuts</span>
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)", background: "var(--accent-tint)", borderRadius: 99, padding: "4px 9px" }}>
          Keymap: <strong style={{ color: "var(--accent)", fontWeight: 600 }}>{keymap.name}</strong>
        </span>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative", width: 300, maxWidth: "100%" }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "inline-flex" }}>
              <SearchIcon />
            </span>
            <input
              autoFocus={!!onClose}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search shortcuts…"
              aria-label="Search shortcuts"
              style={{ width: "100%", height: 32, padding: "0 12px 0 32px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-paper)", font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)", outline: "none" }}
            />
          </div>
        </div>
        <span style={{ font: "11.5px/1 var(--font-mono)", color: "var(--text-muted)" }}>{count}</span>
        {onClose && (
          <button onClick={onClose} aria-label="Close" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "transparent", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer" }}>
            <CloseIcon />
          </button>
        )}
      </div>

      {/* body — multi-column masonry */}
      <div className="scroll-y" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "16px 18px 8px" }}>
        {count === 0 ? (
          <div style={{ textAlign: "center", padding: "70px 0", color: "var(--text-muted)" }}>
            <div style={{ font: "600 14px/1.3 var(--font-sans)", color: "var(--text-primary)", marginBottom: 6 }}>No shortcuts match “{q}”</div>
            <div style={{ font: "12.5px/1.5 var(--font-sans)" }}>Try a different term, or clear the search.</div>
          </div>
        ) : (
          <div style={{ columnWidth: 380, columnGap: 28 }}>
            {filtered.map((g) => (
              <div key={g.group} style={{ breakInside: "avoid", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "0 8px 6px", borderBottom: "1px solid var(--border-hairline)", marginBottom: 4 }}>
                  <span style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)" }}>{g.group}</span>
                  {GROUP_NOTES[g.group] && (
                    <span style={{ font: "11px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>{GROUP_NOTES[g.group]}</span>
                  )}
                </div>
                {g.items.map((it, i) => (
                  <Row key={it.action + i} it={it} q={q} platform={platform} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* footer */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderTop: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", flex: "0 0 auto" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
          <span style={{ display: "inline-flex", color: "var(--accent)" }}><StarIcon /></span> Signature Mathcad keys
        </span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
          Open this any time with <Key>/</Key>
        </span>
      </div>

      <style>{".sc-row{transition:background var(--dur-fast) var(--ease-out)} .sc-row:hover{background:var(--surface-hover)}"}</style>
    </div>
  );
}
