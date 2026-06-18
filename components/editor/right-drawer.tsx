"use client";

import { useEditor } from "./state/editor-provider";
import { CommentsPanel } from "./comments/comments-panel";
import { AiPanel } from "./ai-panel";

/**
 * Renders whichever auxiliary right-edge drawer the app bar has opened
 * (comments / AI). Mutually exclusive and docked beside the inspector; closed by
 * default so it adds no chrome until invoked.
 */
export function RightDrawer() {
  const { state } = useEditor();
  if (state.ui.rightPanel === "comments") return <CommentsPanel />;
  if (state.ui.rightPanel === "ai") return <AiPanel />;
  return null;
}
