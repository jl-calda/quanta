"use client";

import { useEditor } from "../state/editor-provider";
import { Icon } from "../icons";
import { useRibbonCommands } from "./commands";
import { TAB_CONTENT, TABS } from "./tabs";

/**
 * Ribbon — the primary editor chrome (Func §5.2 + the Claude Design mockup). A
 * tab strip over a content row of captioned control groups; every control fires
 * a typed editor command via {@link useRibbonCommands} and reflects the current
 * selection. Collapsed = tab strip only (a secondary state for reclaiming
 * vertical room); the quick-access strip is the other secondary state.
 */
export function Ribbon() {
  const { state, dispatch } = useEditor();
  const { cmd, sel } = useRibbonCommands();
  const { ribbonTab, ribbonCollapsed } = state.ui;
  const Content = TAB_CONTENT[ribbonTab] ?? TAB_CONTENT.Home;

  return (
    <div style={{ flex: "0 0 auto", background: "var(--surface-chrome)", borderBottom: "1px solid var(--border-hairline)" }}>
      {/* tab strip */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          padding: "0 8px",
          borderBottom: ribbonCollapsed ? "none" : "1px solid var(--border-hairline)",
          height: 34,
        }}
      >
        {TABS.map((t) => {
          const on = ribbonTab === t;
          return (
            <button
              key={t}
              type="button"
              className={"ed-tab" + (on ? " on" : "")}
              onClick={() => cmd.setTab(t)}
              style={{
                padding: "0 11px",
                height: 34,
                color: on ? "var(--text-primary)" : "var(--text-muted)",
                font: (on ? "600" : "500") + " 12.5px/1 var(--font-sans)",
              }}
            >
              {t}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => dispatch({ type: "TOGGLE_RIBBON" })}
          title={ribbonCollapsed ? "Expand ribbon" : "Collapse ribbon"}
          aria-label={ribbonCollapsed ? "Expand ribbon" : "Collapse ribbon"}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "none",
            background: "transparent",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-muted)",
            cursor: "pointer",
          }}
        >
          <Icon name={ribbonCollapsed ? "chevD" : "chevU"} size={16} />
        </button>
      </div>

      {/* controls row */}
      {!ribbonCollapsed && (
        <div className="scroll-x" style={{ display: "flex", alignItems: "stretch", height: 86, padding: "0 2px" }}>
          <Content cmd={cmd} sel={sel} />
        </div>
      )}
    </div>
  );
}

export { QuickAccess } from "./quick-access";
export { useRibbonCommands } from "./commands";
