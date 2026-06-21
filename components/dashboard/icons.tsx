import type { ReactNode } from "react";

/**
 * Dashboard icons — thin-stroke 1.5px line glyphs (Lucide family), monochrome,
 * inheriting `currentColor`. Path data ported verbatim from the Dashboard mockup
 * (`mathcad-like/project/Dashboard.html`). Pure SVG → safe in Server Components.
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

export function HomeIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-5h5v5" />
    </Line>
  );
}

export function SheetIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </Line>
  );
}

export function TemplateIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M9 9v11" />
    </Line>
  );
}

export function ShareIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.3" />
      <path d="M16 19a4.4 4.4 0 0 1 5.5-3.7" />
    </Line>
  );
}

export function TrashIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M4 7h16M9.5 7V5h5v2M6 7l1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </Line>
  );
}

export function SearchIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
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

export function PlusIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 5v14M5 12h14" />
    </Line>
  );
}

export function KebabIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </Line>
  );
}

export function FolderIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h4l2 2.5h7A1.5 1.5 0 0 1 19 10v8.5A1.5 1.5 0 0 1 17.5 20h-13A1.5 1.5 0 0 1 3 18.5z" />
    </Line>
  );
}

export function ImportIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Line>
  );
}

export function BlankIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
    </Line>
  );
}

export function SettingsIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </Line>
  );
}

export function ClockIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Line>
  );
}

export function ArrowRightIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Line>
  );
}

export function BookIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z" />
      <path d="M8 4v15" />
    </Line>
  );
}
