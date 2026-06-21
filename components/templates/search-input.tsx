"use client";

import { useEffect, useRef, useState } from "react";
import { SearchIcon } from "./icons";

/**
 * Debounced search box — keeps its own value as you type and pushes the trimmed
 * query up after a short pause, so the server-rendered grid filters without a
 * round-trip per keystroke. Mirrors the export's search field styling.
 */
export function SearchInput({
  initialQuery = "",
  onSearch,
}: {
  initialQuery?: string;
  onSearch: (q: string) => void;
}) {
  const [value, setValue] = useState(initialQuery);
  const [focus, setFocus] = useState(false);
  // Hold the latest callback without retriggering the debounce effect.
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const last = useRef(initialQuery);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const next = value.trim();
      if (next !== last.current) {
        last.current = next;
        onSearchRef.current(next);
      }
    }, 280);
    return () => window.clearTimeout(id);
  }, [value]);

  return (
    <div style={{ position: "relative", width: 320 }}>
      <span
        style={{
          position: "absolute",
          left: 11,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-muted)",
          pointerEvents: "none",
          display: "inline-flex",
        }}
      >
        <SearchIcon size={16} />
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        placeholder="Search templates…"
        aria-label="Search templates"
        style={{
          width: "100%",
          height: 38,
          padding: "0 12px 0 34px",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${focus ? "var(--accent)" : "var(--border-strong)"}`,
          background: "var(--surface-raised)",
          font: "13.5px/1 var(--font-sans)",
          color: "var(--text-primary)",
          outline: "none",
          boxShadow: focus ? "0 0 0 2px color-mix(in srgb, var(--accent) 26%, transparent)" : "none",
          transition: "border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out)",
        }}
      />
    </div>
  );
}
