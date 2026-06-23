"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, IconButton } from "@/components/ds";
import { relativeTime } from "@/components/dashboard/format";
import { findRegion } from "@/lib/worksheet/flatten";
import type { WorksheetContent } from "@/lib/worksheet/content";
import { commentsForRegion, SHEET_ANCHOR, type CommentItem } from "@/lib/worksheet/comments";
import { useEditor } from "../state/editor-provider";
import { scrollToRegion } from "../scroll-to-region";
import { Icon } from "../icons";
import { useComments } from "./comments-provider";

/**
 * Comments panel — the right-edge drawer opened from the app-bar Comments button
 * (Func §5.1). Lists the worksheet's threads oldest-first, lets a commenter post
 * a note anchored to the selected region (or the sheet), and resolve/reopen
 * threads. All writes go through the comments provider (optimistic, RLS-gated).
 */
export function CommentsPanel() {
  const { state, dispatch } = useEditor();
  const { comments, openCount, canComment, submitting, error, focusedRegionId, setFocusedRegion, add, toggleResolved } =
    useComments();
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const anchorId = state.selectedId;
  const anchorName = anchorLabel(state.content, anchorId);

  // The thread shown: scoped to one region (set by clicking its canvas marker) or
  // the whole worksheet. `comments` is already oldest-first; the filter preserves it.
  const visible = focusedRegionId ? commentsForRegion(comments, focusedRegionId) : comments;

  // Clear the region scope whenever the drawer closes (it unmounts), so reopening it
  // from the app bar shows the full thread rather than a stale region scope.
  useEffect(() => () => setFocusedRegion(null), [setFocusedRegion]);

  // Keep the newest comment in view as the thread grows.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visible.length]);

  const submit = async () => {
    const body = draft.trim();
    if (!body) return;
    await add(body, anchorId);
    setDraft("");
  };

  // Jump from a comment to its region: select it, scope the drawer to it, scroll it
  // into view. Sheet-level notes (no region anchor) just clear the scope.
  const jumpToRegion = (regionId: string) => {
    if (regionId === SHEET_ANCHOR) {
      setFocusedRegion(null);
      return;
    }
    dispatch({ type: "SELECT", id: regionId });
    setFocusedRegion(regionId);
    scrollToRegion(regionId);
  };

  return (
    <aside
      aria-label="Comments"
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
        <span style={{ font: "600 13px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>Comments</span>
        {openCount > 0 && <Badge tone="accent">{openCount} open</Badge>}
        <IconButton label="Close comments" size="sm" style={{ marginLeft: "auto" }} onClick={() => dispatch({ type: "CLOSE_RIGHT_PANEL" })}>
          <Icon name="x" size={16} />
        </IconButton>
      </header>

      {focusedRegionId && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderBottom: "1px solid var(--border-hairline)", background: "var(--accent-tint)", font: "11.5px/1.3 var(--font-sans)", color: "var(--text-primary)" }}>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Showing comments on <span style={{ fontWeight: 600 }}>{anchorLabel(state.content, focusedRegionId)}</span>
          </span>
          <button
            onClick={() => setFocusedRegion(null)}
            style={{ marginLeft: "auto", flex: "0 0 auto", border: "none", background: "none", padding: 0, color: "var(--accent)", font: "600 11.5px/1 var(--font-sans)", cursor: "pointer" }}
          >
            Show all
          </button>
        </div>
      )}

      <div ref={listRef} className="scroll-y" style={{ flex: 1, minHeight: 0, padding: visible.length ? "8px 0" : 0 }}>
        {visible.length === 0 ? (
          <div style={{ flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, padding: 24, textAlign: "center" }}>
            <span style={{ display: "inline-flex", color: "var(--text-muted)" }}>
              <Icon name="comment" size={22} />
            </span>
            <span style={{ font: "12.5px/1.5 var(--font-sans)", color: "var(--text-muted)" }}>
              {focusedRegionId
                ? "No comments on this region yet."
                : `No comments yet. ${canComment ? "Start the conversation below." : "You'll see new comments here."}`}
            </span>
          </div>
        ) : (
          visible.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              anchor={anchorLabel(state.content, c.regionId)}
              canResolve={canComment}
              onToggleResolved={() => toggleResolved(c.id, !c.resolved)}
              onJump={() => jumpToRegion(c.regionId)}
            />
          ))
        )}
      </div>

      {error && (
        <div role="alert" style={{ padding: "8px 12px", font: "11.5px/1.4 var(--font-sans)", color: "var(--status-error)", background: "var(--status-error-bg)", borderTop: "1px solid var(--border-hairline)" }}>
          {error}
        </div>
      )}

      {canComment ? (
        <div style={{ flex: "0 0 auto", borderTop: "1px solid var(--border-hairline)", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            Commenting on <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{anchorName}</span>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // ⌘/Ctrl+Enter posts; Enter alone keeps a newline (multi-line notes).
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Add a comment…"
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>⌘↵ to post</span>
            <button
              onClick={() => void submit()}
              disabled={submitting || draft.trim().length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 12px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid transparent",
                background: submitting || draft.trim().length === 0 ? "var(--surface-hover)" : "var(--accent)",
                color: submitting || draft.trim().length === 0 ? "var(--text-muted)" : "var(--text-inverse)",
                font: "500 12px/1 var(--font-sans)",
                cursor: submitting || draft.trim().length === 0 ? "not-allowed" : "pointer",
              }}
            >
              <Icon name="send" size={13} /> {submitting ? "Posting…" : "Comment"}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ flex: "0 0 auto", borderTop: "1px solid var(--border-hairline)", padding: "10px 12px", font: "11.5px/1.4 var(--font-sans)", color: "var(--text-muted)" }}>
          You have read-only access. Ask for commenter access to join the conversation.
        </div>
      )}
    </aside>
  );
}

