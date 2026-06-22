"use client";

import { useState, type Dispatch } from "react";
import {
  constraintToLatex,
  evaluateSolve,
  exprToLatex,
  guessSource,
  parseGuessLine,
  sourceToLatex,
  type SolveAlgorithm,
  type SolveResult,
} from "@/lib/calc";
import type { SolveRegion } from "@/lib/worksheet/content";
import { useKeymap } from "@/lib/preferences/provider";
import { useEditor } from "../state/editor-provider";
import type { EditorAction } from "../state/editor-reducer";
import type { SolveEvalStatus } from "../state/use-solve-eval";
import { Icon } from "../icons";
import { KatexMath } from "../katex-math";
import { MathField } from "../math-field";
import type { RegionRenderProps } from "./types";

/**
 * Solve block read view (Functional Brief §6.5, mockup `solve-block.html`). The
 * bordered Given / Constraints / Solve block renders its guesses and constraints
 * as committed STIX math and binds the solution to the unknown names with units.
 * Editing (guess rows, constraints, algorithm, tolerances) lives in the
 * inspector — only the algorithm has an inline quick-switch here, mirroring the
 * plot's inline title/axis edits. The numeric solve is the pure, synchronous
 * `evaluateSolve`; this view just reads the published `SolveResult`.
 */
export function SolveRegionView({ region, canEdit, dispatch }: RegionRenderProps<SolveRegion>) {
  const { solveResults, solveStatus } = useEditor();
  const result = solveResults.get(region.id);
  return (
    <SolveBlock
      region={region}
      result={result}
      evalStatus={solveStatus.get(region.id)}
      canEdit={canEdit}
      dispatch={dispatch}
    />
  );
}

/**
 * Provider-free variant for read-only contexts (history snapshots). Solves
 * against an empty scope, so constraints referencing worksheet names show their
 * inline error — acceptable for a static snapshot; the live editor binds scope.
 */
export function StaticSolveRegionView({ region }: RegionRenderProps<SolveRegion>) {
  const result = evaluateSolve(region, {});
  return <SolveBlock region={region} result={result} evalStatus={undefined} canEdit={false} dispatch={undefined} />;
}

/* ------------------------------------------------------------------ *
 * The block
 * ------------------------------------------------------------------ */

const ALGO_LABEL: Record<SolveAlgorithm, string> = {
  find: "find",
  minimize: "minimize",
  maximize: "maximize",
  minerr: "minerr",
  odesolve: "Odesolve",
  pdesolve: "Pdesolve",
  numol: "numol",
};

const ALGO_OPTS: { id: SolveAlgorithm; desc: string }[] = [
  { id: "find", desc: "Solve equations exactly" },
  { id: "minimize", desc: "Least value of an objective" },
  { id: "maximize", desc: "Greatest value of an objective" },
  { id: "minerr", desc: "Best fit when no exact solution" },
  { id: "odesolve", desc: "Differential equations · ships next" },
  { id: "pdesolve", desc: "Partial differential equations · ships next" },
  { id: "numol", desc: "Method of lines · ships next" },
];

