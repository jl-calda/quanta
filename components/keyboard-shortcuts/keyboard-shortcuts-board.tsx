"use client";

import type { ReactNode } from "react";
import { QuantaMark } from "@/components/quanta-mark";
import { ShortcutsReference } from "@/components/editor/dialogs/shortcuts-reference";
import { KeymapCards } from "@/components/settings/keymap-cards";
import { MathBar } from "./math-bar";

/**
 * /keyboard-shortcuts — the Keyboard shortcuts board (design mockup 7.25 + 7.26),
 * a public catalogue page sibling to /design and /empty-states. It ports the
 * Claude Design mockup faithfully and wires it to the real feature: the same
 * `/lib/keymap` keymap drives the reference (7.25) and the live, provider-backed
 * Keymap preference (7.26) actually switches the app's keymap.
 */
function Label({ k, children, sub }: { k: string; children: ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ font: "600 11px/1 var(--font-mono)", color: "var(--accent)" }}>{k}</span>
        <span style={{ font: "600 13px/1 var(--font-sans)", color: "var(--text-primary)" }}>{children}</span>
      </div>
      {sub && <div style={{ font: "12px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

export function KeyboardShortcutsBoard() {
  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
        <QuantaMark size={24} className="text-accent" />
        <span className="q-eyebrow">Quanta · Keyboard entry</span>
      </div>
      <h1 style={{ margin: 0, font: "600 26px/1.2 var(--font-sans)", letterSpacing: "-0.015em", color: "var(--text-primary)" }}>
        Keyboard shortcuts &amp; keymap
      </h1>
      <p style={{ margin: "8px 0 0", font: "14px/1.6 var(--font-sans)", color: "var(--text-muted)", maxWidth: 680 }}>
        Mathcad-style keyboard entry is Quanta&rsquo;s primary input model. The reference (7.25) and the Keymap preference
        (7.26) below are driven by one <code style={{ font: "12px var(--font-mono)", color: "var(--text-primary)" }}>/lib/keymap</code>{" "}
        module — the same bindings that configure the editor, so there is no drift. Pick a keymap and the reference, the
        editor, and the keypad all follow.
      </p>

      {/* 7.25 reference */}
      <div style={{ marginTop: 32 }}>
        <Label k="7.25" sub="Searchable, multi-column, grouped — keys shown as keycap chips, platform-aware (⌘ / Ctrl).">
          Keyboard-shortcuts reference
        </Label>
        <div style={{ display: "flex", justifyContent: "center", padding: "24px", background: "var(--surface-chrome)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)" }}>
          <ShortcutsReference embedded />
        </div>
      </div>

      {/* 7.26 + math bar */}
      <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 28, marginTop: 32, alignItems: "start" }}>
        <div>
          <Label k="7.26" sub="A Preferences setting — Mathcad is the default. This control is live: it switches the app keymap.">
            Keymap preference
          </Label>
          <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <div style={{ padding: "13px 16px 11px", borderBottom: "1px solid var(--border-hairline)" }}>
              <div style={{ font: "600 13.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Keymap</div>
              <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 3 }}>How keys behave inside a math region.</div>
            </div>
            <div style={{ padding: 10 }}>
              <KeymapCards />
            </div>
          </div>
        </div>
        <div>
          <Label k="—" sub="Each tool shows its key hint as a small chip (fraction = /, exponent = ^, subscript = _, root = backslash, Greek = Ctrl+G).">
            Math input bar — inline hints
          </Label>
          <div style={{ padding: "28px 22px", background: "var(--surface-chrome)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-hairline)", display: "flex", justifyContent: "center" }}>
            <MathBar />
          </div>
          <div style={{ marginTop: 12, padding: "11px 13px", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-sm)", background: "var(--surface-raised)", font: "12px/1.6 var(--font-sans)", color: "var(--text-muted)" }}>
            The same hints appear on the floating keypad in the editor, so the keyboard path is always discoverable — click
            to learn the key, then type it next time.
          </div>
        </div>
      </div>
    </div>
  );
}
