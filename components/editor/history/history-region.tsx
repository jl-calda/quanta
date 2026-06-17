"use client";

import type { CSSProperties, Dispatch, ReactNode } from "react";
import {
  DEFAULT_DISPLAY,
  type AreaRegion,
  type MathRegion,
  type Region,
  type TextRegion,
} from "@/lib/worksheet/content";
import type { RegionResult } from "@/lib/calc";
import type { DiffStatus } from "@/lib/worksheet/diff";
import { KatexMath } from "../katex-math";
import { Icon } from "../icons";
import type { EditorAction } from "../state/editor-reducer";
import {
  ControlRegionView,
  GenericRegionView,
  ImageRegionView,
  PlotRegionView,
  TableRegionView,
} from "../regions/render-only";

const STATUS_STYLE: Record<Exclude<DiffStatus, "same">, { rule: string; bg: string }> = {
  added: { rule: "var(--status-pass)", bg: "var(--status-pass-bg)" },
  changed: { rule: "var(--status-warning)", bg: "var(--status-warning-bg)" },
  removed: { rule: "var(--status-error)", bg: "var(--status-error-bg)" },
};

/** The render-only views ignore these, but their props require them. */
const passthrough = {
  selected: false,
  editing: false,
  canEdit: false,
  dispatch: (() => {}) as Dispatch<EditorAction>,
};

/** Wrap a rendered region with its diff chrome: tinted fill, status rail, tag. */
export function DiffRegion({ status, children }: { status: DiffStatus; children: ReactNode }) {
  const st = status === "same" ? null : STATUS_STYLE[status];
  const removed = status === "removed";
  return (
    <div
      style={{
        position: "relative",
        padding: "7px 12px",
        marginLeft: -12,
        borderRadius: "var(--radius-sm)",
        background: st ? `color-mix(in srgb, ${st.bg} 60%, transparent)` : "transparent",
        borderLeft: `2px solid ${st ? st.rule : "transparent"}`,
        opacity: removed ? 0.55 : 1,
      }}
    >
      <div
        style={{
          textDecoration: removed ? "line-through" : "none",
          textDecorationColor: "var(--status-error)",
        }}
      >
        {children}
      </div>
      {st && (
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 8,
            font: "9.5px/1 var(--font-sans)",
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: st.rule,
          }}
        >
          {status}
        </span>
      )}
    </div>
  );
}

/**
 * Recursively render a region read-only with its diff status. Areas render as a
 * titled frame and recurse; their children carry their own diff chrome.
 */
export function RegionNode({
  region,
  diff,
  results,
}: {
  region: Region;
  diff: Map<string, DiffStatus> | null;
  results: Map<string, RegionResult>;
}) {
  const status = diff?.get(region.id) ?? "same";
  if (region.type === "area") {
    return (
      <AreaView region={region} status={status}>
        {region.regions.map((child) => (
          <RegionNode key={child.id} region={child} diff={diff} results={results} />
        ))}
      </AreaView>
    );
  }
  return (
    <div style={{ marginLeft: region.indent * 30 }}>
      <DiffRegion status={status}>
        <LeafRegion region={region} result={results.get(region.id)} />
      </DiffRegion>
    </div>
  );
}

