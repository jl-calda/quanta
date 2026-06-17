import type { ReactNode } from "react";

/**
 * Reference-library line icons — thin-stroke 1.5px glyphs (Lucide family),
 * monochrome, inheriting `currentColor`. Path data ported verbatim from the
 * mockup (`mathcad-like/project/reference-app.jsx`, the `X` icon map).
 */

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
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

export function BookIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z" />
      <path d="M8 4v15" />
    </Svg>
  );
}

export function FunctionIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M14.5 5.2A2.4 2.4 0 0 0 10 6.4V9" />
      <path d="M7.5 12.5h6" />
      <path d="M13.5 19c-2 .2-3-1-3-3.2V8" />
    </Svg>
  );
}

export function UnitIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="3" y="8" width="18" height="8" rx="1.4" />
      <path d="M7.5 8v3.5M11.5 8v5M15.5 8v3.5" />
    </Svg>
  );
}

export function ConstantIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M5 19V7.5A2.5 2.5 0 0 1 10 7v.5" />
      <path d="M4 11h6" />
      <path d="M13 5l6 14M19 5l-6 14" />
    </Svg>
  );
}

export function SearchIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Svg>
  );
}

export function ChevronRightIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="m9.5 7 5 5-5 5" />
    </Svg>
  );
}

export function CloseIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Svg>
  );
}

export function InsertIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function CopyIcon({ size }: { size?: number }) {
  return (
    <Svg size={size}>
      <rect x="9" y="9" width="11" height="11" rx="1.6" />
      <path d="M5 15V6a1.2 1.2 0 0 1 1.2-1.2H15" />
    </Svg>
  );
}
