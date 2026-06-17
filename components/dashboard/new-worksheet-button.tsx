"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorksheet } from "@/server/actions/worksheet";
import { PlusIcon, ChevronDownIcon, BlankIcon, TemplateIcon, ImportIcon } from "./icons";

/**
 * "New worksheet" split-button (§4.2). The primary action opens a blank sheet;
 * the dropdown offers blank / from-template / import. Disabled when the member's
 * role can't create worksheets (RLS would otherwise reject the insert).
 */
export function NewWorksheetButton({
  workspaceId,
  canCreate,
}: {
  workspaceId: string;
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function createBlank() {
    setOpen(false);
    setError(null);
    startTransition(async () => {
      const result = await createWorksheet({ workspaceId });
      if (result.ok) router.push(`/w/${result.data.id}`);
      else setError(result.error);
    });
  }

  function fromTemplate() {
    setOpen(false);
    document
      .getElementById("templates")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const disabled = !canCreate || pending;
  const disabledTitle = canCreate
    ? undefined
    : "Ask an admin for engineer access to create worksheets.";

  return (
    <div ref={ref} className="relative flex-none">
      <div className="inline-flex h-[38px] overflow-hidden rounded-sm shadow-[var(--shadow-sm)]">
        <button
          type="button"
          onClick={createBlank}
          disabled={disabled}
          title={disabledTitle}
          className="inline-flex h-full items-center gap-[7px] border-none bg-accent px-3.5 text-13 font-medium text-inverse transition-colors duration-[var(--dur-fast)] hover:bg-accent-press disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
        >
          <PlusIcon size={17} />
          New worksheet
        </button>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          disabled={disabled}
          aria-label="More new options"
          aria-haspopup="menu"
          aria-expanded={open}
          title={disabledTitle}
          className="inline-flex h-full w-8 items-center justify-center border-0 border-l border-l-white/20 bg-accent text-inverse transition-colors duration-[var(--dur-fast)] hover:bg-accent-press disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-accent"
        >
          <span
            className="transition-transform duration-[var(--dur-fast)]"
            style={{ transform: open ? "rotate(180deg)" : "none" }}
          >
            <ChevronDownIcon size={16} />
          </span>
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[268px] rounded-md border border-hairline bg-raised p-1.5 shadow-[var(--shadow-popover)]"
        >
          <MenuRow
            icon={<BlankIcon size={18} />}
            label="Blank worksheet"
            sub="Start from an empty page"
            onClick={createBlank}
          />
          <MenuRow
            icon={<TemplateIcon size={18} />}
            label="From template"
            sub="Pick a pre-built calc"
            onClick={fromTemplate}
          />
          <MenuRow
            icon={<ImportIcon size={18} />}
            label="Import .xlsx / Mathcad"
            sub="Coming soon"
            disabled
          />
        </div>
      )}

      {error && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[268px] rounded-md border border-hairline bg-raised p-3 text-12 text-error shadow-[var(--shadow-popover)]">
          {error}
        </div>
      )}
    </div>
  );
}

function MenuRow({
  icon,
  label,
  sub,
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-[11px] rounded-sm px-2.5 py-2 text-left transition-colors duration-[var(--dur-fast)] hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
    >
      <span className="inline-flex flex-none text-muted">{icon}</span>
      <span>
        <span className="block text-13 font-medium text-ink">{label}</span>
        <span className="block text-[11.5px] text-muted">{sub}</span>
      </span>
    </button>
  );
}
