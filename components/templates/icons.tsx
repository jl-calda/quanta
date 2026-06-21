import type { ReactNode } from "react";

/**
 * Template-gallery icons — thin-stroke 1.5px Lucide-family line glyphs,
 * monochrome, inheriting `currentColor`. Path data ported verbatim from the
 * Claude Design export (`mathcad-like/project/gallery-thumbs.jsx`). Pure SVG →
 * safe in Server Components. (`verified` is a filled check-seal badge.)
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
      <path d="M12 6v12M6 12h12" />
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

export function EyeIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </Line>
  );
}

export function UsersIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 7.5a3 3 0 0 1 0 5.8M16.5 19a5.4 5.4 0 0 1 4 0" />
    </Line>
  );
}

export function FlameIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 3c.5 3-2 4-2 6.5A2 2 0 0 0 12 11.5 2 2 0 0 0 13.2 8C15 9 16 11 16 13.5a4 4 0 0 1-8 0C8 10.5 10 8 12 3z" />
    </Line>
  );
}

export function BookmarkIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1z" />
    </Line>
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

export function DownloadIcon({ size }: { size?: number }) {
  return (
    <Line size={size}>
      <path d="M12 3v11m0 0 4-4m-4 4-4-4" />
      <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
    </Line>
  );
}

/** Filled check-seal — the "verified" badge beside a Quanta byline. */
export function VerifiedIcon({ size = 18 }: { size?: number }) {
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
      <path d="m12 2.5 2.2 1.6 2.7-.2 1 2.5 2.3 1.4-.7 2.6.7 2.6-2.3 1.4-1 2.5-2.7-.2L12 21.5l-2.2-1.6-2.7.2-1-2.5-2.3-1.4.7-2.6-.7-2.6 2.3-1.4 1-2.5 2.7.2z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.4" />
    </svg>
  );
}
