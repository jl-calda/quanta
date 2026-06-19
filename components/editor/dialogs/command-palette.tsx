"use client";

import { useMemo, useState } from "react";
import type { RefGroup } from "@/lib/calc/reference";
import { findRegion } from "@/lib/worksheet/flatten";
import type { RegionType } from "@/lib/worksheet/content";
import type { SymbolEntry } from "@/lib/keymap";
import { useEditor } from "../state/editor-provider";
import { insertIntoActiveField } from "../math-entry";
import type { EditorDialogKind } from "../state/editor-reducer";
import { buildCommands, filterCommands } from "./command-registry";

/**
 * Command palette (Func §5.8) — ⌘/Ctrl-K fuzzy launcher for every editor action,
 * including symbol inserts drawn from the canonical `/lib/keymap` table.
 * Function/unit/constant inserts route through the Reference overlay (no
 * duplicate picker). Top-aligned overlay with arrow-key navigation.
 */
export function CommandPalette({ onClose }: { onClose: () => void }) {
  const { state, dispatch, canEdit, recalculate, recalculateToHere, setMode } = useEditor();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const insertSymbol = (sym: SymbolEntry) => {
    if (insertIntoActiveField({ latex: sym.latex, text: sym.source })) return;
    const region = state.selectedId ? findRegion(state.content, state.selectedId) : undefined;
    if (region && region.type === "math") {
      dispatch({ type: "EDIT_SOURCE", id: region.id, source: region.source + sym.source });
    } else {
      dispatch({ type: "INSERT_REGION_WITH_SOURCE", source: sym.source, anchorId: state.selectedId, where: "below" });
    }
  };

  const commands = useMemo(
    () =>
      buildCommands({
        canEdit,
        selectedId: state.selectedId,
        open: (kind: EditorDialogKind) =>
          dispatch({ type: "OPEN_DIALOG", dialog: { kind, regionId: state.selectedId } }),
        openReference: (kind: RefGroup) => dispatch({ type: "OPEN_REFERENCE", kind }),
        insertRegion: (type: RegionType) =>
          dispatch({ type: "INSERT_REGION", regionType: type, anchorId: state.selectedId, where: "below" }),
        insertSymbol,
        recalculate,
        recalculateToHere,
        setMode,
        openExport: () => dispatch({ type: "OPEN_EXPORT" }),
      }),
    // Rebuilt when the selection changes (recalc-to-here / dialog targets).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canEdit, state.selectedId],
  );

  const filtered = useMemo(() => filterCommands(commands, query).slice(0, 80), [commands, query]);
  const active = Math.min(index, Math.max(filtered.length - 1, 0));

  const run = (i: number) => {
    const cmd = filtered[i];
    if (!cmd) return;
    dispatch({ type: "CLOSE_DIALOG" }); // close the palette first; the command may open another dialog
    cmd.run();
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 110,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
        background: "rgba(21,24,29,0.32)",
        animation: "qfade var(--dur-base) var(--ease-out)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        style={{
          width: "min(620px, 92vw)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden",
        }}
      >
        <input
          autoFocus
          placeholder="Type a command or symbol…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(active);
            } else if (e.key === "Escape") {
              onClose();
            }
          }}
          style={{
            height: 48,
            padding: "0 16px",
            border: "none",
            borderBottom: "1px solid var(--border-hairline)",
            background: "transparent",
            font: "15px/1 var(--font-sans)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
        <div className="scroll-y" style={{ overflowY: "auto", padding: 6 }}>
          {filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              type="button"
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(i)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                width: "100%",
                textAlign: "left",
                padding: "9px 12px",
                border: "none",
                borderRadius: "var(--radius-sm)",
                background: i === active ? "var(--surface-hover)" : "transparent",
                color: "var(--text-primary)",
                font: "13px/1.2 var(--font-sans)",
                cursor: "pointer",
              }}
            >
              <span>{cmd.label}</span>
              {cmd.hint && <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>{cmd.hint}</span>}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: 18, textAlign: "center", color: "var(--text-muted)", font: "13px/1.5 var(--font-sans)" }}>
              No commands match “{query}”.
            </div>
          )}
        </div>
      </div>
      <style>{"@keyframes qfade{from{opacity:0}to{opacity:1}}"}</style>
    </div>
  );
}