function SolveBlock({
  region,
  result,
  evalStatus,
  canEdit,
  dispatch,
}: {
  region: SolveRegion;
  result: SolveResult | undefined;
  evalStatus: SolveEvalStatus | undefined;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction> | undefined;
}) {
  // An in-flight / failed ODE integration overrides the (pure) result status badge.
  const status = evalStatus?.state === "computing"
    ? "computing"
    : evalStatus?.state === "error"
      ? "error"
      : result?.status ?? "empty";
  const unknowns = result?.unknowns ?? region.guesses.map((g) => g.var).filter(Boolean);
  const vars = unknowns.join(", ");

  // Inline editing is offered only in the live editor (the static history view has
  // no dispatch and no preferences provider, so it must stay hook-free).
  const editable = canEdit && !!dispatch;

  // Commit a single guess: parse the `var := value` line back, MERGING onto the
  // existing guess so first-class bounds (lower/upper/integer/discrete) survive.
  // The unit folds into `value` (engine-equivalent — see parseGuessLine).
  const commitGuess = (i: number, src: string) => {
    const parsed = parseGuessLine(src, region.guesses[i]?.var ?? "");
    if (!parsed.value.trim()) return; // empty RHS is a no-op — remove guesses in the inspector
    const next = region.guesses.map((g, j) =>
      j === i ? { ...g, var: parsed.var, value: parsed.value, unit: undefined } : g,
    );
    dispatch?.({ type: "SET_REGION_PROP", id: region.id, patch: { guesses: next } });
  };

  // Commit a single constraint: replace it, or drop it when cleared (mirrors the
  // inspector's blank-line filtering). Constraints stay a plain `string[]`.
  const commitConstraint = (i: number, src: string) => {
    const trimmed = src.trim();
    const next = trimmed
      ? region.constraints.map((c, j) => (j === i ? trimmed : c))
      : region.constraints.filter((_, j) => j !== i);
    dispatch?.({ type: "SET_REGION_PROP", id: region.id, patch: { constraints: next } });
  };

  return (
    <div style={{ position: "relative", maxWidth: 520 }}>
      {/* the bordered block — the accent left rule is the Mathcad solve-block frame */}
      <div
        style={{
          border: "1px solid var(--border-strong)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-raised)",
          padding: "12px 16px 14px",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ font: "600 12px/1 var(--font-sans)", color: "var(--text-primary)" }}>Solve block</span>
          {region.name && (
            <span
              style={{
                font: "11px/1 var(--font-mono)",
                color: "var(--text-muted)",
                background: "var(--surface-chrome)",
                border: "1px solid var(--border-hairline)",
                borderRadius: 3,
                padding: "2px 5px",
              }}
            >
              {region.name}
            </span>
          )}
          <StatusBadge status={status} />
        </div>

        {/* Given — guess values (click to edit inline; map originals to keep indices) */}
        {region.guesses.some((g) => g.var.trim()) && (
          <Section label="Given — guess values">
            {region.guesses.map((g, i) => {
              if (!g.var.trim()) return null;
              const source = `${g.var} := ${guessSource(g)}`;
              const tex = sourceToLatex(source);
              return editable ? (
                <InlineEditableLine
                  key={i}
                  idleTex={tex}
                  seedValue={source}
                  ariaLabel={`Edit guess for ${g.var}`}
                  onCommit={(src) => commitGuess(i, src)}
                />
              ) : (
                <KatexMath key={i} tex={tex} size={17} />
              );
            })}
          </Section>
        )}

        {/* Constraints (click to edit inline; seed via constraintToLatex so relations render) */}
        {region.constraints.some((c) => c.trim()) && (
          <Section label="Constraints">
            {region.constraints.map((c, i) => {
              if (!c.trim()) return null;
              const tex = constraintToLatex(c);
              return editable ? (
                <InlineEditableLine
                  key={i}
                  idleTex={tex}
                  seedValue={c}
                  seedLatex={tex}
                  ariaLabel={`Edit constraint ${c}`}
                  onCommit={(src) => commitConstraint(i, src)}
                />
              ) : (
                <KatexMath key={i} tex={tex} size={17} />
              );
            })}
          </Section>
        )}

        {/* objective (minimize / maximize) */}
        {(region.algorithm === "minimize" || region.algorithm === "maximize") && region.objective?.trim() && (
          <Section label="Objective">
            <KatexMath tex={exprToLatex(region.objective)} size={17} />
          </Section>
        )}

        {/* solver call */}
        <div
          style={{
            font: "600 9.5px/1 var(--font-sans)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
            margin: "12px 0 7px",
          }}
        >
          Solve
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, paddingLeft: 4, flexWrap: "wrap" }}>
          <KatexMath tex={`\\left(${vars || "\\;"}\\right) :=`} size={17} />
          <span style={{ margin: "0 6px" }}>
            <AlgoMenu
              algo={region.algorithm}
              canEdit={canEdit}
              onSelect={(a) => dispatch?.({ type: "SET_REGION_PROP", id: region.id, patch: { algorithm: a } })}
            />
          </span>
          <KatexMath tex={`\\left(${vars || "\\;"}\\right)`} size={17} />
        </div>

        {/* result / error */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-hairline)" }}>
          <ResultArea region={region} result={result} evalStatus={evalStatus} />
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          font: "600 9.5px/1 var(--font-sans)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          margin: "10px 0 7px",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7, paddingLeft: 4 }}>{children}</div>
    </div>
  );
}

/**
 * Inline click-to-edit for one guess or constraint — the in-block alternative to
 * inspector-only editing, mirroring the `AlgoMenu` quick-switch. Idle, it shows the
 * committed KaTeX inside a reset `<button>` (so it inherits the global 2px blueprint
 * focus ring and is keyboard-activatable); a click swaps in a MathLive field seeded
 * from the same source. Commit (Enter / blur) and cancel (Esc) come from `MathField`;
 * the parent maps the committed plain-text source back into the region. Rendered only
 * on the editable path, so `useKeymap` never runs in the provider-free static view.
 */
