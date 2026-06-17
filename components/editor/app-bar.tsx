"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Badge, Button, Tooltip } from "@/components/ds";
import { QuantaMark } from "@/components/quanta-mark";
import { useEditor } from "./state/editor-provider";
import { usePresence, type PresenceUser } from "./use-presence";
import { Icon } from "./icons";
import { ShareDialog } from "@/components/shared/share-dialog";

const RENAME_DEBOUNCE_MS = 600;

/**
 * Editor app bar (40px) — ported from the design mockup
 * (`mathcad-like/project/app-bar.html`):
 *   left   · menu · wordmark · editable title · lock · live autosave status
 *   center · Auto/Manual toggle · Recalculate · calc-status chip
 *   right  · Present · Share · comments · AI · presence avatars
 * The calc controls drive the engine through the provider; the title commits
 * to `renameWorksheet` (debounced while typing, immediate on blur/Enter).
 */
export function EditorAppBar({
  initialTitle,
  canManage,
  canExport,
  me,
}: {
  initialTitle: string;
  canManage: boolean;
  canExport: boolean;
  me: PresenceUser;
}) {
  const { state, dispatch, canEdit, worksheetId, setMode, recalculate, rename, saveVersion } = useEditor();
  const [title, setTitle] = useState(initialTitle);
  const [shareOpen, setShareOpen] = useState(false);
  const peers = usePresence(worksheetId, me);

  // Debounced rename: persist as the engineer types (§5.1), and commit
  // immediately on blur / Enter. The timer is cleared on unmount.
  const renameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (renameTimer.current) clearTimeout(renameTimer.current);
  }, []);

  const onTitleChange = (next: string) => {
    setTitle(next);
    if (renameTimer.current) clearTimeout(renameTimer.current);
    const trimmed = next.trim();
    if (!trimmed) return;
    renameTimer.current = setTimeout(() => rename(trimmed), RENAME_DEBOUNCE_MS);
  };

  const commitTitle = () => {
    if (renameTimer.current) clearTimeout(renameTimer.current);
    const trimmed = title.trim();
    if (trimmed) rename(trimmed);
  };

  const status = calcStatusBadge(state.calcStatus, state.errorCount);
  const autoMode = state.calcMode === "auto";

  return (
    <>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          height: 40,
          flex: "0 0 40px",
          padding: "0 10px",
          background: "var(--surface-chrome)",
          borderBottom: "1px solid var(--border-hairline)",
        }}
      >
        {/* left */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto", minWidth: 0 }}>
          <AppMenu
            canEdit={canEdit}
            canExport={canExport}
            worksheetId={worksheetId}
            onSaveVersion={saveVersion}
            onExport={() => dispatch({ type: "OPEN_EXPORT" })}
          />
          <span style={{ width: 1, height: 18, background: "var(--border-hairline)" }} />
          <QuantaMark size={18} className="text-accent" />
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={(e) => {
              commitTitle();
              e.currentTarget.style.background = "transparent";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            onFocus={(e) => (e.currentTarget.style.background = "var(--surface-raised)")}
            disabled={!canEdit}
            spellCheck={false}
            aria-label="Worksheet title"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              font: "600 13px/1 var(--font-sans)",
              color: "var(--text-primary)",
              width: 256,
              padding: "5px 6px",
              borderRadius: "var(--radius-sm)",
            }}
          />
          {!canEdit && (
            <Tooltip label="Shared · read-only for viewers" side="bottom">
              <span style={{ display: "inline-flex", color: "var(--text-muted)" }} aria-label="Read-only">
                <Icon name="lock" size={14} />
              </span>
            </Tooltip>
          )}
          <AutosaveStatus state={state.saveState} />
        </div>

        {/* center — calc controls */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 9 }}>
          <div
            style={{
              display: "inline-flex",
              border: "1px solid var(--border-strong)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              height: 26,
            }}
          >
            {(["auto", "manual"] as const).map((m) => {
              const on = state.calcMode === m;
              return (
                <button
                  key={m}
                  onClick={() => canEdit && setMode(m)}
                  disabled={!canEdit}
                  style={{
                    padding: "0 11px",
                    height: "100%",
                    border: "none",
                    borderLeft: m === "manual" ? "1px solid var(--border-hairline)" : "none",
                    cursor: canEdit ? "pointer" : "not-allowed",
                    background: on ? "var(--accent-tint)" : "var(--surface-raised)",
                    color: on ? "var(--accent)" : "var(--text-muted)",
                    font: (on ? "600" : "500") + " 12px/1 var(--font-sans)",
                    textTransform: "capitalize",
                  }}
                >
                  {m}
                </button>
              );
            })}
          </div>
          <Tooltip label={autoMode ? "Auto mode recalculates automatically" : "Recalculate now"} side="bottom">
            <button
              onClick={recalculate}
              disabled={autoMode}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 26,
                padding: "0 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-strong)",
                background: "var(--surface-raised)",
                cursor: autoMode ? "not-allowed" : "pointer",
                color: autoMode ? "var(--text-muted)" : "var(--text-primary)",
                font: "500 12px/1 var(--font-sans)",
                opacity: autoMode ? 0.5 : 1,
              }}
            >
              <Icon name="refresh" size={14} /> Recalculate
            </button>
          </Tooltip>
          <Badge tone={status.tone} dot>
            {status.label}
          </Badge>
        </div>

        {/* right */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, flex: "0 0 auto" }}>
          <Tooltip label="Present mode" side="bottom">
            <GhostButton
              aria-label="Present mode"
              style={{ width: "auto", gap: 6, padding: "0 10px" }}
            >
              <Icon name="play" size={14} />
              <span style={{ font: "500 12.5px/1 var(--font-sans)" }}>Present</span>
            </GhostButton>
          </Tooltip>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Icon name="share" size={15} />}
            onClick={() => setShareOpen(true)}
            style={{ height: 30 }}
          >
            Share
          </Button>
          <Tooltip label="Comments" side="bottom">
            <GhostButton aria-label="Comments">
              <Icon name="comment" size={18} />
            </GhostButton>
          </Tooltip>
          <Tooltip label="Ask Quanta AI" side="bottom">
            <button
              aria-label="Ask Quanta AI"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
                background: "var(--accent-tint)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent)",
                cursor: "pointer",
              }}
            >
              <Icon name="sparkle" size={17} />
            </button>
          </Tooltip>
          {peers.map((p) => (
            <Avatar key={p.userId} user={p} size={28} />
          ))}
          <Avatar user={me} size={28} style={{ marginLeft: 3 }} />
        </div>
      </header>
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        worksheetId={worksheetId}
        name={title || initialTitle}
        canManage={canManage}
      />
    </>
  );
}

