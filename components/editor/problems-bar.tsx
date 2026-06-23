"use client";

import { useMemo } from "react";
import { useEditor } from "./state/editor-provider";
import { scrollToRegion } from "./scroll-to-region";
import { Icon } from "./icons";
import { collectProblems, type Problem } from "./problems";

/**
 * ProblemsBar — the collapsible status toolbar that gathers every region
 * evaluation error into one bottom strip, so the worksheet itself stays clean
 * (each region keeps only a subtle marker). Errors are read from the recalc
 * results via {@link collectProblems}; clicking an entry selects + scrolls to the
 * offending region. The bar is hidden entirely when there are no problems and is
 * expanded/collapsed from the status-bar count (`TOGGLE_PROBLEMS`).
 */
export function ProblemsBar() {
  const { state, dispatch } = useEditor();
  const problems = useMemo(
    () => collectProblems(state.content, state.results),
    [state.content, state.results],
  );

  if (problems.length === 0) return null;

  const open = state.ui.problemsOpen;
  const count = problems.length;

  const openRegion = (id: string) => {
    dispatch({ type: "SELECT", id });
    requestAnimationFrame(() => scrollToRegion(id));
  };

  return (
    <section
      aria-label="Problems"
      style={{
        flex: "0 0 auto",
        display: "flex",
        flexDirection: "column",
        background: "var(--surface-chrome)",
        borderTop: "1px solid var(--border-hairline)",
        font: "11.5px/1 var(--font-sans)",
        color: "var(--text-muted)",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => dispatch({ type: "TOGGLE_PROBLEMS" })}
        title={open ? "Collapse problems" : "Expand problems"}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 28,
          padding: "0 12px",
          border: "none",
          background: "transparent",
          color: "var(--text-primary)",
          font: "600 11.5px/1 var(--font-sans)",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <Icon name={open ? "chevD" : "chevR"} size={14} />
        <span style={{ display: "inline-flex", color: "var(--status-error)" }}>
          <Icon name="alertCirc" size={14} />
        </span>
        Problems
        <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>
          {count} {count === 1 ? "problem" : "problems"}
        </span>
      </button>

      {open && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "2px 0 6px",
            maxHeight: 180,
            overflowY: "auto",
            borderTop: "1px solid var(--border-hairline)",
          }}
        >
          {problems.map((p) => (
            <ProblemRow key={p.regionId} problem={p} onOpen={() => openRegion(p.regionId)} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ProblemRow({ problem, onOpen }: { problem: Problem; onOpen: () => void }) {
  const { message, fixHint, label } = problem;
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        title={fixHint ? `${message} ${fixHint}` : message}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          padding: "5px 12px 5px 34px",
          border: "none",
          background: "transparent",
          font: "12px/1.4 var(--font-sans)",
          color: "var(--text-primary)",
          cursor: "pointer",
          textAlign: "left",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span style={{ display: "inline-flex", flex: "0 0 auto", color: "var(--status-error)" }}>
          <Icon name="alertCirc" size={13} />
        </span>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {message}
          {fixHint && <span style={{ color: "var(--text-muted)" }}> {fixHint}</span>}
        </span>
        <span
          style={{
            flex: "0 0 auto",
            maxWidth: "40%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            font: "11px/1.4 var(--font-mono)",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
      </button>
    </li>
  );
}
