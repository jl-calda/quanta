"use client";

import { useState } from "react";
import { IconButton } from "@/components/ds";
import type { ProjectSummary } from "@/server/queries/files";
import { buildTree, folderPath, type ProjectNode } from "./format";
import { ChevronRightIcon, FolderIcon, FolderOpenIcon } from "./icons";

/**
 * Collapsible projects tree (§4.5). Navigates by pushing `?folder=<id>`; the
 * active folder's ancestors start expanded. Collapse state is local React (no
 * localStorage, per CLAUDE.md). A root "All worksheets" entry clears the folder.
 */
export function ProjectsTree({
  open,
  setOpen,
  projects,
  counts,
  activeFolderId,
  onNavigate,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  projects: ProjectSummary[];
  counts: Record<string, number>;
  activeFolderId: string | undefined;
  onNavigate: (folderId: string | null) => void;
}) {
  const tree = buildTree(projects);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(folderPath(projects, activeFolderId).map((c) => c.id)),
  );

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!open) {
    return (
      <div
        style={{
          width: 34,
          flex: "0 0 34px",
          borderRight: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
          display: "flex",
          justifyContent: "center",
          paddingTop: 10,
        }}
      >
        <IconButton label="Show projects" onClick={() => setOpen(true)}>
          <ChevronRightIcon size={17} />
        </IconButton>
      </div>
    );
  }

  return (
    <aside
      style={{
        width: 256,
        flex: "0 0 256px",
        borderRight: "1px solid var(--border-hairline)",
        background: "var(--surface-chrome)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 12px 8px",
        }}
      >
        <span
          style={{
            font: "600 11px/1 var(--font-sans)",
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Projects
        </span>
        <IconButton label="Collapse" size="sm" onClick={() => setOpen(false)}>
          <span style={{ transform: "scaleX(-1)", display: "inline-flex" }}>
            <ChevronRightIcon size={15} />
          </span>
        </IconButton>
      </div>

      <div className="scroll-y" style={{ flex: 1, padding: "0 8px 10px", minHeight: 0 }}>
        <RootRow active={!activeFolderId} onClick={() => onNavigate(null)} />
        {tree.map((node) => (
          <TreeRow
            key={node.id}
            node={node}
            depth={0}
            counts={counts}
            activeFolderId={activeFolderId}
            expanded={expanded}
            onToggle={toggle}
            onNavigate={onNavigate}
          />
        ))}
        {tree.length === 0 && (
          <p style={{ padding: "6px 8px", font: "12.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
            No folders yet.
          </p>
        )}
      </div>
    </aside>
  );
}

function RootRow({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        width: "100%",
        padding: "7px 8px",
        border: "none",
        background: active ? "var(--accent-tint)" : "transparent",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
        textAlign: "left",
        marginBottom: 2,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ display: "inline-flex", color: active ? "var(--accent)" : "var(--text-muted)" }}>
        <FolderOpenIcon size={17} />
      </span>
      <span
        style={{
          flex: 1,
          font: "600 12.5px/1.2 var(--font-sans)",
          color: active ? "var(--accent)" : "var(--text-primary)",
        }}
      >
        All worksheets
      </span>
    </button>
  );
}

function TreeRow({
  node,
  depth,
  counts,
  activeFolderId,
  expanded,
  onToggle,
  onNavigate,
}: {
  node: ProjectNode;
  depth: number;
  counts: Record<string, number>;
  activeFolderId: string | undefined;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onNavigate: (folderId: string) => void;
}) {
  const active = node.id === activeFolderId;
  const isOpen = expanded.has(node.id);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onNavigate(node.id)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          width: "100%",
          padding: "6px 8px",
          paddingLeft: 8 + depth * 16,
          border: "none",
          background: active ? "var(--accent-tint)" : "transparent",
          borderRadius: "var(--radius-sm)",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) => {
          if (!active) e.currentTarget.style.background = "var(--surface-hover)";
        }}
        onMouseLeave={(e) => {
          if (!active) e.currentTarget.style.background = "transparent";
        }}
      >
        <span
          role="button"
          aria-label={isOpen ? "Collapse" : "Expand"}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) onToggle(node.id);
          }}
          style={{
            display: "inline-flex",
            width: 14,
            color: "var(--text-muted)",
            visibility: hasChildren ? "visible" : "hidden",
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform var(--dur-fast)",
          }}
        >
          <ChevronRightIcon size={14} />
        </span>
        <span style={{ display: "inline-flex", color: active ? "var(--accent)" : "var(--accent)" }}>
          {isOpen && hasChildren ? <FolderOpenIcon size={16} /> : <FolderIcon size={16} />}
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            font: (depth === 0 ? "600 " : "") + "12.5px/1.2 var(--font-sans)",
            color: active ? "var(--accent)" : "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.name}
        </span>
        {counts[node.id] != null && (
          <span style={{ font: "11px/1 var(--font-mono)", color: "var(--text-muted)" }}>
            {counts[node.id]}
          </span>
        )}
      </button>
      {isOpen &&
        node.children.map((child) => (
          <TreeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            counts={counts}
            activeFolderId={activeFolderId}
            expanded={expanded}
            onToggle={onToggle}
            onNavigate={onNavigate}
          />
        ))}
    </div>
  );
}
