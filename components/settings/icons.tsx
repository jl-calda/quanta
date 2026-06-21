import type { ReactNode } from "react";

/**
 * Settings section icons — thin 1.5px line glyphs, ported from the design export
 * (settings-app.jsx:13–28). Monochrome; inherit `currentColor`.
 */

function svg(children: ReactNode, size: number) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export type SectionIcon = (size?: number) => ReactNode;

export const SettingsIcons: Record<string, SectionIcon> = {
  account: (s = 18) =>
    svg(
      <>
        <circle cx={12} cy={8} r={3.5} />
        <path d="M5 20a7 7 0 0 1 14 0" />
      </>,
      s,
    ),
  appearance: (s = 18) =>
    svg(
      <>
        <path d="M12 3a9 9 0 1 0 9 9c0-.5-.5-1-1-1h-2.5A2.5 2.5 0 0 1 15 8.5V6a1 1 0 0 0-1-1z" />
        <path d="M8.5 12.5h.01M12 8h.01M15.5 12.5h.01" />
      </>,
      s,
    ),
  editor: (s = 18) =>
    svg(
      <>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z" />
        <path d="M8 8.5h7M8 12h7M8 15.5h4" />
      </>,
      s,
    ),
  calc: (s = 18) =>
    svg(
      <>
        <rect x={5} y={3} width={14} height={18} rx={1.6} />
        <path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4" />
      </>,
      s,
    ),
  units: (s = 18) =>
    svg(
      <>
        <rect x={3} y={8} width={18} height={8} rx={1.4} />
        <path d="M7.5 8v3.5M11.5 8v5M15.5 8v3.5" />
      </>,
      s,
    ),
  templates: (s = 18) =>
    svg(
      <>
        <rect x={3} y={4} width={18} height={16} rx={1.5} />
        <path d="M3 9h18M9 9v11" />
      </>,
      s,
    ),
  sharing: (s = 18) =>
    svg(
      <>
        <circle cx={18} cy={5} r={2.5} />
        <circle cx={6} cy={12} r={2.5} />
        <circle cx={18} cy={19} r={2.5} />
        <path d="M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6" />
      </>,
      s,
    ),
  integrations: (s = 18) =>
    svg(
      <>
        <path d="M10 4 6 8l4 4" />
        <path d="M14 12l4 4-4 4" />
        <path d="M6 8h7a5 5 0 0 1 5 5v3" />
      </>,
      s,
    ),
  workspace: (s = 18) =>
    svg(
      <>
        <path d="M3 21V7l7-4 7 4v14" />
        <path d="M3 21h18M10 9h.01M14 12h.01M10 15h.01" />
      </>,
      s,
    ),
  billing: (s = 18) =>
    svg(
      <>
        <rect x={3} y={5} width={18} height={14} rx={1.6} />
        <path d="M3 9.5h18M6.5 14.5h4" />
      </>,
      s,
    ),
  info: (s = 18) =>
    svg(
      <>
        <circle cx={12} cy={12} r={9} />
        <path d="M12 11v5M12 8h.01" />
      </>,
      s,
    ),
  check: (s = 18) => svg(<path d="M5 12l4.5 4.5L19 7" />, s),
};
