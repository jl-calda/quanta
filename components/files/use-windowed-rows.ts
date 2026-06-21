"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Minimal fixed-row-height windowing for the list view (§4.5 "virtualize large
 * lists"). Rows are uniform height, so we render only the slice in view (plus an
 * overscan) and pad with top/bottom spacers. Zero dependencies — windowing only
 * kicks in above a threshold; below it the caller renders every row so small
 * folders stay simple and fully keyboard-accessible.
 */

export interface WindowedRows {
  /** Inclusive start index of the rows to render. */
  start: number;
  /** Exclusive end index of the rows to render. */
  end: number;
  /** Spacer heights (px) to preserve scroll geometry. */
  padTop: number;
  padBottom: number;
  /** Attach to the scrolling container. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function useWindowedRows({
  count,
  rowHeight,
  overscan = 8,
  enabled = true,
}: {
  count: number;
  rowHeight: number;
  overscan?: number;
  enabled?: boolean;
}): WindowedRows {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState({ start: 0, end: count });

  useEffect(() => {
    if (!enabled) {
      setRange({ start: 0, end: count });
      return;
    }
    const el = scrollRef.current;
    if (!el) return;

    const recompute = () => {
      const { scrollTop, clientHeight } = el;
      const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
      const visible = Math.ceil(clientHeight / rowHeight);
      const end = Math.min(count, start + visible + overscan * 2);
      setRange((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
    };

    recompute();
    el.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    return () => {
      el.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [count, rowHeight, overscan, enabled]);

  if (!enabled) {
    return { start: 0, end: count, padTop: 0, padBottom: 0, scrollRef };
  }
  const start = Math.min(range.start, Math.max(0, count));
  const end = Math.min(range.end, count);
  return {
    start,
    end,
    padTop: start * rowHeight,
    padBottom: Math.max(0, (count - end) * rowHeight),
    scrollRef,
  };
}
