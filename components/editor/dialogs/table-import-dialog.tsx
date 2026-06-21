"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Dialog, Switch } from "@/components/ds";
import { buildTableImport, parseDelimited, toDelimited } from "@/lib/calc";
import { xlsxToGrid } from "@/lib/import/xlsx";
import { findRegion } from "@/lib/worksheet/flatten";
import type { TableRegion } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import { useConfirm } from "@/components/shared/confirm-provider";
import { Field, Section } from "./parts";

/**
 * Import-data dialog (Phase 2) — paste from Excel/Sheets or upload a `.csv`/`.xlsx`,
 * with a "first row is header" toggle and a LIVE preview of the inferred columns and
 * per-column units. Nothing is written until the user confirms (preview =
 * confirmation); a destructive replace of a non-empty grid routes through the shared
 * `useConfirm()`. The parsed result lands as normal table-region content and is
 * persisted by the existing autosave Server Action — no engine or schema change.
 */
export function TableImportDialog({ regionId, onClose }: { regionId: string | null; onClose: () => void }) {
  const { state, dispatch, canEdit } = useEditor();
  const confirm = useConfirm();
  const targetId = regionId ?? state.selectedId;
  const region = targetId ? findRegion(state.content, targetId) : undefined;
  const table = region?.type === "table" ? (region as TableRegion) : undefined;

  const [text, setText] = useState("");
  const [hasHeader, setHasHeader] = useState(true);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Derive the grid + inferred shape from the current text on every keystroke, so
  // the preview the user sees is exactly what import commits.
  const preview = useMemo(() => {
    const grid = parseDelimited(text);
    return buildTableImport(grid, { hasHeader });
  }, [text, hasHeader]);

  const targetHasData = !!table?.rows.some((row) => row.some((cell) => cell.trim() !== ""));
  const hasParsed = preview.columns.length > 0 && (preview.rows.length > 0 || hasHeader);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        const grid = await xlsxToGrid(await file.arrayBuffer());
        // Normalize the workbook into the same delimited text everything flows through.
        setText(toDelimited(grid, "\t"));
      } else {
        setText(await file.text());
      }
      setFileNote(`Loaded ${file.name}`);
    } catch {
      setError(`We couldn't read ${file.name}. Check it's a .csv or .xlsx file and try again.`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const doImport = async () => {
    if (!table || !canEdit || !hasParsed) return;
    if (mode === "replace" && targetHasData) {
      const ok = await confirm({
        title: "Replace table contents?",
        body: "This replaces the table's current columns and rows with the imported data.",
        destructive: true,
        confirmLabel: "Replace",
      });
      if (!ok) return;
    }
    dispatch({
      type: "IMPORT_TABLE_DATA",
      id: table.id,
      mode,
      columns: mode === "replace" ? preview.columns : undefined,
      rows: preview.rows,
    });
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Table"
      title="Import data"
      width={620}
      onClose={onClose}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={doImport} disabled={!canEdit || !table || !hasParsed}>
            Import data
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Field
          label="Paste from Excel or CSV"
          hint="Tab- or comma-separated values. Units in a column header — like “Force (kN)” or “Length [mm]” — are detected automatically."
        >
          <textarea
            value={text}
            spellCheck={false}
            placeholder={"Member, Axial force (kN), Length [mm]\nC1, 120, 3000\nC2, 95.5, 2750"}
            onChange={(e) => {
              setText(e.target.value);
              setFileNote(null);
              setError(null);
            }}
            style={{
              width: "100%",
              minHeight: 120,
              resize: "vertical",
              padding: "8px 10px",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              background: "var(--surface-raised)",
              color: "var(--text-primary)",
              font: "12.5px/1.5 var(--font-mono)",
              outline: "none",
            }}
          />
        </Field>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls"
            onChange={(e) => void onFile(e.target.files?.[0])}
            style={{ display: "none" }}
          />
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            Choose file…
          </Button>
          {fileNote && (
            <span style={{ font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>{fileNote}</span>
          )}
          <Switch
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
            label="First row is header"
            style={{ marginLeft: "auto" }}
          />
        </div>

        {error && (
          <div style={{ font: "12px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</div>
        )}

        {targetHasData && (
          <Section eyebrow="This table already has data">
            <div style={{ display: "flex", gap: 6 }}>
              <ModeButton on={mode === "replace"} onClick={() => setMode("replace")}>
                Replace
              </ModeButton>
              <ModeButton on={mode === "append"} onClick={() => setMode("append")}>
                Append rows
              </ModeButton>
            </div>
          </Section>
        )}

        <Section eyebrow="Preview">
          {hasParsed ? (
            <ImportPreview columns={preview.columns} rows={preview.rows} />
          ) : (
            <div style={{ font: "12px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
              Paste rows or choose a file to see the columns and inferred units.
            </div>
          )}
        </Section>
      </div>
    </Dialog>
  );
}

function ModeButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 28,
        border: "1px solid " + (on ? "var(--accent)" : "var(--border-strong)"),
        background: on ? "var(--accent-tint)" : "var(--surface-raised)",
        color: on ? "var(--accent-press)" : "var(--text-primary)",
        font: "500 12px/1 var(--font-sans)",
        borderRadius: "var(--radius-sm)",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

function ImportPreview({
  columns,
  rows,
}: {
  columns: { label: string; unit?: string }[];
  rows: string[][];
}) {
  const shown = rows.slice(0, 5);
  return (
    <div style={{ border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)", overflow: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ borderBottom: "1.5px solid var(--text-primary)" }}>
            {columns.map((col, c) => (
              <th
                key={c}
                style={{
                  padding: "5px 10px",
                  textAlign: col.unit ? "right" : "left",
                  font: "600 11px/1.3 var(--font-sans)",
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                }}
              >
                {col.label}
                {col.unit && (
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}> [{col.unit}]</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((row, r) => (
            <tr key={r} style={{ borderTop: r ? "1px solid var(--border-hairline)" : "none" }}>
              {columns.map((col, c) => (
                <td
                  key={c}
                  style={{
                    padding: "4px 10px",
                    textAlign: col.unit ? "right" : "left",
                    font: `12px/1.3 ${col.unit ? "var(--font-mono)" : "var(--font-sans)"}`,
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row[c] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > shown.length && (
        <div
          style={{
            padding: "5px 10px",
            font: "11px/1 var(--font-sans)",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border-hairline)",
          }}
        >
          + {rows.length - shown.length} more {rows.length - shown.length === 1 ? "row" : "rows"}
        </div>
      )}
    </div>
  );
}
