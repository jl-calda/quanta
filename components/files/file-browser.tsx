"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, Button, Input, Select } from "@/components/ds";
import type {
  FolderRow,
  FileRow,
  ProjectSummary,
  FileTag,
  WorkspaceMemberOption,
} from "@/server/queries/files";
import type { FilesFilters, FileSort } from "@/lib/schema/files";
import type { ActionResult } from "@/server/result";
import { createWorksheet, renameWorksheet } from "@/server/actions/worksheet";
import {
  createFolder,
  renameProject,
  moveProject,
  duplicateWorksheet,
  softDeleteWorksheet,
  deleteFolder,
  bulkMove,
  bulkTag,
  bulkSoftDelete,
} from "@/server/actions/files";
import { folderPath } from "./format";
import type { RowAction, RowItem } from "./types";
import { ProjectsTree } from "./projects-tree";
import { ListView } from "./list-view";
import { GridView } from "./grid-view";
import { SelectionBar } from "./selection-bar";
import { NewButton } from "./new-button";
import { FilterPill } from "./filter-pill";
import { EmptyFolder } from "./empty-folder";
import { ToastHost, useToast } from "./toast-host";
import {
  NewFolderDialog,
  RenameDialog,
  MoveDialog,
  TagDialog,
  DeleteFolderDialog,
} from "./dialogs";
import { ListIcon, GridIcon, ChevronRightIcon, SearchIcon } from "./icons";

interface FileBrowserProps {
  workspaceId: string;
  canCreate: boolean;
  canEdit: boolean;
  folders: FolderRow[];
  files: FileRow[];
  projects: ProjectSummary[];
  folderCounts: Record<string, number>;
  tags: FileTag[];
  members: WorkspaceMemberOption[];
  filters: FilesFilters;
}

type DialogState =
  | { type: "none" }
  | { type: "newFolder" }
  | { type: "rename"; item: RowItem }
  | { type: "move"; items: RowItem[] }
  | { type: "tag"; items: RowItem[] }
  | { type: "deleteFolder"; folder: { id: string; name: string; itemCount: number } }
  | { type: "bulkDelete"; items: RowItem[] };

const SORT_OPTIONS: { value: FileSort; label: string; dir: "asc" | "desc" }[] = [
  { value: "modified", label: "Recently modified", dir: "desc" },
  { value: "name", label: "Name (A–Z)", dir: "asc" },
  { value: "status", label: "Calc status", dir: "asc" },
];

/** The file browser (§4.5). Wraps everything in the toast host. */
export function FileBrowser(props: FileBrowserProps) {
  return (
    <ToastHost>
      <Browser {...props} />
    </ToastHost>
  );
}

