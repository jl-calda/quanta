"use client";

import { Group, Radio, Row, Section } from "@/components/settings/controls";
import { keymaps } from "@/lib/keymap";
import type { KeymapId } from "@/lib/keymap";

/**
 * Editor — per-user prefs. The keymap selects how math entry behaves (Mathcad
 * 2D building vs conventional explicit commands); persisted to
 * `profiles.preferences` and read by the math editor.
 */
export function EditorSection({
  keymap,
  onChange,
}: {
  keymap: KeymapId;
  onChange: (keymap: KeymapId) => void;
}) {
  const active = keymaps[keymap];
  return (
    <Section
      title="Editor"
      desc="How you enter math. The keymap drives the editor shortcuts and the shortcuts reference."
    >
      <Group title="Keymap">
        <Row
          label="Math entry keymap"
          help={active.description}
          control={
            <Radio
              options={[
                { value: "mathcad", label: "Mathcad" },
                { value: "default", label: "Default" },
              ]}
              value={keymap}
              onChange={(v) => onChange(v as KeymapId)}
            />
          }
        />
      </Group>
    </Section>
  );
}
