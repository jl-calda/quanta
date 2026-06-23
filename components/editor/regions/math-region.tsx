"use client";

import { useKeymap } from "@/lib/preferences/provider";
import { isSymbolic, sourceToLatex } from "@/lib/calc";
import { symbolicCacheHash, SYMBOLIC_PLACEHOLDER } from "@/lib/worksheet/symbolic-cache";
import { DEFAULT_DISPLAY, type MathRegion as MathRegionData } from "@/lib/worksheet/content";
import { KatexMath } from "../katex-math";
import { MathInput } from "../math-input";
import { Icon } from "../icons";
import { useEditor } from "../state/editor-provider";
import { splitResultUnit } from "./math-display";
import { applyModifierSelect } from "./region-select";
import type { RegionRenderProps } from "./types";

/**
 * MathRegion — Quanta's signature live-calculation cell. While editing it
 * offers natural Mathcad-style 2D entry (MathLive, the primary input) with a
 * plain-text mono field as a secondary toggle; when committed it shows crisp
 * textbook notation (KaTeX from the engine's TeX) with a highlighted result +
 * unit and an OK/Fail tag from conditional formatting. Unit-mismatch and parse
 * errors surface inline in the app's voice with a wavy underline.
 */
export function MathRegionView({
  region,
  result,
  editing,
  canEdit,
  multiActive,
  dispatch,
}: RegionRenderProps<MathRegionData>) {
  if (editing && canEdit) {
    return <MathEditor region={region} dispatch={dispatch} />;
  }
  // Symbolic regions (CAS calls like diff / simplify / solve) render their
  // worker-computed result from the cache, never the pure engine's result — the
  // engine can't evaluate free symbols and would surface an undefined-symbol
  // error. Checked before `result?.error` so that error never shows here.
  if (isSymbolic(region.source)) {
    return (
      <MathSymbolic region={region} canEdit={canEdit} multiActive={multiActive} dispatch={dispatch} />
    );
  }
  if (result?.error) {
    return <MathError region={region} message={result.error.message} fix={result.error.fixHint} />;
  }
  return (
    <MathCommitted region={region} result={result} canEdit={canEdit} multiActive={multiActive} dispatch={dispatch} />
  );
}

/* ------------------------------------------------------------------ *
 * Symbolic — the Mathcad symbolic-evaluate operator: formula → result
 * ------------------------------------------------------------------ */

/** The committed formula as TeX, falling back to the raw source if it won't convert. */
function committedTex(source: string): string {
  try {
    return sourceToLatex(source) || source;
  } catch {
    return source;
  }
}

/**
 * A symbolic math region: the formula, the Mathcad symbolic arrow (→), and the
 * SymPy result rendered as TeX. The successful result is read from `region.cache`
 * (written by the symbolic producer, persisted via autosave); while it computes
 * or if it failed, transient status comes from the editor context. A viewer with
 * no cached result sees the same placeholder the PDF export shows.
 */
function MathSymbolic({
  region,
  canEdit,
  multiActive,
  dispatch,
}: Pick<RegionRenderProps<MathRegionData>, "region" | "canEdit" | "multiActive" | "dispatch">) {
  const { symbolicStatus } = useEditor();
  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };
  const status = symbolicStatus.get(region.id);

  const cache = region.cache;
  const fresh = !!cache && cache.v === 1 && cache.hash === symbolicCacheHash(region.source);

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (applyModifierSelect(e, region.id, dispatch, multiActive)) return;
    dispatch(canEdit ? { type: "BEGIN_EDIT", id: region.id } : { type: "SELECT", id: region.id });
  };

  const formula =
    display.formula ? (
      <KatexMath tex={committedTex(region.source)} size={19} />
    ) : (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>
        {region.source || "Empty formula"}
      </span>
    );

  // The result that follows the arrow: fresh TeX, a computing pulse, an error
  // chip in the app's voice, or the export-matching placeholder.
  let resultNode: React.ReactNode;
  if (fresh) {
    resultNode = (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "1px 8px",
          borderRadius: "var(--radius-sm)",
          background: "var(--accent-tint)",
          color: "var(--accent)",
        }}
      >
        <KatexMath tex={cache!.tex} size={18} />
      </span>
    );
  } else if (status?.state === "computing") {
    resultNode = (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, font: "12px/1 var(--font-sans)", color: "var(--text-muted)" }}>
        <Icon name="spinner" size={13} />
        Computing…
      </span>
    );
  } else if (status?.state === "error") {
    return (
      <div onClick={onClick} title={canEdit ? "Click to edit formula" : undefined} style={{ display: "inline-flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", cursor: canEdit ? "text" : "default" }}>
        {formula}
        <SymbolicArrow />
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
          {status.message}
        </span>
      </div>
    );
  } else {
    resultNode = (
      <span style={{ font: "12px/1 var(--font-sans)", color: "var(--text-muted)", fontStyle: "italic" }}>
        {SYMBOLIC_PLACEHOLDER}
      </span>
    );
  }

  return (
    <div
      onClick={onClick}
      title={canEdit ? "Click to edit formula" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: "0.35em",
        rowGap: "var(--ws-math-rowgap)",
        cursor: canEdit ? "text" : "default",
      }}
    >
      {formula}
      <SymbolicArrow />
      {resultNode}
    </div>
  );
}