function InlineEditableLine({
  idleTex,
  seedValue,
  seedLatex,
  ariaLabel,
  onCommit,
}: {
  idleTex: string;
  seedValue: string;
  seedLatex?: string;
  ariaLabel: string;
  onCommit: (source: string) => void;
}) {
  const { keymap } = useKeymap();
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <MathField
        value={seedValue}
        seedLatex={seedLatex}
        keymap={keymap}
        onCommit={(src) => {
          setEditing(false);
          onCommit(src);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <button
      type="button"
      title="Click to edit"
      aria-label={ariaLabel}
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-hover)";
        e.currentTarget.style.borderColor = "var(--border-hairline)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        alignSelf: "flex-start",
        border: "1px solid transparent",
        borderRadius: 4,
        background: "transparent",
        padding: "1px 4px",
        margin: "-1px -4px",
        cursor: "text",
        font: "inherit",
        color: "inherit",
        textAlign: "left",
      }}
    >
      <KatexMath tex={idleTex} size={17} />
    </button>
  );
}

function StatusBadge({ status }: { status: SolveResult["status"] | "computing" }) {
  const map = {
    solved: { color: "var(--status-pass)", icon: "check" as const, text: "converged" },
    "no-solution": { color: "var(--status-error)", icon: "alertCirc" as const, text: "no solution" },
    error: { color: "var(--status-error)", icon: "alertCirc" as const, text: "error" },
    deferred: { color: "var(--text-muted)", icon: "dot" as const, text: "ships next" },
    empty: { color: "var(--text-muted)", icon: "dot" as const, text: "set up" },
    computing: { color: "var(--accent)", icon: "dot" as const, text: "integrating" },
  }[status];
  return (
    <span
      style={{
        marginLeft: "auto",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        font: "10px/1 var(--font-sans)",
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        fontWeight: 600,
        color: map.color,
      }}
    >
      <Icon name={map.icon} size={13} /> {map.text}
    </span>
  );
}

function ResultArea({
  region,
  result,
  evalStatus,
}: {
  region: SolveRegion;
  result: SolveResult | undefined;
  evalStatus: SolveEvalStatus | undefined;
}) {
  // An ODE integration in flight / failed takes precedence over the cached result.
  if (evalStatus?.state === "computing") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, font: "12px/1.5 var(--font-sans)", color: "var(--accent)" }}>
        <Icon name="solve" size={15} /> Integrating the ODE…
      </div>
    );
  }
  if (evalStatus?.state === "error") {
    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "10px 12px",
          borderRadius: "var(--radius-sm)",
          background: "var(--status-error-bg)",
          border: "1px solid color-mix(in srgb, var(--status-error) 28%, transparent)",
        }}
      >
        <span style={{ display: "inline-flex", color: "var(--status-error)", flex: "0 0 auto", marginTop: 1 }}>
          <Icon name="alertCirc" size={16} />
        </span>
        <div style={{ font: "600 12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>{evalStatus.message}</div>
      </div>
    );
  }

  if (!result || result.status === "empty") {
    return (
      <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        Add guess values and constraints in the inspector, then this block solves for{" "}
        {region.guesses.map((g) => g.var).filter(Boolean).join(", ") || "the unknowns"}.
      </div>
    );
  }

  if (result.status === "deferred") {
    return <DeferredNote region={region} />;
  }

  if (result.status === "no-solution" || result.status === "error") {
    return (
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "10px 12px",
          borderRadius: "var(--radius-sm)",
          background: "var(--status-error-bg)",
          border: "1px solid color-mix(in srgb, var(--status-error) 28%, transparent)",
        }}
      >
        <span style={{ display: "inline-flex", color: "var(--status-error)", flex: "0 0 auto", marginTop: 1 }}>
          <Icon name="alertCirc" size={16} />
        </span>
        <div>
          <div style={{ font: "600 12.5px/1.4 var(--font-sans)", color: "var(--status-error)" }}>
            {result.error?.message ?? "No solution found"}
          </div>
          {result.error?.fixHint && (
            <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-primary)", marginTop: 2 }}>
              {result.error.fixHint}
            </div>
          )}
        </div>
      </div>
    );
  }

  // solved
  const extra = result.solutionSets && result.solutionSets.length > 1 ? result.solutionSets : null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {result.outputs.map((out) => (
        <span key={out.name} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.16em", flexWrap: "wrap" }}>
          <KatexMath tex={`${exprToLatex(out.name)} =`} size={18} />
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: "0.16em",
              padding: "1px 8px",
              borderRadius: 4,
              marginLeft: "0.12em",
              background: "var(--accent-tint)",
              color: "var(--accent)",
              fontWeight: 600,
              font: "600 16px/1.2 var(--font-math)",
            }}
          >
            {out.formatted}
          </span>
        </span>
      ))}
      {extra && <SolutionSets sets={extra} />}
    </div>
  );
}

