"use client";

import { useEffect } from "react";
import { ShortcutsReference } from "./shortcuts-reference";

/**
 * Keyboard-shortcuts reference modal (Func §7.25 / design mockup 7.25). The
 * editor host: a scrim overlay around the shared {@link ShortcutsReference}
 * panel. Closes on Escape or scrim click and does NOT trap focus — every
 * shortcut is also reachable from the ribbon / menus (accessibility floor).
 */
export function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(21,24,29,0.32)",
        padding: "var(--space-6)",
        animation: "qfade var(--dur-base) var(--ease-out)",
      }}
    >
      <ShortcutsReference onClose={onClose} />
      <style>{"@keyframes qfade{from{opacity:0}to{opacity:1}}"}</style>
    </div>
  );
}