/** The Mathcad symbolic-evaluate arrow (→), set in the math face. */
function SymbolicArrow() {
  return (
    <span
      aria-label="evaluates symbolically to"
      style={{ fontFamily: "var(--font-math)", fontSize: 19, color: "var(--text-math)" }}
    >
      →
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * Committed — textbook notation + result pill
 * ------------------------------------------------------------------ */

function MathCommitted({
  region,
  result,
  canEdit,
  multiActive,
  dispatch,
}: Pick<RegionRenderProps<MathRegionData>, "region" | "result" | "canEdit" | "multiActive" | "dispatch">) {
  const display = { ...DEFAULT_DISPLAY, ...(region.display ?? {}) };
  const stale = result?.status === "stale";
  const style = result?.style;

  const tone = {
    fg: style?.color ?? "var(--accent)",
    bg: style?.fill ?? "var(--accent-tint)",
  };

  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (applyModifierSelect(e, region.id, dispatch, multiActive)) return;
    dispatch(canEdit ? { type: "BEGIN_EDIT", id: region.id } : { type: "SELECT", id: region.id });
  };

  const formula =
    display.formula && result?.tex ? (
      <KatexMath tex={result.tex} size={19} />
    ) : (
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>
        {region.source || "Empty formula"}
      </span>
    );

  const hasResult = display.result && !!result?.formatted;
  const resultRow = (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35em" }}>
      <span style={{ fontFamily: "var(--font-math)", fontSize: 19, color: "var(--text-math)" }}>=</span>
      <ResultPill formatted={result?.formatted ?? ""} value={result?.value} tone={tone} />
      {style?.label && <StatusLabel label={style.label} color={tone.fg} />}
      {stale && (
        <span style={{ font: "500 var(--text-11)/1 var(--font-sans)", color: "var(--status-warning)" }}>
          stale
        </span>
      )}
    </span>
  );

  // Show-steps — the three-line breakdown (Mockup 6.1 Frame C): the symbolic
  // definition, the formula with values substituted (muted), then the
  // highlighted result. A dashed rule separates each section after the first.
  const showSteps = display.substituted && !!result?.substitutedTex;
  if (showSteps) {
    let shown = 0;
    return (
      <div
        onClick={onClick}
        title={canEdit ? "Click to edit formula" : undefined}
        style={{ display: "flex", flexDirection: "column", gap: "var(--ws-steps-gap)", cursor: canEdit ? "text" : "default", opacity: stale ? 0.6 : 1 }}
      >
        {display.formula && (
          <StepSection header="Name := formula" divider={shown++ > 0}>
            <KatexMath tex={result!.tex} size={19} />
          </StepSection>
        )}
        <StepSection header="Substituted" divider={shown++ > 0}>
          <KatexMath tex={result!.substitutedTex!} size={19} muted />
        </StepSection>
        {hasResult && (
          <StepSection header="Result" divider={shown++ > 0}>
            {resultRow}
          </StepSection>
        )}
      </div>
    );
  }

  // Compact — name = formula = result on one wrapping line (Frames B / E).
  return (
    <div
      onClick={onClick}
      title={canEdit ? "Click to edit formula" : undefined}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        columnGap: "0.35em",
        rowGap: "var(--ws-math-rowgap)",
        cursor: canEdit ? "text" : "default",
        opacity: stale ? 0.6 : 1,
      }}
    >
      {formula}
      {hasResult && resultRow}
    </div>
  );
}

/** The highlighted result chip: magnitude in the math face, the unit as a
 *  distinct smaller upright sans token (Mockup 6.1 `ResUnit`), pill tone from
 *  conditional formatting. */
function ResultPill({
  formatted,
  value,
  tone,
}: {
  formatted: string;
  value: unknown;
  tone: { fg: string; bg: string };
}) {
  const { magnitude, unit } = splitResultUnit(formatted, value);
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.18em",
        padding: "1px 8px",
        borderRadius: "var(--radius-sm)",
        background: tone.bg,
        color: tone.fg,
        fontFamily: "var(--font-math)",
        fontSize: 18,
        fontWeight: 600,
      }}
    >
      <span>{magnitude}</span>
      {unit && (
        <span
          style={{
            fontFamily: "var(--font-sans)",
            fontStyle: "normal",
            fontSize: "0.74em",
            fontWeight: 600,
            letterSpacing: "0.01em",
          }}
        >
          {unit}
        </span>
      )}
    </span>
  );
}

/** OK / Check / Fail tag from a conditional-formatting rule. */
function StatusLabel({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        font: "600 var(--text-11)/1 var(--font-sans)",
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        color,
      }}
    >
      {label}
    </span>
  );
}

/** One labelled section of the show-steps breakdown. */
function StepSection({
  header,
  divider,
  children,
}: {
  header: string;
  divider: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={divider ? { borderTop: "1px dashed var(--border-hairline)", paddingTop: "var(--ws-steps-gap)" } : undefined}>
      <div
        style={{
          font: "600 9px/1 var(--font-sans)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 4,
        }}
      >
        {header}
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Editing — the reusable MathInput seam (MathLive 2D primary, mono secondary)
 * ------------------------------------------------------------------ */

function MathEditor({
  region,
  dispatch,
}: Pick<RegionRenderProps<MathRegionData>, "region" | "dispatch">) {
  const { keymap } = useKeymap();

  const commit = (source: string) => {
    if (source !== region.source) dispatch({ type: "EDIT_SOURCE", id: region.id, source });
    dispatch({ type: "END_EDIT" });
  };

  // Enter commits and opens the next line (no boxed chrome, no eyebrow — the
  // field edits in place where the committed notation sat).
  const advance = (source: string) => dispatch({ type: "EDIT_AND_ADVANCE", id: region.id, source });

  return <MathInput value={region.source} keymap={keymap} onCommit={commit} onEnter={advance} />;
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
  // The full message moved to the bottom Problems toolbar; the region keeps only
  // an unobtrusive marker — the source under a red wavy underline, with the
  // message on hover — so the calculation flow reads cleanly.
  return (
    <span
      title={fix ? `${message} ${fix}` : message}
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
  );
}
