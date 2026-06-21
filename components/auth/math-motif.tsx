"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Frac, Op, Sub, Sup } from "@/components/ds";

/**
 * The signature live-math moment, looping: a spreadsheet-style formula is typed
 * into a region, then commits to crisp textbook notation with a highlighted
 * result + unit and an OK tag. Ported from `Sign in.html`. Honors
 * `prefers-reduced-motion` by showing the committed state with no animation.
 */

const FULL = "M_Ed := w*L^2/8";

const cellStyle: CSSProperties = {
  position: "relative",
  background: "rgba(255,255,255,0.018)",
  border: "1px solid var(--border-hairline)",
  borderRadius: "var(--radius-md)",
  padding: "22px 24px",
  minHeight: 96,
  display: "flex",
  alignItems: "center",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
};

function It({ children }: { children: ReactNode }) {
  return (
    <span style={{ fontFamily: "var(--font-math)", fontStyle: "italic" }}>{children}</span>
  );
}

export function MathMotif() {
  // Start deterministic (matches SSR) and decide motion on mount to avoid a
  // hydration mismatch.
  const [typed, setTyped] = useState("");
  const [phase, setPhase] = useState<"typing" | "committed">("typing");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setTyped(FULL);
      setPhase("committed");
      return;
    }

    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(setTimeout(r, ms)));

    (async function loop() {
      while (alive) {
        setPhase("typing");
        setTyped("");
        await wait(620);
        for (let i = 1; i <= FULL.length && alive; i++) {
          setTyped(FULL.slice(0, i));
          await wait(72);
        }
        await wait(720);
        if (!alive) break;
        setPhase("committed");
        await wait(3600);
      }
    })();

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="auth-motif" style={{ width: "100%", maxWidth: 380 }}>
      {/* region chrome label */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <span
          style={{
            font: "600 11px/1 var(--font-sans)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          Live math
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--border-hairline)" }} />
        <span style={{ font: "11px/1 var(--font-mono)", color: "var(--text-muted)" }}>
          region 03
        </span>
      </div>

      <div style={cellStyle}>
        {phase === "typing" ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                font: "600 10px/1 var(--font-sans)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--accent)",
                border: "1px solid var(--accent)",
                borderRadius: 3,
                padding: "3px 5px",
              }}
            >
              edit
            </span>
            <span
              style={{
                font: "16px/1.3 var(--font-mono)",
                color: "var(--text-primary)",
                whiteSpace: "pre",
              }}
            >
              {typed}
              <span
                className="auth-caret"
                style={{
                  display: "inline-block",
                  width: 2,
                  height: "1.05em",
                  marginLeft: 1,
                  transform: "translateY(0.18em)",
                  background: "var(--accent)",
                }}
              />
            </span>
          </div>
        ) : (
          <div
            className="auth-fade-in"
            style={{
              display: "inline-flex",
              alignItems: "center",
              flexWrap: "wrap",
              columnGap: "0.32em",
              font: "22px/1.15 var(--font-math)",
              color: "var(--text-math)",
            }}
          >
            <Sub base="M" sub="Ed" />
            <Op>=</Op>
            <Frac
              num={
                <span>
                  <It>w</It>
                  <Op>·</Op>
                  <Sup base="L" sup="2" />
                </span>
              }
              den="8"
            />
            <Op>=</Op>
            <span
              style={{
                display: "inline-flex",
                alignItems: "baseline",
                gap: "0.2em",
                padding: "2px 9px",
                borderRadius: "var(--radius-sm)",
                background: "var(--accent-tint)",
                color: "var(--accent)",
                fontFamily: "var(--font-math)",
                fontWeight: 600,
              }}
            >
              <span>27.6</span>
              <span style={{ fontSize: "0.78em" }}>kN·m</span>
            </span>
            <span
              style={{
                marginLeft: "0.3em",
                font: "600 11px/1 var(--font-sans)",
                letterSpacing: "0.02em",
                textTransform: "uppercase",
                color: "var(--status-pass)",
              }}
            >
              OK
            </span>
          </div>
        )}
      </div>

      <p
        style={{
          margin: "14px 2px 0",
          font: "13px/1.5 var(--font-sans)",
          color: "var(--text-muted)",
        }}
      >
        Type a spreadsheet formula. The moment you commit, it reads as textbook
        math — units resolved, result live.
      </p>
    </div>
  );
}
