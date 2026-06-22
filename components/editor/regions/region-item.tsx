"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch } from "react";
import type { AreaRegion, Region } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import type { EditorAction } from "../state/editor-reducer";
import { Icon, type IconName } from "../icons";
import { regionDomId } from "../scroll-to-region";
import { MathRegionView } from "./math-region";
import { TextRegionView } from "./text-region";
import { TableRegionView } from "./table-region";
import { PlotRegionView } from "./plot-region";
import { ControlRegionView } from "./control-region";
import { SolveRegionView } from "./solve-region";
import { ProgramRegionView } from "./program-region";
import { SweepRegionView } from "./sweep-region";
import { GenericRegionView, ImageRegionView } from "./render-only";
import { applyModifierSelect } from "./region-select";
import type { RegionRenderProps } from "./types";

/**
 * RegionItem — a single region with its full chrome: selection + editing
 * states, indent guide, reorder (drag handle), the selection toolbar
 * (outdent/indent/span/border/⋮), and the inter-region "insert below" affordance.
 * Recursion lives here (an area renders its children through RegionItem), so the
 * type-specific views stay presentational and import-cycle-free.
 */
export function RegionItem({ region }: { region: Region }) {
  const { state, dispatch, canEdit } = useEditor();
  const inSelection = state.selectedIds.includes(region.id);
  const isPrimary = state.selectedId === region.id;
  const multiActive = state.selectedIds.length > 1;
  const editing = state.editingId === region.id;
  const result = state.results.get(region.id);
  const isError = result?.status === "error";

  const [dropPos, setDropPos] = useState<null | "before" | "after">(null);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (applyModifierSelect(e, region.id, dispatch, multiActive)) return;
    if (!editing) dispatch({ type: "SELECT", id: region.id });
  };

  const onDragOver = (e: React.DragEvent) => {
    if (!canEdit) return;
    if (!e.dataTransfer.types.includes("text/region-id")) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropPos(e.clientY < rect.top + rect.height / 2 ? "before" : "after");
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    // Stop the drop bubbling to the owning cell — a region-relative move and a
    // cell append must never both fire for one drop.
    e.stopPropagation();
    const dragged = e.dataTransfer.getData("text/region-id");
    const pos = dropPos;
    setDropPos(null);
    if (dragged && dragged !== region.id && pos) {
      dispatch({ type: "MOVE_TO", id: dragged, targetId: region.id, position: pos });
    }
  };

  const className =
    "region" +
    (inSelection ? " is-selected" : "") +
    (editing ? " is-editing" : "") +
    (isError ? " is-error" : "");

  return (
    <div
      id={regionDomId(region.id)}
      className={className}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={() => setDropPos(null)}
      onDrop={onDrop}
      style={{ position: "relative", marginLeft: region.indent * 30, padding: "6px 10px" }}
    >
      {region.indent > 0 && <span className="indent-guide" />}
      {dropPos && <DropLine where={dropPos} />}

      {canEdit && (
        <span
          className="reorder"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/region-id", region.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          title="Drag to reorder"
          style={{ position: "absolute", left: -20, top: 7, color: "var(--text-muted)", cursor: "grab", display: "inline-flex" }}
        >
          <Icon name="grip" size={15} />
        </span>
      )}

      <RegionBody region={region} result={result} selected={isPrimary} multiActive={multiActive} editing={editing} canEdit={canEdit} dispatch={dispatch} />

      {/* Per-region tools only for a lone selection; a multi-selection uses the
          canvas group bar instead. */}
      {canEdit && isPrimary && !multiActive && !editing && (
        <SelectionToolbar region={region} dispatch={dispatch} />
      )}
      {canEdit && !editing && <InsertBelow anchorId={region.id} dispatch={dispatch} />}
    </div>
  );
}

