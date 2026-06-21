"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ds";
import { SettingsIcons, type SectionIcon } from "@/components/settings/icons";
import { PlaceholderSection } from "@/components/settings/sections/placeholder";
import { CalculationSection } from "@/components/settings/sections/calculation";
import { UnitsSection } from "@/components/settings/sections/units-formatting";
import { AppearanceSection } from "@/components/settings/sections/appearance";
import { EditorSection } from "@/components/settings/sections/editor";
import { SharingSection } from "@/components/settings/sections/sharing";
import {
  updateUserPreferences,
  updateWorkspaceSettings,
} from "@/server/actions/settings";
import { useKeymap } from "@/lib/preferences/provider";
import type { Density, Theme } from "@/lib/preferences/cookies";
import type { KeymapId } from "@/lib/keymap";
import type { FormatSettings, WorkspaceSettings } from "@/lib/settings/types";

interface SectionDef {
  id: string;
  label: string;
  icon: SectionIcon;
  admin?: boolean;
}

const SECTIONS: SectionDef[] = [
  { id: "account", label: "Account", icon: SettingsIcons.account },
  { id: "appearance", label: "Appearance", icon: SettingsIcons.appearance },
  { id: "editor", label: "Editor", icon: SettingsIcons.editor },
  { id: "calculation", label: "Calculation", icon: SettingsIcons.calc },
  { id: "units", label: "Units & formatting", icon: SettingsIcons.units },
  { id: "templates", label: "Templates & defaults", icon: SettingsIcons.templates },
  { id: "sharing", label: "Sharing & permissions", icon: SettingsIcons.sharing },
  { id: "integrations", label: "Integrations", icon: SettingsIcons.integrations },
  { id: "workspace", label: "Workspace", icon: SettingsIcons.workspace, admin: true },
  { id: "billing", label: "Billing", icon: SettingsIcons.billing },
];

/** Tolerance fields use the explicit save bar; everything else saves on change. */
function withSavedTolerances(
  working: WorkspaceSettings,
  saved: WorkspaceSettings,
): WorkspaceSettings {
  return {
    ...working,
    ctol: saved.ctol,
    tol: saved.tol,
    maxIter: saved.maxIter,
    format: {
      ...working.format,
      expHigh: saved.format.expHigh,
      expLow: saved.format.expLow,
    },
  };
}

/* ---------------- save-on-change toast (ported from settings-app.jsx:43–60) ---- */

interface ToastState {
  msg: string;
  leaving: boolean;
  id: number;
}

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((msg: string) => {
    setToast({ msg, leaving: false, id: Date.now() });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setToast((t) => (t ? { ...t, leaving: true } : null)),
      2200,
    );
    setTimeout(() => setToast(null), 2600);
  }, []);
  return [toast, show] as const;
}

function Toast({ toast }: { toast: ToastState | null }) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={toast.leaving ? "toast-out" : "toast-in"}
      style={{
        position: "fixed",
        bottom: 26,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 90,
        display: "inline-flex",
        alignItems: "center",
        gap: 9,
        padding: "10px 15px",
        background: "var(--ink)",
        color: "var(--text-inverse)",
        borderRadius: 8,
        boxShadow: "var(--shadow-modal)",
        font: "13px/1 var(--font-sans)",
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--status-pass)",
          color: "#fff",
        }}
      >
        {SettingsIcons.check(13)}
      </span>
      {toast.msg}
    </div>
  );
}

/* ---------------- app ---------------- */

