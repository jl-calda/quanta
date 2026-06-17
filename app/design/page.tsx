import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ds";
import { QuantaMark } from "@/components/quanta-mark";
import { Showcase } from "@/components/ds/showcase";

/**
 * /design — the screens index (developer handoff) + a live Foundation
 * showcase of the M3 design-system components. Public, root-level route.
 *
 * The screens catalog is ported from mathcad-like/project/index.html: three
 * groups of cards with line-glyph + dot-grid thumbnails. Cards link to a real
 * route where one exists and are marked "Planned" otherwise. The Foundation
 * section exercises every new DS component (and uses Card for its layout).
 */

export const metadata = {
  title: "Quanta — Design system & screens index",
};

function Svg({ children, size = 30 }: { children: ReactNode; size?: number }) {
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

/* per-screen thumbnail glyphs (1.5px line), ported from index.html */
const G = {
  signin: (
    <Svg>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 5 12 13 21 5" />
    </Svg>
  ),
  dashboard: (
    <Svg>
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </Svg>
  ),
  editor: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 8h18M8 8v12" />
      <path d="M11 12h6M11 15h4" />
    </Svg>
  ),
  templates: (
    <Svg>
      <rect x="3" y="4" width="8" height="7" rx="1" />
      <rect x="13" y="4" width="8" height="7" rx="1" />
      <rect x="3" y="13" width="8" height="7" rx="1" />
      <rect x="13" y="13" width="8" height="7" rx="1" />
    </Svg>
  ),
  files: (
    <Svg>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h3.8l2 2.5h7.2A1.5 1.5 0 0 1 19 10v1" />
      <path d="M3 11h18l-1.5 8.5A1 1 0 0 1 18.5 20H5.5a1 1 0 0 1-1-.8z" />
    </Svg>
  ),
  reference: (
    <Svg>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2z" />
      <path d="M8 4v15M11 9h5M11 12h4" />
    </Svg>
  ),
  settings: (
    <Svg size={28}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2.5v3M12 18.5v3M4.5 4.5l2.1 2.1M17.4 17.4l2.1 2.1M2.5 12h3M18.5 12h3M4.5 19.5l2.1-2.1M17.4 6.6l2.1-2.1" />
    </Svg>
  ),
  shared: (
    <Svg>
      <circle cx="18" cy="6" r="2.4" />
      <circle cx="6" cy="12" r="2.4" />
      <circle cx="18" cy="18" r="2.4" />
      <path d="M8.1 10.8 15.9 7.2M8.1 13.2l7.8 3.6" />
    </Svg>
  ),
  history: (
    <Svg>
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1" />
      <path d="M3.5 4.5V9H8" />
      <path d="M12 8v4.2l3 1.8" />
    </Svg>
  ),
  exportd: (
    <Svg size={28}>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M12 11v6m0 0 2.5-2.5M12 17l-2.5-2.5" />
    </Svg>
  ),
  admin: (
    <Svg>
      <circle cx="9" cy="9" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <circle cx="17.5" cy="9.5" r="2.3" />
      <path d="M16 19a4.4 4.4 0 0 1 5.5-3.7" />
    </Svg>
  ),
  appbar: (
    <Svg>
      <rect x="3" y="6" width="18" height="5" rx="1" />
      <path d="M6 8.5h3M14 8.5h4" />
    </Svg>
  ),
  ribbon: (
    <Svg>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 9h18M7 13h2M11 13h2M15 13h2M7 16h2M11 16h2" />
    </Svg>
  ),
  leftpanel: (
    <Svg>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M9 4v16" />
      <path d="M5 8h2M5 11h2M5 14h2" />
    </Svg>
  ),
  canvas: (
    <Svg>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 7h8M8 11h3M13 11h3M8 15h8" />
    </Svg>
  ),
  mathregion: (
    <Svg>
      <rect x="3" y="6" width="18" height="12" rx="1.5" />
      <path d="M7 10h3M8.5 10v4M14 10l3 4M17 10l-3 4" />
    </Svg>
  ),
  keyboard: (
    <Svg>
      <rect x="3" y="6" width="18" height="12" rx="1.6" />
      <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
    </Svg>
  ),
  empty: (
    <Svg size={28}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" strokeDasharray="3 3" />
      <path d="M12 9v6M9 12h6" />
    </Svg>
  ),
};

interface ScreenItem {
  file: string;
  label: string;
  glyph: ReactNode;
  desc: string;
  href?: string;
  primary?: boolean;
}

interface ScreenGroup {
  group: string;
  note: string;
  items: ScreenItem[];
}

