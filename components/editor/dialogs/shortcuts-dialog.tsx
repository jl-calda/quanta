"use client";

import { useMemo, useState } from "react";
import { Dialog, Input } from "@/components/ds";
import { getKeymap, DEFAULT_KEYMAP_ID, type KeyBinding } from "@/lib/keymap";

/**
 * Keyboard-shortcuts panel (Func §7.25) — a dense, searchable reference rendered
 * straight from the active `/lib/keymap` keymap (the single source of truth that
 * also configures the MathLive editor), grouped by binding group.
 */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const keymap = getKeymap(DEFAULT_KEYMAP_ID);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = keymap.bindings.filter(
      (b) => !q || b.description.toLowerCase().includes(q) || b.keys.toLowerCase().includes(q),
    );
    const byGroup = new Map<string, KeyBinding[]>();
    for (const b of filtered) {
      const list = byGroup.get(b.group) ?? [];
      list.push(b);
      byGroup.set(b.group, list);
    }
    return [...byGroup.entries()];
  }, [keymap, query]);

  return (
    <Dialog open eyebrow={keymap.name} title="Keyboard shortcuts" width={520} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Input autoFocus placeholder="Search shortcuts…" value={query} onChange={(e) => setQuery(e.target.value)} />
        {groups.map(([group, bindings]) => (
          <div key={group} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ font: "600 11px/1.2 var(--font-sans)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-muted)" }}>{group}</div>
            {bindings.map((b) => (
              <div key={b.action + b.keys} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "3px 0" }}>
                <span style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--text-primary)" }}>{b.description}</span>
                <kbd
                  style={{
                    font: "12px/1 var(--font-mono)",
                    color: "var(--text-primary)",
                    background: "var(--surface-chrome)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-sm)",
                    padding: "3px 7px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {b.keys}
                </kbd>
              </div>
            ))}
          </div>
        ))}
        {groups.length === 0 && (
          <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>No shortcuts match “{query}”.</span>
        )}
      </div>
    </Dialog>
  );
}
