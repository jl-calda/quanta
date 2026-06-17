import type { ReactNode } from "react";

/**
 * Editor icon set — Lucide-style, 1.5px stroke, geometric, rounded caps,
 * monochrome (inherits `currentColor`). Ported 1:1 from the design mockup
 * (`mathcad-like/project/editor-icons.jsx`) as a typed registry: every glyph is
 * the inner SVG content, wrapped by <Icon> in the standard 24×24 frame.
 */

export type IconName =
  | "menu" | "check" | "refresh" | "play" | "share" | "comment" | "sparkle"
  | "chevD" | "chevR" | "chevL" | "chevU" | "chevDD"
  | "cut" | "copy" | "paste" | "table" | "image" | "area" | "control" | "plot"
  | "solve" | "func" | "unit" | "decimals" | "steps" | "fmt" | "plus" | "plusSm"
  | "kebab" | "kebabH" | "grip" | "indentR" | "indentL" | "spanCols" | "splitCols"
  | "border" | "folder" | "sheet" | "outline" | "varsX" | "gear" | "fit"
  | "alertTri" | "alertCirc" | "dot" | "search" | "eye" | "link" | "lock" | "target";

const GLYPHS: Record<IconName, ReactNode> = {
  menu: (<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>),
  check: <path d="M5 12l4.5 4.5L19 7" />,
  refresh: (<><path d="M20.5 11A8.5 8.5 0 1 0 18 17.5" /><path d="M20.5 5.5V11H15" /></>),
  play: <path d="M8 5.5l10 6.5-10 6.5z" />,
  share: (<><circle cx="18" cy="5.5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="18.5" r="2.4" /><path d="M8.1 10.8 15.9 6.7" /><path d="M8.1 13.2l7.8 4.1" /></>),
  comment: <path d="M5 5h14a1.2 1.2 0 0 1 1.2 1.2v8.4A1.2 1.2 0 0 1 19 15.8H9.5L5.5 19.5V6.2A1.2 1.2 0 0 1 6.7 5z" />,
  sparkle: (<><path d="M12 3.5l1.7 4.6 4.6 1.7-4.6 1.7L12 16.1l-1.7-4.6L5.7 9.8l4.6-1.7z" /><path d="M18.5 14.5l.8 2.1 2.1.8-2.1.8-.8 2.1-.8-2.1-2.1-.8 2.1-.8z" /></>),
  chevD: <path d="m6 9.5 6 6 6-6" />,
  chevR: <path d="m9.5 6 6 6-6 6" />,
  chevL: <path d="m14.5 6-6 6 6 6" />,
  chevU: <path d="m6 14.5 6-6 6 6" />,
  chevDD: (<><path d="m7 6 5 5 5-5" /><path d="m7 13 5 5 5-5" /></>),
  cut: (<><circle cx="6" cy="6" r="2.3" /><circle cx="6" cy="18" r="2.3" /><path d="M7.9 7.5 19 18" /><path d="M7.9 16.5 19 6" /></>),
  copy: (<><rect x="9" y="9" width="11" height="11" rx="1.6" /><path d="M5 15V6a1.2 1.2 0 0 1 1.2-1.2H15" /></>),
  paste: (<><rect x="8" y="4" width="8" height="4" rx="1" /><path d="M8 6H6.2A1.2 1.2 0 0 0 5 7.2v12.6A1.2 1.2 0 0 0 6.2 21h11.6a1.2 1.2 0 0 0 1.2-1.2V7.2A1.2 1.2 0 0 0 17.8 6H16" /></>),
  table: (<><rect x="4" y="5" width="16" height="14" rx="1.6" /><path d="M4 10h16M4 14.5h16M9.5 5v14M14.5 5v14" /></>),
  image: (<><rect x="4" y="5" width="16" height="14" rx="1.6" /><circle cx="9" cy="10" r="1.4" /><path d="M5 17.5l4.2-4 3 2.6 3.3-3.3L19 16" /></>),
  area: (<><path d="M8 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H8" /><path d="M16 4h2.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H16" /></>),
  control: (<><path d="M4 8h8M16 8h4M4 16h4M12 16h8" /><circle cx="14" cy="8" r="2.2" /><circle cx="8" cy="16" r="2.2" /></>),
  plot: (<><path d="M4 4v16h16" /><path d="M7 15.5l3.2-4.2 3 2.2 4.3-6" /></>),
  solve: (<><path d="M9 4H6.5A1.5 1.5 0 0 0 5 5.5v3A2.2 2.2 0 0 1 2.8 10.7 2.2 2.2 0 0 1 5 12.9v3A1.5 1.5 0 0 0 6.5 17.4H9" /><path d="M15 4h2.5A1.5 1.5 0 0 1 19 5.5v3a2.2 2.2 0 0 0 2.2 2.2A2.2 2.2 0 0 0 19 12.9v3a1.5 1.5 0 0 1-1.5 1.5H15" /></>),
  func: (<><path d="M14.5 5.2A2.4 2.4 0 0 0 10 6.4V9" /><path d="M7.5 12.5h6" /><path d="M13.5 19c-2 .2-3-1-3-3.2V8" /></>),
  unit: (<><rect x="3" y="8" width="18" height="8" rx="1.4" /><path d="M7.5 8v3.5M11.5 8v5M15.5 8v3.5" /></>),
  decimals: (<><circle cx="5" cy="18" r="1.2" /><path d="M9 9.5a2.5 2.5 0 1 1 4 1.9C11.5 12.8 9 14 9 17h5" /><path d="M17.5 8v8M17.5 8l3 0" /></>),
  steps: (<><path d="M8 6h12M8 12h12M8 18h8" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>),
  fmt: (<><path d="M5 7h14" /><path d="M5 12h9" /><path d="M5 17h12" /><path d="M17 14l2 2 3-3.5" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  plusSm: <path d="M12 6.5v11M6.5 12h11" />,
  kebab: (<><circle cx="12" cy="5" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="12" cy="19" r="1.4" /></>),
  kebabH: (<><circle cx="5" cy="12" r="1.4" /><circle cx="12" cy="12" r="1.4" /><circle cx="19" cy="12" r="1.4" /></>),
  grip: (<><circle cx="9" cy="6" r="1.25" /><circle cx="15" cy="6" r="1.25" /><circle cx="9" cy="12" r="1.25" /><circle cx="15" cy="12" r="1.25" /><circle cx="9" cy="18" r="1.25" /><circle cx="15" cy="18" r="1.25" /></>),
  indentR: (<><path d="M4 6h16" /><path d="M11 12h9" /><path d="M4 18h16" /><path d="M4 9.5 7 12l-3 2.5" /></>),
  indentL: (<><path d="M4 6h16" /><path d="M11 12h9" /><path d="M4 18h16" /><path d="M7 9.5 4 12l3 2.5" /></>),
  spanCols: (<><path d="M3 6v12M21 6v12" /><path d="M7.5 12h9" /><path d="M10 9l-2.5 3 2.5 3M14 9l2.5 3-2.5 3" /></>),
  splitCols: (<><path d="M12 4.5v15" /><path d="M4 8.5h4.5M4 12h4.5M4 15.5h4.5M15.5 8.5H20M15.5 12H20M15.5 15.5H20" /></>),
  border: <rect x="4" y="4" width="16" height="16" rx="1.5" />,
  folder: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v8A1.5 1.5 0 0 1 17.5 19.5h-13A1.5 1.5 0 0 1 3 18z" />,
  sheet: (<><rect x="5" y="3" width="14" height="18" rx="1.6" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>),
  outline: (<><path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" /></>),
  varsX: <path d="M7 7.5l9.5 9M16.5 7.5 7 16.5" />,
  gear: (<><circle cx="12" cy="12" r="3" /><path d="M12 2.5v3M12 18.5v3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M2.5 12h3M18.5 12h3M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1" /></>),
  fit: (<><path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9" /><path d="M20 9V5.5A1.5 1.5 0 0 0 18.5 4H15" /><path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20H9" /><path d="M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15" /></>),
  alertTri: (<><path d="M10.3 4.2 2.2 18a1.6 1.6 0 0 0 1.4 2.4h16.8a1.6 1.6 0 0 0 1.4-2.4L13.7 4.2a1.6 1.6 0 0 0-3.4 0z" /><path d="M12 9.5v4" /><path d="M12 17h.01" /></>),
  alertCirc: (<><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></>),
  dot: <circle cx="12" cy="12" r="4" />,
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>),
  eye: (<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>),
  link: (<><path d="M9.5 14.5 14.5 9.5" /><path d="M11 7l1-1a3.5 3.5 0 0 1 5 5l-1 1" /><path d="M13 17l-1 1a3.5 3.5 0 0 1-5-5l1-1" /></>),
  lock: (<><rect x="5" y="10.5" width="14" height="9.5" rx="1.6" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>),
  target: (<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /><circle cx="12" cy="12" r="0.6" /></>),
};

export interface IconProps {
  name: IconName;
  size?: number;
}

export function Icon({ name, size = 18 }: IconProps) {
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
      {GLYPHS[name]}
    </svg>
  );
}
