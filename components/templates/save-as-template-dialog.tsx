"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Input, Select } from "@/components/ds";
import { saveAsTemplate } from "@/server/actions/templates";
import { parseTagsInput, type TemplateScope } from "@/lib/schema/templates";
import type { WorksheetOption } from "@/server/queries/templates";
import { PlusIcon } from "./icons";

const SCOPES: { value: TemplateScope; label: string }[] = [
  { value: "author", label: "Only me (author)" },
  { value: "workspace", label: "Workspace" },
  { value: "public", label: "Public" },
];

/**
 * "Save as template" (§4.4) — turns one of the user's worksheets into a reusable
 * template. Opens a dialog to pick the source sheet + metadata (discipline /
 * standard / type) and a visibility scope, then calls `saveAsTemplate` and routes
 * to the "Your templates" tab where the new authored row appears.
 */
export function SaveAsTemplateDialog({
  workspaceId,
  worksheets,
}: {
  workspaceId: string;
  worksheets: WorksheetOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [worksheetId, setWorksheetId] = useState(worksheets[0]?.id ?? "");
  const [title, setTitle] = useState(worksheets[0]?.title ?? "");
  const [description, setDescription] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [standard, setStandard] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [scope, setScope] = useState<TemplateScope>("workspace");

  const worksheetOptions = useMemo(
    () => worksheets.map((w) => ({ value: w.id, label: w.title })),
    [worksheets],
  );

  function selectWorksheet(id: string) {
    setWorksheetId(id);
    const match = worksheets.find((w) => w.id === id);
    if (match) setTitle(match.title);
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const tags = parseTagsInput(tagsInput);
      const result = await saveAsTemplate({
        workspaceId,
        worksheetId,
        title,
        description: description || undefined,
        discipline: discipline || undefined,
        standard: standard || undefined,
        templateType: templateType || undefined,
        category: category || undefined,
        tags: tags.length > 0 ? tags : undefined,
        scope,
      });
      if (result.ok) {
        close();
        router.push("/templates?tab=mine");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const noWorksheets = worksheets.length === 0;

  return (
    <>
      <Button variant="secondary" iconLeft={<PlusIcon size={15} />} onClick={() => setOpen(true)}>
        Save as template
      </Button>

      <Dialog
        open={open}
        eyebrow="Templates"
        title="Save as template"
        onClose={close}
        width={480}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={submit}
              disabled={pending || noWorksheets || !worksheetId || title.trim() === ""}
            >
              {pending ? "Saving…" : "Save template"}
            </Button>
          </>
        }
      >
        {noWorksheets ? (
          <p style={{ color: "var(--text-muted)" }}>
            You don&apos;t have any worksheets yet. Create one first, then save it as a template.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Base it on">
              <Select
                value={worksheetId}
                options={worksheetOptions}
                onChange={(e) => selectWorksheet(e.target.value)}
              />
            </Field>
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Template title" />
            </Field>
            <Field label="Description">
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this calculation does"
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Discipline">
                <Input value={discipline} onChange={(e) => setDiscipline(e.target.value)} placeholder="Structural" />
              </Field>
              <Field label="Standard">
                <Input value={standard} onChange={(e) => setStandard(e.target.value)} placeholder="Eurocode" />
              </Field>
              <Field label="Type">
                <Input
                  value={templateType}
                  onChange={(e) => setTemplateType(e.target.value)}
                  placeholder="Member check"
                />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Category">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Beams" />
              </Field>
              <Field label="Tags">
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="beam, steel, ULS"
                />
              </Field>
            </div>
            <Field label="Visibility">
              <Select value={scope} options={SCOPES} onChange={(e) => setScope(e.target.value as TemplateScope)} />
            </Field>
            {error && (
              <p style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</p>
            )}
          </div>
        )}
      </Dialog>
    </>
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
