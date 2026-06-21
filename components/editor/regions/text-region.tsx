"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { TextRegion as TextRegionData } from "@/lib/worksheet/content";
import { applyModifierSelect } from "./region-select";
import type { RegionRenderProps } from "./types";

/**
 * Text region — a heading (h1–h3, optionally with a tracked eyebrow) or body
 * copy. Edited in place via a textarea; committed text renders in Geist Sans.
 */
const HEADING_STYLE: Record<1 | 2 | 3, React.CSSProperties> = {
  1: { font: "600 27px/1.2 var(--font-sans)", letterSpacing: "-0.015em", color: "var(--text-primary)" },
  2: { font: "600 20px/1.3 var(--font-sans)", color: "var(--text-primary)" },
  3: { font: "600 16px/1.3 var(--font-sans)", color: "var(--text-primary)" },
};

export function TextRegionView({
  region,
  editing,
  canEdit,
  multiActive,
  dispatch,
}: RegionRenderProps<TextRegionData>) {
  const [draft, setDraft] = useState(region.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      const el = ref.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  if (editing && canEdit) {
    const commit = () => {
      if (draft !== region.text) dispatch({ type: "EDIT_TEXT", id: region.id, text: draft });
      dispatch({ type: "END_EDIT" });
    };
    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDraft(region.text);
        dispatch({ type: "END_EDIT" });
      }
    };
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        spellCheck
        rows={Math.max(1, draft.split("\n").length)}
        placeholder="Write a note…  (⌘↵ to commit)"
        style={{
          width: "100%",
          resize: "vertical",
          font: region.heading
            ? (HEADING_STYLE[region.heading].font as string)
            : "13px/1.5 var(--font-sans)",
          color: "var(--text-primary)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-focus)",
          boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 22%, transparent)",
          borderRadius: "var(--radius-sm)",
          padding: "6px 8px",
          outline: "none",
        }}
      />
    );
  }

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (applyModifierSelect(e, region.id, dispatch, multiActive)) return;
    dispatch(canEdit ? { type: "BEGIN_EDIT", id: region.id } : { type: "SELECT", id: region.id });
  };

  return (
    <div onClick={onClick} style={{ cursor: canEdit ? "text" : "default", minHeight: "1.2em" }}>
      {region.eyebrow && (
        <div
          style={{
            font: "600 11px/1 var(--font-sans)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 5,
          }}
        >
          {region.eyebrow}
        </div>
      )}
      {region.heading ? (
        <div style={HEADING_STYLE[region.heading]}>{region.text || "Heading"}</div>
      ) : (
        <p
          style={{
            margin: 0,
            font: "13px/1.5 var(--font-sans)",
            color: "var(--text-muted)",
            whiteSpace: "pre-wrap",
          }}
        >
          {region.text || <span style={{ fontStyle: "italic" }}>Empty note</span>}
        </p>
      )}
    </div>
  );
}
