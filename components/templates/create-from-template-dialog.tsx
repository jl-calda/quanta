"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Dialog, Input } from "@/components/ds";
import type { TemplateParam } from "@/lib/worksheet/content";
import { createWorksheet } from "@/server/actions/worksheet";

/**
 * Fill-ins dialog (Phase-2 parameterized create). When a template declares fill-in
 * params (`{{tokens}}` the author marked), "Use template" opens this instead of
 * creating directly: it prompts for each value, then calls `createWorksheet` with
 * the `fillIns` map so the server substitutes them into the new worksheet. A param
 * with a default may be left blank (the default is used); one without a default is
 * required (a blank would otherwise leave the raw token in a formula).
 */
export function CreateFromTemplateDialog({
  open,
  onClose,
  workspaceId,
  templateId,
  templateTitle,
  params,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
  templateId: string;
  templateTitle: string;
  params: TemplateParam[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(params.map((p) => [p.key, p.default ?? ""])),
  );

  function setValue(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  // Required = no value supplied and no default to fall back to.
  const incomplete = params.some((p) => (values[p.key] ?? "").trim() === "" && !p.default);

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createWorksheet({ workspaceId, templateId, fillIns: values });
      if (result.ok) {
        onClose();
        router.push(`/w/${result.data.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      eyebrow="Use template"
      title={templateTitle}
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={pending || incomplete}>
            {pending ? "Creating…" : "Create worksheet"}
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ color: "var(--text-muted)", margin: "-2px 0 0" }}>
          Fill in the values for this template, then create your worksheet.
        </p>
        {params.map((p) => (
          <Field key={p.key} label={p.label || p.key} help={p.help}>
            <Input
              value={values[p.key] ?? ""}
              onChange={(e) => setValue(p.key, e.target.value)}
              placeholder={p.default ? `Default: ${p.default}` : `Enter ${p.label || p.key}`}
              suffix={p.unit}
              mono={p.type === "number"}
              inputMode={p.type === "number" ? "decimal" : undefined}
            />
          </Field>
        ))}
        {error && (
          <p style={{ font: "12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</p>
        )}
      </div>
    </Dialog>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
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
      {help && <span style={{ font: "12px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{help}</span>}
    </label>
  );
}
