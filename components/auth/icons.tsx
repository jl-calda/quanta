import type { ReactNode } from "react";

/**
 * Auth-screen icons — thin-stroke 1.5px line glyphs (Lucide family), monochrome,
 * inheriting `currentColor`. Ported from the `Sign in.html` mockup so the OAuth
 * and password controls carry the design system's icon weight.
 *
 * The Google "G" follows the mockup's deliberate monochrome line treatment so it
 * sits at the same weight as the rest of the set, rather than the multicolor
 * brand mark.
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

export function EyeIcon() {
  return (
    <Line size={17}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </Line>
  );
}

export function EyeOffIcon() {
  return (
    <Line size={17}>
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />
      <path d="M9.4 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.4 3.3" />
      <path d="M6.2 6.2A17 17 0 0 0 2 12s3.5 7 10 7a9.5 9.5 0 0 0 3.1-.5" />
    </Line>
  );
}

export function AlertIcon() {
  return (
    <Line size={15}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </Line>
  );
}

export function KeyIcon() {
  return (
    <Line size={17}>
      <circle cx="8" cy="15" r="4" />
      <path d="M10.8 12.2 20 3" />
      <path d="M16 7l3 3M18.5 4.5 21 7" />
    </Line>
  );
}

export function ArrowIcon() {
  return (
    <Line size={16}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Line>
  );
}

export function GoogleIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.2c0 5.05-3.6 8.6-9 8.6a8.8 8.8 0 1 1 5.9-15.3" />
      <path d="M21 11.5h-8.2v2.6h5.3" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <Line size={15}>
      <path d="m20 6-11 11-5-5" />
    </Line>
  );
}
