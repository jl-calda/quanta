"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { applyColonAssign, DEFAULT_KEYMAP_ID } from "@/lib/keymap";
import { DEFAULT_DISPLAY, type MathRegion as MathRegionData } from "@/lib/worksheet/content";
import { KatexMath } from "../katex-math";
import { Icon } from "../icons";
import type { RegionRenderProps } from "./types";

/**
 * MathRegion — Quanta's signature live-calculation cell. Toggles between a raw
 * Mathcad-style formula (Geist Mono) while editing and crisp textbook notation
 * (KaTeX from the engine's TeX) when committed, with a highlighted result + unit
 * and an OK/Fail tag from conditional formatting. Unit-mismatch and parse errors
 * surface inline in the app's voice with a wavy underline.
 */
export function MathRegionView({
  region,
  result,
  editing,
  canEdit,
  dispatch,
}: RegionRenderProps<MathRegionData>) {
  if (editing && canEdit) {
    return <MathEditor region={region} dispatch={dispatch} />;
  }
  if (result?.error) {
    return <MathError region={region} message={result.error.message} fix={result.error.fixHint} />;
  }
  return (
    <MathCommitted region={region} result={result} canEdit={canEdit} dispatch={dispatch} />
  );
}

/* ------------------------------------------------------------------ *
 * Committed — textbook notation + result pill
 * ------------------------------------------------------------------ */

function MathCommitted({
  region,
  result,
  canEdit,
  dispatch,
}: Pick<RegionRenderProps<MathRegionData>, "region" | "result" | "canEdit" | "dispatch">) {
  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };
  const stale = result?.status === "stale";
  const style = result?.style;

  const tone = {
    fg: style?.color ?? "var(--accent)",
    bg: style?.fill ?? "var(--accent-tint)",
  };

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(canEdit ? { type: "BEGIN_EDIT", id: region.id } : { type: "SELECT", id: region.id });
  };

  return (
    <div
      onClick={onClick}
      title={canEdit ? "Click to edit formula" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: "0.35em",
        rowGap: 4,
        cursor: canEdit ? "text" : "default",
        opacity: stale ? 0.6 : 1,
      }}
    >
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
          {stale && (
            <span style={{ font: "500 var(--text-11)/1 var(--font-sans)", color: "var(--status-warning)" }}>
              stale
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Editing — raw mono formula with the Mathcad ':' → ':=' entry move
 * ------------------------------------------------------------------ */

function MathEditor({
  region,
  dispatch,
}: Pick<RegionRenderProps<MathRegionData>, "region" | "dispatch">) {
  const [draft, setDraft] = useState(region.source);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, []);

  const commit = () => {
    if (draft !== region.source) dispatch({ type: "EDIT_SOURCE", id: region.id, source: draft });
    dispatch({ type: "END_EDIT" });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(region.source);
      dispatch({ type: "END_EDIT" });
    } else if (e.key === ":" && DEFAULT_KEYMAP_ID === "mathcad") {
      const el = e.currentTarget;
      const edit = applyColonAssign(el.value, el.selectionStart ?? el.value.length);
      if (edit) {
        e.preventDefault();
        setDraft(edit.value);
        requestAnimationFrame(() => el.setSelectionRange(edit.caret, edit.caret));
      }
    }
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          font: "600 var(--text-11)/1 var(--font-sans)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        edit
      </span>
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        onClick={(e) => e.stopPropagation()}
        spellCheck={false}
        placeholder="e.g. N_Rd := 0.75 · A_s · f_ub"
        style={{
          font: "var(--text-14)/1.3 var(--font-mono)",
          color: "var(--text-primary)",
          background: "var(--surface-raised)",
          border: "1px solid var(--border-focus)",
          boxShadow: "0 0 0 2px color-mix(in srgb, var(--accent) 24%, transparent)",
          borderRadius: "var(--radius-sm)",
          padding: "4px 8px",
          minWidth: Math.max(220, (draft.length + 6) * 8.4),
          outline: "none",
        }}
      />
      <span
        title="Entry mode"
        style={{ display: "inline-flex", border: "1px solid var(--accent)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          title="Natural math (2D) — coming soon"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, color: "var(--text-muted)", fontFamily: "var(--font-math)", fontStyle: "italic", fontSize: 11, opacity: 0.55 }}
        >
          √x
        </span>
        <span
          title="Plain formula (text)"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 600 }}
        >
          Aa
        </span>
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Error — wavy underline + inline message in the app's voice
 * ------------------------------------------------------------------ */

function MathError({
  region,
  message,
  fix,
}: {
  region: MathRegionData;
  message: string;
  fix?: string;
}) {
  return (
    <div style={{ display: "inline-flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          color: "var(--text-primary)",
          textDecoration: "underline wavy var(--status-error)",
          textDecorationThickness: "1.5px",
          textUnderlineOffset: "4px",
          paddingBottom: 1,
        }}
      >
        {region.source || "(empty)"}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          font: "11.5px/1.3 var(--font-sans)",
          color: "var(--status-error)",
          background: "var(--status-error-bg)",
          border: "1px solid color-mix(in srgb, var(--status-error) 30%, transparent)",
          borderRadius: "var(--radius-sm)",
          padding: "4px 7px",
        }}
      >
        <Icon name="alertCirc" size={13} />
        {message}
        {fix && <span style={{ color: "var(--text-muted)" }}>{fix}</span>}
      </span>
    </div>
  );
}
