"use client";

import { useEffect, useState } from "react";
import { Select } from "@/components/ds";
import { readingOrderIds } from "@/lib/worksheet/flatten";
import { useEditor } from "./state/editor-provider";
import type { UnitsSystem } from "./state/editor-reducer";
import { Icon } from "./icons";

/**
 * Live page indicator from the rendered page-break separators (PageFrame). The
 * page box resizes whenever the page count changes, so a ResizeObserver on it
 * keeps the total fresh; a passive scroll listener tracks the current page.
 */
function usePageIndicator(): { current: number; total: number } {
  const [state, setState] = useState({ current: 1, total: 1 });
  useEffect(() => {
    const field = document.querySelector<HTMLElement>(".ed-field");
    const page = field?.querySelector<HTMLElement>(".ed-page");
    if (!field || !page) return;
    const recompute = () => {
      const breaks = Array.from(page.querySelectorAll<HTMLElement>(".ed-page-break"));
      const top = field.getBoundingClientRect().top + 80;
      let current = 1;
      for (const b of breaks) {
        if (b.getBoundingClientRect().top < top) current += 1;
        else break;
      }
      setState({ current, total: breaks.length + 1 });
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(page);
    field.addEventListener("scroll", recompute, { passive: true });
    return () => {
      ro.disconnect();
      field.removeEventListener("scroll", recompute);
    };
  }, []);
  return state;
}

/**
 * Status bar (28px): calc status + region/error counts · page indicator ·
 * units-system selector · zoom slider + fit-width. The selector re-displays
 * results in the chosen system (display-only — stored values stay in base);
 * "Custom" uses the worksheet's user-defined units (worksheet settings → Units).
 */
export function StatusBar() {
  const { state, dispatch } = useEditor();
  const regionCount = readingOrderIds(state.content).length;
  const { current: currentPage, total: totalPages } = usePageIndicator();
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
        <span>Page {Math.min(currentPage, totalPages)} of {totalPages}</span>
      </span>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span>Units</span>
        <div style={{ width: 64 }}>
          <Select
            size="sm"
            value={state.unitsSystem}
            onChange={(e) => dispatch({ type: "SET_UNITS", system: e.target.value as UnitsSystem })}
            options={[
              { value: "si", label: "SI" },
              { value: "uscs", label: "USCS" },
              { value: "cgs", label: "CGS" },
              { value: "custom", label: "Custom" },
            ]}
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
