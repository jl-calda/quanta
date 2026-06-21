"use client";

import { Section } from "@/components/settings/controls";
import { KeymapCards } from "@/components/settings/keymap-cards";
import type { KeymapId } from "@/lib/keymap";

/**
 * Editor — per-user prefs. The keymap selects how math entry behaves (Mathcad
 * 2D building vs conventional explicit commands). It applies instantly through
 * the cookie-backed provider (no flash, app-wide — the editor, the MathLive
 * bridge, the shortcuts reference, and the keypad all read it) and is mirrored
 * to `profiles.preferences` for cross-device sync via `onPersist`.
 *
 * Matches design mockup 7.26 — radio cards, Mathcad is the default.
 */
export function EditorSection({
  onPersist,
}: {
  onPersist: (patch: { keymap?: KeymapId }) => void;
}) {
  return (
    <Section
      title="Editor"
      desc="How keys behave inside a math region. The keymap drives the editor shortcuts and the shortcuts reference."
    >
      <div style={{ maxWidth: 460 }}>
        <KeymapCards onPersist={(keymap) => onPersist({ keymap })} />
      </div>
    </Section>
  );
}
