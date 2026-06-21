"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { searchWorksheets, type SearchHit } from "@/server/actions/worksheet";
import { calcStatusMeta, relativeTime } from "./format";
import { SearchIcon } from "./icons";

/**
 * Global search (§4.2): debounced lookup across worksheet titles + tags, scoped
 * to the active workspace, surfaced in a results popover. ⌘K focuses the field.
 */
export function SearchBar({ workspaceId }: { workspaceId: string }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);

  // Debounced query → server action, guarding against out-of-order responses.
  useEffect(() => {
    const q = query.trim();
    if (q.length === 0) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const seq = ++seqRef.current;
    const timer = setTimeout(async () => {
      const result = await searchWorksheets(workspaceId, q);
      if (seq !== seqRef.current) return; // a newer keystroke superseded this one
      setHits(result.ok ? result.data : []);
      setLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  // ⌘K / Ctrl-K focuses the field; outside-click & Escape close the popover.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, []);

  const showPopover = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative mx-auto w-full max-w-[460px]">
      <span className="pointer-events-none absolute left-[11px] top-1/2 -translate-y-1/2 text-muted">
        <SearchIcon size={16} />
      </span>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search worksheets, templates, functions…"
        aria-label="Search"
        className="h-[38px] w-full rounded-sm border border-strong bg-raised pl-[34px] pr-12 text-[13.5px] text-ink outline-none transition-[border-color,box-shadow] duration-[var(--dur-fast)] placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_26%,transparent)]"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-hairline px-[5px] py-0.5 font-mono text-11 text-muted">
        ⌘K
      </span>

      {showPopover && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-md border border-hairline bg-raised p-1.5 shadow-[var(--shadow-popover)]">
          {loading && hits.length === 0 ? (
            <div className="px-3 py-2.5 text-[12.5px] text-muted">Searching…</div>
          ) : hits.length === 0 ? (
            <div className="px-3 py-2.5 text-[12.5px] text-muted">
              No worksheets match “{query.trim()}”.
            </div>
          ) : (
            hits.map((hit) => {
              const meta = calcStatusMeta(hit.calc_status);
              return (
                <Link
                  key={hit.id}
                  href={`/w/${hit.id}`}
                  className="flex items-center justify-between gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-hover"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-13 text-ink">
                      {hit.title}
                    </span>
                    <span className="block text-11 text-muted">
                      {relativeTime(hit.updated_at)}
                    </span>
                  </span>
                  <span
                    className="h-[7px] w-[7px] flex-none rounded-full"
                    style={{ background: `var(--status-${meta.tone})` }}
                    title={meta.label}
                  />
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
