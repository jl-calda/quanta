import type { WorksheetRole } from "@/lib/supabase/types";
import { initials } from "@/components/dashboard/format";

/**
 * Small presentational primitives for the Shared page (ported from
 * `shared-app.jsx`): a colored initials/photo `Avatar`, an overlapped
 * `AvatarStack`, and a tone-coded `RoleChip`. Pure (no hooks) so they render in
 * both Server and Client Components.
 */

const PALETTE = ["#1F5FBF", "#1E8E5A", "#C6890B", "#8B5CF6", "#C2392B", "#0E7490"];

/** Deterministic avatar color from any stable key (id / email / name). */
function colorFor(key: string): string {
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return PALETTE[sum % PALETTE.length];
}

export function Avatar({
  name,
  colorKey,
  size = 24,
  ring = false,
}: {
  name: string;
  /** Stable key for the color (defaults to the name). */
  colorKey?: string;
  size?: number;
  ring?: boolean;
}) {
  // Initials-only, like the rest of Quanta (projects table, editor presence) —
  // the design mockup never uses photos.
  return (
    <span
      title={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colorFor(colorKey ?? name),
        color: "#fff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        font: `600 ${Math.round(size * 0.4)}px/1 var(--font-sans)`,
        flex: "0 0 auto",
        ...(ring ? { boxShadow: "0 0 0 2px var(--surface-raised)" } : null),
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 3,
}: {
  people: { id: string; name: string }[];
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {shown.map((p, i) => (
        <span key={p.id} style={{ marginLeft: i ? -8 : 0, zIndex: max - i }}>
          <Avatar name={p.name} colorKey={p.id} ring />
        </span>
      ))}
      {extra > 0 && (
        <span
          style={{
            marginLeft: -8,
            width: 24,
            height: 24,
            borderRadius: "50%",
            background: "var(--surface-chrome)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-muted)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            font: "600 10px/1 var(--font-sans)",
            boxShadow: "0 0 0 2px var(--surface-raised)",
          }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}

const ROLE_STYLES: Record<WorksheetRole, { c: string; b: string }> = {
  owner: { c: "var(--accent)", b: "var(--accent-tint)" },
  editor: { c: "var(--status-pass)", b: "var(--status-pass-bg)" },
  commenter: { c: "var(--status-warning)", b: "var(--status-warning-bg)" },
  viewer: { c: "var(--text-muted)", b: "var(--surface-chrome)" },
};

export function RoleChip({ role }: { role: WorksheetRole }) {
  const s = ROLE_STYLES[role];
  const label = role.charAt(0).toUpperCase() + role.slice(1);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        font: "500 11px/1 var(--font-sans)",
        color: s.c,
        background: s.b,
        border: `1px solid color-mix(in srgb, ${s.c} 22%, transparent)`,
        borderRadius: "var(--radius-sm)",
        padding: "3px 8px",
      }}
    >
      {label}
    </span>
  );
}
