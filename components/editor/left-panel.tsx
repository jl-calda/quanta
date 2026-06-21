"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { buildOutline } from "@/lib/worksheet/outline";
import { buildSymbolTable, matchSymbol } from "@/lib/worksheet/symbols";
import { splitValueUnit } from "@/lib/worksheet/value-unit";
import type { ProjectNode, ProjectTree } from "@/lib/worksheet/project-tree";
import type { RegionResult } from "@/lib/calc";
import { IconButton } from "@/components/ds";
import { useEditor } from "./state/editor-provider";
import type { LeftTab } from "./state/editor-reducer";
import { scrollToRegion } from "./scroll-to-region";
import { Icon } from "./icons";

/** Section-header eyebrow (matches the mockup's tracked uppercase labels). */
const EYEBROW: CSSProperties = {
  font: "600 11px/1 var(--font-sans)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
};

/** A scrollable tab body column (header stays put, this scrolls). */
const TAB_COL: CSSProperties = { display: "flex", flexDirection: "column", minHeight: 0, flex: 1 };
const SCROLL_BODY: CSSProperties = { flex: 1, minHeight: 0, padding: "0 6px 8px" };

/** Render a `N_Rd`-style name with a subscript, in the math face. */
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
 * Left panel — Outline (numbered headings + tagged regions), Variables (the live
 * engine symbol table with reference counts), Files (the workspace project tree
 * with the current sheet highlighted). Clicking an Outline/Variables row scrolls
 * the canvas to that region. Collapsible to a 32px rail.
 */
