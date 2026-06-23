"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, ReactNode, RefObject } from "react";
import type { Region, Row, WorksheetContent } from "@/lib/worksheet/content";
import type { HeaderFooterBand, PageSettings } from "@/lib/schema/page";
import {
  expandTokens,
  pageCountForHeight,
  resolvePageGeometry,
  type PageGeometry,
  type TokenCtx,
} from "@/lib/page/geometry";
import { useEditor } from "./state/editor-provider";
import type { EditorAction } from "./state/editor-reducer";
import { RegionItem } from "./regions/region-item";
import { Icon } from "./icons";

/** Above this many rows the page body switches on CSS content-visibility so the
 *  browser skips laying out off-screen rows (cheap virtualization that keeps the
 *  DOM — and therefore drag/scroll-to-region — intact). */
const VIRTUALIZE_ROWS = 60;
/** Gutter track width between columns (matches the mockup's dashed gutter). */
const GUTTER = 16;
/** Smallest column fraction the split drag will produce (mirrors the reducer). */
const MIN_COL = 0.14;

/**
 * Canvas — the worksheet field. A grey scroll field holds the white page (dot-
 * grid body, header/footer bands). Content renders as the hybrid-flow grid:
 * reading-order rows, each split into 1–3 columns with a draggable dashed gutter,
 * regions flowing within a cell. No free placement — everything snaps to a cell.
 * Owns structural editing: create, reorder (drag within/between cells), columns +
 * split ratio, span, indent, delete, and multi-select group ops.
 */
