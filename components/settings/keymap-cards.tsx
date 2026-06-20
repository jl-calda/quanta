"use client";

import { useKeymap } from "@/lib/preferences/provider";
import { keymaps, type KeymapId } from "@/lib/keymap";

/**
 * Keymap preference — radio cards (design mockup 7.26). Provider-backed so the
 * choice applies instantly app-wide (editor, MathLive bridge, shortcuts
 * reference, keypad); the Settings screen also mirrors it to the profile via
 * `onPersist`. Reused by the Settings Editor section and the `/keyboard-shortcuts`
 * design board.
 */
const OPTIONS: { id: KeymapId; badge?: string }[] = [
  { id: "mathcad", badge: "Default" },
  { id: "default" },
];

export function KeymapCards({ onPersist }: { onPersist?: (id: KeymapId) => void }) {
  const { keymapId, setKeymap } = useKeymap();

  return (
    <div role="radiogroup" aria-label="Keymap" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {OPTIONS.map(({ id, badge }) => {
        const on = keymapId === id;
        const map = keymaps[id];
        return (
          <button
            key={id}
            role="radio"
            aria-checked={on}
            onClick={() => {
              setKeymap(id);
              onPersist?.(id);
            }}
            style={{
              display: "flex",
              gap: 11,
              padding: "11px 12px",
              border: "1px solid " + (on ? "var(--accent)" : "var(--border-hairline)"),
              borderRadius: "var(--radius-sm)",
              background: on ? "var(--accent-tint)" : "var(--surface-raised)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              aria-hidden
              style={{
                flex: "0 0 auto",
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "1.5px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginTop: 1,
              }}
            >
              {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ font: "600 13px/1.2 var(--font-sans)", color: on ? "var(--accent)" : "var(--text-primary)" }}>{map.name}</span>
                {badge && (
                  <span
                    style={{
                      font: "9.5px/1 var(--font-sans)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: 3,
                      padding: "2px 4px",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </span>
              <span style={{ display: "block", font: "11.5px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 4 }}>
                {map.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