const GROUPS: ScreenGroup[] = [
  {
    group: "Pages — full screens",
    note: "Top-level routes in the app.",
    items: [
      { file: "sign-in", label: "Sign in / Sign up", glyph: G.signin, href: "/sign-in", desc: "Split auth — dark brand panel with live-math motif + tabbed sign-in / create-account form." },
      { file: "dashboard", label: "Dashboard / Home", glyph: G.dashboard, href: "/app", desc: "Signed-in home: nav rail, recents with rendered previews, templates, projects table, empty state." },
      { file: "editor", label: "Worksheet editor", glyph: G.editor, primary: true, desc: "The core screen — app bar, ribbon, 3-column workspace, status bar, floating keypad." },
      { file: "templates", label: "Template gallery", glyph: G.templates, desc: "Filterable template grid with math thumbnails, Your-templates tab, and a Preview drawer." },
      { file: "files", label: "File browser", glyph: G.files, desc: "Project tree + dense data table, multi-select action bar, grid view, empty folder." },
      { file: "reference", label: "Reference library", glyph: G.reference, href: "/reference", desc: "Functions / units / constants browser with worked examples and Insert action." },
      { file: "settings", label: "Settings", glyph: G.settings, desc: "Calculation + Units & formatting sections with a live preview and save patterns." },
      { file: "shared", label: "Shared", glyph: G.shared, desc: "Shared-with-me / by-me tables, activity feed, and the reusable Share dialog." },
      { file: "history", label: "Version history", glyph: G.history, desc: "Timeline, single-version diff highlights, side-by-side compare with synced scroll." },
      { file: "export", label: "Print / export preview", glyph: G.exportd, desc: "WYSIWYG paginated pages + live export options (format, margins, steps, watermark)." },
      { file: "admin", label: "Workspace admin", glyph: G.admin, desc: "Members table + invite modal, roles & permissions matrix, audit log." },
    ],
  },
  {
    group: "Editor component specimens",
    note: "Isolated chrome pieces, shown across states/frames.",
    items: [
      { file: "app-bar", label: "App bar", glyph: G.appbar, desc: "The 40px bar — autosave states, calc controls, status chips, tooltips + zoomed detail." },
      { file: "ribbon", label: "Ribbon", glyph: G.ribbon, desc: "All 11 tabs rendered as frames, plus collapsed state and quick-access strip." },
      { file: "left-panel", label: "Left panel", glyph: G.leftpanel, desc: "Outline / Variables / Files as three live frames, 240px." },
      { file: "math-region", label: "Math region", glyph: G.mathregion, desc: "Natural 2D formula editor — live notation build, unit tokens, show-steps, mode toggle." },
      { file: "canvas", label: "Canvas surface", glyph: G.canvas, desc: "Hybrid-flow column grid: single/multi-column, spanning, indentation, controls." },
    ],
  },
  {
    group: "Component catalogues",
    note: "Cross-cutting pattern boards.",
    items: [
      { file: "empty-states", label: "Empty states", glyph: G.empty, desc: "Eight consistent empty-state cards — icon, headline, supporting line, one action." },
      { file: "keyboard-shortcuts", label: "Keyboard shortcuts", glyph: G.keyboard, desc: "Mathcad-style shortcuts reference, keymap preference, and math input bar with key hints." },
    ],
  },
];

