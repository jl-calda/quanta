import type { ReactNode } from "react";

/**
 * File-browser icons — thin-stroke 1.5px Lucide-family line glyphs, monochrome,
 * inheriting `currentColor`. Path data ported verbatim from the Claude Design
 * export (`files-app.jsx`). Pure SVG → safe in Server Components.
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

export function FolderIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v8A1.5 1.5 0 0 1 17.5 19.5h-13A1.5 1.5 0 0 1 3 18z" />
    </Line>
  );
}

export function FolderOpenIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M3.5 18.5 6 11a1.4 1.4 0 0 1 1.3-1h12.2a.9.9 0 0 1 .85 1.2l-2 6.5a1.4 1.4 0 0 1-1.34 1H4.5A1 1 0 0 1 3.5 18.5z" />
      <path d="M3.2 17V7.5A1.5 1.5 0 0 1 4.7 6h3.6l2 2.5h6.7A1.5 1.5 0 0 1 18.5 10v1.5" />
    </Line>
  );
}

export function SheetIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M6.5 3.5h7L18 8v11.5a1 1 0 0 1-1 1H6.5a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" />
      <path d="M13 3.5V8h4.5" />
      <path d="M8.5 12.5h6M8.5 15.5h6" />
    </Line>
  );
}

export function ChevronRightIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="m9.5 7 5 5-5 5" />
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

export function ListIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </Line>
  );
}

export function GridIcon({ size = 18 }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </Line>
  );
}

export function PlusIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 6v12M6 12h12" />
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

export function CloseIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Line>
  );
}

export function OpenIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
    </Line>
  );
}

export function RenameIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M4 20h16" />
      <path d="M14.5 5.5l3 3" />
      <path d="M6 17l1-4 9.5-9.5a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2L10 16z" />
    </Line>
  );
}

export function MoveIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M5 9 2 12l3 3" />
      <path d="M9 5l3-3 3 3" />
      <path d="M15 19l-3 3-3-3" />
      <path d="M19 9l3 3-3 3" />
      <path d="M2 12h20M12 2v20" />
    </Line>
  );
}

export function DuplicateIcon({ size = 18 }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="9" y="9" width="11" height="11" rx="1.6" />
      <path d="M5 15V6a1.2 1.2 0 0 1 1.2-1.2H15" />
    </Line>
  );
}

export function ShareIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="17" cy="6" r="2.4" />
      <circle cx="17" cy="18" r="2.4" />
      <path d="M8.1 11 14.9 7.2M8.1 13l6.8 3.8" />
    </Line>
  );
}

export function HistoryIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V9H8" />
      <path d="M12 8v4.5l3 1.8" />
    </Line>
  );
}

export function ExportIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 3v11m0-11 4 4m-4-4-4 4" />
      <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
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

export function TagIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <path d="M8 8h.01" />
    </Line>
  );
}

export function KebabIcon({ size = 18 }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="19" r="1" />
    </Line>
  );
}

export function SortArrowIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 5v14" />
      <path d="M7 10l5-5 5 5" />
    </Line>
  );
}

export function TemplateIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path d="M4 9h16M9 9v11" />
    </Line>
  );
}
