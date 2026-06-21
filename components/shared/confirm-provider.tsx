"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/ds/feedback/confirm-dialog";
import {
  ConfirmController,
  type ConfirmOptions,
  type ResolvedConfirm,
} from "./confirm-controller";

/**
 * ConfirmProvider — mounts the one confirmation dialog and exposes the typed
 * `confirm()` API. Every destructive action (delete / trash / discard /
 * overwrite) routes through `useConfirm()` so confirmations are never
 * hand-rolled per call. Mounted high in the app tree (the app layout).
 */
type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef<ConfirmController | null>(null);
  if (!controllerRef.current) controllerRef.current = new ConfirmController();

  const [dialog, setDialog] = useState<ResolvedConfirm | null>(null);

  useEffect(() => controllerRef.current!.subscribe(setDialog), []);

  const confirm = useCallback<ConfirmFn>((options) => controllerRef.current!.confirm(options), []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        body={dialog?.body}
        confirmLabel={dialog?.confirmLabel ?? "Confirm"}
        cancelLabel={dialog?.cancelLabel ?? "Cancel"}
        destructive={dialog?.destructive}
        onConfirm={() => controllerRef.current!.settle(true)}
        onCancel={() => controllerRef.current!.settle(false)}
      />
    </ConfirmContext.Provider>
  );
}
