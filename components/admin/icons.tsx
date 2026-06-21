import type { ReactNode } from "react";

/**
 * Workspace-admin line icons (1.5px stroke, rounded caps) — ported from the
 * Claude Design mockup (`admin-app.jsx` X set). Monochrome, inherit currentColor.
 */

export type AdminIcon = (size?: number) => ReactNode;

function svg(children: ReactNode, s = 18): ReactNode {
  return (
    <svg
      width={s}
      height={s}
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

export const AdminIcons: Record<string, AdminIcon> = {
  members: (s = 18) =>
    svg(
      <>
        <circle cx="9" cy="9" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <circle cx="17.5" cy="9.5" r="2.3" />
        <path d="M16 19a4.4 4.4 0 0 1 5.5-3.7" />
      </>,
      s,
    ),
  roles: (s = 18) =>
    svg(
      <>
        <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        <path d="M9.5 11.5l1.8 1.8 3.5-3.8" />
      </>,
      s,
    ),
  projects: (s = 18) =>
    svg(
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v8A1.5 1.5 0 0 1 17.5 19.5h-13A1.5 1.5 0 0 1 3 18z" />,
      s,
    ),
  templates: (s = 18) =>
    svg(
      <>
        <rect x="3" y="4" width="18" height="16" rx="1.5" />
        <path d="M3 9h18M9 9v11" />
      </>,
      s,
    ),
  branding: (s = 18) =>
    svg(
      <>
        <circle cx="13" cy="11" r="8" />
        <path d="M13 7v8M9 11h8" />
        <circle cx="5" cy="19" r="1.5" />
      </>,
      s,
    ),
  security: (s = 18) =>
    svg(
      <>
        <rect x="5" y="10.5" width="14" height="9.5" rx="1.6" />
        <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      </>,
      s,
    ),
  audit: (s = 18) =>
    svg(
      <>
        <path d="M5 4h10l4 4v12H5z" />
        <path d="M14 4v4h4M8 13h7M8 16.5h5" />
      </>,
      s,
    ),
  billing: (s = 18) =>
    svg(
      <>
        <rect x="3" y="5" width="18" height="14" rx="1.6" />
        <path d="M3 9.5h18M6.5 14.5h4" />
      </>,
      s,
    ),
  plus: (s = 18) => svg(<path d="M12 6v12M6 12h12" />, s),
  search: (s = 18) =>
    svg(
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.2-3.2" />
      </>,
      s,
    ),
  close: (s = 18) => svg(<path d="M6 6l12 12M18 6 6 18" />, s),
  kebab: (s = 18) =>
    svg(
      <>
        <circle cx="12" cy="5" r="1.3" />
        <circle cx="12" cy="12" r="1.3" />
        <circle cx="12" cy="19" r="1.3" />
      </>,
      s,
    ),
  check: (s = 18) => svg(<path d="M5 12l4.5 4.5L19 7" />, s),
  partial: (s = 18) => svg(<path d="M7 12h10" />, s),
  external: (s = 18) =>
    svg(
      <>
        <path d="M14 4h6v6" />
        <path d="M20 4 10 14" />
      </>,
      s,
    ),
};