/** Additional solution sets from a multi-start / discrete solve (display-only; the first exports to scope). */
function SolutionSets({ sets }: { sets: NonNullable<SolveResult["solutionSets"]> }) {
  return (
    <div style={{ marginTop: 6, paddingTop: 8, borderTop: "1px solid var(--border-hairline)" }}>
      <div
        style={{
          font: "600 9.5px/1 var(--font-sans)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 7,
        }}
      >
        Solutions ({sets.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {sets.map((s, i) => (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", gap: "0 14px", font: "12px/1.5 var(--font-mono)", color: i === 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
            {s.outputs.map((o) => (
              <span key={o.name}>
                {o.name} = {o.formatted}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A faithful 'ships next' placeholder for the deferred ODE/PDE algorithms. */
function DeferredNote({ region }: { region: SolveRegion }) {
  const ode = region.ode;
  const rows: [string, string][] = [];
  if (ode?.system?.length) rows.push(["System", ode.system.filter(Boolean).join(",  ")]);
  if (ode?.indepVar) rows.push(["Independent", ode.indepVar]);
  if (ode?.range && (ode.range.min != null || ode.range.max != null))
    rows.push(["Range", `${ode.range.min ?? "—"} … ${ode.range.max ?? "—"}`]);
  if (ode?.conditions?.length) rows.push(["Conditions", ode.conditions.filter(Boolean).join(",  ")]);
  if (ode?.step != null) rows.push(["Step", String(ode.step)]);
  if (ode?.mesh != null) rows.push(["Mesh", String(ode.mesh)]);

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: "var(--radius-sm)",
        background: "var(--surface-chrome)",
        border: "1px solid var(--border-hairline)",
      }}
    >
      <span style={{ display: "inline-flex", color: "var(--text-muted)", flex: "0 0 auto", marginTop: 1 }}>
        <Icon name="solve" size={16} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ font: "600 12.5px/1.4 var(--font-sans)", color: "var(--text-primary)" }}>
          {ALGO_LABEL[region.algorithm]} ships next
        </div>
        <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", marginTop: 2 }}>
          The differential-equation integrator lands with the SciPy engine. This block&rsquo;s configuration is saved.
        </div>
        {rows.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 12px", marginTop: 8 }}>
            {rows.map(([k, v]) => (
              <ConfigRow key={k} k={k} v={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConfigRow({ k, v }: { k: string; v: string }) {
  return (
    <>
      <span style={{ font: "11px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>{k}</span>
      <span style={{ font: "11.5px/1.4 var(--font-mono)", color: "var(--text-primary)", overflowWrap: "anywhere" }}>{v}</span>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Algorithm quick-switch menu (ports the mockup dropdown)
 * ------------------------------------------------------------------ */

function AlgoMenu({
  algo,
  canEdit,
  onSelect,
}: {
  algo: SolveAlgorithm;
  canEdit: boolean;
  onSelect: (a: SolveAlgorithm) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canEdit) {
    return (
      <span style={{ font: "13px/1 var(--font-mono)", color: "var(--accent)" }}>{ALGO_LABEL[algo]}</span>
    );
  }

  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          height: 22,
          padding: "0 6px",
          borderRadius: 4,
          border: "1px solid " + (open ? "var(--accent)" : "var(--border-strong)"),
          background: "var(--surface-raised)",
          cursor: "pointer",
          font: "13px/1 var(--font-mono)",
          color: "var(--accent)",
          verticalAlign: "middle",
        }}
      >
        {ALGO_LABEL[algo]}
        <span style={{ color: "var(--text-muted)", display: "inline-flex" }}>
          <Icon name="chevD" size={13} />
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            width: 260,
            zIndex: 30,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-hairline)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-popover)",
            padding: 4,
          }}
        >
          {ALGO_OPTS.map((opt) => {
            const active = opt.id === algo;
            return (
              <button
                key={opt.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(opt.id);
                  setOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 8,
                  width: "100%",
                  padding: "6px 8px",
                  border: "none",
                  borderRadius: 4,
                  background: active ? "var(--accent-tint)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                <span style={{ font: "12.5px/1.2 var(--font-mono)", color: active ? "var(--accent)" : "var(--text-primary)", minWidth: 72 }}>
                  {ALGO_LABEL[opt.id]}
                </span>
                <span style={{ font: "11px/1.3 var(--font-sans)", color: "var(--text-muted)" }}>{opt.desc}</span>
              </button>
            );
          })}
        </div>
      )}
    </span>
  );
}