/** Live autosave status — spinner (saving) · `*` (unsaved) · check (saved) · retry (error). */
function AutosaveStatus({ state }: { state: string }) {
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    flex: "0 0 auto",
    font: "11.5px/1 var(--font-sans)",
  };
  switch (state) {
    case "saving":
      return (
        <span style={{ ...base, color: "var(--text-muted)" }}>
          <span className="q-spin" style={{ display: "inline-flex", color: "var(--text-muted)" }}>
            <Icon name="spinner" size={13} />
          </span>
          Saving…
        </span>
      );
    case "unsaved":
      return (
        <span style={{ ...base, color: "var(--status-warning)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>*</span>
          Unsaved
        </span>
      );
    case "error":
      return (
        <span style={{ ...base, color: "var(--status-error)" }}>
          <span style={{ display: "inline-flex", color: "var(--status-error)" }}>
            <Icon name="alertCirc" size={13} />
          </span>
          Couldn&apos;t save — retry
        </span>
      );
    default:
      return (
        <span style={{ ...base, color: "var(--text-muted)" }}>
          <span style={{ display: "inline-flex", color: "var(--status-pass)" }}>
            <Icon name="check" size={13} />
          </span>
          Saved
        </span>
      );
  }
}

/** Round presence avatar with a hover tooltip of the collaborator's name. */
function Avatar({ user, size, style }: { user: PresenceUser; size: number; style?: CSSProperties }) {
  return (
    <Tooltip label={user.name} side="bottom">
      <span
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: user.color,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          font: "600 11px/1 var(--font-sans)",
          cursor: "pointer",
          ...style,
        }}
      >
        {user.initials}
      </span>
    </Tooltip>
  );
}

/** 30px ghost icon button with the standard hover wash (mockup pattern). */
function GhostButton({
  children,
  style,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 30,
        height: 30,
        border: "none",
        background: "transparent",
        borderRadius: "var(--radius-md)",
        color: "var(--text-muted)",
        cursor: "pointer",
        transition: "background var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out)",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-hover)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}

function AppMenu({
  canEdit,
  canExport,
  worksheetId,
  onSaveVersion,
  onExport,
}: {
  canEdit: boolean;
  canExport: boolean;
  worksheetId: string;
  onSaveVersion: (label?: string) => Promise<void>;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [open]);

  const saveVersion = async () => {
    setSaving(true);
    await onSaveVersion();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setOpen(false);
  };

  const item = (label: string, onClick: () => void, disabled = false) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", border: "none", background: "transparent", font: "12.5px/1 var(--font-sans)", color: disabled ? "var(--text-muted)" : "var(--text-primary)", cursor: disabled ? "not-allowed" : "pointer" }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.background = "var(--surface-hover)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <Tooltip label="Menu" side="bottom">
        <GhostButton
          aria-label="Menu"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          style={open ? { background: "var(--surface-hover)", color: "var(--text-primary)" } : undefined}
        >
          <Icon name="menu" size={18} />
        </GhostButton>
      </Tooltip>
      {saved && (
        <span style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, font: "11px/1 var(--font-sans)", color: "var(--status-pass)", whiteSpace: "nowrap" }}>Version saved</span>
      )}
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, minWidth: 180, background: "var(--surface-raised)", border: "1px solid var(--border-hairline)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-popover)", padding: 4, zIndex: 60 }}>
          {item(saving ? "Saving version…" : "Save version", saveVersion, !canEdit || saving)}
          <Link
            href={`/w/${worksheetId}/history`}
            style={{ display: "block", padding: "7px 12px", font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)", textDecoration: "none" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            Version history
          </Link>
          {canExport && (
            <>
              <div style={{ height: 1, background: "var(--border-hairline)", margin: "4px 0" }} />
              {item("Print / export…", () => {
                setOpen(false);
                onExport();
              })}
            </>
          )}
          <div style={{ height: 1, background: "var(--border-hairline)", margin: "4px 0" }} />
          <Link href="/app" style={{ display: "block", padding: "7px 12px", font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)", textDecoration: "none" }}>
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

function calcStatusBadge(
  status: string,
  errorCount: number,
): { tone: "pass" | "warning" | "error"; label: string } {
  if (status === "error") return { tone: "error", label: `${errorCount} ${errorCount === 1 ? "error" : "errors"}` };
  if (status === "stale") return { tone: "warning", label: "Needs recalculate" };
  return { tone: "pass", label: "All current" };
}
