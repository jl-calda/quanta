/**
 * Confirmation controller — the pure state machine behind `useConfirm()`.
 *
 * One controller drives one mounted dialog: `confirm(options)` returns a promise
 * that resolves `true` on confirm and `false` on cancel/dismiss. Kept free of
 * React and the DOM so the resolve-once semantics are unit-tested directly. The
 * provider subscribes to render, and routes the dialog's buttons to `settle`.
 */
import type { ReactNode } from "react";

export interface ConfirmOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions render a red confirm button and a stronger default label. */
  destructive?: boolean;
}

export interface ResolvedConfirm {
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
}

/** Fill defaults; destructive requests default to a "Delete" verb when unset. */
export function normalizeConfirm(options: ConfirmOptions): ResolvedConfirm {
  return {
    title: options.title,
    body: options.body,
    confirmLabel: options.confirmLabel ?? (options.destructive ? "Delete" : "Confirm"),
    cancelLabel: options.cancelLabel ?? "Cancel",
    destructive: options.destructive ?? false,
  };
}

export type ConfirmListener = (state: ResolvedConfirm | null) => void;

export class ConfirmController {
  private resolver: ((value: boolean) => void) | null = null;
  private listener: ConfirmListener | null = null;

  /** The provider subscribes to receive the dialog state to render. */
  subscribe(listener: ConfirmListener): () => void {
    this.listener = listener;
    return () => {
      if (this.listener === listener) this.listener = null;
    };
  }

  /** Open a confirmation; resolves true on confirm, false on cancel/dismiss. */
  confirm(options: ConfirmOptions): Promise<boolean> {
    // Only one dialog at a time — cancel any in-flight request first.
    this.settle(false);
    this.listener?.(normalizeConfirm(options));
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /** Resolve the open request (idempotent) and clear the dialog. */
  settle(value: boolean): void {
    const resolve = this.resolver;
    if (!resolve) return;
    this.resolver = null;
    this.listener?.(null);
    resolve(value);
  }
}
