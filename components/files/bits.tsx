import { Badge } from "@/components/ds";
import type { CalcStatus } from "@/lib/supabase/types";
import { ownerColor, ownerInitials } from "./format";
import { FolderIcon, SheetIcon } from "./icons";

/**
 * Small presentational atoms shared by the list and grid views — owner avatar,
 * calc-status chip, tag chip, and the folder/sheet type icon. Pure render, no
 * client state, ported from the mockup's inline helpers.
 */

export function Avatar({
  name,
  avatarUrl,
  size = 22,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        style={{ borderRadius: "50%", objectFit: "cover", flex: "0 0 auto" }}
      />
    );
  }
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ownerColor(name),
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: `600 ${size * 0.4}px/1 var(--font-sans)`,
        flex: "0 0 auto",
      }}
    >
      {ownerInitials(name)}
    </span>
  );
}

export function StatusChip({ status }: { status: CalcStatus }) {
  if (status === "current") return <Badge tone="pass" dot>Current</Badge>;
  if (status === "stale") return <Badge tone="warning" dot>Recalculate</Badge>;
  if (status === "error") return <Badge tone="error" dot>Errors</Badge>;
  return <span style={{ color: "var(--text-muted)", font: "12px var(--font-sans)" }}>—</span>;
}

export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        font: "10.5px/1 var(--font-sans)",
        color: "var(--text-muted)",
        background: "var(--surface-chrome)",
        border: "1px solid var(--border-hairline)",
        borderRadius: 4,
        padding: "3px 6px",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

export function TypeIcon({ kind, size = 18 }: { kind: "folder" | "sheet"; size?: number }) {
  return kind === "folder" ? (
    <span style={{ color: "var(--accent)", display: "inline-flex" }}>
      <FolderIcon size={size} />
    </span>
  ) : (
    <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
      <SheetIcon size={size} />
    </span>
  );
}
