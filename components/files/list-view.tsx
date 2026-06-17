"use client";

import { Checkbox } from "@/components/ds";
import type { FolderRow, FileRow } from "@/server/queries/files";
import type { FileSort, SortDir } from "@/lib/schema/files";
import type { RowAction, RowItem } from "./types";
import { Avatar, StatusChip, TagChip, TypeIcon } from "./bits";
import { RowKebabMenu } from "./row-kebab-menu";
import { useWindowedRows } from "./use-windowed-rows";
import { fmtModified } from "./format";
import { SortArrowIcon } from "./icons";

const COLS = "38px 30px 1fr 150px 132px 120px 92px 132px 40px";
const ROW_H = 49;
const VIRTUALIZE_OVER = 60;

type Row =
  | { kind: "folder"; data: FolderRow }
  | { kind: "sheet"; data: FileRow };

/**
 * Dense data table (§4.5). Folders sort above worksheets; the combined list is
 * windowed above ~60 rows (uniform row height) so large folders stay smooth.
 * Sortable Name/Modified headers reflect the URL sort state.
 */
export function ListView({
  folders,
  files,
  selected,
  onToggleSelect,
  onToggleAll,
  allSelected,
  someSelected,
  canEdit,
  sort,
  dir,
  onSort,
  onAction,
}: {
  folders: FolderRow[];
  files: FileRow[];
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
  canEdit: boolean;
  sort: FileSort;
  dir: SortDir;
  onSort: (col: FileSort) => void;
  onAction: (action: RowAction, item: RowItem) => void;
}) {
  const rows: Row[] = [
    ...folders.map((f): Row => ({ kind: "folder", data: f })),
    ...files.map((f): Row => ({ kind: "sheet", data: f })),
  ];
  const total = rows.length;
  const virtualize = total > VIRTUALIZE_OVER;
  const { start, end, padTop, padBottom, scrollRef } = useWindowedRows({
    count: total,
    rowHeight: ROW_H,
    enabled: virtualize,
  });
  const visible = rows.slice(start, end);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
        background: "var(--surface-raised)",
      }}
    >
      {/* header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: COLS,
          gap: 12,
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
          flex: "0 0 auto",
        }}
      >
        <span style={{ display: "inline-flex" }}>
          <Checkbox
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={onToggleAll}
            disabled={!canEdit}
          />
        </span>
        <span />
        <HeadCell label="Name" col="name" sort={sort} dir={dir} onSort={onSort} />
        <HeadCell label="Tags" />
        <HeadCell label="Owner" />
        <HeadCell label="Calc status" col="status" sort={sort} dir={dir} onSort={onSort} />
        <HeadCell label="Size" />
        <HeadCell label="Modified" col="modified" sort={sort} dir={dir} onSort={onSort} />
        <span />
      </div>

      {/* body */}
      <div ref={scrollRef} className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        {padTop > 0 && <div style={{ height: padTop }} />}
        {visible.map((row) =>
          row.kind === "folder" ? (
            <FolderTableRow
              key={`f-${row.data.id}`}
              folder={row.data}
              selected={selected.has(row.data.id)}
              anySelected={selected.size > 0}
              canEdit={canEdit}
              onToggleSelect={() => onToggleSelect(row.data.id)}
              onAction={onAction}
            />
          ) : (
            <SheetTableRow
              key={`s-${row.data.id}`}
              file={row.data}
              selected={selected.has(row.data.id)}
              anySelected={selected.size > 0}
              canEdit={canEdit}
              onToggleSelect={() => onToggleSelect(row.data.id)}
              onAction={onAction}
            />
          ),
        )}
        {padBottom > 0 && <div style={{ height: padBottom }} />}
      </div>
    </div>
  );
}

function HeadCell({
  label,
  col,
  sort,
  dir,
  onSort,
}: {
  label: string;
  col?: FileSort;
  sort?: FileSort;
  dir?: SortDir;
  onSort?: (col: FileSort) => void;
}) {
  const sortable = !!col && !!onSort;
  const active = sortable && sort === col;
  return (
    <span
      onClick={sortable ? () => onSort!(col!) : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        font: "600 11px/1 var(--font-sans)",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: active ? "var(--accent)" : "var(--text-muted)",
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {label}
      {active && (
        <span
          style={{
            color: "var(--accent)",
            display: "inline-flex",
            transform: dir === "asc" ? "none" : "scaleY(-1)",
          }}
        >
          <SortArrowIcon size={12} />
        </span>
      )}
    </span>
  );
}

function rowStyle(selected: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: COLS,
    gap: 12,
    alignItems: "center",
    height: ROW_H,
    padding: "0 14px",
    borderBottom: "1px solid var(--border-hairline)",
    cursor: "pointer",
    background: selected ? "var(--surface-selected)" : "transparent",
  };
}

