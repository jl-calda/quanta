"use client";

import type { ReactNode } from "react";
import type { RegionType } from "@/lib/worksheet/content";
import { findRegion } from "@/lib/worksheet/flatten";
import { useEditor } from "./state/editor-provider";
import { Icon, type IconName } from "./icons";

const TABS = [
  "Home", "Insert", "Math", "Operators", "Functions", "Matrices",
  "Plot", "Format", "Document", "Calculate", "Review",
];

/**
 * Ribbon — tab row + a collapsible controls row. Every control fires a typed
 * editor command (insert region, result format, show-steps) against the current
 * selection. The Home tab is fully wired (matching the mockup); the other tabs
 * are placeholders this pass. Controls disable for read-only roles.
 */
export function Ribbon() {
  const { state, dispatch, canEdit } = useEditor();
  const { ribbonTab, ribbonCollapsed } = state.ui;
  const selected = state.selectedId ? findRegion(state.content, state.selectedId) : undefined;
  const selectedMath = selected?.type === "math" ? selected : undefined;

  const insert = (regionType: RegionType) =>
    dispatch({ type: "INSERT_REGION", regionType, anchorId: state.selectedId, where: "below" });

  const decimals = selectedMath?.format?.decimals ?? 2;
  const setDecimals = (d: number) => {
    if (!selectedMath) return;
    dispatch({ type: "SET_REGION_PROP", id: selectedMath.id, patch: { format: { ...selectedMath.format, decimals: Math.max(0, Math.min(6, d)) } } });
  };
  const toggleSteps = () => {
    if (!selectedMath) return;
    const cur = selectedMath.display?.substituted ?? false;
    dispatch({ type: "SET_REGION_PROP", id: selectedMath.id, patch: { display: { ...selectedMath.display, substituted: !cur } } });
  };

  return (
    <div style={{ flex: "0 0 auto", background: "var(--surface-chrome)", borderBottom: "1px solid var(--border-hairline)" }}>
      {/* tab row */}
      <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "0 8px", borderBottom: ribbonCollapsed ? "none" : "1px solid var(--border-hairline)", height: 34 }}>
        {TABS.map((t) => {
          const on = ribbonTab === t;
          return (
            <button
              key={t}
              className={"ed-tab" + (on ? " on" : "")}
              onClick={() => dispatch({ type: "SET_RIBBON_TAB", tab: t })}
              style={{ padding: "0 11px", height: 34, color: on ? "var(--text-primary)" : "var(--text-muted)", font: (on ? "600" : "500") + " 12.5px/1 var(--font-sans)" }}
            >
              {t}
            </button>
          );
        })}
        <button
          onClick={() => dispatch({ type: "TOGGLE_RIBBON" })}
          title={ribbonCollapsed ? "Show ribbon" : "Collapse ribbon"}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, border: "none", background: "transparent", borderRadius: "var(--radius-sm)", color: "var(--text-muted)", cursor: "pointer" }}
        >
          <Icon name={ribbonCollapsed ? "chevD" : "chevU"} size={16} />
        </button>
      </div>

      {/* controls row */}
      {!ribbonCollapsed && (
        <div className="scroll-x" style={{ display: "flex", alignItems: "stretch", height: 84, padding: "0 4px" }}>
          {ribbonTab === "Home" || ribbonTab === "Insert" ? (
            <>
              <Group label="Region">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px 2px" }}>
                  <SmBtn glyph="=" label="Math" onClick={() => insert("math")} disabled={!canEdit} />
                  <SmBtn icon="area" label="Area" onClick={() => insert("area")} disabled={!canEdit} />
                  <SmBtn glyph="T" label="Text" onClick={() => insert("text")} disabled={!canEdit} />
                  <SmBtn icon="image" label="Image" onClick={() => insert("image")} disabled={!canEdit} />
                  <SmBtn icon="table" label="Table" onClick={() => insert("table")} disabled={!canEdit} />
                  <SmBtn icon="control" label="Control" onClick={() => insert("control")} disabled={!canEdit} />
                </div>
              </Group>

              <Group label="Math format">
                <BigBtn icon="fmt" label="Result format" disabled />
                <Stack>
                  <SmBtn icon="unit" label="Units display" disabled />
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "1px 6px" }}>
                    <span style={{ font: "12px/1 var(--font-sans)", color: selectedMath ? "var(--text-primary)" : "var(--text-muted)" }}>Decimals</span>
                    <Stepper value={decimals} onDec={() => setDecimals(decimals - 1)} onInc={() => setDecimals(decimals + 1)} disabled={!canEdit || !selectedMath} />
                  </div>
                  <SmBtn icon="steps" label="Show steps" onClick={toggleSteps} disabled={!canEdit || !selectedMath} active={selectedMath?.display?.substituted} />
                </Stack>
              </Group>

              <Group label="Insert">
                <BigBtn glyph={<span style={{ fontFamily: "var(--font-math)", fontStyle: "italic" }}>ƒ</span>} label="Function" disabled />
                <Stack>
                  <SmBtn icon="unit" label="Unit" disabled />
                  <SmBtn glyph="Σ" label="Symbol" disabled />
                  <SmBtn icon="plot" label="Plot" onClick={() => insert("plot")} disabled={!canEdit} />
                </Stack>
                <BigBtn icon="solve" label="Solve block" onClick={() => insert("solve")} disabled={!canEdit} />
              </Group>
            </>
          ) : (
            <div style={{ display: "flex", alignItems: "center", padding: "0 16px", font: "12.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
              {ribbonTab} tools are coming soon. Use the Home tab to insert and format regions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", height: "100%", padding: "0 10px", borderRight: "1px solid var(--border-hairline)" }}>
      <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 4 }}>{children}</div>
      <div style={{ font: "10px/1 var(--font-sans)", color: "var(--text-muted)", paddingBottom: 4, letterSpacing: "0.02em" }}>{label}</div>
    </div>
  );
}

