"use client";

import { useRef, type ReactNode, type RefObject } from "react";

/**
 * Two scroll panes with synchronized vertical scroll — older (left) / newer
 * (right) version side by side. A lock flag prevents the scroll handlers from
 * echoing each other into a loop.
 */
export function SyncPanes({ left, right }: { left: ReactNode; right: ReactNode }) {
  const lRef = useRef<HTMLDivElement>(null);
  const rRef = useRef<HTMLDivElement>(null);
  const lock = useRef(false);

  const sync =
    (src: RefObject<HTMLDivElement | null>, dst: RefObject<HTMLDivElement | null>) => () => {
      if (lock.current) {
        lock.current = false;
        return;
      }
      if (!src.current || !dst.current) return;
      lock.current = true;
      dst.current.scrollTop = src.current.scrollTop;
    };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
      <div
        ref={lRef}
        onScroll={sync(lRef, rRef)}
        className="scroll-y vh-field"
        style={{ flex: 1, minWidth: 0, padding: "22px 20px 60px", borderRight: "1px solid var(--border-strong)" }}
      >
        <PaneLabel tone="error">Older version</PaneLabel>
        {left}
      </div>
      <div
        ref={rRef}
        onScroll={sync(rRef, lRef)}
        className="scroll-y vh-field"
        style={{ flex: 1, minWidth: 0, padding: "22px 20px 60px" }}
      >
        <PaneLabel tone="pass">Newer version</PaneLabel>
        {right}
      </div>
    </div>
  );
}

function PaneLabel({ tone, children }: { tone: "pass" | "error"; children: ReactNode }) {
  const pass = tone === "pass";
  return (
    <div style={{ width: "100%", maxWidth: 560, margin: "0 auto 12px", display: "flex", justifyContent: "center" }}>
      <span
        style={{
          font: "10.5px/1 var(--font-sans)",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: pass ? "var(--status-pass)" : "var(--status-error)",
          background: pass ? "var(--status-pass-bg)" : "var(--status-error-bg)",
          borderRadius: 99,
          padding: "4px 12px",
        }}
      >
        {children}
      </span>
    </div>
  );
}
