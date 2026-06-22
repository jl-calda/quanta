"use client";

import { useState, type Dispatch } from "react";
import {
  constraintToLatex,
  evaluateSolve,
  exprToLatex,
  guessSource,
  sourceToLatex,
  type SolveAlgorithm,
  type SolveResult,
} from "@/lib/calc";
import type { SolveRegion } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import type { EditorAction } from "../state/editor-reducer";
import type { SolveEvalStatus } from "../state/use-solve-eval";
import { Icon } from "../icons";
import { KatexMath } from "../katex-math";
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

        {/* Given — guess values */}
        {region.guesses.some((g) => g.var.trim()) && (
          <Section label="Given — guess values">
            {region.guesses
              .filter((g) => g.var.trim())
              .map((g, i) => (
                <KatexMath key={i} tex={sourceToLatex(`${g.var} := ${guessSource(g)}`)} size={17} />
              ))}
          </Section>
        )}

        {/* Constraints */}
        {region.constraints.some((c) => c.trim()) && (
          <Section label="Constraints">
            {region.constraints
              .filter((c) => c.trim())
              .map((c, i) => (
                <KatexMath key={i} tex={constraintToLatex(c)} size={17} />
              ))}
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
