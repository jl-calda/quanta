"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "../icons";
import { Big } from "./glyphs";
import { useRibbonCommands } from "./commands";

/**
 * Quick-access strip — a slim toolbar of the most-used tools with an overflow
 * menu, for focused full-height worksheets. A SECONDARY chrome state (not a
 * replacement for the ribbon); exported for hosts that opt into it. Ported from
 * the design mockup's quick-access frame.
 */
export function QuickAccess() {
  const { cmd, sel } = useRibbonCommands();

  const tool = (
    opts: { icon?: IconName; glyph?: ReactNode; tip: string; onClick?: () => void; disabled?: boolean },
  ) => (
    <button
      type="button"
      title={opts.disabled ? `${opts.tip} — coming soon` : opts.tip}
      disabled={opts.disabled}
      onClick={opts.onClick}
      onMouseEnter={(e) => {
        if (!opts.disabled) e.currentTarget.style.background = "var(--surface-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        borderRadius: 6,
        color: opts.disabled ? "var(--text-muted)" : "var(--text-primary)",
        cursor: opts.disabled ? "not-allowed" : "pointer",
        opacity: opts.disabled ? 0.5 : 1,
      }}
    >
      {opts.glyph ?? (opts.icon && <Icon name={opts.icon} size={18} />)}
    </button>
  );

  const rule = <span style={{ width: 1, height: 20, background: "var(--border-hairline)", margin: "0 3px" }} />;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        height: 40,
        padding: "0 6px",
        border: "1px solid var(--border-hairline)",
        borderRadius: "var(--radius-md)",
        background: "var(--surface-chrome)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <span style={{ display: "inline-flex", marginRight: 4 }}>
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect x="2.75" y="2.75" width="26.5" height="26.5" rx="4" stroke="var(--accent)" strokeWidth="1.5" />
          <line x1="8" y1="16" x2="24" y2="16" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12.5" y1="10.25" x2="19.5" y2="10.25" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="16" cy="21.75" r="1.6" fill="var(--status-pass)" />
        </svg>
      </span>
      {rule}
      {tool({ glyph: <Big s={15}>=</Big>, tip: "Insert math", onClick: () => cmd.insertRegion("math"), disabled: !sel.canEdit })}
      {tool({ icon: "refresh", tip: "Recalculate", onClick: cmd.recalculate })}
      {tool({ icon: "fmt", tip: "Result format", disabled: true })}
      {tool({ icon: "columns", tip: "Row columns", onClick: () => cmd.setTab("Format") })}
      {rule}
      {tool({ icon: "more", tip: "More tools", disabled: true })}
    </div>
  );
}
