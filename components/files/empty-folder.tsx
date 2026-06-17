"use client";

import { Button } from "@/components/ds";
import { FolderOpenIcon, PlusIcon, ExportIcon } from "./icons";

/**
 * Empty-folder state (§4.5). One primary action ("New worksheet"); "Import a
 * file" is shown disabled ("Coming soon"). Read-only roles see the explanatory
 * copy without the create action.
 */
export function EmptyFolder({
  canCreate,
  filtered,
  onNewWorksheet,
}: {
  canCreate: boolean;
  filtered: boolean;
  onNewWorksheet: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "90px 0",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-hairline)",
          background: "var(--surface-raised)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent)",
          marginBottom: 18,
        }}
      >
        <FolderOpenIcon size={28} />
      </div>
      <h3 style={{ margin: "0 0 7px", font: "600 16px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>
        {filtered ? "Nothing matches those filters" : "This folder is empty"}
      </h3>
      <p
        style={{
          margin: "0 auto 20px",
          maxWidth: 340,
          font: "13px/1.55 var(--font-sans)",
          color: "var(--text-muted)",
        }}
      >
        {filtered
          ? "Try clearing the search or a filter to widen the results."
          : canCreate
            ? "Create a worksheet here, or import an existing .xlsx or Mathcad file to get started."
            : "No worksheets here yet. Ask an editor to add one."}
      </p>
      {!filtered && canCreate && (
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="primary" iconLeft={<PlusIcon size={16} />} onClick={onNewWorksheet}>
            New worksheet
          </Button>
          <Button variant="secondary" iconLeft={<ExportIcon size={16} />} disabled title="Coming soon">
            Import a file
          </Button>
        </div>
      )}
    </div>
  );
}