export function Canvas({ worksheetTitle }: { worksheetTitle: string }) {
  const { state, dispatch, canEdit, pageSettings } = useEditor();
  const { content, zoom } = state;

  const liveIds = new Set(state.selectedIds);
  if (state.editingId) liveIds.add(state.editingId);

  const multi = canEdit && state.selectedIds.length > 1;

  return (
    <div
      className="ed-field scroll-y"
      onClick={() => dispatch({ type: "SELECT", id: null })}
      style={{ flex: 1, height: "100%", overflowX: "auto", padding: "24px 0 120px" }}
    >
      {multi && <GroupBar count={state.selectedIds.length} dispatch={dispatch} />}
      <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", transition: "transform var(--dur-base) var(--ease-out)" }}>
        <PageFrame
          content={content}
          pageSettings={pageSettings}
          worksheetTitle={worksheetTitle}
          canEdit={canEdit}
          dispatch={dispatch}
          liveIds={liveIds}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Page frame — a full bounded page (page-setup size/orientation/margins),
 * forced to whole page-heights so empty space below the last region is on the
 * page, with on-screen page-break separators for multi-page worksheets. The
 * geometry is the shared `lib/page/geometry` module, so the on-screen page
 * tracks the export/print layout. Content flows continuously (regions are
 * untouched); breaks are drawn as overlays — a region may cross a break line on
 * screen, exactly as the export preview notes.
 * ------------------------------------------------------------------ */

function PageFrame({
  content,
  pageSettings,
  worksheetTitle,
  canEdit,
  dispatch,
  liveIds,
}: {
  content: WorksheetContent;
  pageSettings: PageSettings;
  worksheetTitle: string;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
  liveIds: Set<string>;
}) {
  const geom = useMemo(() => resolvePageGeometry(pageSettings), [pageSettings]);
  const virtualize = content.rows.length > VIRTUALIZE_ROWS;

  // Measure the flowed rows' natural height (layout px — `scrollHeight` is
  // unaffected by the parent `transform: scale(zoom)`), so page-count math stays
  // in unscaled px. The min-height that bounds the page lives on a PARENT of
  // `rowsRef`, so it can't feed back into this measurement.
  const rowsRef = useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = useState(geom.pageContentH);
  useLayoutEffect(() => {
    const el = rowsRef.current;
    if (!el) return;
    const update = () => setContentH(el.scrollHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [content, geom.pageContentH]);

  const pageCount = pageCountForHeight(contentH, geom);
  const bodyAreaH = pageCount * geom.pageContentH;

  // Field tokens; date/time resolved after mount to avoid SSR hydration drift.
  const [clock, setClock] = useState({ date: "", time: "" });
  useEffect(() => {
    const now = new Date();
    setClock({
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  }, []);

  return (
    <article className="ed-page" style={{ width: geom.pageW }}>
      {!pageSettings.differentFirstPage && (
        <PageBand
          kind="header"
          band={pageSettings.header}
          fallback={{ left: "Quanta", center: "", right: worksheetTitle }}
          geom={geom}
          ctx={{ page: 1, pages: pageCount, title: worksheetTitle, ...clock }}
        />
      )}
      <div
        style={{
          padding: `${geom.marginTop}px ${geom.marginRight}px ${geom.marginBottom}px ${geom.marginLeft}px`,
        }}
      >
        <div
          className={"ed-page-body" + (geom.gridShow ? " q-grid" : "") + (virtualize ? " ed-virtualize" : "")}
          style={{
            minHeight: bodyAreaH,
            backgroundSize: geom.gridShow ? `${geom.gridSpacing}px ${geom.gridSpacing}px` : undefined,
          }}
        >
          <div ref={rowsRef} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            {content.rows.length === 0 ? (
              <EmptyState canEdit={canEdit} dispatch={dispatch} />
            ) : (
              content.rows.map((row) => (
                <RowView
                  key={row.id}
                  row={row}
                  canEdit={canEdit}
                  dispatch={dispatch}
                  live={rowIsLive(row, liveIds)}
                />
              ))
            )}
          </div>
        </div>
      </div>
      <PageBand
        kind="footer"
        band={pageSettings.footer}
        fallback={{ left: "Quanta", center: "", right: `Page ${pageCount} of ${pageCount}` }}
        geom={geom}
        ctx={{ page: pageCount, pages: pageCount, title: worksheetTitle, ...clock }}
      />
      {Array.from({ length: Math.max(0, pageCount - 1) }, (_, i) => i + 1).map((k) => (
        <PageBreak
          key={k}
          top={geom.headerH + geom.marginTop + k * geom.pageContentH}
          pageNo={k + 1}
          pageCount={pageCount}
          gutter={geom.marginRight}
        />
      ))}
    </article>
  );
}

/** A running header/footer band (3 zones), token-expanded; falls back to the
 *  ledger default (Quanta / title / page) when the page-setup band is empty. */
function PageBand({
  kind,
  band,
  fallback,
  geom,
  ctx,
}: {
  kind: "header" | "footer";
  band: HeaderFooterBand;
  fallback: HeaderFooterBand;
  geom: PageGeometry;
  ctx: TokenCtx;
}) {
  const footer = kind === "footer";
  const isCustom = `${band.left}${band.center}${band.right}`.trim().length > 0;
  const zones = isCustom ? band : fallback;
  const zone = (text: string, justify: "flex-start" | "center" | "flex-end") => (
    <span style={{ flex: 1, minWidth: 0, display: "inline-flex", justifyContent: justify, alignItems: "center", gap: 6 }}>
      {footer && !isCustom && justify === "flex-start" && <Icon name="dot" size={10} />}
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{expandTokens(text, ctx)}</span>
    </span>
  );
  return (
    <div
      className="ed-page-band"
      style={{
        flex: "0 0 auto",
        height: footer ? geom.footerH : geom.headerH,
        display: "flex",
        alignItems: "center",
        padding: `0 ${geom.marginRight}px 0 ${geom.marginLeft}px`,
        [footer ? "borderTop" : "borderBottom"]: "1px solid var(--border-hairline)",
        font: "10.5px/1 var(--font-sans)",
        letterSpacing: footer ? undefined : "0.06em",
        textTransform: footer ? undefined : "uppercase",
        color: "var(--text-muted)",
      }}
    >
      {zone(zones.left, "flex-start")}
      {zone(zones.center, "center")}
      {zone(zones.right, "flex-end")}
    </div>
  );
}

/** A full-width on-screen page boundary (dashed rule + page-number chip). Drawn
 *  over the content (clicks pass through); a region may cross it, as in export. */
function PageBreak({ top, pageNo, pageCount, gutter }: { top: number; pageNo: number; pageCount: number; gutter: number }) {
  return (
    <div
      aria-hidden
      className="ed-page-break"
      style={{ position: "absolute", left: 0, right: 0, top, pointerEvents: "none", zIndex: 2, borderTop: "1px dashed var(--border-strong)" }}
    >
      <span
        style={{
          position: "absolute",
          right: Math.max(8, gutter),
          top: 4,
          font: "600 10px/1 var(--font-sans)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          background: "var(--surface-paper)",
          padding: "1px 5px",
        }}
      >
        Page {pageNo} of {pageCount}
      </span>
    </div>
  );
}

/** True when any region in the row (descending into areas) is selected/editing —
 *  such rows opt out of content-visibility so their hover chrome isn't clipped. */
function rowIsLive(row: Row, liveIds: Set<string>): boolean {
  if (liveIds.size === 0) return false;
  const walk = (regions: Region[]): boolean =>
    regions.some((r) => liveIds.has(r.id) || (r.type === "area" && walk(r.regions)));
  return row.cells.some((cell) => walk(cell.regions));
}

/* ------------------------------------------------------------------ *
 * Row — 1–N columns with a draggable gutter
 * ------------------------------------------------------------------ */

function RowView({
  row,
  canEdit,
  dispatch,
  live,
}: {
  row: Row;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
  live: boolean;
}) {
  const [hover, setHover] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const rowClass = "ed-row" + (live ? " is-live" : "");

  const controls = canEdit && hover && <ColumnsControl row={row} dispatch={dispatch} />;

  if (row.columns === 1) {
    return (
      <div
        className={rowClass}
        style={{ position: "relative" }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {controls}
        {row.cells[0]?.regions.map((r) => (
          <RegionItem key={r.id} region={r} />
        ))}
      </div>
    );
  }

  // Equal columns unless a drag-set ratio is present; interleave fr cell tracks
  // with fixed gutter tracks so the gutter (dashed rule + drag handle) sits on the
  // column boundary.
  const fr =
    row.split && row.split.length === row.columns ? row.split : Array(row.columns).fill(1);
  const tracks: string[] = [];
  fr.forEach((f, i) => {
    if (i) tracks.push(`${GUTTER}px`);
    tracks.push(`${f}fr`);
  });

  const items: ReactNode[] = [];
  row.cells.forEach((cell, ci) => {
    if (ci) {
      items.push(
        <Gutter
          key={`g${ci}`}
          boundary={ci - 1}
          fr={fr}
          rowId={row.id}
          gridRef={gridRef}
          canEdit={canEdit}
          dispatch={dispatch}
        />,
      );
    }
    items.push(<CellView key={`c${ci}`} row={row} cell={cell} cellIndex={ci} canEdit={canEdit} dispatch={dispatch} />);
  });

  return (
    <div
      ref={gridRef}
      className={rowClass}
      style={{ position: "relative", display: "grid", gridTemplateColumns: tracks.join(" "), marginTop: 2 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {controls}
      {items}
    </div>
  );
}

/** A cell's column. Empty cells become drop targets for a dragged region (the
 *  drag-into-empty-column move) and offer a one-click add. */
function CellView({
  row,
  cell,
  cellIndex,
  canEdit,
  dispatch,
}: {
  row: Row;
  cell: { regions: Region[] };
  cellIndex: number;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}) {
  const [over, setOver] = useState(false);
  const empty = cell.regions.length === 0;
  const droppable = canEdit && empty;

  return (
    <div
      style={{ minWidth: 0 }}
      onDragOver={
        droppable
          ? (e) => {
              if (!e.dataTransfer.types.includes("text/region-id")) return;
              e.preventDefault();
              setOver(true);
            }
          : undefined
      }
      onDragLeave={droppable ? () => setOver(false) : undefined}
      onDrop={
        droppable
          ? (e) => {
              e.preventDefault();
              setOver(false);
              const dragged = e.dataTransfer.getData("text/region-id");
              if (dragged) dispatch({ type: "MOVE_TO_CELL", id: dragged, rowId: row.id, cellIndex });
            }
          : undefined
      }
    >
      {cell.regions.map((r) => (
        <RegionItem key={r.id} region={r} />
      ))}
      {canEdit && empty && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "INSERT_INTO_CELL", rowId: row.id, cellIndex, regionType: "math" });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            border: "1px dashed " + (over ? "var(--accent)" : "var(--border-strong)"),
            borderRadius: "var(--radius-sm)",
            background: over ? "var(--accent-tint)" : "transparent",
            color: over ? "var(--accent)" : "var(--text-muted)",
            font: "12px/1 var(--font-sans)",
            cursor: "pointer",
            padding: "8px 10px",
            width: "100%",
            transition: "background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
          }}
        >
          <Icon name="plusSm" size={13} /> {over ? "Drop here" : "Add a region"}
        </button>
      )}
    </div>
  );
}

/** The gutter between two columns: a dashed rule plus (when editable) a handle to
 *  drag the split ratio. */
function Gutter({
  boundary,
  fr,
  rowId,
  gridRef,
  canEdit,
  dispatch,
}: {
  boundary: number;
  fr: number[];
  rowId: string;
  gridRef: RefObject<HTMLDivElement | null>;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}) {
  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
      <span className="ed-gutter" />
      {canEdit && <SplitHandle boundary={boundary} fr={fr} rowId={rowId} gridRef={gridRef} dispatch={dispatch} />}
    </div>
  );
}

function SplitHandle({
  boundary,
  fr,
  rowId,
  gridRef,
  dispatch,
}: {
  boundary: number;
  fr: number[];
  rowId: string;
  gridRef: RefObject<HTMLDivElement | null>;
  dispatch: Dispatch<EditorAction>;
}) {
  const [drag, setDrag] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDrag(true);

    // The boundary's left neighbour-pair is invariant during the drag, so we
    // resolve the new split from the pointer's absolute fraction across the row
    // (same scaled rect for left + width → zoom-safe).
    const sum = fr.reduce((a, b) => a + b, 0) || 1;
    const norm = fr.map((v) => v / sum);
    const pre = norm.slice(0, boundary).reduce((a, b) => a + b, 0);
    const pairSum = norm[boundary] + norm[boundary + 1];

    const move = (ev: PointerEvent) => {
      const el = gridRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = (ev.clientX - rect.left) / rect.width;
      const left = Math.min(pairSum - MIN_COL, Math.max(MIN_COL, p - pre));
      const next = [...norm];
      next[boundary] = left;
      next[boundary + 1] = pairSum - left;
      dispatch({ type: "SET_SPLIT", rowId, split: next });
    };
    const up = () => {
      setDrag(false);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <span
      className="ed-split-handle"
      data-drag={drag || undefined}
      role="separator"
      aria-orientation="vertical"
      aria-label="Drag to resize columns"
      title="Drag to resize columns"
      onPointerDown={onPointerDown}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

/** Per-row hover control: set the column count (1/2/3). Columns are also
 *  settable from the ribbon's layout group. */
function ColumnsControl({ row, dispatch }: { row: Row; dispatch: Dispatch<EditorAction> }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
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
      <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>
        <Icon name="splitCols" size={13} />
      </span>
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
}

/* ------------------------------------------------------------------ *
 * Multi-select group bar
 * ------------------------------------------------------------------ */

function GroupBar({ count, dispatch }: { count: number; dispatch: Dispatch<EditorAction> }) {
  const btn = (label: string, icon: Parameters<typeof Icon>[0]["name"], action: EditorAction) => (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        dispatch(action);
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 26,
        height: 26,
        border: "none",
        background: "transparent",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={icon} size={16} />
    </button>
  );

  const sep = <span style={{ width: 1, height: 16, background: "var(--border-hairline)", margin: "0 2px" }} />;

  return (
    // Full-width sticky wrapper so the bar centres over the page yet lets clicks
    // outside it pass through to the field (which clears the selection).
    <div
      style={{
        position: "sticky",
        top: 12,
        zIndex: 20,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          pointerEvents: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: 2,
          background: "var(--surface-raised)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-popover)",
          padding: "3px 6px",
        }}
      >
        <span style={{ font: "600 12px/1 var(--font-sans)", color: "var(--text-primary)", padding: "0 6px" }}>
          {count} selected
        </span>
        {sep}
        {btn("Outdent", "indentL", { type: "INDENT_SELECTED", delta: -1 })}
        {btn("Indent", "indentR", { type: "INDENT_SELECTED", delta: 1 })}
        {btn("Duplicate", "copy", { type: "DUPLICATE_SELECTED" })}
        {btn("Group into area", "area", { type: "GROUP_SELECTED" })}
        {sep}
        <button
          onClick={(e) => {
            e.stopPropagation();
            dispatch({ type: "DELETE_SELECTED" });
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            height: 26,
            padding: "0 9px",
            border: "none",
            background: "transparent",
            borderRadius: "var(--radius-sm)",
            color: "var(--status-error)",
            font: "500 12.5px/1 var(--font-sans)",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--status-error-bg)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          Delete
        </button>
        {sep}
        {btn("Clear selection", "x", { type: "SELECT", id: null })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Empty document
 * ------------------------------------------------------------------ */

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
