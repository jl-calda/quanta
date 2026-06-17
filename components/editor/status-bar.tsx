"use client";

import { Select } from "@/components/ds";
import { readingOrderIds } from "@/lib/worksheet/flatten";
import { useEditor } from "./state/editor-provider";
import type { UnitsSystem } from "./state/editor-reducer";
import { Icon } from "./icons";

/**
 * Status bar (28px): calc status + region/error counts · page indicator ·
 * units-system selector · zoom slider + fit-width. (SI is wired through the
 * engine; USCS/CGS are display selections for now.)
 */
export function StatusBar() {
  const { state, dispatch } = useEditor();
  const regionCount = readingOrderIds(state.content).length;
  const dot = state.calcStatus === "error" ? "var(--status-error)" : state.calcStatus === "stale" ? "var(--status-warning)" : "var(--status-pass)";
  const statusLabel = state.calcStatus === "error" ? "Errors" : state.calcStatus === "stale" ? "Stale" : "All current";

  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        height: 28,
        flex: "0 0 28px",
        padding: "0 12px",
        background: "var(--surface-chrome)",
        borderTop: "1px solid var(--border-hairline)",
        font: "11.5px/1 var(--font-sans)",
        color: "var(--text-muted)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: dot }} /> {statusLabel}
      </span>
      <span>
        {regionCount} {regionCount === 1 ? "region" : "regions"} · {state.errorCount} {state.errorCount === 1 ? "error" : "errors"}
      </span>
      <span style={{ flex: 1, display: "flex", justifyContent: "center", gap: 16 }}>
        <span>Page 1</span>
      </span>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span>Units</span>
        <div style={{ width: 64 }}>
          <Select
            size="sm"
            value={state.unitsSystem}
            onChange={(e) => dispatch({ type: "SET_UNITS", system: e.target.value as UnitsSystem })}
            options={[{ value: "si", label: "SI" }, { value: "uscs", label: "USCS" }, { value: "cgs", label: "CGS" }]}
          />
        </div>
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
        <input
          type="range"
          min={50}
          max={150}
          value={Math.round(state.zoom * 100)}
          onChange={(e) => dispatch({ type: "SET_ZOOM", zoom: Number(e.target.value) / 100 })}
          style={{ width: 96, accentColor: "var(--accent)" }}
          aria-label="Zoom"
        />
        <span style={{ fontFamily: "var(--font-mono)", width: 34 }}>{Math.round(state.zoom * 100)}%</span>
        <button
          title="Fit width"
          onClick={() => dispatch({ type: "SET_ZOOM", zoom: 1 })}
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 22, border: "none", background: "transparent", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer" }}
        >
          <Icon name="fit" size={15} />
        </button>
      </div>
    </footer>
  );
}
