"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Toast, type ToastTone } from "@/components/ds";

/**
 * A lightweight toast stack for the file browser. The DS `Toast` is purely
 * presentational (it asks to be hosted in your own stack), so this provider owns
 * the queue, auto-dismiss, and a fixed bottom-right positioner. Mutations call
 * `useToast().push(...)` to confirm or report failures in the app's voice.
 */

type ToastItem = {
  id: number;
  tone: ToastTone;
  title: ReactNode;
  description?: ReactNode;
};

type PushArgs = {
  tone?: ToastTone;
  title: ReactNode;
  description?: ReactNode;
};

const ToastContext = createContext<{ push: (t: PushArgs) => void } | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastHost>");
  return ctx;
}

export function ToastHost({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    ({ tone = "success", title, description }: PushArgs) => {
      const id = nextId.current++;
      setItems((prev) => [...prev, { id, tone, title, description }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 24,
          bottom: 24,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "none",
        }}
      >
        {items.map((t) => (
          <div key={t.id} style={{ pointerEvents: "auto" }} className="pop-in">
            <Toast
              tone={t.tone}
              title={t.title}
              description={t.description}
              onDismiss={() => dismiss(t.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
