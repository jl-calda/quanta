"use client";

import type { Region } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import { Icon } from "../icons";
import { useComments } from "./comments-provider";

/**
 * Region comment marker — the canvas-side bridge to the comments drawer. A small
 * count badge sits in a region's top-right corner whenever that region has ≥1 open
 * (unresolved) comment; clicking it selects the region, opens the comments drawer,
 * and scopes the thread to that region (via the provider's `focusedRegionId`).
 *
 * Shown for ALL roles (viewers/reviewers included) — it only surfaces existing open
 * comments, so it's gated by the open count, never by `canComment` (posting stays
 * RLS-gated on the server). Renders nothing when the region has no open comments.
 */
export function RegionCommentMarker({ region }: { region: Region }) {
  const { state, dispatch } = useEditor();
  const { openCountByRegion, focusedRegionId, setFocusedRegion } = useComments();

  const count = openCountByRegion.get(region.id) ?? 0;
  if (count === 0) return null;

  const active = focusedRegionId === region.id && state.ui.rightPanel === "comments";
  const label = `${count} open ${count === 1 ? "comment" : "comments"}. Show thread.`;

  const open = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: "SELECT", id: region.id });
    setFocusedRegion(region.id);
    // Open (never toggle closed) — leave it open if the drawer is already on comments.
    if (state.ui.rightPanel !== "comments") {
      dispatch({ type: "TOGGLE_RIGHT_PANEL", panel: "comments" });
    }
  };

  return (
    <button
      className="region-comment-marker"
      title={label}
      aria-label={label}
      onClick={open}
      style={{
        position: "absolute",
        top: 6,
        right: 8,
        zIndex: 5,
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        height: 19,
        padding: "0 6px",
        borderRadius: "var(--radius-sm)",
        border: active
          ? "1px solid var(--accent)"
          : "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
        background: active ? "var(--accent)" : "var(--accent-tint)",
        color: active ? "var(--text-inverse)" : "var(--accent)",
        font: "600 11px/1 var(--font-sans)",
        cursor: "pointer",
        transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
      }}
    >
      <Icon name="comment" size={12} />
      {count}
    </button>
  );
}
