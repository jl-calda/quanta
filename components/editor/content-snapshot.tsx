"use client";

import { useMemo, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { parseContent } from "@/lib/worksheet/content";
import { hasRenderableRegions } from "@/lib/worksheet/flatten";
import type { Json } from "@/lib/supabase/types";

// The inner renderer pulls in the calc engine (mathjs) + KaTeX, so it loads
// lazily on the client only when there is real content to draw — it never enters
// the gallery / files / dashboard initial bundles. Until it mounts (and during
// SSR) the lightweight procedural `fallback` shows through beneath it.
const ContentSnapshotInner = dynamic(
  () => import("./content-snapshot-inner").then((m) => m.ContentSnapshotInner),
  { ssr: false },
);

export interface ContentSnapshotProps {
  /** Worksheet / template content tree (JSONB). */
  content: Json;
  /** Procedural placeholder shown for empty/invalid content and while loading. */
  fallback: ReactNode;
  /** Downscale factor (cards ~0.6, dashboard mini ~0.42). */
  scale?: number;
  /** Inner padding in px (at scale 1). */
  padding?: number;
  /** Cap on rendered rows (top crop). */
  maxRows?: number;
}

/**
 * ContentSnapshot — a real, read-only rendered thumbnail of a worksheet /
 * template's own content (rows → regions, math typeset via KaTeX with result
 * chips), scaled into a card. Replaces the procedural `TemplateThumb` /
 * `MiniPreview`, which survives only as the empty-content `fallback`. The fallback
 * renders beneath; the opaque snapshot covers it once its lazy chunk has loaded,
 * so there is no blank flash. Reuses the history viewer's provider-free renderer.
 */
export function ContentSnapshot({ content, fallback, scale, padding, maxRows }: ContentSnapshotProps) {
  const parsed = useMemo(() => parseContent(content), [content]);

  // Empty / invalid content → just the procedural placeholder (no engine load).
  if (!hasRenderableRegions(parsed)) return <>{fallback}</>;

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Shown until the snapshot's lazy chunk mounts, then covered by it. */}
      <div style={{ position: "absolute", inset: 0 }}>{fallback}</div>
      <ContentSnapshotInner content={parsed} scale={scale} padding={padding} maxRows={maxRows} />
    </div>
  );
}
