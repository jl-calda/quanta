"use client";

import { Checkbox } from "@/components/ds";
import { ContentSnapshot } from "@/components/editor/content-snapshot";
import { TemplateThumb } from "@/components/templates/template-thumb";
import type { FolderRow, FileRow } from "@/server/queries/files";
import type { RowAction, RowItem } from "./types";
import { Avatar, StatusChip } from "./bits";
import { RowKebabMenu } from "./row-kebab-menu";
import { FolderIcon } from "./icons";
import { fmtModified } from "./format";

/**
 * Card grid (§4.5). Folders are compact cards; worksheets show a procedural
 * "live-math" thumbnail (seeded by id — worksheets don't persist a thumbnail).
 * Capped at the listing size, so no virtualization is needed here.
 */
export function GridView({
  folders,
  files,
  selected,
  onToggleSelect,
  canEdit,
  onAction,
}: {
  folders: FolderRow[];
  files: FileRow[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  canEdit: boolean;
  onAction: (action: RowAction, item: RowItem) => void;
}) {
  return (
    <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 16,
          paddingBottom: 8,
        }}
      >
        {folders.map((f) => {
          const item: RowItem = { id: f.id, kind: "folder", name: f.name };
          const isSel = selected.has(f.id);
          return (
            <div
              key={`f-${f.id}`}
              onClick={() => onAction("open", item)}
              style={{
                border: "1px solid " + (isSel ? "var(--accent)" : "var(--border-hairline)"),
                borderRadius: "var(--radius-md)",
                background: isSel ? "var(--surface-selected)" : "var(--surface-raised)",
                padding: "14px 15px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 11,
                position: "relative",
                minHeight: 90,
              }}
            >
              <CardCheck visible={canEdit} checked={isSel} onChange={() => onToggleSelect(f.id)} />
              <CardKebab kind="folder" canEdit={canEdit} item={item} onAction={onAction} />
              <span style={{ color: "var(--accent)", display: "inline-flex" }}>
                <FolderIcon size={34} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    font: "600 13.5px/1.3 var(--font-sans)",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.name}
                </span>
                <span
                  style={{
                    display: "block",
                    font: "11.5px/1.3 var(--font-sans)",
                    color: "var(--text-muted)",
                    marginTop: 3,
                  }}
                >
                  {f.itemCount} item{f.itemCount === 1 ? "" : "s"} · {fmtModified(f.created_at)}
                </span>
              </span>
            </div>
          );
        })}

        {files.map((s) => {
          const item: RowItem = { id: s.id, kind: "sheet", name: s.title };
          const isSel = selected.has(s.id);
          return (
            <div
              key={`s-${s.id}`}
              onClick={() => onAction("open", item)}
              style={{
                border: "1px solid " + (isSel ? "var(--accent)" : "var(--border-hairline)"),
                borderRadius: "var(--radius-md)",
                background: "var(--surface-raised)",
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ position: "absolute", top: 10, left: 10, zIndex: 3 }}>
                <CardCheck visible={canEdit} checked={isSel} onChange={() => onToggleSelect(s.id)} raised />
              </span>
              <CardKebab kind="sheet" canEdit={canEdit} item={item} onAction={onAction} />
              <div style={{ height: 128, borderBottom: "1px solid var(--border-hairline)", position: "relative" }}>
                <ContentSnapshot
                  content={s.content}
                  fallback={<TemplateThumb seed={s.id} />}
                  scale={0.5}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "linear-gradient(to bottom, transparent 62%, var(--surface-raised))",
                  }}
                />
              </div>
              <div style={{ padding: "11px 13px 12px" }}>
                <div
                  style={{
                    font: "600 13px/1.32 var(--font-sans)",
                    color: "var(--text-primary)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginTop: 10,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Avatar name={s.ownerName ?? "Unknown"} avatarUrl={s.ownerAvatarUrl} size={18} />
                    <span style={{ font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                      {fmtModified(s.updated_at)}
                    </span>
                  </span>
                  <StatusChip status={s.calc_status} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardCheck({
  visible,
  checked,
  onChange,
  raised = false,
}: {
  visible: boolean;
  checked: boolean;
  onChange: () => void;
  raised?: boolean;
}) {
  if (!visible) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: 10,
        left: 10,
        zIndex: 3,
        background: raised ? "var(--surface-raised)" : undefined,
        borderRadius: 4,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox checked={checked} onChange={onChange} />
    </span>
  );
}

function CardKebab({
  kind,
  canEdit,
  item,
  onAction,
}: {
  kind: "folder" | "sheet";
  canEdit: boolean;
  item: RowItem;
  onAction: (action: RowAction, item: RowItem) => void;
}) {
  return (
    <span style={{ position: "absolute", top: 8, right: 8, zIndex: 3 }}>
      <RowKebabMenu
        kind={kind}
        canEdit={canEdit}
        iconSize={16}
        onOpen={() => onAction("open", item)}
        onRename={() => onAction("rename", item)}
        onMove={() => onAction("move", item)}
        onDuplicate={() => onAction("duplicate", item)}
        onDelete={() => onAction("delete", item)}
      />
    </span>
  );
}
