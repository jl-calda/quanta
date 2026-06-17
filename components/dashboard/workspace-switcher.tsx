"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchWorkspace } from "@/server/actions/workspace";
import { initials } from "./format";
import { ChevronDownIcon } from "./icons";

export interface WorkspaceOption {
  id: string;
  name: string;
}

/**
 * Bottom-of-rail workspace card. Opens a popover of the user's workspaces;
 * selecting one records it on the profile (`switchWorkspace`) and refreshes so
 * every Server Component re-scopes to the new tenant.
 */
export function WorkspaceSwitcher({
  current,
  workspaces,
  subtitle,
}: {
  current: WorkspaceOption;
  workspaces: WorkspaceOption[];
  subtitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(id: string) {
    setOpen(false);
    if (id === current.id) return;
    startTransition(async () => {
      const result = await switchWorkspace(id);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex w-full items-center gap-[9px] rounded-sm border border-hairline bg-raised px-2 py-[7px] text-left transition-colors duration-[var(--dur-fast)] hover:bg-hover"
      >
        <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded text-11 font-semibold text-inverse" style={{ background: "var(--text-primary)" }}>
          {initials(current.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-12 font-semibold text-ink">
            {current.name}
          </span>
          <span className="block text-11 text-muted">{subtitle}</span>
        </span>
        <span className="text-muted">
          <ChevronDownIcon size={15} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-md border border-hairline bg-raised p-1.5 shadow-[var(--shadow-popover)]"
        >
          <div className="px-2 py-1 text-11 font-semibold uppercase tracking-[0.08em] text-muted">
            Switch workspace
          </div>
          {workspaces.map((ws) => {
            const isCurrent = ws.id === current.id;
            return (
              <button
                key={ws.id}
                type="button"
                role="menuitem"
                onClick={() => select(ws.id)}
                className={[
                  "flex w-full items-center gap-[9px] rounded-sm px-2 py-[7px] text-left transition-colors duration-[var(--dur-fast)]",
                  isCurrent ? "bg-accent-tint" : "hover:bg-hover",
                ].join(" ")}
              >
                <span className="inline-flex h-[22px] w-[22px] flex-none items-center justify-center rounded text-11 font-semibold text-inverse" style={{ background: "var(--text-primary)" }}>
                  {initials(ws.name)}
                </span>
                <span
                  className={[
                    "min-w-0 flex-1 truncate text-12",
                    isCurrent ? "font-semibold text-accent" : "text-ink",
                  ].join(" ")}
                >
                  {ws.name}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