function DropLine({ where }: { where: "before" | "after" }) {
  return (
    <span
      style={{
        position: "absolute",
        left: 4,
        right: 4,
        top: where === "before" ? -1 : undefined,
        bottom: where === "after" ? -1 : undefined,
        height: 2,
        background: "var(--accent)",
        borderRadius: 1,
        zIndex: 7,
      }}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Type dispatch (+ recursive area)
 * ------------------------------------------------------------------ */

function RegionBody(props: RegionRenderProps) {
  const { region } = props;
  switch (region.type) {
    case "math":
      return <MathRegionView {...props} region={region} />;
    case "text":
      return <TextRegionView {...props} region={region} />;
    case "area":
      return <AreaFrame {...props} region={region} />;
    case "table":
      return <TableRegionView {...props} region={region} />;
    case "plot":
      return <PlotRegionView {...props} region={region} />;
    case "image":
      return <ImageRegionView {...props} region={region} />;
    case "control":
      return <ControlRegionView {...props} region={region} />;
    case "solve":
      return <SolveRegionView {...props} region={region} />;
    case "program":
      return <ProgramRegionView {...props} region={region} />;
    case "sweep":
      return <SweepRegionView {...props} region={region} />;
    default:
      return <GenericRegionView {...props} region={region} />;
  }
}

function AreaFrame({ region, canEdit, dispatch }: RegionRenderProps<AreaRegion>) {
  const count = region.regions.length;
  const [renaming, setRenaming] = useState(false);

  const commitTitle = (value: string) => {
    setRenaming(false);
    const title = value.trim();
    if (title && title !== region.title) {
      dispatch({ type: "SET_REGION_PROP", id: region.id, patch: { title } });
    }
  };

  return (
    <div
      style={{
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "color-mix(in srgb, var(--surface-chrome) 40%, var(--surface-paper))",
      }}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (renaming) return;
          dispatch({ type: "TOGGLE_AREA", id: region.id });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "7px 12px",
          borderBottom: region.collapsed ? "none" : "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
          <Icon name={region.collapsed ? "chevR" : "chevD"} size={16} />
        </span>
        {renaming ? (
          <input
            autoFocus
            defaultValue={region.title}
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => commitTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") commitTitle(e.currentTarget.value);
              else if (e.key === "Escape") setRenaming(false);
            }}
            style={{
              font: "600 12px/1 var(--font-sans)",
              letterSpacing: "0.02em",
              color: "var(--text-primary)",
              background: "var(--surface-raised)",
              border: "1px solid var(--accent)",
              borderRadius: "var(--radius-sm)",
              padding: "2px 6px",
              outline: "none",
            }}
          />
        ) : (
          <span
            onDoubleClick={(e) => {
              if (!canEdit) return;
              e.stopPropagation();
              setRenaming(true);
            }}
            title={canEdit ? "Double-click to rename" : undefined}
            style={{ font: "600 12px/1 var(--font-sans)", letterSpacing: "0.02em", color: "var(--text-primary)" }}
          >
            {region.title}
          </span>
        )}
        <span
          style={{
            font: "11px/1 var(--font-sans)",
            color: "var(--text-muted)",
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-full)",
            padding: "2px 7px",
          }}
        >
          {count} {count === 1 ? "region" : "regions"}
        </span>
        {canEdit && (
          <button
            title="Ungroup area"
            aria-label="Ungroup area"
            onClick={(e) => {
              e.stopPropagation();
              dispatch({ type: "UNGROUP_AREA", id: region.id });
            }}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 22,
              height: 22,
              border: "none",
              background: "transparent",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Icon name="area" size={14} />
          </button>
        )}
      </div>
      {!region.collapsed && (
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
          {region.regions.map((child) => (
            <RegionItem key={child.id} region={child} />
          ))}
          {count === 0 && canEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "INSERT_REGION", regionType: "math", anchorId: region.id, where: "below" });
              }}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                border: "none",
                background: "none",
                color: "var(--accent)",
                font: "500 12px/1 var(--font-sans)",
                cursor: "pointer",
                padding: "4px 0",
              }}
            >
              <Icon name="plusSm" size={13} /> Add a region
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Selection toolbar + insert-below
 * ------------------------------------------------------------------ */

function TBtn({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        border: "none",
        background: "transparent",
        borderRadius: "var(--radius-sm)",
        color: "var(--text-primary)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function Sep() {
  return <span style={{ width: 1, height: 15, background: "var(--border-hairline)", margin: "0 1px" }} />;
}

function SelectionToolbar({ region, dispatch }: { region: Region; dispatch: Dispatch<EditorAction> }) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu]);

  const item = (label: string, action: EditorAction, danger = false) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        dispatch(action);
        setMenu(false);
      }}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        border: "none",
        background: "transparent",
        font: "12.5px/1 var(--font-sans)",
        color: danger ? "var(--status-error)" : "var(--text-primary)",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );

  return (
    <div
      className="region-tools"
      ref={ref}
      style={{
        position: "absolute",
        top: -15,
        right: 8,
        display: "flex",
        alignItems: "center",
        gap: 1,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-popover)",
        padding: 2,
        zIndex: 6,
      }}
    >
      <TBtn label="Outdent" icon="indentL" onClick={() => dispatch({ type: "INDENT", id: region.id, delta: -1 })} />
      <TBtn label="Indent" icon="indentR" onClick={() => dispatch({ type: "INDENT", id: region.id, delta: 1 })} />
      <Sep />
      <TBtn label="Span all columns" icon="spanCols" onClick={() => dispatch({ type: "TOGGLE_SPAN", id: region.id })} />
      <TBtn
        label="Toggle region border"
        icon="border"
        onClick={() => dispatch({ type: "SET_REGION_PROP", id: region.id, patch: { border: !region.border } })}
      />
      <Sep />
      <div style={{ position: "relative" }}>
        <TBtn label="More actions" icon="kebab" onClick={() => setMenu((m) => !m)} />
        {menu && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              right: 0,
              minWidth: 150,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-hairline)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-popover)",
              padding: 4,
              zIndex: 8,
            }}
          >
            {item("Move up", { type: "MOVE_REGION", id: region.id, dir: "up" })}
            {item("Move down", { type: "MOVE_REGION", id: region.id, dir: "down" })}
            {item("Duplicate", { type: "DUPLICATE_REGION", id: region.id })}
            <div style={{ height: 1, background: "var(--border-hairline)", margin: "4px 0" }} />
            {item("Copy", { type: "COPY_SELECTED" })}
            {item("Paste", { type: "PASTE" })}
            <div style={{ height: 1, background: "var(--border-hairline)", margin: "4px 0" }} />
            {item("Delete", { type: "DELETE_REGION", id: region.id }, true)}
          </div>
        )}
      </div>
    </div>
  );
}

function InsertBelow({ anchorId, dispatch }: { anchorId: string; dispatch: Dispatch<EditorAction> }) {
  return (
    <div
      className="insert-below"
      style={{ position: "absolute", left: 0, right: 0, bottom: -11, height: 20, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}
    >
      <span style={{ position: "absolute", left: 6, right: 6, height: 1, background: "var(--accent)", opacity: 0.35 }} />
      <button
        onClick={(e) => {
          e.stopPropagation();
          dispatch({ type: "INSERT_REGION", regionType: "math", anchorId, where: "below" });
        }}
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          height: 20,
          padding: "0 9px",
          borderRadius: "var(--radius-full)",
          border: "1px solid var(--accent)",
          background: "var(--surface-raised)",
          color: "var(--accent)",
          font: "500 11px/1 var(--font-sans)",
          cursor: "pointer",
        }}
      >
        <Icon name="plusSm" size={12} /> Insert below
      </button>
    </div>
  );
}