const Stack = ({ children }: { children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 1, justifyContent: "center" }}>{children}</div>
);

function BigBtn({ icon, glyph, label, onClick, disabled }: { icon?: IconName; glyph?: ReactNode; label: string; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} — coming soon` : label}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5, width: 58, height: 60, border: "1px solid transparent", borderRadius: "var(--radius-md)", background: "transparent", cursor: disabled ? "not-allowed" : "pointer", color: "var(--text-primary)", opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ display: "inline-flex", height: 24, alignItems: "center", fontFamily: "var(--font-math)", fontSize: 21 }}>{glyph ?? (icon && <Icon name={icon} size={22} />)}</span>
      <span style={{ font: "11px/1.1 var(--font-sans)", textAlign: "center" }}>{label}</span>
    </button>
  );
}

function SmBtn({ icon, glyph, label, onClick, disabled, active }: { icon?: IconName; glyph?: string; label: string; onClick?: () => void; disabled?: boolean; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled ? `${label} — coming soon` : label}
      style={{ display: "flex", alignItems: "center", gap: 8, height: 22, padding: "0 8px 0 6px", border: "1px solid transparent", borderRadius: 5, background: active ? "var(--accent-tint)" : "transparent", cursor: disabled ? "not-allowed" : "pointer", color: active ? "var(--accent)" : "var(--text-primary)", width: "100%", textAlign: "left", opacity: disabled ? 0.5 : 1 }}
      onMouseEnter={(e) => !disabled && !active && (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => !active && (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ display: "inline-flex", width: 16, justifyContent: "center", color: active ? "var(--accent)" : "var(--text-muted)", fontFamily: glyph ? "var(--font-math)" : "inherit", fontSize: glyph ? 15 : undefined }}>
        {glyph ?? (icon && <Icon name={icon} size={16} />)}
      </span>
      <span style={{ font: "12px/1 var(--font-sans)", whiteSpace: "nowrap" }}>{label}</span>
    </button>
  );
}

function Stepper({ value, onDec, onInc, disabled }: { value: number; onDec: () => void; onInc: () => void; disabled?: boolean }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 20, opacity: disabled ? 0.5 : 1 }}>
      <button onClick={onDec} disabled={disabled} style={{ width: 18, height: "100%", border: "none", background: "var(--surface-raised)", cursor: disabled ? "not-allowed" : "pointer", color: "var(--text-primary)", fontSize: 13 }}>−</button>
      <span style={{ width: 18, textAlign: "center", font: "12px var(--font-mono)" }}>{value}</span>
      <button onClick={onInc} disabled={disabled} style={{ width: 18, height: "100%", border: "none", background: "var(--surface-raised)", borderLeft: "1px solid var(--border-hairline)", cursor: disabled ? "not-allowed" : "pointer", color: "var(--text-primary)", fontSize: 13 }}>+</button>
    </div>
  );
}
