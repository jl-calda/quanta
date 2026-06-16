import { QuantaMark } from "./quanta-mark";
import { ThemeToggle } from "./theme-toggle";
import { DensityToggle } from "./density-toggle";

/**
 * Minimal application bar — chrome surface with a hairline base rule, the
 * Quanta wordmark on the left, and the display-preference toggles on the right.
 * This is the foundational shell chrome; the full ribbon arrives in a later
 * milestone.
 */
export function AppBar() {
  return (
    <header className="flex items-center justify-between border-b border-hairline bg-chrome px-4 py-2">
      <div className="flex items-center gap-2 text-ink">
        <QuantaMark size={20} className="text-accent" />
        <span className="text-16 font-semibold tracking-[-0.01em]">Quanta</span>
      </div>
      <div className="flex items-center gap-3">
        <DensityToggle />
        <ThemeToggle />
      </div>
    </header>
  );
}
