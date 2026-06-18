"use client";

import { useState } from "react";
import { Badge, IconButton } from "@/components/ds";
import { useEditor } from "./state/editor-provider";
import { Icon } from "./icons";

/**
 * Ask Quanta AI — the right-edge drawer opened from the app-bar AI button
 * (Func §5.1 "AI button opens a panel"). The assistant itself ships in a later
 * milestone (M11 · export/AI), so this is an honest, on-brand shell: it shows
 * what the assistant will do and a composer that clearly reports it isn't
 * connected yet — no fabricated responses.
 */
const PROMPTS = [
  "Explain the calculations in this worksheet",
  "Check my units and assumptions",
  "Suggest a load combination to add",
];

export function AiPanel() {
  const { dispatch } = useEditor();
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState(false);

  const send = () => {
    if (!draft.trim()) return;
    setNotice(true);
  };

  return (
    <aside
      aria-label="Ask Quanta AI"
      style={{
        width: 320,
        flex: "0 0 320px",
        borderLeft: "1px solid var(--border-hairline)",
        background: "var(--surface-chrome)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border-hairline)" }}>
        <span style={{ display: "inline-flex", color: "var(--accent)" }}>
          <Icon name="sparkle" size={16} />
        </span>
        <span style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Quanta AI</span>
        <Badge tone="accent">Preview</Badge>
        <IconButton label="Close Quanta AI" size="sm" style={{ marginLeft: "auto" }} onClick={() => dispatch({ type: "CLOSE_RIGHT_PANEL" })}>
          <Icon name="x" size={16} />
        </IconButton>
      </header>

      <div className="scroll-y" style={{ flex: 1, minHeight: 0, padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, font: "13px/1.6 var(--font-sans)", color: "var(--text-primary)" }}>
          Your engineering assistant — soon it will explain steps, check units and assumptions, and
          draft calculations right in this worksheet.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "600 11px/1 var(--font-sans)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--text-muted)" }}>
            Try asking
          </span>
          {PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setDraft(p)}
              style={{ textAlign: "left", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", background: "var(--surface-raised)", color: "var(--text-primary)", font: "12.5px/1.4 var(--font-sans)", padding: "8px 10px", cursor: "pointer" }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div role="status" style={{ padding: "8px 12px", font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)", background: "var(--accent-tint)", borderTop: "1px solid var(--border-hairline)" }}>
          Quanta AI isn&apos;t connected in this build yet — it arrives in a later release.
        </div>
      )}

      <div style={{ flex: "0 0 auto", borderTop: "1px solid var(--border-hairline)", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask about this worksheet…"
          rows={3}
          style={{
            resize: "none",
            width: "100%",
            border: "1px solid var(--border-strong)",
            borderRadius: "var(--radius-sm)",
            background: "var(--surface-raised)",
            color: "var(--text-primary)",
            font: "12.5px/1.5 var(--font-sans)",
            padding: "7px 9px",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={send}
            disabled={draft.trim().length === 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 28,
              padding: "0 12px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid transparent",
              background: draft.trim().length === 0 ? "var(--surface-hover)" : "var(--accent)",
              color: draft.trim().length === 0 ? "var(--text-muted)" : "var(--text-inverse)",
              font: "500 12px/1 var(--font-sans)",
              cursor: draft.trim().length === 0 ? "not-allowed" : "pointer",
            }}
          >
            <Icon name="send" size={13} /> Ask
          </button>
        </div>
      </div>
    </aside>
  );
}
