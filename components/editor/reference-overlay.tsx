"use client";

import { useEffect } from "react";
import { IconButton } from "@/components/ds";
import { ReferenceLibrary } from "@/components/reference/reference-library";
import type { ReferenceItem } from "@/lib/calc/reference";
import { CloseIcon } from "@/components/reference/icons";
import { useEditor } from "./state/editor-provider";

/**
 * Editor host for the Reference library: a near-full-screen overlay (the dense
 * 3-pane browser needs more room than the centered DS Dialog gives). Driven by
 * `ui.referenceOpen`; closes on Escape or scrim click. "Insert into worksheet"
 * drops a math region prefilled with the item's source below the selection.
 */
export function ReferenceOverlay() {
  const { state, dispatch, canEdit } = useEditor();
  const { referenceOpen, referenceKind } = state.ui;

  useEffect(() => {
    if (!referenceOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE_REFERENCE" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [referenceOpen, dispatch]);

  if (!referenceOpen) return null;

  const insert = (item: ReferenceItem) => {
    dispatch({
      type: "INSERT_REGION_WITH_SOURCE",
      source: item.insert,
      anchorId: state.selectedId,
      where: "below",
    });
    dispatch({ type: "CLOSE_REFERENCE" });
  };

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dispatch({ type: "CLOSE_REFERENCE" });
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(21,24,29,0.32)",
        padding: "var(--space-6)",
        animation: "qfade var(--dur-base) var(--ease-out)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reference library"
        style={{
          width: "min(1180px, 94vw)",
          height: "min(760px, 92vh)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-paper)",
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-modal)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            flex: "0 0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "var(--space-4)",
            padding: "10px 14px",
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-chrome)",
          }}
        >
          <span style={{ font: "600 13px/1 var(--font-sans)", color: "var(--text-primary)" }}>
            Insert from reference library
          </span>
          <IconButton label="Close reference library" onClick={() => dispatch({ type: "CLOSE_REFERENCE" })}>
            <CloseIcon size={16} />
          </IconButton>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <ReferenceLibrary
            variant={canEdit ? "editor" : "standalone"}
            onInsert={insert}
            initialGroup={referenceKind}
          />
        </div>
      </div>
      <style>{"@keyframes qfade{from{opacity:0}to{opacity:1}}"}</style>
    </div>
  );
}
