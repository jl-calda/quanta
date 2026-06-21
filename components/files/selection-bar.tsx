"use client";

import { MoveIcon, TagIcon, ExportIcon, TrashIcon, CloseIcon } from "./icons";

/**
 * Floating multi-select action bar (dark ink, pill). Move / Tag / Delete are
 * gated to editor+; Export is shown but disabled ("Coming soon"). Appears only
 * while a selection exists. Centered in the content area like the mockup.
 */
export function SelectionBar({
  count,
  canEdit,
  onMove,
  onTag,
  onDelete,
  onClear,
}: {
  count: number;
  canEdit: boolean;
  onMove: () => void;
  onTag: () => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="bar-in"
      style={{
        position: "fixed",
        left: "calc(50% + 116px)",
        transform: "translateX(-50%)",
        bottom: 26,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "7px 8px 7px 14px",
        background: "var(--ink)",
        borderRadius: 10,
        boxShadow: "var(--shadow-modal)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 9,
          font: "13px/1 var(--font-sans)",
          color: "var(--text-inverse)",
          paddingRight: 6,
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 22,
            height: 22,
            padding: "0 6px",
            borderRadius: 6,
            background: "var(--accent)",
            color: "#fff",
            font: "600 12px/1 var(--font-mono)",
          }}
        >
          {count}
        </span>
        selected
      </span>

      {canEdit && (
        <>
          <Divider />
          <BarButton label="Move" icon={<MoveIcon size={16} />} onClick={onMove} />
          <BarButton label="Tag" icon={<TagIcon size={16} />} onClick={onTag} />
        </>
      )}
      <BarButton label="Export" icon={<ExportIcon size={16} />} disabled title="Coming soon" />
      {canEdit && <BarButton label="Delete" icon={<TrashIcon size={16} />} danger onClick={onDelete} />}

      <Divider />
      <button
        type="button"
        aria-label="Clear selection"
        onClick={onClear}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 30,
          height: 30,
          border: "none",
          background: "transparent",
          borderRadius: 6,
          color: "var(--text-inverse)",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.12)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <CloseIcon size={17} />
      </button>
    </div>
  );
}

function Divider() {
  return <span style={{ width: 1, height: 22, background: "rgba(255,255,255,0.18)", margin: "0 4px" }} />;
}

function BarButton({
  label,
  icon,
  onClick,
  danger = false,
  disabled = false,
  title,
}: {
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
        height: 32,
        padding: "0 12px",
        borderRadius: "var(--radius-sm)",
        border: "none",
        background: "transparent",
        color: disabled ? "rgba(255,255,255,0.4)" : danger ? "#FF9B8F" : "var(--text-inverse)",
        font: "500 12.5px/1 var(--font-sans)",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {icon}
      {label}
    </button>
  );
}
