"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Badge, Button } from "@/components/ds";
import { QuantaMark } from "@/components/quanta-mark";
import { useEditor } from "./state/editor-provider";
import { usePresence, type PresenceUser } from "./use-presence";
import { Icon } from "./icons";
import { ShareDialog } from "@/components/shared/share-dialog";

/**
 * Editor app bar (44px): menu · logo · editable title · autosave status |
 * Auto/Manual + Recalculate + calc-status badge | Present/Share/Comments/AI ·
 * presence avatars · you. The calc controls drive the engine through the
 * provider; the title commits to `renameWorksheet`.
 */
export function EditorAppBar({
  initialTitle,
  canManage,
  me,
}: {
  initialTitle: string;
  canManage: boolean;
  me: PresenceUser;
}) {
  const { state, canEdit, worksheetId, setMode, recalculate, rename, saveVersion } = useEditor();
  const [title, setTitle] = useState(initialTitle);
  const [shareOpen, setShareOpen] = useState(false);
  const peers = usePresence(worksheetId, me);

  const save = saveStatus(state.saveState);
  const status = calcStatusBadge(state.calcStatus, state.errorCount);

  return (
    <>
    <header
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        height: 44,
        flex: "0 0 44px",
        padding: "0 12px",
        background: "var(--surface-chrome)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      {/* left */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto", minWidth: 0 }}>
        <AppMenu canEdit={canEdit} worksheetId={worksheetId} onSaveVersion={saveVersion} />
        <span style={{ width: 1, height: 20, background: "var(--border-hairline)" }} />
        <QuantaMark size={20} className="text-accent" />
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && rename(title.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          disabled={!canEdit}
          spellCheck={false}
          aria-label="Worksheet title"
          style={{
            font: "600 13.5px/1 var(--font-sans)",
            color: "var(--text-primary)",
            width: 268,
            padding: "4px 6px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "transparent",
            outline: "none",
          }}
          onFocus={(e) => (e.target.style.background = "var(--surface-raised)")}
        />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, font: "11.5px/1 var(--font-sans)", color: save.color, flex: "0 0 auto" }}>
          {save.icon && <span style={{ display: "inline-flex" }}>{save.icon}</span>}
          {save.label}
        </span>
      </div>

      {/* center — calc controls */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
        <div style={{ display: "inline-flex", border: "1px solid var(--border-strong)", borderRadius: "var(--radius-sm)", overflow: "hidden", height: 28 }}>
          {(["auto", "manual"] as const).map((m) => {
            const on = state.calcMode === m;
            return (
              <button
                key={m}
                onClick={() => canEdit && setMode(m)}
                disabled={!canEdit}
                style={{
                  padding: "0 12px",
                  height: "100%",
                  border: "none",
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
        <button
          onClick={recalculate}
          disabled={state.calcMode === "auto"}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 28,
            padding: "0 11px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
            cursor: state.calcMode === "auto" ? "not-allowed" : "pointer",
            color: state.calcMode === "auto" ? "var(--text-muted)" : "var(--text-primary)",
            font: "500 12px/1 var(--font-sans)",
            opacity: state.calcMode === "auto" ? 0.55 : 1,
          }}
        >
          <Icon name="refresh" size={15} /> Recalculate
        </button>
        <Badge tone={status.tone} dot>
          {status.label}
        </Badge>
      </div>

      {/* right */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flex: "0 0 auto" }}>
        {peers.map((p) => (
          <span
            key={p.userId}
            title={p.name}
            style={{ width: 26, height: 26, borderRadius: "50%", background: p.color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "600 10px/1 var(--font-sans)", border: "1.5px solid var(--surface-chrome)" }}
          >
            {p.initials}
          </span>
        ))}
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<Icon name="share" size={15} />}
          onClick={() => setShareOpen(true)}
          title="Share worksheet"
          style={{ height: 30 }}
        >
          Share
        </Button>
        <GhostIcon icon="comment" label="Comments — coming soon" />
        <button
          title="Ask Quanta AI — coming soon"
          disabled
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)", background: "var(--accent-tint)", borderRadius: "var(--radius-md)", color: "var(--accent)", cursor: "not-allowed", opacity: 0.7 }}
        >
          <Icon name="sparkle" size={17} />
        </button>
        <span
          title={me.name}
          style={{ width: 28, height: 28, borderRadius: "50%", background: me.color, color: "var(--text-inverse)", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "600 11px/1 var(--font-sans)", marginLeft: 4 }}
        >
          {me.initials}
        </span>
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

function AppMenu({
  canEdit,
  worksheetId,
  onSaveVersion,
}: {
  canEdit: boolean;
  worksheetId: string;
  onSaveVersion: (label?: string) => Promise<void>;
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
      <button
        title="Menu"
        aria-label="Menu"
        onClick={() => setOpen((o) => !o)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: open ? "var(--surface-hover)" : "transparent", borderRadius: "var(--radius-md)", color: open ? "var(--text-primary)" : "var(--text-muted)", cursor: "pointer" }}
      >
        <Icon name="menu" size={18} />
      </button>
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
          <div style={{ height: 1, background: "var(--border-hairline)", margin: "4px 0" }} />
          <Link href="/app" style={{ display: "block", padding: "7px 12px", font: "12.5px/1 var(--font-sans)", color: "var(--text-primary)", textDecoration: "none" }}>
            Back to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

function GhostIcon({ icon, label }: { icon: Parameters<typeof Icon>[0]["name"]; label: string }) {
  return (
    <button
      title={label}
      aria-label={label}
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, border: "none", background: "transparent", borderRadius: "var(--radius-md)", color: "var(--text-muted)", cursor: "pointer" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-hover)";
        e.currentTarget.style.color = "var(--text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--text-muted)";
      }}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

function saveStatus(s: string): { label: string; color: string; icon: React.ReactNode } {
  switch (s) {
    case "saving":
      return { label: "Saving…", color: "var(--text-muted)", icon: null };
    case "unsaved":
      return { label: "Unsaved", color: "var(--status-warning)", icon: null };
    case "error":
      return { label: "Couldn't save — retry", color: "var(--status-error)", icon: <Icon name="alertCirc" size={13} /> };
    default:
      return { label: "Saved", color: "var(--status-pass)", icon: <Icon name="check" size={13} /> };
  }
}

function calcStatusBadge(
  status: string,
  errorCount: number,
): { tone: "pass" | "warning" | "error"; label: string } {
  if (status === "error") return { tone: "error", label: `${errorCount} ${errorCount === 1 ? "error" : "errors"}` };
  if (status === "stale") return { tone: "warning", label: "Stale — recalculate" };
  return { tone: "pass", label: "All current" };
}
