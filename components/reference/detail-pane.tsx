"use client";

import type { ReactNode } from "react";
import { Badge, Button, Op } from "@/components/ds";
import type { ReferenceItem } from "@/lib/calc/reference";
import { resolveRelated } from "@/lib/calc/reference";
import { WorkedExampleView } from "./worked-example";
import { InsertIcon, CopyIcon } from "./icons";

const KIND_LABEL = { function: "Function", unit: "Unit", constant: "Constant" } as const;

/**
 * Right pane (flex): the selected item's reference — header (kind, signature,
 * description, actions) and the kind-specific sections (parameters / value /
 * conversion / behaviour / worked example / related). Ported from the mockup's
 * `DetailPanel`, with the worked example rendered live by the engine.
 *
 * `onInsert` is present only in the editor (inserts at the caret); on the
 * standalone page the primary action is Copy.
 */
export function DetailPane({
  item,
  onInsert,
  onCopy,
  onRelated,
}: {
  item: ReferenceItem;
  onInsert?: (item: ReferenceItem) => void;
  onCopy: (item: ReferenceItem) => void;
  onRelated: (item: ReferenceItem) => void;
}) {
  return (
    <div
      key={item.id}
      className="ref-fade-rise"
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--surface-chrome)",
      }}
    >
      {/* header */}
      <div
        style={{
          padding: "20px 22px 18px",
          borderBottom: "1px solid var(--border-hairline)",
          background: "var(--surface-paper)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
          <Badge tone="accent">{KIND_LABEL[item.kind]}</Badge>
          <span style={{ font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            {item.tag}
          </span>
        </div>
        <code style={{ display: "block", font: "600 19px/1.4 var(--font-mono)", color: "var(--text-primary)" }}>
          {item.kind === "function" ? item.sig : item.name}
        </code>
        {item.kind !== "function" && (
          <div style={{ font: "13px/1.4 var(--font-sans)", color: "var(--text-muted)", marginTop: 4 }}>
            {item.sig}
          </div>
        )}
        <p style={{ margin: "12px 0 0", font: "13.5px/1.6 var(--font-sans)", color: "var(--text-primary)", maxWidth: 560 }}>
          {item.desc}
        </p>
        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          {onInsert ? (
            <>
              <Button variant="primary" iconLeft={<InsertIcon size={16} />} onClick={() => onInsert(item)}>
                Insert into worksheet
              </Button>
              <Button variant="ghost" iconLeft={<CopyIcon size={15} />} onClick={() => onCopy(item)}>
                Copy signature
              </Button>
            </>
          ) : (
            <Button variant="primary" iconLeft={<CopyIcon size={15} />} onClick={() => onCopy(item)}>
              Copy signature
            </Button>
          )}
        </div>
      </div>

      {/* body */}
      <div className="scroll-y" style={{ flex: 1, minHeight: 0 }}>
        {item.kind === "function" && (
          <Section eyebrow="Parameters">
            <ParamsTable params={item.params} />
          </Section>
        )}

        {item.kind === "constant" && (
          <Section eyebrow="Value">
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 12,
                padding: "14px 16px",
                border: "1px solid var(--border-hairline)",
                borderRadius: 6,
                background: "var(--surface-raised)",
              }}
            >
              <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic", fontSize: 17, color: "var(--text-math)" }}>
                {item.name}
              </span>
              <Op>=</Op>
              <span style={{ font: "16px/1 var(--font-mono)", color: "var(--text-primary)" }}>{item.value}</span>
              <span style={{ font: "14px/1 var(--font-math)", color: "var(--accent)" }}>{item.unit}</span>
              <span style={{ marginLeft: "auto", font: "11.5px/1 var(--font-sans)", color: "var(--text-muted)" }}>
                {item.source}
              </span>
            </div>
          </Section>
        )}

        {item.kind === "unit" && (
          <Section eyebrow="Conversion">
            <div style={{ display: "flex", gap: 28 }}>
              <div>
                <div style={subLabel}>Base SI</div>
                <span style={{ font: "15px/1 var(--font-mono)", color: "var(--text-primary)" }}>
                  {`1 ${item.name} = ${item.base}`}
                </span>
              </div>
              <div>
                <div style={subLabel}>Dimension</div>
                <span style={{ font: "15px/1 var(--font-math)", color: "var(--text-math)" }}>{item.dim}</span>
              </div>
            </div>
          </Section>
        )}

        {item.kind !== "constant" && item.units && (
          <Section eyebrow="Units behaviour">
            <p style={{ margin: 0, font: "13px/1.6 var(--font-sans)", color: "var(--text-primary)", maxWidth: 560 }}>
              {item.units}
            </p>
          </Section>
        )}

        {item.example && (
          <Section eyebrow="Worked example">
            <div
              className="q-grid-mini"
              style={{
                padding: "16px 18px",
                border: "1px solid var(--border-hairline)",
                borderRadius: 6,
                background: "var(--surface-paper)",
              }}
            >
              <WorkedExampleView spec={item.example} />
            </div>
          </Section>
        )}

        {item.related.length > 0 && (
          <Section eyebrow="Related">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {item.related.map((token) => {
                const target = resolveRelated(token);
                const label = target ? target.name : token;
                return (
                  <button
                    key={token}
                    type="button"
                    disabled={!target}
                    onClick={() => target && onRelated(target)}
                    className="ref-related"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      height: 30,
                      padding: "0 11px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-hairline)",
                      background: "var(--surface-raised)",
                      cursor: target ? "pointer" : "default",
                      color: target ? "var(--text-primary)" : "var(--text-muted)",
                      font: "12.5px/1 var(--font-mono)",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

const subLabel: React.CSSProperties = {
  font: "11px/1 var(--font-sans)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-muted)",
  marginBottom: 6,
};

function Section({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <div style={{ padding: "16px 22px", borderTop: "1px solid var(--border-hairline)" }}>
      <div
        style={{
          font: "600 11px/1 var(--font-sans)",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginBottom: 12,
        }}
      >
        {eyebrow}
      </div>
      {children}
    </div>
  );
}

function ParamsTable({ params }: { params: Array<[string, string, string]> }) {
  const pth: React.CSSProperties = {
    padding: "8px 12px",
    font: "600 10.5px/1 var(--font-sans)",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    color: "var(--text-muted)",
    textAlign: "left",
  };
  const ptd: React.CSSProperties = {
    padding: "9px 12px",
    font: "12.5px/1.45 var(--font-sans)",
    verticalAlign: "top",
  };
  return (
    <div
      style={{
        border: "1px solid var(--border-hairline)",
        borderRadius: 6,
        overflow: "hidden",
        background: "var(--surface-raised)",
      }}
    >
      <table style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "var(--surface-chrome)", borderBottom: "1px solid var(--border-hairline)" }}>
            <th style={{ ...pth, width: 96 }}>Name</th>
            <th style={{ ...pth, width: 110 }}>Type</th>
            <th style={pth}>Description</th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr key={i} style={{ borderTop: i ? "1px solid var(--border-hairline)" : "none" }}>
              <td style={{ ...ptd, fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 500 }}>
                {p[0]}
              </td>
              <td style={{ ...ptd, color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{p[1]}</td>
              <td style={{ ...ptd, color: "var(--text-muted)" }}>{p[2]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
