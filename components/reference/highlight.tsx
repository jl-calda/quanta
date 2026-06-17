import { highlightMatch } from "@/lib/calc/reference";

/**
 * Render `text` with the first case-insensitive occurrence of `query` wrapped in
 * a blueprint-tinted `<mark>` — the search-result highlight from the mockup
 * (`.hl`). Styled inline so it works on any page without extra global CSS.
 */
export function Highlight({ text, query }: { text: string; query: string }) {
  const split = highlightMatch(text, query);
  if (!split) return <>{text}</>;
  return (
    <>
      {split.pre}
      <mark
        style={{
          background: "color-mix(in srgb, var(--status-warning) 32%, transparent)",
          color: "inherit",
          borderRadius: 2,
          padding: "0 1px",
        }}
      >
        {split.match}
      </mark>
      {split.post}
    </>
  );
}