function Browser({
  workspaceId,
  canCreate,
  canEdit,
  folders,
  files,
  projects,
  folderCounts,
  tags,
  members,
  filters,
}: FileBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [treeOpen, setTreeOpen] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(filters.q ?? "");
  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [dialogError, setDialogError] = useState<string | null>(null);

  // Reset selection whenever the underlying listing changes (folder/filter nav).
  useEffect(() => {
    setSelected(new Set());
  }, [filters.folder, filters.q, filters.owner, filters.status, filters.tag]);

  // Keep the search box in sync if the URL is changed externally (back/forward).
  useEffect(() => {
    setSearch(filters.q ?? "");
  }, [filters.q]);

  // Lookups for resolving selected ids → kind/name (for bulk actions).
  const itemById = useMemo(() => {
    const m = new Map<string, RowItem>();
    for (const f of folders) m.set(f.id, { id: f.id, kind: "folder", name: f.name });
    for (const s of files) m.set(s.id, { id: s.id, kind: "sheet", name: s.title });
    return m;
  }, [folders, files]);

  function setParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value == null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    startTransition(() =>
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }),
    );
  }

  function navigate(folderId: string | null) {
    setSelected(new Set());
    setParams({ folder: folderId, q: null, owner: null, status: null, tag: null });
  }

  // Debounced search → URL.
  useEffect(() => {
    const current = filters.q ?? "";
    if (search === current) return;
    const t = setTimeout(() => setParams({ q: search || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function onSort(col: FileSort) {
    if (filters.sort === col) {
      setParams({ dir: filters.dir === "asc" ? "desc" : "asc" });
    } else {
      const def = SORT_OPTIONS.find((o) => o.value === col)?.dir ?? "desc";
      setParams({ sort: col, dir: def });
    }
  }

  function onSelectSort(value: string) {
    const opt = SORT_OPTIONS.find((o) => o.value === value);
    if (opt) setParams({ sort: opt.value, dir: opt.dir });
  }

  /* ----------------------------- selection ----------------------------- */
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  const allIds = useMemo(
    () => [...folders.map((f) => f.id), ...files.map((f) => f.id)],
    [folders, files],
  );
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;
  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allIds));
  }
  function clearSelection() {
    setSelected(new Set());
  }

  /* ----------------------------- run helper ----------------------------- */
  function run<T>(
    fn: () => Promise<ActionResult<T>>,
    onSuccess: (data: T) => void,
    successToast?: string,
    inDialog = false,
  ) {
    setDialogError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        if (successToast) toast.push({ tone: "success", title: successToast });
        onSuccess(res.data);
        router.refresh();
      } else {
        if (inDialog) setDialogError(res.error);
        toast.push({ tone: "error", title: res.error });
      }
    });
  }

  function closeDialog() {
    setDialog({ type: "none" });
    setDialogError(null);
  }

  /* ----------------------------- row actions ---------------------------- */
  function onAction(action: RowAction, item: RowItem) {
    switch (action) {
      case "open":
        if (item.kind === "folder") navigate(item.id);
        else router.push(`/w/${item.id}`);
        break;
      case "rename":
        setDialog({ type: "rename", item });
        break;
      case "move":
        setDialog({ type: "move", items: [item] });
        break;
      case "duplicate":
        run(
          () => duplicateWorksheet({ id: item.id }),
          () => {},
          "Worksheet duplicated",
        );
        break;
      case "delete":
        if (item.kind === "folder") {
          const folder = folders.find((f) => f.id === item.id);
          setDialog({
            type: "deleteFolder",
            folder: { id: item.id, name: item.name, itemCount: folder?.itemCount ?? 0 },
          });
        } else {
          run(
            () => softDeleteWorksheet({ id: item.id }),
            () => clearSelection(),
            "Moved to Trash",
          );
        }
        break;
    }
  }

  /* ----------------------------- create --------------------------------- */
  function onNewWorksheet() {
    run(
      () => createWorksheet({ workspaceId, projectId: filters.folder }),
      (data) => router.push(`/w/${data.id}`),
    );
  }

  function onCreateFolder(name: string) {
    run(
      () => createFolder({ workspaceId, parentId: filters.folder ?? null, name }),
      () => closeDialog(),
      "Folder created",
      true,
    );
  }

  /* ----------------------------- dialog confirms ------------------------ */
  function onRenameConfirm(name: string) {
    if (dialog.type !== "rename") return;
    const { item } = dialog;
    run(
      async (): Promise<ActionResult<unknown>> =>
        item.kind === "folder"
          ? renameProject({ id: item.id, name })
          : renameWorksheet({ id: item.id, title: name }),
      () => closeDialog(),
      "Renamed",
      true,
    );
  }

  function onMoveConfirm(targetId: string | null) {
    if (dialog.type !== "move") return;
    const items = dialog.items;
    const sheetIds = items.filter((i) => i.kind === "sheet").map((i) => i.id);
    const folderIds = items.filter((i) => i.kind === "folder").map((i) => i.id);
    run(
      async () => {
        if (sheetIds.length) {
          const r = await bulkMove({ ids: sheetIds, projectId: targetId });
          if (!r.ok) return r;
        }
        for (const id of folderIds) {
          const r = await moveProject({ id, parentId: targetId });
          if (!r.ok) return r;
        }
        return { ok: true, data: undefined } as ActionResult<undefined>;
      },
      () => {
        closeDialog();
        clearSelection();
      },
      items.length === 1 ? "Moved" : `Moved ${items.length} items`,
      true,
    );
  }

  function onTagConfirm(tagId: string) {
    if (dialog.type !== "tag") return;
    const sheetIds = dialog.items.filter((i) => i.kind === "sheet").map((i) => i.id);
    run(
      () => bulkTag({ ids: sheetIds, tagId }),
      () => {
        closeDialog();
        clearSelection();
      },
      "Tag applied",
      true,
    );
  }

  function onDeleteFolderConfirm() {
    if (dialog.type !== "deleteFolder") return;
    const id = dialog.folder.id;
    run(
      () => deleteFolder({ id }),
      (data) => {
        closeDialog();
        clearSelection();
        // If the deleted folder is the one we're viewing, jump to its parent.
        if (filters.folder === id) {
          const path = folderPath(projects, id);
          navigate(path.length > 1 ? path[path.length - 2].id : null);
        }
        toast.push({
          tone: "success",
          title: "Folder deleted",
          description:
            data.trashedCount > 0
              ? `${data.trashedCount} worksheet${data.trashedCount === 1 ? "" : "s"} moved to Trash`
              : undefined,
        });
      },
      undefined,
      true,
    );
  }

  function onBulkDeleteConfirm() {
    if (dialog.type !== "bulkDelete") return;
    const sheetIds = dialog.items.filter((i) => i.kind === "sheet").map((i) => i.id);
    const folderIds = dialog.items.filter((i) => i.kind === "folder").map((i) => i.id);
    run(
      async () => {
        if (sheetIds.length) {
          const r = await bulkSoftDelete({ ids: sheetIds });
          if (!r.ok) return r;
        }
        for (const id of folderIds) {
          const r = await deleteFolder({ id });
          if (!r.ok) return r;
        }
        return { ok: true, data: undefined } as ActionResult<undefined>;
      },
      () => {
        closeDialog();
        clearSelection();
      },
      "Moved to Trash",
      true,
    );
  }

  /* ----------------------------- bulk triggers -------------------------- */
  const selectedItems = useMemo(
    () => [...selected].map((id) => itemById.get(id)).filter((x): x is RowItem => !!x),
    [selected, itemById],
  );

  function onBulkMove() {
    setDialog({ type: "move", items: selectedItems });
  }
  function onBulkTag() {
    setDialog({ type: "tag", items: selectedItems });
  }
  function onBulkDelete() {
    setDialog({ type: "bulkDelete", items: selectedItems });
  }

  /* ----------------------------- derived UI ----------------------------- */
  const crumbs = useMemo(() => {
    const path = folderPath(projects, filters.folder);
    return [{ id: null as string | null, name: "All worksheets" }, ...path];
  }, [projects, filters.folder]);

  const isEmpty = folders.length === 0 && files.length === 0;
  const isFiltered = Boolean(filters.q || filters.owner || filters.status || filters.tag);

  const ownerOptions = members.map((m) => ({ value: m.id, label: m.name }));
  const statusOptions = [
    { value: "current", label: "Current" },
    { value: "stale", label: "Needs recalculate" },
    { value: "error", label: "Has errors" },
  ];
  const tagOptions = tags.map((t) => ({ value: t.id, label: t.name }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      {/* top bar */}
      <header style={{ flex: "0 0 auto", borderBottom: "1px solid var(--border-hairline)", background: "var(--surface-paper)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 28px 14px" }}>
          <nav style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0 }} aria-label="Breadcrumb">
            {crumbs.map((c, i) => {
              const last = i === crumbs.length - 1;
              return (
                <span key={c.id ?? "root"} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    className={last ? "" : "q-link"}
                    onClick={last ? undefined : () => navigate(c.id)}
                    style={{
                      font: (last ? "600 " : "500 ") + "14px/1 var(--font-sans)",
                      color: last ? "var(--text-primary)" : "var(--text-muted)",
                      cursor: last ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.name}
                  </span>
                  {!last && (
                    <span style={{ color: "var(--border-strong)", display: "inline-flex" }}>
                      <ChevronRightIcon size={13} />
                    </span>
                  )}
                </span>
              );
            })}
          </nav>

          <ViewToggle view={filters.view} onChange={(v) => setParams({ view: v === "list" ? null : v })} />
          {canCreate && (
            <NewButton onNewWorksheet={onNewWorksheet} onNewFolder={() => setDialog({ type: "newFolder" })} pending={pending} />
          )}
        </div>

        {/* search + filters */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "0 28px 14px" }}>
          <div style={{ width: 280 }}>
            <Input
              value={search}
              placeholder="Search in this folder…"
              prefix={<SearchIcon size={16} />}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span style={{ width: 1, height: 22, background: "var(--border-hairline)" }} />
          <FilterPill label="Owner" value={filters.owner} options={ownerOptions} onSelect={(v) => setParams({ owner: v })} />
          <FilterPill label="Calc status" value={filters.status} options={statusOptions} onSelect={(v) => setParams({ status: v })} />
          <FilterPill label="Tag" value={filters.tag} options={tagOptions} onSelect={(v) => setParams({ tag: v })} />

          <div style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>Sort</span>
            <div style={{ width: 180 }}>
              <Select value={filters.sort} options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))} onChange={(e) => onSelectSort(e.target.value)} />
            </div>
          </div>
        </div>
      </header>

      {/* body: tree + content */}
      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        <ProjectsTree
          open={treeOpen}
          setOpen={setTreeOpen}
          projects={projects}
          counts={folderCounts}
          activeFolderId={filters.folder}
          onNavigate={navigate}
        />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            padding: "20px 28px 24px",
            background: "var(--surface-paper)",
          }}
        >
          {isEmpty ? (
            <EmptyFolder canCreate={canCreate} filtered={isFiltered} onNewWorksheet={onNewWorksheet} />
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 14, flex: "0 0 auto" }}>
                <span style={{ font: "13px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                  {folders.length} folder{folders.length === 1 ? "" : "s"} · {files.length} worksheet
                  {files.length === 1 ? "" : "s"}
                </span>
                {pending && (
                  <span style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)" }}>Updating…</span>
                )}
              </div>

              <div style={{ flex: 1, minHeight: 0, opacity: pending ? 0.7 : 1, transition: "opacity var(--dur-base) var(--ease-out)" }}>
                {filters.view === "list" ? (
                  <ListView
                    folders={folders}
                    files={files}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    onToggleAll={toggleAll}
                    allSelected={allSelected}
                    someSelected={someSelected}
                    canEdit={canEdit}
                    sort={filters.sort}
                    dir={filters.dir}
                    onSort={onSort}
                    onAction={onAction}
                  />
                ) : (
                  <GridView
                    folders={folders}
                    files={files}
                    selected={selected}
                    onToggleSelect={toggleSelect}
                    canEdit={canEdit}
                    onAction={onAction}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* selection bar */}
      {someSelected && (
        <SelectionBar
          count={selected.size}
          canEdit={canEdit}
          onMove={onBulkMove}
          onTag={onBulkTag}
          onDelete={onBulkDelete}
          onClear={clearSelection}
        />
      )}

      {/* dialogs */}
      <NewFolderDialog
        open={dialog.type === "newFolder"}
        onClose={closeDialog}
        onCreate={onCreateFolder}
        pending={pending}
        error={dialogError}
      />
      <RenameDialog
        open={dialog.type === "rename"}
        onClose={closeDialog}
        initialName={dialog.type === "rename" ? dialog.item.name : ""}
        label={dialog.type === "rename" && dialog.item.kind === "folder" ? "Rename folder" : "Rename worksheet"}
        onRename={onRenameConfirm}
        pending={pending}
        error={dialogError}
      />
      <MoveDialog
        open={dialog.type === "move"}
        onClose={closeDialog}
        projects={projects}
        excludeIds={dialog.type === "move" ? dialog.items.filter((i) => i.kind === "folder").map((i) => i.id) : []}
        count={dialog.type === "move" ? dialog.items.length : 0}
        onMove={onMoveConfirm}
        pending={pending}
        error={dialogError}
      />
      <TagDialog
        open={dialog.type === "tag"}
        onClose={closeDialog}
        tags={tags}
        count={dialog.type === "tag" ? dialog.items.filter((i) => i.kind === "sheet").length : 0}
        onApply={onTagConfirm}
        pending={pending}
        error={dialogError}
      />
      <DeleteFolderDialog
        open={dialog.type === "deleteFolder"}
        onClose={closeDialog}
        folderName={dialog.type === "deleteFolder" ? dialog.folder.name : ""}
        itemCount={dialog.type === "deleteFolder" ? dialog.folder.itemCount : 0}
        onConfirm={onDeleteFolderConfirm}
        pending={pending}
        error={dialogError}
      />
      <BulkDeleteDialog
        open={dialog.type === "bulkDelete"}
        items={dialog.type === "bulkDelete" ? dialog.items : []}
        onClose={closeDialog}
        onConfirm={onBulkDeleteConfirm}
        pending={pending}
        error={dialogError}
      />
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: "list" | "grid"; onChange: (v: "list" | "grid") => void }) {
  const opts: ["list" | "grid", React.ReactNode][] = [
    ["list", <ListIcon key="l" size={18} />],
    ["grid", <GridIcon key="g" size={18} />],
  ];
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--border-strong)",
        borderRadius: "var(--radius-sm)",
        overflow: "hidden",
        height: 36,
        flex: "0 0 auto",
      }}
    >
      {opts.map(([v, icon], i) => {
        const active = view === v;
        return (
          <button
            key={v}
            type="button"
            aria-label={`${v} view`}
            aria-pressed={active}
            onClick={() => onChange(v)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 38,
              height: "100%",
              border: "none",
              borderLeft: i ? "1px solid var(--border-hairline)" : "none",
              cursor: "pointer",
              background: active ? "var(--accent-tint)" : "var(--surface-raised)",
              color: active ? "var(--accent)" : "var(--text-muted)",
            }}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

function BulkDeleteDialog({
  open,
  items,
  onClose,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  items: RowItem[];
  onClose: () => void;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  const folderCount = items.filter((i) => i.kind === "folder").length;
  const sheetCount = items.filter((i) => i.kind === "sheet").length;
  return (
    <Dialog
      open={open}
      eyebrow="Delete"
      title={`Delete ${items.length} item${items.length === 1 ? "" : "s"}?`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--text-primary)" }}>
        {sheetCount > 0 && (
          <>
            {sheetCount} worksheet{sheetCount === 1 ? "" : "s"} will be moved to Trash (restorable).
          </>
        )}
        {folderCount > 0 && (
          <>
            {" "}
            {folderCount} folder{folderCount === 1 ? "" : "s"} and their contents will be deleted; their
            worksheets move to Trash.
          </>
        )}
      </p>
      {error && (
        <p style={{ margin: "12px 0 0", font: "12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</p>
      )}
    </Dialog>
  );
}