const arrow = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function ScreenCard({ it }: { it: ScreenItem }) {
  const cardClass =
    "group flex flex-col overflow-hidden rounded-md border border-hairline bg-paper transition-[box-shadow,border-color] duration-150 hover:border-accent hover:shadow-[var(--shadow-sm)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]";

  const inner = (
    <>
      <div
        className="relative flex items-center justify-center overflow-hidden border-b border-hairline bg-hover transition-colors duration-150 group-hover:bg-accent-tint"
        style={{ height: "var(--d-thumb-sm)" }}
      >
        <div className="q-grid absolute inset-0 opacity-50" />
        <span
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 60,
            height: 60,
            borderRadius: "var(--radius-md)",
            background: "var(--surface-paper)",
            border: "1px solid var(--border-hairline)",
            color: "var(--accent)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {it.glyph}
        </span>
        {it.primary && (
          <span style={{ position: "absolute", top: 10, right: 10 }}>
            <Badge tone="accent">Core</Badge>
          </span>
        )}
        {!it.href && (
          <span style={{ position: "absolute", top: 10, left: 10 }}>
            <Badge tone="neutral">Planned</Badge>
          </span>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "13px 15px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h3 style={{ margin: 0, font: "600 14px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>{it.label}</h3>
          {it.href && <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>{arrow}</span>}
        </div>
        <p style={{ margin: "6px 0 0", font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>{it.desc}</p>
        <code
          style={{
            marginTop: 11,
            font: "11px/1 var(--font-mono)",
            color: "var(--text-muted)",
            background: "var(--surface-chrome)",
            border: "1px solid var(--border-hairline)",
            borderRadius: 4,
            padding: "4px 7px",
            alignSelf: "flex-start",
          }}
        >
          {it.href ?? `${it.file} · planned`}
        </code>
      </div>
    </>
  );

  if (it.href) {
    return (
      <Link href={it.href} className={cardClass}>
        {inner}
      </Link>
    );
  }
  return <div className={cardClass}>{inner}</div>;
}

const META = [
  "Light & dark theme",
  "Comfortable / Compact density",
  "Typed React on the bound design system",
  "STIX Two math · Geist Sans/Mono",
  "Blueprint accent #1F5FBF",
];

export default function DesignIndexPage() {
  const total = GROUPS.reduce((n, g) => n + g.items.length, 0);
  return (
    <main className="min-h-screen bg-chrome">
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "44px 40px 72px" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <QuantaMark size={30} className="text-accent" />
          <div>
            <div style={{ font: "600 19px/1.1 var(--font-sans)", letterSpacing: "-0.01em", color: "var(--text-primary)" }}>
              Quanta
            </div>
            <div className="q-eyebrow" style={{ marginTop: 3 }}>
              Design system · screens index
            </div>
          </div>
        </div>
        <p style={{ margin: "0 0 8px", font: "14px/1.65 var(--font-sans)", color: "var(--text-primary)", maxWidth: 760 }}>
          The Quanta design-system foundation (M3): the core, form, navigation, feedback and math components recreated as
          typed React on the bound tokens. Below, a live <strong>Foundation</strong> showcase of every component, then a
          catalog of the {total} planned screens. Cards link to a route where it already exists and are marked{" "}
          <strong>Planned</strong> otherwise.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "14px 0 8px" }}>
          {META.map((t) => (
            <span
              key={t}
              style={{
                font: "11.5px/1 var(--font-sans)",
                color: "var(--text-muted)",
                background: "var(--surface-paper)",
                border: "1px solid var(--border-hairline)",
                borderRadius: 99,
                padding: "5px 11px",
              }}
            >
              {t}
            </span>
          ))}
        </div>

        {/* Foundation showcase */}
        <section style={{ marginTop: 36 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              paddingBottom: 12,
              marginBottom: 20,
              borderBottom: "1px solid var(--border-hairline)",
            }}
          >
            <h2 style={{ margin: 0, font: "600 15px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>
              Foundation — components
            </h2>
            <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
              Every M3 component, live, in its variants and states.
            </span>
          </div>
          <Showcase />
        </section>

        {/* Screens catalog */}
        {GROUPS.map((grp) => (
          <section key={grp.group} style={{ marginTop: 36 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                paddingBottom: 12,
                marginBottom: 20,
                borderBottom: "1px solid var(--border-hairline)",
              }}
            >
              <h2 style={{ margin: 0, font: "600 15px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>{grp.group}</h2>
              <span style={{ font: "12.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>{grp.note}</span>
              <span style={{ marginLeft: "auto", font: "11px/1 var(--font-mono)", color: "var(--text-muted)" }}>
                {grp.items.length}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
              {grp.items.map((it) => (
                <ScreenCard key={it.file} it={it} />
              ))}
            </div>
          </section>
        ))}

        {/* handoff note */}
        <div
          style={{
            marginTop: 44,
            padding: "18px 20px",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-paper)",
            display: "flex",
            gap: 14,
            alignItems: "flex-start",
          }}
        >
          <span style={{ display: "inline-flex", color: "var(--accent)", flex: "0 0 auto", marginTop: 1 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4h6v6" />
              <path d="M20 4 10 14" />
              <path d="M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6" />
            </svg>
          </span>
          <div>
            <div style={{ font: "600 13.5px/1.3 var(--font-sans)", color: "var(--text-primary)", marginBottom: 4 }}>
              Foundation milestone (M3)
            </div>
            <p style={{ margin: 0, font: "12.5px/1.6 var(--font-sans)", color: "var(--text-muted)", maxWidth: 760 }}>
              The 21 components live under <code style={{ font: "12px var(--font-mono)", color: "var(--text-primary)" }}>components/ds/</code>{" "}
              (core / forms / navigation / feedback / math), ported 1:1 from the bound design system in{" "}
              <code style={{ font: "12px var(--font-mono)", color: "var(--text-primary)" }}>mathcad-like/project/_ds/</code> and exported
              from <code style={{ font: "12px var(--font-mono)", color: "var(--text-primary)" }}>@/components/ds</code>. The remaining
              screens land in later milestones (M4 editor shell onward).
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
