"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@/components/ds";
import { Field } from "./parts";

/** The worksheet canvas scroll container (see `Canvas`). */
function canvas(): HTMLElement | null {
  return typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ed-field");
}

/** Estimate the page count from the scroll height, a viewport ≈ a page. */
function pageCount(el: HTMLElement): number {
  return Math.max(1, Math.ceil(el.scrollHeight / Math.max(el.clientHeight, 1)));
}

/**
 * Go-to-page dialog (Func §7.22) — jump the worksheet canvas to a page. The
 * editor renders one continuous page, so navigation is proportional (a viewport
 * ≈ a page); it scrolls smoothly to the requested page and closes.
 */
export function GoToPageDialog({ onClose }: { onClose: () => void }) {
  const [total, setTotal] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const el = canvas();
    if (el) setTotal(pageCount(el));
  }, []);

  const go = (n: number) => {
    const el = canvas();
    if (!el) return;
    const target = Math.min(Math.max(1, n), pageCount(el));
    el.scrollTo({ top: (target - 1) * el.clientHeight, behavior: "smooth" });
    onClose();
  };

  return (
    <Dialog
      open
      eyebrow="Navigate"
      title="Go to page"
      width={360}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => go(page)}>Go</Button>
        </>
      }
    >
      <Field label={`Page (1–${total})`}>
        <Input
          autoFocus
          type="number"
          value={String(page)}
          onChange={(e) => setPage(Number(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") go(page);
          }}
        />
      </Field>
    </Dialog>
  );
}
