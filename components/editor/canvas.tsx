"use client";

import { useState } from "react";
import type { Dispatch } from "react";
import type { Row } from "@/lib/worksheet/content";
import { useEditor } from "./state/editor-provider";
import type { EditorAction } from "./state/editor-reducer";
import { RegionItem } from "./regions/region-item";
import { Icon } from "./icons";

/**
 * Canvas — the worksheet field. A grey scroll field holds the white page (dot-
 * grid body, header/footer bands). Content renders as the hybrid-flow grid:
 * reading-order rows, each split into 1–3 columns with a dashed gutter, regions
 * flowing within a cell. No free placement — everything snaps to a cell.
 */
export function Canvas({ worksheetTitle }: { worksheetTitle: string }) {
  const { state, dispatch, canEdit } = useEditor();
  const { content, zoom } = state;

  return (
    <div
      className="ed-field scroll-y"
      onClick={() => dispatch({ type: "SELECT", id: null })}
      style={{ flex: 1, height: "100%", padding: "24px 0 120px" }}
    >
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform var(--dur-base) var(--ease-out)" }}>
        <article className="ed-page">
          <Band left="Quanta" right={worksheetTitle} />
          <div className="ed-page-body q-grid">
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
              {content.rows.length === 0 ? (
                <EmptyState canEdit={canEdit} dispatch={dispatch} />
              ) : (
                content.rows.map((row) => (
                  <RowView key={row.id} row={row} canEdit={canEdit} dispatch={dispatch} />
                ))
              )}
            </div>
          </div>
          <Band left="Quanta" right="Page 1" footer />
        </article>
      </div>
    </div>
  );
}

function Band({ left, right, footer }: { left: string; right: string; footer?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 52px",
        [footer ? "borderTop" : "borderBottom"]: "1px solid var(--border-hairline)",
        font: "10.5px/1 var(--font-sans)",
        letterSpacing: footer ? undefined : "0.06em",
        textTransform: footer ? undefined : "uppercase",
        color: "var(--text-muted)",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        {footer && <Icon name="dot" size={10} />} {left}
      </span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>{right}</span>
    </div>
  );
}

function RowView({ row, canEdit, dispatch }: { row: Row; canEdit: boolean; dispatch: Dispatch<EditorAction> }) {
  const [hover, setHover] = useState(false);

  const controls = canEdit && hover && (
    <div
      style={{
        position: "absolute",
        top: -12,
        right: 0,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-popover)",
        padding: "2px 4px",
        zIndex: 6,
      }}
    >
      <span style={{ font: "10px/1 var(--font-sans)", color: "var(--text-muted)", padding: "0 2px" }}>Columns</span>
      {([1, 2, 3] as const).map((n) => (
        <button
          key={n}
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "SET_COLUMNS", rowId: row.id, columns: n });
          }}
          style={{
            width: 20,
            height: 18,
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
            background: row.columns === n ? "var(--accent-tint)" : "transparent",
            color: row.columns === n ? "var(--accent)" : "var(--text-muted)",
            font: (row.columns === n ? "600" : "500") + " 11px/1 var(--font-mono)",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );

  if (row.columns === 1) {
    return (
      <div style={{ position: "relative" }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        {controls}
        {row.cells[0]?.regions.map((r) => (
          <RegionItem key={r.id} region={r} />
        ))}
      </div>
    );
  }

  const template =
    row.split && row.split.length === row.columns
      ? row.split.map((n) => `${n}fr`).join(" ")
      : `repeat(${row.columns}, 1fr)`;

  return (
    <div
      style={{ position: "relative", display: "grid", gridTemplateColumns: template, marginTop: 2 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {controls}
      {row.cells.map((cell, ci) => (
        <div
          key={ci}
          style={{
            paddingLeft: ci ? 26 : 0,
            paddingRight: ci < row.columns - 1 ? 26 : 0,
            borderLeft: ci ? "1px dashed var(--border-strong)" : "none",
          }}
        >
          {cell.regions.map((r) => (
            <RegionItem key={r.id} region={r} />
          ))}
          {canEdit && cell.regions.length === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "INSERT_INTO_CELL", rowId: row.id, cellIndex: ci, regionType: "math" });
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                border: "1px dashed var(--border-strong)",
                borderRadius: "var(--radius-sm)",
                background: "transparent",
                color: "var(--text-muted)",
                font: "12px/1 var(--font-sans)",
                cursor: "pointer",
                padding: "8px 10px",
                width: "100%",
              }}
            >
              <Icon name="plusSm" size={13} /> Add a region
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function EmptyState({ canEdit, dispatch }: { canEdit: boolean; dispatch: Dispatch<EditorAction> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "80px 24px", textAlign: "center" }}>
      <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
        <Icon name="fmt" size={28} />
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ font: "600 15px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>No regions yet</span>
        <span style={{ font: "13px/1.4 var(--font-sans)", color: "var(--text-muted)", maxWidth: 360 }}>
          Add your first calculation. Type a name, then a value with units — e.g. F_t := 12 kN.
        </span>
      </div>
      {canEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: null, where: "below" });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 32,
            padding: "0 14px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "var(--accent)",
            color: "var(--text-inverse)",
            font: "500 13px/1 var(--font-sans)",
            cursor: "pointer",
          }}
        >
          <Icon name="plus" size={15} /> Add region
        </button>
      )}
    </div>
  );
}