function AreaView({
  region,
  status,
  children,
}: {
  region: AreaRegion;
  status: DiffStatus;
  children: ReactNode;
}) {
  const tag = status === "same" ? null : status;
  return (
    <div style={{ marginLeft: region.indent * 30 }}>
      <div
        style={{
          border: "1px solid var(--border-hairline)",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          background: "color-mix(in srgb, var(--surface-chrome) 40%, var(--surface-paper))",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "7px 12px",
            borderBottom: "1px solid var(--border-hairline)",
            background: "var(--surface-chrome)",
          }}
        >
          <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
            <Icon name="chevD" size={16} />
          </span>
          <span style={{ font: "600 12px/1 var(--font-sans)", letterSpacing: "0.02em", color: "var(--text-primary)" }}>
            {region.title}
          </span>
          {tag && (
            <span
              style={{
                marginLeft: "auto",
                font: "9.5px/1 var(--font-sans)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: STATUS_STYLE[tag].rule,
              }}
            >
              {tag}
            </span>
          )}
        </div>
        <div style={{ padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>{children}</div>
      </div>
    </div>
  );
}

/** Leaf read-only renderer: math (committed) / text / render-only types. */
export function LeafRegion({ region, result }: { region: Region; result?: RegionResult }) {
  switch (region.type) {
    case "math":
      return <MathView region={region} result={result} />;
    case "text":
      return <TextView region={region} />;
    case "table":
      return <TableRegionView {...passthrough} region={region} />;
    case "plot":
      return <PlotRegionView {...passthrough} region={region} />;
    case "image":
      return <ImageRegionView {...passthrough} region={region} />;
    case "control":
      return <ControlRegionView {...passthrough} region={region} />;
    default:
      // Areas render via RegionNode (recursing children); never reached here.
      if (region.type === "area") return null;
      return <GenericRegionView {...passthrough} region={region} />;
  }
}

/* ------------------------------------------------------------------ *
 * Math + text (committed, read-only — adapted from the editor's region views)
 * ------------------------------------------------------------------ */

const HEADING_STYLE: Record<1 | 2 | 3, CSSProperties> = {
  1: { font: "600 27px/1.2 var(--font-sans)", letterSpacing: "-0.015em", color: "var(--text-primary)" },
  2: { font: "600 20px/1.3 var(--font-sans)", color: "var(--text-primary)" },
  3: { font: "600 16px/1.3 var(--font-sans)", color: "var(--text-primary)" },
};

function MathView({ region, result }: { region: MathRegion; result?: RegionResult }) {
  if (result?.error) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          color: "var(--text-primary)",
          textDecoration: "underline wavy var(--status-error)",
          textDecorationThickness: "1.5px",
          textUnderlineOffset: "4px",
        }}
      >
        {region.source || "(empty)"}
      </span>
    );
  }

  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };
  const style = result?.style;
  const tone = { fg: style?.color ?? "var(--accent)", bg: style?.fill ?? "var(--accent-tint)" };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", flexWrap: "wrap", columnGap: "0.35em", rowGap: 4 }}>
      {display.formula && result?.tex ? (
        <KatexMath tex={result.tex} size={19} />
      ) : (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>
          {region.source || "Empty formula"}
        </span>
      )}

      {display.substituted && result?.substitutedTex && (
        <span style={{ display: "inline-flex", alignItems: "center", color: "var(--text-muted)" }}>
          <span style={{ fontFamily: "var(--font-math)", padding: "0 0.25em" }}>=</span>
          <KatexMath tex={result.substitutedTex} size={17} />
        </span>
      )}

      {display.result && result?.formatted && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35em" }}>
          <span style={{ fontFamily: "var(--font-math)", fontSize: 19, color: "var(--text-math)" }}>=</span>
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              padding: "1px 8px",
              borderRadius: "var(--radius-sm)",
              background: tone.bg,
              color: tone.fg,
              fontFamily: "var(--font-math)",
              fontSize: 18,
              fontWeight: 600,
            }}
          >
            {result.formatted}
          </span>
          {style?.label && (
            <span
              style={{
                font: "600 var(--text-11)/1 var(--font-sans)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: tone.fg,
              }}
            >
              {style.label}
            </span>
          )}
        </span>
      )}
    </div>
  );
}

function TextView({ region }: { region: TextRegion }) {
  return (
    <div style={{ minHeight: "1.2em" }}>
      {region.eyebrow && (
        <div
          style={{
            font: "600 11px/1 var(--font-sans)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            marginBottom: 5,
          }}
        >
          {region.eyebrow}
        </div>
      )}
      {region.heading ? (
        <div style={HEADING_STYLE[region.heading]}>{region.text || "Heading"}</div>
      ) : (
        <p style={{ margin: 0, font: "13px/1.5 var(--font-sans)", color: "var(--text-muted)", whiteSpace: "pre-wrap" }}>
          {region.text || <span style={{ fontStyle: "italic" }}>Empty note</span>}
        </p>
      )}
    </div>
  );
}
