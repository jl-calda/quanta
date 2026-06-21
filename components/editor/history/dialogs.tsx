"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@/components/ds";
import { RestoreIcon } from "./icons";
import type { TimelineEntry } from "./types";

/** Name (or rename) a version. Submits the label up to the action. */
export function NameDialog({
  open,
  initialLabel,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialLabel: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (label: string) => void;
}) {
  const [label, setLabel] = useState(initialLabel);
  useEffect(() => {
    if (open) setLabel(initialLabel);
  }, [open, initialLabel]);

  return (
    <Dialog
      open={open}
      eyebrow="Version history"
      title="Name this version"
      width={440}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSubmit(label)} disabled={busy}>
            {busy ? "Saving…" : "Name version"}
          </Button>
        </>
      }
    >
      <p style={{ margin: "0 0 14px", font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        A named version is pinned in the timeline and easy to return to — e.g. an issue or a checkpoint.
      </p>
      <Input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Issued for construction — Rev C"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit(label);
        }}
      />
      {error && (
        <p style={{ margin: "12px 0 0", font: "12px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</p>
      )}
    </Dialog>
  );
}

/** Confirm restoring a version (snapshots the current draft first). */
export function RestoreDialog({
  entry,
  busy,
  error,
  onClose,
  onConfirm,
}: {
  entry: TimelineEntry | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog
      open={!!entry}
      eyebrow="Version history"
      title="Restore this version?"
      width={460}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" iconLeft={RestoreIcon(16)} onClick={onConfirm} disabled={busy}>
            {busy ? "Restoring…" : "Restore version"}
          </Button>
        </>
      }
    >
      {entry && (
        <p style={{ margin: 0, font: "13px/1.55 var(--font-sans)", color: "var(--text-muted)" }}>
          This makes{" "}
          <strong style={{ color: "var(--text-primary)" }}>
            {entry.label || entry.rel} · {entry.timeLabel}
          </strong>{" "}
          the current worksheet. Your present draft is kept in history, so nothing is lost.
        </p>
      )}
      {error && (
        <p style={{ margin: "12px 0 0", font: "12px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{error}</p>
      )}
    </Dialog>
  );
}
