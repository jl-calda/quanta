"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Input } from "@/components/ds";
import { Field } from "./parts";

/** The worksheet canvas scroll container (see `Canvas`). */
function canvas(): HTMLElement | null {
  return typeof document === "undefined" ? null : document.querySelector<HTMLElement>(".ed-field");
}

/** The on-screen page-break separators rendered by `PageFrame`; one per boundary. */
function pageBreaks(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(".ed-page-break"));
}

/**
 * Go-to-page dialog (Func §7.22) — jump the worksheet canvas to a page. The
 * canvas renders a bounded multi-page sheet with real page-break separators, so
 * navigation lands precisely on the requested page's boundary (zoom-aware via
 * the rendered geometry) and closes.
 */
export function GoToPageDialog({ onClose }: { onClose: () => void }) {
  const [total, setTotal] = useState(1);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const el = canvas();
    if (el) setTotal(pageBreaks(el).length + 1);
  }, []);

  const go = (n: number) => {
    const el = canvas();
    if (!el) return;
    const breaks = pageBreaks(el);
    const target = Math.min(Math.max(1, n), breaks.length + 1);
    if (target <= 1) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // Scroll so the target page's break sits just under the field's top edge
      // (24px = the field's top padding).
      const brk = breaks[target - 2];
      const delta = brk.getBoundingClientRect().top - el.getBoundingClientRect().top;
      el.scrollTo({ top: el.scrollTop + delta - 24, behavior: "smooth" });
    }
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