function FolderTableRow({
  folder,
  selected,
  anySelected,
  canEdit,
  onToggleSelect,
  onAction,
}: {
  folder: FolderRow;
  selected: boolean;
  anySelected: boolean;
  canEdit: boolean;
  onToggleSelect: () => void;
  onAction: (action: RowAction, item: RowItem) => void;
}) {
  const item: RowItem = { id: folder.id, kind: "folder", name: folder.name };
  return (
    <div
      className={"fb-row" + (selected || anySelected ? " any-sel" : "")}
      style={rowStyle(selected)}
      onClick={() => onAction("open", item)}
    >
      <CheckCell visible={canEdit} checked={selected} onChange={onToggleSelect} />
      <span style={{ display: "inline-flex" }}>
        <TypeIcon kind="folder" />
      </span>
      <Name bold>{folder.name}</Name>
      <span style={{ color: "var(--text-muted)" }}>—</span>
      <span style={{ color: "var(--text-muted)" }}>—</span>
      <span style={{ color: "var(--text-muted)", font: "12px var(--font-sans)" }}>—</span>
      <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-muted)" }}>
        {folder.itemCount} item{folder.itemCount === 1 ? "" : "s"}
      </span>
      <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
        {fmtModified(folder.created_at)}
      </span>
      <KebabCell kind="folder" canEdit={canEdit} item={item} onAction={onAction} />
    </div>
  );
}

function SheetTableRow({
  file,
  selected,
  anySelected,
  canEdit,
  onToggleSelect,
  onAction,
}: {
  file: FileRow;
  selected: boolean;
  anySelected: boolean;
  canEdit: boolean;
  onToggleSelect: () => void;
  onAction: (action: RowAction, item: RowItem) => void;
}) {
  const item: RowItem = { id: file.id, kind: "sheet", name: file.title };
  return (
    <div
      className={"fb-row" + (selected || anySelected ? " any-sel" : "")}
      style={rowStyle(selected)}
      onClick={() => onAction("open", item)}
    >
      <CheckCell visible={canEdit} checked={selected} onChange={onToggleSelect} />
      <span style={{ display: "inline-flex" }}>
        <TypeIcon kind="sheet" />
      </span>
      <Name>{file.title}</Name>
      <span style={{ display: "flex", gap: 5, overflow: "hidden" }}>
        {file.tags.length ? (
          file.tags.map((t) => <TagChip key={t.id}>{t.name}</TagChip>)
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <Avatar name={file.ownerName ?? "Unknown"} avatarUrl={file.ownerAvatarUrl} />
        <span
          style={{
            font: "12.5px/1.2 var(--font-sans)",
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.ownerName ?? "Unknown"}
        </span>
      </span>
      <span>
        <StatusChip status={file.calc_status} />
      </span>
      <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-muted)" }}>{file.size}</span>
      <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
        {fmtModified(file.updated_at)}
      </span>
      <KebabCell kind="sheet" canEdit={canEdit} item={item} onAction={onAction} />
    </div>
  );
}

function CheckCell({
  visible,
  checked,
  onChange,
}: {
  visible: boolean;
  checked: boolean;
  onChange: () => void;
}) {
  if (!visible) return <span />;
  return (
    <span className="row-check" style={{ display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
      <Checkbox checked={checked} onChange={onChange} />
    </span>
  );
}

function KebabCell({
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
    <span className="row-kebab" style={{ display: "flex", justifyContent: "flex-end" }}>
      <RowKebabMenu
        kind={kind}
        canEdit={canEdit}
        onOpen={() => onAction("open", item)}
        onRename={() => onAction("rename", item)}
        onMove={() => onAction("move", item)}
        onDuplicate={() => onAction("duplicate", item)}
        onDelete={() => onAction("delete", item)}
      />
    </span>
  );
}

function Name({ children, bold = false }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <span
        style={{
          font: (bold ? "600 " : "500 ") + "13px/1.3 var(--font-sans)",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </span>
  );
}
