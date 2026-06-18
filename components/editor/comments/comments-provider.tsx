"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { addComment, setCommentResolved } from "@/server/actions/comment";
import {
  openCommentCount,
  reidComment,
  sortCommentsAsc,
  SHEET_ANCHOR,
  type CommentItem,
} from "@/lib/worksheet/comments";
import type { PresenceUser } from "../use-presence";

interface CommentsContextValue {
  comments: CommentItem[];
  /** Open (unresolved) count — drives the app-bar badge. */
  openCount: number;
  /** Whether the current viewer may post (owner/editor/commenter). */
  canComment: boolean;
  /** A submit is in flight (disables the composer). */
  submitting: boolean;
  /** Last action error, in the app's voice; cleared on the next attempt. */
  error: string | null;
  /** Post a comment anchored to `regionId` (defaults to the sheet). */
  add: (body: string, regionId?: string | null) => Promise<void>;
  /** Resolve / reopen a thread. */
  toggleResolved: (id: string, resolved: boolean) => Promise<void>;
}

const CommentsContext = createContext<CommentsContextValue | null>(null);

export function useComments(): CommentsContextValue {
  const ctx = useContext(CommentsContext);
  if (!ctx) throw new Error("useComments must be used within <CommentsProvider>");
  return ctx;
}

/**
 * Client store for the editor's comments. Seeded server-side (RLS-scoped) and
 * kept live with optimistic add/resolve so the app-bar badge and the panel stay
 * in sync without a round-trip. Failures revert the optimistic change and surface
 * a fixable message; the real gate is RLS on the server action.
 */
export function CommentsProvider({
  worksheetId,
  me,
  canComment,
  initial,
  children,
}: {
  worksheetId: string;
  me: PresenceUser;
  canComment: boolean;
  initial: CommentItem[];
  children: ReactNode;
}) {
  const [comments, setComments] = useState<CommentItem[]>(() => sortCommentsAsc(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = useCallback(
    async (body: string, regionId?: string | null) => {
      const text = body.trim();
      if (!text || submitting) return;
      setError(null);
      setSubmitting(true);

      const tempId = `temp-${Date.now()}`;
      const anchor = regionId && regionId.length > 0 ? regionId : SHEET_ANCHOR;
      const optimistic: CommentItem = {
        id: tempId,
        regionId: anchor,
        authorId: me.userId,
        authorName: me.name,
        authorInitials: me.initials,
        authorColor: me.color,
        body: text,
        resolved: false,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setComments((prev) => sortCommentsAsc([...prev, optimistic]));

      const result = await addComment({ worksheetId, regionId: anchor, body: text });
      setSubmitting(false);
      if (result.ok) {
        setComments((prev) =>
          reidComment(prev, tempId, {
            ...optimistic,
            id: result.data.id,
            createdAt: result.data.createdAt,
            pending: undefined,
          }),
        );
      } else {
        setComments((prev) => prev.filter((c) => c.id !== tempId));
        setError(result.error);
      }
    },
    [me, submitting, worksheetId],
  );

  const toggleResolved = useCallback(async (id: string, resolved: boolean) => {
    setError(null);
    // Optimistic flip; revert on failure.
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, resolved } : c)));
    const result = await setCommentResolved({ id, resolved });
    if (!result.ok) {
      setComments((prev) => prev.map((c) => (c.id === id ? { ...c, resolved: !resolved } : c)));
      setError(result.error);
    }
  }, []);

  const value = useMemo<CommentsContextValue>(
    () => ({
      comments,
      openCount: openCommentCount(comments),
      canComment,
      submitting,
      error,
      add,
      toggleResolved,
    }),
    [comments, canComment, submitting, error, add, toggleResolved],
  );

  return <CommentsContext.Provider value={value}>{children}</CommentsContext.Provider>;
}
