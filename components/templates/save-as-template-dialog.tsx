"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Input, Select } from "@/components/ds";
import { saveAsTemplate, updateTemplateVersion, detectTemplateFillIns } from "@/server/actions/templates";
import { parseTagsInput, type TemplateScope } from "@/lib/schema/templates";
import type { TemplateParam } from "@/lib/worksheet/content";
import type { TemplateOption, WorksheetOption } from "@/server/queries/templates";
import { PlusIcon } from "./icons";

const SCOPES: { value: TemplateScope; label: string }[] = [
  { value: "author", label: "Only me (author)" },
  { value: "workspace", label: "Workspace" },
  { value: "public", label: "Public" },
];

const PARAM_TYPES: { value: TemplateParam["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
];

type Mode = "new" | "update";

/**
 * "Save as template" (§4.4) + Phase-2 versioning. Turns one of the user's
 * worksheets into a new template, or — in "Update existing template" mode —
 * publishes a new revision of one the user already authored. Either way an
 * optional fill-in editor declares the `{{token}}` params engineers are prompted
 * for at create time (auto-detected from the worksheet when left empty).
 */
export function SaveAsTemplateDialog({
  workspaceId,
  worksheets,
  myTemplates,
}: {
  workspaceId: string;
  worksheets: WorksheetOption[];
  myTemplates: TemplateOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [detecting, startDetect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode] = useState<Mode>("new");
  const [worksheetId, setWorksheetId] = useState(worksheets[0]?.id ?? "");
  const [title, setTitle] = useState(worksheets[0]?.title ?? "");
  const [description, setDescription] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [standard, setStandard] = useState("");
  const [templateType, setTemplateType] = useState("");
  const [category, setCategory] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [scope, setScope] = useState<TemplateScope>("workspace");
  const [templateId, setTemplateId] = useState(myTemplates[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [params, setParams] = useState<TemplateParam[]>([]);

  const worksheetOptions = useMemo(
    () => worksheets.map((w) => ({ value: w.id, label: w.title })),
    [worksheets],
  );
  const templateOptions = useMemo(
    () => myTemplates.map((t) => ({ value: t.id, label: t.title })),
    [myTemplates],
  );

  function selectWorksheet(id: string) {
    setWorksheetId(id);
    const match = worksheets.find((w) => w.id === id);
    if (match && mode === "new") setTitle(match.title);
  }

  function detect() {
    if (!worksheetId) return;
    setError(null);
    startDetect(async () => {
      const result = await detectTemplateFillIns(worksheetId);
      if (result.ok) setParams(result.data);
      else setError(result.error);
    });
  }

  function addParam() {
    setParams((prev) => [...prev, { key: "", label: "", type: "text" }]);
  }
  function updateParam(i: number, patch: Partial<TemplateParam>) {
    setParams((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));
  }
  function removeParam(i: number) {
    setParams((prev) => prev.filter((_, idx) => idx !== i));
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  // Only keep fully-named params; an empty list tells the server to auto-detect.
  function cleanedParams(): TemplateParam[] | undefined {
    const valid = params
      .filter((p) => p.key.trim() !== "")
      .map((p) => ({
        ...p,
        key: p.key.trim(),
        label: p.label.trim() || p.key.trim(),
        default: p.default?.trim() || undefined,
        unit: p.unit?.trim() || undefined,
      }));
    return valid.length > 0 ? valid : undefined;
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const tags = parseTagsInput(tagsInput);
      const result =
        mode === "new"
          ? await saveAsTemplate({
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
              params: cleanedParams(),
            })
          : await updateTemplateVersion({
              templateId,
              worksheetId,
              note: note || undefined,
              params: cleanedParams(),
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
  const submitDisabled =
    pending ||
    noWorksheets ||
    !worksheetId ||
    (mode === "new" ? title.trim() === "" : !templateId);

  return (
    <>
      <Button variant="secondary" iconLeft={<PlusIcon size={15} />} onClick={() => setOpen(true)}>
        Save as template
      </Button>

      <Dialog
        open={open}
        eyebrow="Templates"
        title={mode === "new" ? "Save as template" : "Update existing template"}
        onClose={close}
        width={520}
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={submitDisabled}>
              {pending
                ? mode === "new"
                  ? "Saving…"
                  : "Publishing…"
                : mode === "new"
                  ? "Save template"
                  : "Publish update"}
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
            {myTemplates.length > 0 && (
              <Field label="Action">
                <Select
                  value={mode}
                  options={[
                    { value: "new", label: "Create a new template" },
                    { value: "update", label: "Update an existing template (new version)" },
                  ]}
                  onChange={(e) => setMode(e.target.value as Mode)}
                />
              </Field>
            )}

            {mode === "update" && (
              <Field label="Template to update">
                <Select
                  value={templateId}
                  options={templateOptions}
                  onChange={(e) => setTemplateId(e.target.value)}
                />
              </Field>
            )}

            <Field label={mode === "new" ? "Base it on" : "Publish from worksheet"}>
              <Select
                value={worksheetId}
                options={worksheetOptions}
                onChange={(e) => selectWorksheet(e.target.value)}
              />
            </Field>

            {mode === "new" ? (
              <>
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
              </>
            ) : (
              <Field label="What changed">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note for the version history (optional)"
                />
              </Field>
            )}

            <FillInsEditor
              params={params}
              detecting={detecting}
              onDetect={detect}
              onAdd={addParam}
              onUpdate={updateParam}
              onRemove={removeParam}
            />
            {error && (
              <p style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</p>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}

/** The light fill-in editor: declare/label/type the `{{token}}` params an author
 * marked in the worksheet. Empty → the server auto-detects on save. */
function FillInsEditor({
  params,
  detecting,
  onDetect,
  onAdd,
  onUpdate,
  onRemove,
}: {
  params: TemplateParam[];
  detecting: boolean;
  onDetect: () => void;
  onAdd: () => void;
  onUpdate: (i: number, patch: Partial<TemplateParam>) => void;
  onRemove: (i: number) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        paddingTop: 12,
        borderTop: "1px solid var(--border-hairline)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          style={{
            font: "600 11px/1 var(--font-sans)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            flex: 1,
          }}
        >
          Fill-ins
        </span>
        <Button variant="ghost" size="sm" onClick={onDetect} disabled={detecting}>
          {detecting ? "Detecting…" : "Detect from worksheet"}
        </Button>
        <Button variant="secondary" size="sm" onClick={onAdd}>
          Add fill-in
        </Button>
      </div>

      {params.length === 0 ? (
        <p style={{ font: "12px/1.45 var(--font-sans)", color: "var(--text-muted)", margin: 0 }}>
          Mark fill-ins by typing <code>{"{{name}}"}</code> in the worksheet (e.g. <code>L := {"{{span}}"}</code>),
          then detect them here — or leave this empty and they&apos;ll be detected automatically on save.
        </p>
      ) : (
        params.map((p, i) => (
          <div
            key={i}
            style={{
              border: "1px solid var(--border-hairline)",
              borderRadius: "var(--radius-sm)",
              padding: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
            }}
          >
            <MiniField label="Token key">
              <Input value={p.key} onChange={(e) => onUpdate(i, { key: e.target.value })} placeholder="span" mono />
            </MiniField>
            <MiniField label="Label">
              <Input value={p.label} onChange={(e) => onUpdate(i, { label: e.target.value })} placeholder="Span" />
            </MiniField>
            <MiniField label="Type">
              <Select
                value={p.type}
                options={PARAM_TYPES}
                onChange={(e) => onUpdate(i, { type: e.target.value as TemplateParam["type"] })}
              />
            </MiniField>
            <MiniField label="Unit">
              <Input value={p.unit ?? ""} onChange={(e) => onUpdate(i, { unit: e.target.value })} placeholder="mm" mono />
            </MiniField>
            <MiniField label="Default">
              <Input
                value={p.default ?? ""}
                onChange={(e) => onUpdate(i, { default: e.target.value })}
                placeholder="optional"
                mono
              />
            </MiniField>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end" }}>
              <Button variant="ghost" size="sm" onClick={() => onRemove(i)}>
                Remove
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>{label}</span>
      {children}
    </label>
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
