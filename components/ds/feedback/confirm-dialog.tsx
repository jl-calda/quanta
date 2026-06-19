"use client";

import type { ReactNode } from "react";
import { Button } from "../core/button";
import { Dialog } from "./dialog";

/**
 * ConfirmDialog — the single confirmation surface, built on the DS `Dialog`.
 * Destructive actions render a red confirm button. Driven entirely by props so
 * the `ConfirmProvider` owns all state; never used directly — call `useConfirm()`.
 */
export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      width={420}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {typeof body === "string" ? (
        <p style={{ margin: 0, color: "var(--text-secondary, var(--text-muted))" }}>{body}</p>
      ) : (
        body
      )}
    </Dialog>
  );
}
