"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Dialog, Input, Select } from "@/components/ds";
import type { ProjectSummary } from "@/server/queries/files";
import { buildTree, descendantIds, type ProjectNode } from "./format";

/** New-folder dialog — name a folder created inside the current folder. */
export function NewFolderDialog({
  open,
  onClose,
  onCreate,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    if (open) setName("");
  }, [open]);

  return (
    <Dialog
      open={open}
      eyebrow="Worksheets"
      title="New folder"
      onClose={onClose}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onCreate(name.trim())}
            disabled={pending || name.trim() === ""}
          >
            {pending ? "Creating…" : "Create folder"}
          </Button>
        </>
      }
    >
      <Field label="Folder name">
        <Input
          value={name}
          autoFocus
          placeholder="e.g. Anchors"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() !== "") onCreate(name.trim());
          }}
        />
      </Field>
      {error && <ErrorLine>{error}</ErrorLine>}
    </Dialog>
  );
}

/** Rename dialog — reused for both worksheets and folders. */
export function RenameDialog({
  open,
  onClose,
  initialName,
  label,
  onRename,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  initialName: string;
  label: string;
  onRename: (name: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [name, setName] = useState(initialName);
  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  return (
    <Dialog
      open={open}
      eyebrow="Rename"
      title={label}
      onClose={onClose}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onRename(name.trim())}
            disabled={pending || name.trim() === "" || name.trim() === initialName}
          >
            {pending ? "Saving…" : "Rename"}
          </Button>
        </>
      }
    >
      <Field label="Name">
        <Input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() !== "") onRename(name.trim());
          }}
        />
      </Field>
      {error && <ErrorLine>{error}</ErrorLine>}
    </Dialog>
  );
}

/** Flatten the tree to indented options, skipping any excluded subtree (so a
 * folder can't be moved into itself or a descendant). */
function moveOptions(
  projects: ProjectSummary[],
  excludeIds: string[],
): { value: string; label: string }[] {
  const excluded = new Set(excludeIds.flatMap((id) => descendantIds(projects, id)));
  const tree = buildTree(projects);
  const out: { value: string; label: string }[] = [{ value: "", label: "Workspace root" }];
  const walk = (nodes: ProjectNode[], depth: number) => {
    for (const n of nodes) {
      if (excluded.has(n.id)) continue;
      out.push({ value: n.id, label: `${"  ".repeat(depth)}${n.name}` });
      walk(n.children, depth + 1);
    }
  };
  walk(tree, 0);
  return out;
}

/** Move dialog — pick a destination folder for the selected item(s). */
export function MoveDialog({
  open,
  onClose,
  projects,
  excludeIds,
  count,
  onMove,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  projects: ProjectSummary[];
  excludeIds: string[];
  count: number;
  onMove: (targetId: string | null) => void;
  pending: boolean;
  error: string | null;
}) {
  const options = useMemo(
    () => moveOptions(projects, excludeIds),
    [projects, excludeIds],
  );
  const [target, setTarget] = useState("");
  useEffect(() => {
    if (open) setTarget("");
  }, [open]);

  return (
    <Dialog
      open={open}
      eyebrow="Move"
      title={count === 1 ? "Move to…" : `Move ${count} items to…`}
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onMove(target === "" ? null : target)}
            disabled={pending}
          >
            {pending ? "Moving…" : "Move here"}
          </Button>
        </>
      }
    >
      <Field label="Destination">
        <Select value={target} options={options} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      {error && <ErrorLine>{error}</ErrorLine>}
    </Dialog>
  );
}

/** Tag dialog — apply a workspace tag to the selected worksheet(s). */
export function TagDialog({
  open,
  onClose,
  tags,
  count,
  onApply,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  tags: { id: string; name: string }[];
  count: number;
  onApply: (tagId: string) => void;
  pending: boolean;
  error: string | null;
}) {
  const [tagId, setTagId] = useState(tags[0]?.id ?? "");
  useEffect(() => {
    if (open) setTagId(tags[0]?.id ?? "");
  }, [open, tags]);

  return (
    <Dialog
      open={open}
      eyebrow="Tag"
      title={count === 1 ? "Add a tag" : `Tag ${count} worksheets`}
      onClose={onClose}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onApply(tagId)} disabled={pending || !tagId}>
            {pending ? "Tagging…" : "Apply tag"}
          </Button>
        </>
      }
    >
      {tags.length === 0 ? (
        <p style={{ color: "var(--text-muted)" }}>
          This workspace has no tags yet. Add tags to a worksheet from its editor first.
        </p>
      ) : (
        <Field label="Tag">
          <Select
            value={tagId}
            options={tags.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(e) => setTagId(e.target.value)}
          />
        </Field>
      )}
      {error && <ErrorLine>{error}</ErrorLine>}
    </Dialog>
  );
}

/** Delete-folder confirm — names the cascade so it's never a surprise. */
export function DeleteFolderDialog({
  open,
  onClose,
  folderName,
  itemCount,
  onConfirm,
  pending,
  error,
}: {
  open: boolean;
  onClose: () => void;
  folderName: string;
  itemCount: number;
  onConfirm: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <Dialog
      open={open}
      eyebrow="Delete folder"
      title={`Delete “${folderName}”?`}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={pending}>
            {pending ? "Deleting…" : "Delete folder"}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, color: "var(--text-primary)" }}>
        {itemCount > 0 ? (
          <>
            This folder and its subfolders will be deleted, and{" "}
            <strong>
              {itemCount} worksheet{itemCount === 1 ? "" : "s"}
            </strong>{" "}
            inside will be moved to Trash. You can restore worksheets from Trash; the folders
            themselves can&apos;t be recovered.
          </>
        ) : (
          <>This folder and its subfolders will be deleted. They can&apos;t be recovered.</>
        )}
      </p>
      {error && <ErrorLine>{error}</ErrorLine>}
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        style={{
          font: "600 11px/1 var(--font-sans)",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "12px 0 0", font: "12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>
      {children}
    </p>
  );
}