export function LeftPanel({
  worksheetTitle,
  currentSheetId,
  currentProjectId,
  projectTree,
}: {
  worksheetTitle: string;
  currentSheetId: string;
  currentProjectId: string | null;
  projectTree: ProjectTree;
}) {
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
      {tab === "outline" && <OutlineList />}
      {tab === "variables" && <VariablesList />}
      {tab === "files" && (
        <FilesList
          tree={projectTree}
          currentSheetId={currentSheetId}
          currentProjectId={currentProjectId}
          currentTitle={worksheetTitle}
        />
      )}
    </aside>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <div style={{ padding: "12px 10px", font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{children}</div>;
}

/** Select a region and bring it into view in the canvas. */
function useOpenRegion() {
  const { dispatch } = useEditor();
  return (id: string) => {
    dispatch({ type: "SELECT", id });
    requestAnimationFrame(() => scrollToRegion(id));
  };
}

/* ------------------------------------------------------------------ *
 * Outline
 * ------------------------------------------------------------------ */

function OutlineList() {
  const { state, dispatch, canEdit } = useEditor();
  const openRegion = useOpenRegion();
  const items = useMemo(() => buildOutline(state.content), [state.content]);

  const addHeading = () =>
    dispatch({ type: "INSERT_HEADING", anchorId: state.selectedId, where: "below" });

  return (
    <div style={TAB_COL}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px 7px", flex: "0 0 auto" }}>
        <span style={EYEBROW}>Contents</span>
        {canEdit && (
          <button
            onClick={addHeading}
            style={{ display: "inline-flex", alignItems: "center", gap: 3, border: "none", background: "none", color: "var(--accent)", font: "500 11.5px/1 var(--font-sans)", cursor: "pointer", padding: "2px 4px", borderRadius: "var(--radius-sm)" }}
          >
            <Icon name="plusSm" size={13} /> heading
          </button>
        )}
      </div>
      <div className="scroll-y" style={SCROLL_BODY}>
        {items.length === 0 ? (
          <Empty>{canEdit ? "No headings yet. Add one to build the outline." : "No headings yet."}</Empty>
        ) : (
          items.map((o) => {
            const active = state.selectedId === o.id;
            return (
              <button
                key={o.id}
                className="lp-row"
                onClick={() => openRegion(o.id)}
                style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "6px 8px", paddingLeft: 8 + o.level * 15, border: "none", background: active ? "var(--accent-tint)" : undefined, borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left", borderLeft: "2px solid " + (active ? "var(--accent)" : "transparent") }}
              >
                {o.level > 0 && <span style={{ width: 4, height: 4, borderRadius: "50%", background: active ? "var(--accent)" : "var(--border-strong)", flex: "0 0 auto" }} />}
                <span style={{ flex: 1, minWidth: 0, font: (o.level === 0 ? "600 12.5" : "400 12") + "px/1.3 var(--font-sans)", color: active ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                {o.tag && <span style={{ font: "9px/1 var(--font-mono)", color: "var(--text-muted)", border: "1px solid var(--border-hairline)", borderRadius: 3, padding: "1px 3px", flex: "0 0 auto" }}>{o.tag}</span>}
                {o.number && <span style={{ font: "11px/1 var(--font-mono)", color: active ? "var(--accent)" : "var(--text-muted)", flex: "0 0 auto", textAlign: "right" }}>{o.number}</span>}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Variables
 * ------------------------------------------------------------------ */

function VariablesList() {
  const { state } = useEditor();
  const openRegion = useOpenRegion();
  const [query, setQuery] = useState("");

  const table = useMemo(() => buildSymbolTable(state.content), [state.content]);
  const entries = table.map((e) => ({ ...e, result: state.results.get(e.id) }));
  const filtered = entries.filter((e) => matchSymbol(e.name, query));
  const conflicts = entries.filter((e) => e.result?.error?.kind === "unit-mismatch").length;

  // Group, preserving first-appearance order of the section labels.
  const groups: { group: string; items: typeof filtered }[] = [];
  for (const e of filtered) {
    let g = groups.find((x) => x.group === e.group);
    if (!g) {
      g = { group: e.group, items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <div style={TAB_COL}>
      <div style={{ padding: "9px 10px 8px", flex: "0 0 auto" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none", display: "inline-flex" }}>
            <Icon name="search" size={14} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search variables…"
            aria-label="Search variables"
            style={{ width: "100%", height: 30, padding: "0 10px 0 30px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-strong)", background: "var(--surface-raised)", font: "12px/1 var(--font-sans)", color: "var(--text-primary)", outline: "none" }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--accent)";
              e.target.style.boxShadow = "0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "var(--border-strong)";
              e.target.style.boxShadow = "none";
            }}
          />
        </div>
      </div>
      <div className="scroll-y" style={SCROLL_BODY}>
        {table.length === 0 ? (
          <Empty>Define a value (e.g. F_t := 12 kN) to see it here.</Empty>
        ) : groups.length === 0 ? (
          <Empty>No variables match “{query}”.</Empty>
        ) : (
          groups.map((g) => (
            <div key={g.group} style={{ marginBottom: 4 }}>
              <div style={{ padding: "8px 8px 5px", font: "600 9.5px/1 var(--font-sans)", letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-muted)" }}>{g.group}</div>
              {g.items.map((it) => (
                <VarRow key={it.id} entry={it} onOpen={openRegion} />
              ))}
            </div>
          ))
        )}
      </div>
      {conflicts > 0 && (
        <div style={{ flex: "0 0 auto", borderTop: "1px solid var(--border-hairline)", padding: "8px 12px", font: "11px/1.4 var(--font-sans)", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-flex", color: "var(--status-error)", flex: "0 0 auto" }}>
            <Icon name="alertTri" size={13} />
          </span>
          {conflicts} {conflicts === 1 ? "name has" : "names have"} a unit conflict
        </div>
      )}
    </div>
  );
}

function VarRow({
  entry,
  onOpen,
}: {
  entry: { id: string; name: string; refCount: number; result?: RegionResult };
  onOpen: (id: string) => void;
}) {
  const result = entry.result;
  const err = result?.status === "error";
  const stale = result?.status === "stale";
  const vu = result ? splitValueUnit(result) : { value: "—", unit: "" };

  return (
    <button
      className="lp-row"
      onClick={() => onOpen(entry.id)}
      style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "6px 8px", border: "none", background: undefined, borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: err ? "var(--status-error)" : "var(--accent)", flex: "0 0 auto" }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        <VarName name={entry.name} />
      </span>
      {err ? (
        <span title={result?.error?.message ?? "Error"} style={{ display: "inline-flex", alignItems: "center", color: "var(--status-error)", flex: "0 0 auto" }}>
          <Icon name="alertCirc" size={13} />
        </span>
      ) : (
        <>
          <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-primary)", flex: "0 0 auto", opacity: stale ? 0.55 : 1 }}>{vu.value}</span>
          <span style={{ font: "11px/1 var(--font-mono)", color: "var(--text-muted)", width: 30, flex: "0 0 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vu.unit}</span>
          <span title={`${entry.refCount} ${entry.refCount === 1 ? "reference" : "references"}`} style={{ font: "10px/1 var(--font-sans)", color: "var(--text-muted)", flex: "0 0 auto", width: 30, textAlign: "right" }}>
            {entry.refCount === 0 ? "—" : `used ${entry.refCount}×`}
          </span>
        </>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Files
 * ------------------------------------------------------------------ */

/** Chain of project ids from a root down to `target`, or null if not found. */
function pathToProject(nodes: ProjectNode[], target: string | null): string[] | null {
  if (!target) return null;
  for (const node of nodes) {
    if (node.id === target) return [node.id];
    const deeper = pathToProject(node.children, target);
    if (deeper) return [node.id, ...deeper];
  }
  return null;
}

function FilesList({
  tree,
  currentSheetId,
  currentProjectId,
  currentTitle,
}: {
  tree: ProjectTree;
  currentSheetId: string;
  currentProjectId: string | null;
  currentTitle: string;
}) {
  const router = useRouter();
  const defaultOpen = useMemo(
    () => new Set(pathToProject(tree.roots, currentProjectId) ?? []),
    [tree, currentProjectId],
  );
  const [open, setOpen] = useState<Set<string>>(defaultOpen);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const go = (id: string) => {
    if (id !== currentSheetId) router.push(`/w/${id}`);
  };

  const empty = tree.roots.length === 0 && tree.looseSheets.length === 0;

  return (
    <div style={TAB_COL}>
      <div style={{ padding: "9px 12px 7px", flex: "0 0 auto" }}>
        <span style={EYEBROW}>Project</span>
      </div>
      <div className="scroll-y" style={SCROLL_BODY}>
        {empty ? (
          <SheetRow title={currentTitle} active level={0} onClick={() => {}} />
        ) : (
          <>
            {tree.roots.map((p) => (
              <TreeProject key={p.id} node={p} level={0} open={open} toggle={toggle} currentSheetId={currentSheetId} go={go} />
            ))}
            {tree.looseSheets.map((s) => (
              <SheetRow key={s.id} title={s.title} active={s.id === currentSheetId} level={0} onClick={() => go(s.id)} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

function TreeProject({
  node,
  level,
  open,
  toggle,
  currentSheetId,
  go,
}: {
  node: ProjectNode;
  level: number;
  open: Set<string>;
  toggle: (id: string) => void;
  currentSheetId: string;
  go: (id: string) => void;
}) {
  const isOpen = open.has(node.id);
  return (
    <>
      <button
        className="lp-row"
        onClick={() => toggle(node.id)}
        aria-expanded={isOpen}
        style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "6px 8px", paddingLeft: 8 + level * 15, border: "none", background: undefined, borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ display: "inline-flex", color: "var(--text-muted)", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform var(--dur-fast) var(--ease-out)", flex: "0 0 auto" }}>
          <Icon name="chevR" size={12} />
        </span>
        <span style={{ display: "inline-flex", color: "var(--accent)", flex: "0 0 auto" }}>
          <Icon name="folder" size={15} />
        </span>
        <span style={{ flex: 1, minWidth: 0, font: "600 12px/1.3 var(--font-sans)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.name}</span>
      </button>
      {isOpen && (
        <>
          {node.children.map((c) => (
            <TreeProject key={c.id} node={c} level={level + 1} open={open} toggle={toggle} currentSheetId={currentSheetId} go={go} />
          ))}
          {node.sheets.map((s) => (
            <SheetRow key={s.id} title={s.title} active={s.id === currentSheetId} level={level + 1} onClick={() => go(s.id)} />
          ))}
        </>
      )}
    </>
  );
}

function SheetRow({
  title,
  active,
  level,
  onClick,
}: {
  title: string;
  active: boolean;
  level: number;
  onClick: () => void;
}) {
  return (
    <button
      className="lp-row"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "6px 8px", paddingLeft: 8 + level * 15, border: "none", background: active ? "var(--accent-tint)" : undefined, borderRadius: "var(--radius-sm)", cursor: active ? "default" : "pointer", textAlign: "left", borderLeft: "2px solid " + (active ? "var(--accent)" : "transparent") }}
    >
      <span style={{ width: 12, flex: "0 0 auto" }} />
      <span style={{ display: "inline-flex", color: active ? "var(--accent)" : "var(--text-muted)", flex: "0 0 auto" }}>
        <Icon name="sheet" size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0, font: "400 12px/1.3 var(--font-sans)", color: active ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
    </button>
  );
}
