"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, ChevronDownIcon, SheetIcon, FolderIcon, TemplateIcon } from "./icons";

/**
 * Split "New" button — primary action creates a worksheet; the caret opens a
 * menu for New folder and "From template" (which routes to the gallery). Matches
 * the mockup's split control. Hidden entirely for read-only roles.
 */
export function NewButton({
  onNewWorksheet,
  onNewFolder,
  pending,
}: {
  onNewWorksheet: () => void;
  onNewFolder: () => void;
  pending: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const items: [string, React.ReactNode, () => void][] = [
    ["Worksheet", <SheetIcon key="s" size={16} />, onNewWorksheet],
    ["Folder", <FolderIcon key="f" size={16} />, onNewFolder],
    ["From template", <TemplateIcon key="t" size={16} />, () => router.push("/templates")],
  ];

  const accentBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    background: "var(--accent)",
    color: "var(--text-inverse)",
    border: "none",
    font: "500 13px/1 var(--font-sans)",
    cursor: pending ? "wait" : "pointer",
  };

  return (
    <div ref={ref} style={{ position: "relative", flex: "0 0 auto" }}>
      <div
        style={{
          display: "inline-flex",
          height: 36,
          borderRadius: "var(--radius-sm)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <button
          type="button"
          onClick={onNewWorksheet}
          disabled={pending}
          style={{ ...accentBtn, padding: "0 13px" }}
        >
          <PlusIcon size={16} />
          New
        </button>
        <button
          type="button"
          aria-label="More new options"
          onClick={() => setOpen((o) => !o)}
          style={{ ...accentBtn, width: 30, borderLeft: "1px solid rgba(255,255,255,0.22)" }}
        >
          <span
            style={{
              display: "inline-flex",
              transform: open ? "rotate(180deg)" : "none",
              transition: "transform var(--dur-fast)",
            }}
          >
            <ChevronDownIcon size={15} />
          </span>
        </button>
      </div>
      {open && (
        <div
          className="pop-in"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 188,
            zIndex: 50,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-popover)",
            padding: 5,
          }}
        >
          {items.map(([label, icon, onClick]) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                setOpen(false);
                onClick();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                width: "100%",
                padding: "8px 9px",
                border: "none",
                background: "transparent",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--text-primary)",
                font: "13px/1 var(--font-sans)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