function CommentRow({
  comment,
  anchor,
  canResolve,
  onToggleResolved,
  onJump,
}: {
  comment: CommentItem;
  anchor: string;
  canResolve: boolean;
  onToggleResolved: () => void;
  /** Select + scroll to the comment's region (no-op label for sheet-level notes). */
  onJump: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 9,
        padding: "10px 12px",
        opacity: comment.pending ? 0.6 : comment.resolved ? 0.7 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "0 0 auto",
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: comment.authorColor,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          font: "600 10.5px/1 var(--font-sans)",
        }}
      >
        {comment.authorInitials}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ font: "600 12.5px/1.2 var(--font-sans)", color: "var(--text-primary)" }}>{comment.authorName}</span>
          <span style={{ font: "11px/1 var(--font-sans)", color: "var(--text-muted)" }}>
            {comment.pending ? "Posting…" : relativeTime(comment.createdAt)}
          </span>
          {comment.resolved && <Badge tone="pass" dot>Resolved</Badge>}
        </div>
        <div style={{ marginTop: 3, font: "12.5px/1.5 var(--font-sans)", color: "var(--text-primary)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {comment.body}
        </div>
        <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 10 }}>
          {anchor !== "the worksheet" && (
            <button
              onClick={onJump}
              title={`Go to ${anchor}`}
              style={{ border: "none", background: "none", padding: 0, font: "11px/1 var(--font-mono)", color: "var(--text-muted)", cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {anchor}
            </button>
          )}
          {canResolve && !comment.pending && (
            <button
              onClick={onToggleResolved}
              style={{ display: "inline-flex", alignItems: "center", gap: 4, border: "none", background: "none", padding: 0, cursor: "pointer", color: comment.resolved ? "var(--text-muted)" : "var(--status-pass)", font: "500 11px/1 var(--font-sans)" }}
            >
              <Icon name="checkCirc" size={13} /> {comment.resolved ? "Reopen" : "Resolve"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Human label for a comment's anchor: the region's #tag, its type, or the sheet. */
function anchorLabel(content: WorksheetContent, regionId: string | null): string {
  if (!regionId || regionId === SHEET_ANCHOR) return "the worksheet";
  const region = findRegion(content, regionId);
  if (!region) return "the worksheet";
  if (region.tag) return `#${region.tag}`;
  return `${region.type} region`;
}
