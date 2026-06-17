"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "@/server/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { DensityToggle } from "@/components/density-toggle";
import { initials } from "./format";
import { SettingsIcon } from "./icons";

/**
 * Bottom-of-rail user card. Opens a popover that hosts the display-preference
 * toggles (theme + density — which the dashboard's own top bar no longer
 * carries) and the sign-out action.
 */
export function UserMenu({
  name,
  email,
}: {
  name: string;
  email: string | null;
}) {
  const [open, setOpen] = useState(false);
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account and preferences"
        className="flex w-full items-center gap-[9px] rounded-sm px-2 py-1 text-left transition-colors duration-[var(--dur-fast)] hover:bg-hover"
      >
        <span className="inline-flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full text-11 font-semibold text-inverse" style={{ background: "var(--accent)" }}>
          {initials(name)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
          {name}
        </span>
        <span className="inline-flex text-muted">
          <SettingsIcon size={17} />
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-md border border-hairline bg-raised p-3 shadow-[var(--shadow-popover)]"
        >
          <div className="mb-2 min-w-0">
            <div className="truncate text-13 font-semibold text-ink">{name}</div>
            {email && <div className="truncate text-11 text-muted">{email}</div>}
          </div>

          <div className="my-2 h-px bg-hairline" />

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-12 text-muted">Theme</span>
              <ThemeToggle />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-12 text-muted">Density</span>
              <DensityToggle />
            </div>
          </div>

          <div className="my-2 h-px bg-hairline" />

          <form action={signOut}>
            <button
              type="submit"
              className="w-full rounded-sm px-2 py-1.5 text-left text-13 text-ink transition-colors duration-[var(--dur-fast)] hover:bg-hover"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
