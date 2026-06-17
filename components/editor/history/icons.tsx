import type { ReactNode } from "react";

/**
 * Thin-stroke (1.5px) line icons for the Version history screen, in the Quanta
 * iconography (Lucide-light family). Plain render helpers — called as
 * `iconLeft={TagIcon()}` — matching the design mockup.
 */
function svg(path: ReactNode, size: number): ReactNode {
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
      {path}
    </svg>
  );
}

export const BackIcon = (size = 17): ReactNode => svg(<path d="M14.5 6l-6 6 6 6" />, size);

export const CompareIcon = (size = 16): ReactNode =>
  svg(
    <>
      <rect x="3" y="5" width="7" height="14" rx="1" />
      <rect x="14" y="5" width="7" height="14" rx="1" />
      <path d="M12 3v18" />
    </>,
    size,
  );

export const RestoreIcon = (size = 15): ReactNode =>
  svg(
    <>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V9H8" />
    </>,
    size,
  );

export const TagIcon = (size = 15): ReactNode =>
  svg(
    <>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <path d="M8 8h.01" />
    </>,
    size,
  );
