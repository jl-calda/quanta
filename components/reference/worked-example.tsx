"use client";

import { useMemo } from "react";
import { runExample, type WorkedExample } from "@/lib/calc/reference";
import { KatexMath } from "@/components/editor/katex-math";

/**
 * The detail pane's live worked example. Runs the spec through the calc engine
 * ({@link runExample}) and renders the computed lines — so the value shown is the
 * value the engine produces, and can never drift from a hard-coded string. The
 * last line is highlighted as the result with its computed unit.
 */
export function WorkedExampleView({ spec }: { spec: WorkedExample }) {
  const run = useMemo(() => runExample(spec), [spec]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
        {spec.caption}
      </div>

      {spec.table && <ExampleTable table={spec.table} />}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {run.lines.map((line, i) =>
          line.isResult ? (
            <ResultLine key={i} tex={line.tex} formatted={line.formatted} tone={spec.tone} />
          ) : (
            <div key={i} style={{ display: "flex", alignItems: "center" }}>
              <KatexMath tex={line.tex} size={16} />
            </div>
          ),
        )}
      </div>

      {!run.ok && (
        <div style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--status-error)" }}>
          This example couldn&apos;t be evaluated: {run.error}
        </div>
      )}
    </div>
  );
}

/**
 * The highlighted result line: the full definition (`name := formula`) followed
 * by `= [chip]`, where the chip carries the engine's computed value + unit.
 */
function ResultLine({
  tex,
  formatted,
  tone = "accent",
}: {
  tex: string;
  formatted: string;
  tone?: "accent" | "pass";
}) {
  const isPass = tone === "pass";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <KatexMath tex={tex} size={18} />
      <span style={{ fontFamily: "var(--font-math)", color: "var(--text-math)", fontSize: 18 }}>=</span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "baseline",
          padding: "1px 8px",
          borderRadius: 4,
          fontFamily: "var(--font-math)",
          fontSize: 18,
          fontWeight: 600,
          background: isPass ? "var(--status-pass-bg)" : "var(--accent-tint)",
          color: isPass ? "var(--status-pass)" : "var(--accent)",
        }}
      >
        {formatted}
      </span>
    </div>
  );
}

const thh: React.CSSProperties = {
  padding: "5px 10px",
  font: "600 10.5px/1 var(--font-sans)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "var(--text-muted)",
  textAlign: "left",
};
const tdc: React.CSSProperties = {
  padding: "5px 10px",
  font: "12px/1.3 var(--font-mono)",
  color: "var(--text-primary)",
};

function ExampleTable({
  table,
}: {
  table: NonNullable<WorkedExample["table"]>;
}) {
  const highlight = new Set(table.highlightRows ?? []);
  return (
    <div
      style={{
        border: "1px solid var(--border-hairline)",
        borderRadius: 4,
        overflow: "hidden",
        maxWidth: 320,
      }}
    >
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "var(--surface-chrome)" }}>
            {table.headers.map((h, i) => (
              <th key={i} style={thh}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, r) => (
            <tr
              key={r}
              style={{
                borderTop: "1px solid var(--border-hairline)",
                background: highlight.has(r) ? "var(--accent-tint)" : "transparent",
              }}
            >
              {row.map((cell, c) => (
                <td key={c} style={tdc}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