export function SettingsApp({
  workspaceId,
  workspaceName,
  userName,
  canEditWorkspace,
  initialWorkspace,
  initialKeymap,
}: {
  workspaceId: string;
  workspaceName: string;
  userName: string;
  canEditWorkspace: boolean;
  initialWorkspace: WorkspaceSettings;
  initialKeymap: KeymapId;
}) {
  const [active, setActive] = useState("calculation");
  const [toast, showToast] = useToast();

  const [settings, setSettings] = useState<WorkspaceSettings>(initialWorkspace);
  const [saved, setSaved] = useState<WorkspaceSettings>(initialWorkspace);
  const [dirty, setDirty] = useState(false);

  // Reconcile the cookie-backed keymap (which the editor reads) with the value
  // stored on the profile — the DB is authoritative across devices.
  const { setKeymap } = useKeymap();
  useEffect(() => {
    setKeymap(initialKeymap);
  }, [initialKeymap, setKeymap]);

  /** Persist workspace defaults, reverting + warning on failure. */
  const persistWorkspace = useCallback(
    async (payload: WorkspaceSettings, successMsg: string) => {
      const result = await updateWorkspaceSettings(workspaceId, payload);
      if (result.ok) {
        setSaved(payload);
        showToast(successMsg);
      } else {
        setSettings(saved); // roll back the optimistic change
        showToast(result.error);
      }
    },
    [workspaceId, saved, showToast],
  );

  const patch = useCallback(
    (partial: Partial<WorkspaceSettings>, save: boolean) => {
      setSettings((prev) => {
        const next = { ...prev, ...partial };
        if (save) void persistWorkspace(withSavedTolerances(next, saved), "Saved");
        else setDirty(true);
        return next;
      });
    },
    [persistWorkspace, saved],
  );

  const patchFormat = useCallback(
    (partial: Partial<FormatSettings>, save: boolean) => {
      setSettings((prev) => {
        const next = { ...prev, format: { ...prev.format, ...partial } };
        if (save) void persistWorkspace(withSavedTolerances(next, saved), "Saved");
        else setDirty(true);
        return next;
      });
    },
    [persistWorkspace, saved],
  );

  const saveTolerances = useCallback(() => {
    setDirty(false);
    void persistWorkspace(settings, "Changes saved");
  }, [persistWorkspace, settings]);

  const discardTolerances = useCallback(() => {
    setSettings(saved);
    setDirty(false);
  }, [saved]);

  const persistUserPrefs = useCallback(
    async (prefPatch: { theme?: Theme; density?: Density; keymap?: KeymapId }) => {
      const result = await updateUserPreferences(prefPatch);
      showToast(result.ok ? "Saved" : result.error);
    },
    [showToast],
  );

  const goToSection = (id: string) => {
    if (dirty) discardTolerances();
    setActive(id);
  };

  const workspaceProps = {
    settings,
    canEdit: canEditWorkspace,
    patch,
    patchFormat,
  };

  const renderSection = () => {
    switch (active) {
      case "calculation":
        return <CalculationSection {...workspaceProps} />;
      case "units":
        return <UnitsSection {...workspaceProps} />;
      case "sharing":
        return <SharingSection {...workspaceProps} />;
      case "appearance":
        return (
          <AppearanceSection
            onPersist={(p) => void persistUserPrefs(p)}
          />
        );
      case "editor":
        return <EditorSection onPersist={(p) => void persistUserPrefs(p)} />;
      default: {
        const sec = SECTIONS.find((x) => x.id === active)!;
        return <PlaceholderSection label={sec.label} icon={sec.icon} />;
      }
    }
  };

  return (
    <div style={{ display: "flex", flex: 1, minHeight: 0 }} data-screen-label="Settings">
      {/* settings sub-nav */}
      <aside
        style={{
          width: 244,
          flex: "0 0 244px",
          borderRight: "1px solid var(--border-hairline)",
          background: "var(--surface-chrome)",
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <div style={{ padding: "20px 18px 14px" }}>
          <div
            style={{
              font: "600 16px/1.2 var(--font-sans)",
              color: "var(--text-primary)",
            }}
          >
            Settings
          </div>
          <div
            style={{
              font: "12.5px/1.4 var(--font-sans)",
              color: "var(--text-muted)",
              marginTop: 3,
            }}
          >
            {userName} · {workspaceName}
          </div>
        </div>

        <div className="scroll-y" style={{ flex: 1, padding: "4px 8px 12px", minHeight: 0 }}>
          {SECTIONS.map((sec) => {
            const on = active === sec.id;
            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => goToSection(sec.id)}
                aria-current={on ? "page" : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  width: "100%",
                  padding: "8px 10px",
                  border: "none",
                  background: on ? "var(--accent-tint)" : "transparent",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 1,
                }}
                onMouseEnter={(e) => {
                  if (!on) e.currentTarget.style.background = "var(--surface-hover)";
                }}
                onMouseLeave={(e) => {
                  if (!on) e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    color: on ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {sec.icon(18)}
                </span>
                <span
                  style={{
                    flex: 1,
                    font: `${on ? "600 " : "500 "}13px/1.2 var(--font-sans)`,
                    color: on ? "var(--accent)" : "var(--text-primary)",
                  }}
                >
                  {sec.label}
                </span>
                {sec.admin && (
                  <span
                    style={{
                      font: "9.5px/1 var(--font-sans)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--text-muted)",
                      border: "1px solid var(--border-hairline)",
                      borderRadius: 3,
                      padding: "2px 4px",
                    }}
                  >
                    Admin
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div
          style={{
            borderTop: "1px solid var(--border-hairline)",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            font: "12px/1.4 var(--font-sans)",
            color: "var(--text-muted)",
          }}
        >
          <span style={{ display: "inline-flex" }}>{SettingsIcons.info(15)}</span>
          Synced across your devices
        </div>
      </aside>

      {/* content */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          position: "relative",
        }}
      >
        <div
          className="scroll-y"
          style={{
            flex: 1,
            minHeight: 0,
            padding: `36px 40px ${dirty ? 100 : 56}px`,
            background: "var(--surface-paper)",
          }}
        >
          {renderSection()}
        </div>

        {dirty && (
          <div
            className="bar-rise"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 40px",
              borderTop: "1px solid var(--border-hairline)",
              background: "var(--surface-chrome)",
              boxShadow: "0 -2px 8px color-mix(in srgb, var(--ink) 6%, transparent)",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                font: "13px/1.4 var(--font-sans)",
                color: "var(--text-primary)",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--status-warning)",
                }}
              />
              You have unsaved changes to tolerances.
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
              <Button variant="ghost" onClick={discardTolerances}>
                Discard
              </Button>
              <Button variant="primary" onClick={saveTolerances}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </div>

      <Toast toast={toast} />
    </div>
  );
}
