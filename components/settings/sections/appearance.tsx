"use client";

import { Group, Radio, Row, Section } from "@/components/settings/controls";
import { useDensity, useTheme } from "@/lib/preferences/provider";
import type { Density, Theme } from "@/lib/preferences/cookies";

/**
 * Appearance — per-user prefs. Theme and density apply instantly through the
 * cookie-backed providers (no flash, app-wide) and are mirrored to
 * `profiles.preferences` for cross-device sync via `onPersist`.
 */
export function AppearanceSection({
  onPersist,
}: {
  onPersist: (patch: { theme?: Theme; density?: Density }) => void;
}) {
  const { theme, setTheme } = useTheme();
  const { density, setDensity } = useDensity();

  return (
    <Section
      title="Appearance"
      desc="How Quanta looks for you. These preferences follow your account across devices."
    >
      <Group title="Display">
        <Row
          label="Theme"
          help="Light is the default; dark lifts every hue for low-light work."
          control={
            <Radio
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              value={theme}
              onChange={(v) => {
                setTheme(v);
                onPersist({ theme: v });
              }}
            />
          }
        />
        <Row
          label="Density"
          help="Compact fits more on screen; comfortable adds breathing room."
          control={
            <Radio
              options={[
                { value: "compact", label: "Compact" },
                { value: "comfortable", label: "Comfortable" },
              ]}
              value={density}
              onChange={(v) => {
                setDensity(v);
                onPersist({ density: v });
              }}
            />
          }
        />
      </Group>
    </Section>
  );
}
