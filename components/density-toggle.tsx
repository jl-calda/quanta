"use client";

import { useDensity } from "@/lib/preferences/provider";
import type { Density } from "@/lib/preferences/cookies";

const OPTIONS: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
];

/**
 * Comfortable / Compact density toggle — a small segmented control.
 * Compact is the default. The choice is persisted via the `quanta-density`
 * cookie and applied to <html data-density> (read server-side, so there is no
 * flash). See lib/preferences and app/styles/density.css.
 */
export function DensityToggle() {
  const { density, setDensity } = useDensity();

  return (
    <div
      role="group"
      aria-label="Display density"
      className="inline-flex items-center gap-px rounded-md border border-hairline bg-raised p-[3px]"
    >
      {OPTIONS.map((option) => {
        const active = density === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            title={`${option.label} density`}
            onClick={() => setDensity(option.value)}
            className={[
              "cursor-pointer rounded-sm px-2.5 py-1 text-12 font-medium transition-colors duration-150",
              active
                ? "bg-accent-tint text-accent"
                : "bg-transparent text-muted hover:bg-hover",
            ].join(" ")}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
