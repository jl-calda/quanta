import { QuantaMark } from "@/components/quanta-mark";
import { VerifiedIcon } from "./icons";
import { initialsOf } from "./format";

/**
 * Byline — the template's provenance. Official Quanta templates (no author)
 * render the verified mark; community templates render the author's initials +
 * name. Ported from the export's `Byline`; `size="lg"` is used in the preview
 * drawer's metadata strip. Pure presentational — server-safe.
 */
export function Byline({
  authorId,
  authorName,
  size = "sm",
}: {
  authorId: string | null;
  authorName: string | null;
  size?: "sm" | "lg";
}) {
  const lg = size === "lg";
  const font = `${lg ? "12.5px" : "11.5px"}/1 var(--font-sans)`;
  const dim = lg ? 22 : 18;

  // Official Quanta template (curated / no author) → verified mark.
  if (!authorId) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, font, color: "var(--text-muted)" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: dim,
            height: dim,
            borderRadius: 4,
            background: "var(--ink)",
            color: "var(--text-inverse)",
          }}
        >
          <QuantaMark size={lg ? 14 : 12} />
        </span>
        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Quanta</span>
        <span style={{ display: "inline-flex", color: "var(--status-pass)" }}>
          <VerifiedIcon size={lg ? 15 : 13} />
        </span>
        verified
      </span>
    );
  }

  const name = authorName ?? "Community";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, font, color: "var(--text-muted)" }}>
      <span
        style={{
          width: dim,
          height: dim,
          borderRadius: "50%",
          background: "var(--surface-selected)",
          color: "var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          font: `600 ${lg ? 10 : 8.5}px/1 var(--font-sans)`,
        }}
      >
        {initialsOf(name)}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{name}</span>
      <span>· community</span>
    </span>
  );
}
