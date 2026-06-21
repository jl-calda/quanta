"use client";

import {
  constraintToLatex,
  evaluateProgram,
  exprToLatex,
  sourceToLatex,
  type ProgramResult,
  type ProgramStatement,
} from "@/lib/calc";
import type { ProgramRegion } from "@/lib/worksheet/content";
import { useEditor } from "../state/editor-provider";
import { Icon } from "../icons";
import { KatexMath } from "../katex-math";
import type { RegionRenderProps } from "./types";

/**
 * Program block read view (Functional Brief §2 "inline programs", Coverage Matrix
 * B8). Renders a user-defined function (or value) in the Mathcad 2D layout: the
 * signature line `name(params) :=`, then the statement body inside the program
 * bracket (a tall left rule), with if / else-if / otherwise, for, and while shown
 * as indented sub-blocks. The body is structured data (not parsed text), so the
 * layout is exact and the evaluation is the pure, synchronous `evaluateProgram`;
 * this view only reads the published {@link ProgramResult}. Editing the body lives
 * in the inspector.
 */
export function ProgramRegionView({ region }: RegionRenderProps<ProgramRegion>) {
  const { programResults } = useEditor();
  return <ProgramBlock region={region} result={programResults.get(region.id)} />;
}

/** Provider-free variant for read-only contexts (history snapshots, exports). */
export function StaticProgramRegionView({ region }: RegionRenderProps<ProgramRegion>) {
  return <ProgramBlock region={region} result={evaluateProgram(region, {})} />;
}

function ProgramBlock({ region, result }: { region: ProgramRegion; result: ProgramResult | undefined }) {
  const name = region.name?.trim();
  const params = (region.params ?? []).map((p) => p.trim()).filter(Boolean);
  const signature = name
    ? params.length > 0
      ? `${exprToLatex(name)}\\left(${params.map(exprToLatex).join(",\\ ")}\\right)`
      : exprToLatex(name)
    : null;

  return (
    <div style={{ position: "relative", maxWidth: 540 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ font: "600 12px/1 var(--font-sans)", color: "var(--text-primary)" }}>Program</span>
          {name && (
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
              {name}
              {params.length > 0 ? `(${params.join(", ")})` : ""}
            </span>
          )}
          <StatusBadge status={result?.status ?? "empty"} />
        </div>

        {/* signature := program-bracket( body ) */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          {signature && (
            <span style={{ paddingTop: 2 }}>
              <KatexMath tex={`${signature} :=`} size={17} />
            </span>
          )}
          <ProgramBody body={region.body ?? []} />
        </div>

        {/* result / error */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--border-hairline)" }}>
          <ResultArea region={region} result={result} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Body — the Mathcad program bracket (tall left rule) + statement stack
 * ------------------------------------------------------------------ */

function ProgramBody({ body }: { body: ProgramStatement[] }) {
  if (body.length === 0) {
    return (
      <span style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)", fontStyle: "italic" }}>
        Empty program — add statements in the inspector.
      </span>
    );
  }
  return (
    <div
      style={{
        borderLeft: "2px solid var(--border-strong)",
        paddingLeft: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {body.map((stmt, i) => (
        <StatementView key={i} stmt={stmt} />
      ))}
    </div>
  );
}

function Keyword({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ font: "600 12px/1.5 var(--font-mono)", color: "var(--accent)" }}>{children}</span>
  );
}

function StatementView({ stmt }: { stmt: ProgramStatement }) {
  switch (stmt.kind) {
    case "assign":
      return <KatexMath tex={sourceToLatex(`${stmt.target} := ${stmt.expr || "?"}`)} size={16} />;
    case "return":
      return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Keyword>return</Keyword>
          <KatexMath tex={exprToLatex(stmt.expr || "?")} size={16} />
        </span>
      );
    case "if":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {(stmt.branches ?? []).map((b, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Keyword>{i === 0 ? "if" : "else if"}</Keyword>
                <KatexMath tex={constraintToLatex(b.cond || "?")} size={16} />
              </span>
              <div style={{ paddingLeft: 14 }}>
                <ProgramBody body={b.body ?? []} />
              </div>
            </div>
          ))}
          {stmt.otherwise && stmt.otherwise.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <Keyword>otherwise</Keyword>
              <div style={{ paddingLeft: 14 }}>
                <ProgramBody body={stmt.otherwise} />
              </div>
            </div>
          )}
        </div>
      );
    case "for":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Keyword>for</Keyword>
            <KatexMath
              tex={`${exprToLatex(stmt.var || "i")} \\in ${exprToLatex(stmt.from || "1")} \\,..\\, ${exprToLatex(stmt.to || "1")}${stmt.step ? ` \\;(${exprToLatex(stmt.step)})` : ""}`}
              size={16}
            />
          </span>
          <div style={{ paddingLeft: 14 }}>
            <ProgramBody body={stmt.body ?? []} />
          </div>
        </div>
      );
    case "while":
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Keyword>while</Keyword>
            <KatexMath tex={constraintToLatex(stmt.cond || "?")} size={16} />
          </span>
          <div style={{ paddingLeft: 14 }}>
            <ProgramBody body={stmt.body ?? []} />
          </div>
        </div>
      );
  }
}

/* ------------------------------------------------------------------ *
 * Result / status
 * ------------------------------------------------------------------ */

function ResultArea({ region, result }: { region: ProgramRegion; result: ProgramResult | undefined }) {
  if (!result || result.status === "empty") {
    return (
      <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        {region.name ? `Define ${region.name}'s body in the inspector.` : "Name this program and add its body in the inspector."}
      </div>
    );
  }

  if (result.status === "error") {
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
            {result.error?.message ?? "This program could not run."}
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

  if (result.status === "function") {
    const params = result.params.join(", ");
    return (
      <div style={{ font: "12px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        Defines{" "}
        <span style={{ font: "12px/1 var(--font-mono)", color: "var(--text-primary)" }}>
          {result.name}({params})
        </span>{" "}
        — call it from any region below, e.g.{" "}
        <span style={{ font: "12px/1 var(--font-mono)", color: "var(--accent)" }}>
          {result.name}({result.params.map(() => "…").join(", ")})
        </span>
        .
      </div>
    );
  }

  // value
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: "0.16em", flexWrap: "wrap" }}>
      {result.name && <KatexMath tex={`${exprToLatex(result.name)} =`} size={18} />}
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
        {result.formatted}
      </span>
    </span>
  );
}

function StatusBadge({ status }: { status: ProgramResult["status"] }) {
  const map = {
    value: { color: "var(--status-pass)", icon: "check" as const, text: "value" },
    function: { color: "var(--accent)", icon: "solve" as const, text: "function" },
    error: { color: "var(--status-error)", icon: "alertCirc" as const, text: "error" },
    empty: { color: "var(--text-muted)", icon: "dot" as const, text: "set up" },
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
