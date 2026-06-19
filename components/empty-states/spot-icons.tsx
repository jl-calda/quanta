import type { ReactNode } from "react";

/**
 * Thin-line spot icons for the empty-state medallions — ported verbatim from the
 * Claude Design mockup (`mathcad-like/project/empty-states.html`). Drawn at 34px
 * in a 24-grid with a 1.4px stroke (the spot scale; the canonical UI line icons
 * stay 1.5px — see DECISIONS.md). Monochrome, inherit `currentColor`, decorative.
 *
 * Pure SVG with no hooks or server-only code, so the map is shared freely between
 * server components (the board) and client components (the live connection card).
 */

export type SpotIconName =
  | "worksheet"
  | "folder"
  | "search"
  | "share"
  | "history"
  | "sparkle"
  | "offline"
  | "cloud"
  | "ok";

function spot(children: ReactNode): ReactNode {
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const SPOT_ICONS: Record<SpotIconName, ReactNode> = {
  // sheet with a plus
  worksheet: spot(
    <>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4" />
      <path d="M12 11v6M9 14h6" />
    </>,
  ),
  // open folder
  folder: spot(
    <>
      <path d="M3.5 18.5 6 11a1.4 1.4 0 0 1 1.3-1h12.2a.9.9 0 0 1 .85 1.2l-2 6.5a1.4 1.4 0 0 1-1.34 1H4.5A1 1 0 0 1 3.5 18.5z" />
      <path d="M3.2 16V6.5A1.5 1.5 0 0 1 4.7 5h3.6l2 2.5h6.5A1.5 1.5 0 0 1 18.3 9v1.5" />
    </>,
  ),
  // magnifier
  search: spot(
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-3.6-3.6" />
      <path d="M8.6 11h4.8" />
    </>,
  ),
  // share nodes
  share: spot(
    <>
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.1 10.8 15.9 7.2M8.1 13.2l7.8 3.6" />
    </>,
  ),
  // clock with arrow
  history: spot(
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V9H8" />
      <path d="M12 8v4.2l3 1.8" />
    </>,
  ),
  // sparkle
  sparkle: spot(
    <>
      <path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z" />
      <path d="M18.5 15l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z" />
    </>,
  ),
  // cloud with a slash (offline)
  offline: spot(
    <>
      <path d="M7 18h10a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.2 9.3" />
      <path d="M7 18a3.4 3.4 0 0 1-.6-6.7" />
      <path d="M4 4l16 16" />
    </>,
  ),
  // cloud (connected) — the offline cloud without the slash
  cloud: spot(
    <>
      <path d="M7 18h10a3.5 3.5 0 0 0 .5-6.96A5 5 0 0 0 8.2 9.3" />
      <path d="M7 18a3.4 3.4 0 0 1-.6-6.7" />
    </>,
  ),
  // shield check (no errors)
  ok: spot(
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" />
      <path d="M9 11.5l2.2 2.2 3.8-4" />
    </>,
  ),
};
