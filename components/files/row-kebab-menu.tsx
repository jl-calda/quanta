"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ds";
import {
  KebabIcon,
  OpenIcon,
  RenameIcon,
  MoveIcon,
  DuplicateIcon,
  ShareIcon,
  HistoryIcon,
  ExportIcon,
  TrashIcon,
} from "./icons";

type MenuItem = {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
};

/**
 * Per-row actions menu. Items are role-gated: editors get Open / Rename /
 * Move / Duplicate (worksheets) and the destructive trash/delete action; the
 * not-yet-built Share / Version history / Export are shown disabled ("Coming
 * soon"). Viewers get Open + Export only.
 */
export function RowKebabMenu({
  kind,
  canEdit,
  size = "sm",
  iconSize = 17,
  onOpen,
  onRename,
  onMove,
  onDuplicate,
  onDelete,
}: {
  kind: "folder" | "sheet";
  canEdit: boolean;
  size?: "sm" | "md";
  iconSize?: number;
  onOpen: () => void;
  onRename: () => void;
  onMove: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const h = (ev: MouseEvent) => {
      if (ref.current && !ref.current.contains(ev.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const fire = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const groups: MenuItem[][] = [];
  const editGroup: MenuItem[] = [{ label: "Open", icon: <OpenIcon size={16} />, onClick: fire(onOpen) }];
  if (canEdit) {
    editGroup.push({ label: "Rename", icon: <RenameIcon size={16} />, onClick: fire(onRename) });
    editGroup.push({ label: "Move to…", icon: <MoveIcon size={16} />, onClick: fire(onMove) });
    if (kind === "sheet") {
      editGroup.push({ label: "Duplicate", icon: <DuplicateIcon size={16} />, onClick: fire(onDuplicate) });
    }
  }
  groups.push(editGroup);

  const comingSoon: MenuItem[] = [];
  if (kind === "sheet") {
    comingSoon.push({ label: "Share", icon: <ShareIcon size={16} />, disabled: true, title: "Coming soon" });
    comingSoon.push({ label: "Version history", icon: <HistoryIcon size={16} />, disabled: true, title: "Coming soon" });
  }
  comingSoon.push({ label: "Export", icon: <ExportIcon size={16} />, disabled: true, title: "Coming soon" });
  groups.push(comingSoon);

  if (canEdit) {
    groups.push([
      {
        label: kind === "folder" ? "Delete folder" : "Move to trash",
        icon: <TrashIcon size={16} />,
        onClick: fire(onDelete),
        danger: true,
      },
    ]);
  }

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex" }} onClick={(e) => e.stopPropagation()}>
      <IconButton
        label="Actions"
        size={size}
        active={open}
        onClick={() => setOpen((o) => !o)}
      >
        <KebabIcon size={iconSize} />
      </IconButton>
      {open && (
        <div
          className="pop-in"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            width: 196,
            zIndex: 50,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-popover)",
            padding: 5,
          }}
        >
          {groups.map((group, gi) => (
            <div
              key={gi}
              style={{
                borderTop: gi ? "1px solid var(--border-hairline)" : "none",
                marginTop: gi ? 4 : 0,
                paddingTop: gi ? 4 : 0,
              }}
            >
              {group.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  title={item.title}
                  disabled={item.disabled}
                  onClick={item.onClick}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "7px 9px",
                    border: "none",
                    background: "transparent",
                    borderRadius: "var(--radius-sm)",
                    cursor: item.disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    color: item.disabled
                      ? "var(--text-muted)"
                      : item.danger
                        ? "var(--status-error)"
                        : "var(--text-primary)",
                    font: "12.5px/1 var(--font-sans)",
                    opacity: item.disabled ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (item.disabled) return;
                    e.currentTarget.style.background = item.danger
                      ? "var(--status-error-bg)"
                      : "var(--surface-hover)";
                  }}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      color: item.danger ? "var(--status-error)" : "var(--text-muted)",
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </span>
  );
}
