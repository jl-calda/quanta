"use client";

import { useMemo, useState } from "react";
import { Button, Dialog, Input, Tabs } from "@/components/ds";
import { ALL_SYMBOLS, SYMBOL_GROUPS, type SymbolEntry } from "@/lib/keymap";
import { findRegion } from "@/lib/worksheet/flatten";
import { insertIntoActiveField } from "../math-entry";
import { useEditor } from "../state/editor-provider";

/**
 * Insert-symbol dialog (Func §7.7) — a searchable, tabbed grid of every Greek
 * letter, operator, relation, arrow, and misc glyph. Sourced entirely from the
 * canonical `/lib/keymap` table (the SAME one the ribbon operator palette uses),
 * so there is no second symbol list. Clicking inserts into the focused math
 * field, else appends to the selected math region, else seeds a new region.
 */
export function InsertSymbolDialog({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useEditor();
  const [tab, setTab] = useState<string>(SYMBOL_GROUPS[0].group);
  const [query, setQuery] = useState("");

  const entries = useMemo<SymbolEntry[]>(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return ALL_SYMBOLS.filter(
        (s) => s.label.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.glyph === query.trim(),
      );
    }
    return SYMBOL_GROUPS.find((g) => g.group === tab)?.entries ?? [];
  }, [query, tab]);

  const insert = (sym: SymbolEntry) => {
    if (insertIntoActiveField({ latex: sym.latex, text: sym.source })) return;
    const region = state.selectedId ? findRegion(state.content, state.selectedId) : undefined;
    if (region && region.type === "math") {
      dispatch({ type: "EDIT_SOURCE", id: region.id, source: region.source + sym.source });
    } else {
      dispatch({
        type: "INSERT_REGION_WITH_SOURCE",
        source: sym.source,
        anchorId: state.selectedId,
        where: "below",
      });
    }
  };

  return (
    <Dialog
      open
      eyebrow="Insert"
      title="Symbol"
      width={520}
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input
          autoFocus
          placeholder="Search symbols…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {!query && (
          <Tabs
            items={SYMBOL_GROUPS.map((g) => ({ value: g.group, label: g.group }))}
            value={tab}
            onChange={setTab}
          />
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
            gap: 6,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {entries.map((sym) => (
            <button
              key={sym.id}
              type="button"
              title={sym.label}
              aria-label={sym.label}
              onClick={() => insert(sym)}
              style={{
                height: 52,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                border: "1px solid var(--border-hairline)",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-raised)",
                cursor: "pointer",
              }}
            >
              <span style={{ font: "20px/1 var(--font-math)", color: "var(--text-math)" }}>{sym.glyph}</span>
              <span style={{ font: "9.5px/1 var(--font-sans)", color: "var(--text-muted)", maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {sym.label}
              </span>
            </button>
          ))}
          {entries.length === 0 && (
            <span style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--text-muted)", font: "12.5px/1.5 var(--font-sans)" }}>
              No symbols match “{query}”.
            </span>
          )}
        </div>
      </div>
    </Dialog>
  );
}
