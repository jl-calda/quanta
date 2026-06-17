import type { ReactNode } from "react";

/**
 * Shared-page icons — thin-stroke 1.5px Lucide-family line glyphs, monochrome,
 * inheriting `currentColor`. Path data ported verbatim from the Claude Design
 * export (`shared-app.jsx`). Pure SVG → safe in Server Components.
 */

function Line({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function LinkIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M9.5 14.5 14.5 9.5" />
      <path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" />
    </Line>
  );
}

export function CommentIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M5 5h14a1.2 1.2 0 0 1 1.2 1.2v8.4A1.2 1.2 0 0 1 19 15.8H9.5L5.5 19.5V6.2A1.2 1.2 0 0 1 6.7 5z" />
    </Line>
  );
}

export function EditIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M4 20h4L18.5 9.5a1.4 1.4 0 0 0 0-2l-1-1a1.4 1.4 0 0 0-2 0L5 17z" />
    </Line>
  );
}

export function ShareEventIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="18" cy="5.5" r="2.3" />
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="18.5" r="2.3" />
      <path d="M8.1 10.8 15.9 6.7M8.1 13.2l7.8 4.1" />
    </Line>
  );
}

export function ManageAccessIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.3" />
      <path d="M16 19a4.4 4.4 0 0 1 5.5-3.7" />
    </Line>
  );
}

export function PanelIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M14 4v16" />
    </Line>
  );
}

export function ChevronRightIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="m9.5 6 6 6-6 6" />
    </Line>
  );
}

export function ChevronDownIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="m6 9 6 6 6-6" />
    </Line>
  );
}
