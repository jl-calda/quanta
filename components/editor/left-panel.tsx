"use client";

import type { ReactNode } from "react";
import { mathRegions, walkRegions } from "@/lib/worksheet/flatten";
import { IconButton } from "@/components/ds";
import { useEditor } from "./state/editor-provider";
import type { LeftTab } from "./state/editor-reducer";
import { Icon } from "./icons";

/** Render a `N_Rd`-style name with a subscript. */
function VarName({ name }: { name: string }) {
  const i = name.indexOf("_");
  if (i === -1) return <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic" }}>{name}</span>;
  return (
    <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic" }}>
      {name.slice(0, i)}
      <sub style={{ fontSize: "0.66em", fontStyle: "normal" }}>{name.slice(i + 1)}</sub>
    </span>
  );
}

/**
 * Left panel — Outline (headings + tagged regions), Variables (the engine
 * symbol table in reading order), Files (the current sheet). Collapsible to a
 * 32px rail.
 */
export function LeftPanel({ worksheetTitle }: { worksheetTitle: string }) {
  const { state, dispatch } = useEditor();
  const open = state.ui.leftOpen;
  const tab = state.ui.leftTab;

  if (!open) {
    return (
      <div style={{ width: 32, flex: "0 0 32px", borderRight: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 8 }}>
        <IconButton label="Show panel" onClick={() => dispatch({ type: "TOGGLE_LEFT" })}>
          <Icon name="chevR" size={17} />
        </IconButton>
      </div>
    );
  }

  const TabBtn = ({ id, label }: { id: LeftTab; label: string }) => (
    <button
      onClick={() => dispatch({ type: "SET_LEFT_TAB", tab: id })}
      className={"ed-tab" + (tab === id ? " on" : "")}
      style={{ flex: 1, height: 34, color: tab === id ? "var(--text-primary)" : "var(--text-muted)", font: (tab === id ? "600" : "500") + " 12px/1 var(--font-sans)" }}
    >
      {label}
    </button>
  );

  return (
    <aside style={{ width: 244, flex: "0 0 244px", borderRight: "1px solid var(--border-hairline)", background: "var(--surface-chrome)", display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{ display: "flex", alignItems: "center", padding: "0 6px", borderBottom: "1px solid var(--border-hairline)" }}>
        <TabBtn id="outline" label="Outline" />
        <TabBtn id="variables" label="Variables" />
        <TabBtn id="files" label="Files" />
        <IconButton label="Hide panel" size="sm" onClick={() => dispatch({ type: "TOGGLE_LEFT" })}>
          <Icon name="chevL" size={16} />
        </IconButton>
      </div>
      <div className="scroll-y" style={{ flex: 1, padding: "8px 6px", minHeight: 0 }}>
        {tab === "outline" && <OutlineList />}
        {tab === "variables" && <VariablesList />}
        {tab === "files" && <FilesList title={worksheetTitle} />}
      </div>
    </aside>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ padding: "12px 10px", font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{children}</div>;
}

function OutlineList() {
  const { state, dispatch } = useEditor();
  const items: { id: string; label: string; level: number; tag?: string }[] = [];
  for (const r of walkRegions(state.content)) {
    if (r.type === "text" && r.heading) items.push({ id: r.id, label: r.text || "Heading", level: r.heading - 1 });
    else if (r.tag) items.push({ id: r.id, label: `#${r.tag}`, level: 1, tag: r.type });
  }
  if (items.length === 0) return <Empty>Add a heading or tag a region to build the outline.</Empty>;
  return (
    <>
      {items.map((o) => {
        const active = state.selectedId === o.id;
        return (
          <button
            key={o.id}
            onClick={() => dispatch({ type: "SELECT", id: o.id })}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", paddingLeft: 8 + o.level * 16, border: "none", background: active ? "var(--accent-tint)" : "transparent", borderRadius: 5, cursor: "pointer", textAlign: "left" }}
          >
            <span style={{ flex: 1, minWidth: 0, font: (o.level === 0 ? "600 " : "400 ") + "12.5px/1.3 var(--font-sans)", color: active ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
            {o.tag && <span style={{ font: "9.5px/1 var(--font-mono)", color: "var(--text-muted)", border: "1px solid var(--border-hairline)", borderRadius: 3, padding: "1px 3px" }}>{o.tag}</span>}
          </button>
        );
      })}
    </>
  );
}

function VariablesList() {
  const { state, dispatch } = useEditor();
  const defs = mathRegions(state.content)
    .map((r) => ({ region: r, result: state.results.get(r.id) }))
    .filter((d) => d.result?.name);
  if (defs.length === 0) return <Empty>Define a value (e.g. F_t := 12 kN) to see it here.</Empty>;
  return (
    <>
      <div style={{ padding: "2px 8px 8px", font: "11px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
        {defs.length} {defs.length === 1 ? "name" : "names"} defined · in reading order
      </div>
      {defs.map(({ region, result }) => {
        const err = result?.status === "error";
        return (
          <div
            key={region.id}
            onClick={() => dispatch({ type: "SELECT", id: region.id })}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 8px", borderRadius: 5, cursor: "pointer" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: err ? "var(--status-error)" : "var(--accent)", flex: "0 0 auto" }} />
            <span style={{ flex: 1, fontSize: 14 }}><VarName name={result!.name!} /></span>
            <span style={{ font: "12px/1 var(--font-mono)", color: err ? "var(--status-error)" : "var(--text-primary)", maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {err ? "error" : result?.formatted || "—"}
            </span>
          </div>
        );
      })}
    </>
  );
}

function FilesList({ title }: { title: string }) {
  return (
    <button
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", border: "none", background: "var(--accent-tint)", borderRadius: 5, cursor: "default", textAlign: "left" }}
    >
      <span style={{ color: "var(--accent)", display: "inline-flex", flex: "0 0 auto" }}><Icon name="sheet" size={15} /></span>
      <span style={{ flex: 1, minWidth: 0, font: "400 12.5px/1.3 var(--font-sans)", color: "var(--accent)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
    </button>
  );
}
