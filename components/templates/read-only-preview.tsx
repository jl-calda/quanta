"use client";

import "katex/dist/katex.min.css";
import "@/components/editor/editor.css";
import { EditorProvider } from "@/components/editor/state/editor-provider";
import { Canvas } from "@/components/editor/canvas";
import { parseContent } from "@/lib/worksheet/content";
import type { Json } from "@/lib/supabase/types";

/**
 * Read-only template preview — the "read-only editor in a drawer" (§4.4). Rather
 * than build a separate render path, this mounts the real editor renderer
 * (`EditorProvider` + `Canvas`) with `canEdit={false}`: the Canvas already gates
 * its row controls / add-region affordances on `canEdit`, and autosave is
 * disabled, so the template's content tree renders exactly as it would in the
 * editor — math (engine TeX → KaTeX), text, areas and tables — but inert. The
 * 816px page is scaled down to sit inside the 540px drawer.
 */
export function ReadOnlyPreview({
  templateId,
  title,
  content,
}: {
  templateId: string;
  title: string;
  content: Json;
}) {
  return (
    <div
      className="scroll-y"
      style={{
        flex: 1,
        minHeight: 0,
        background: "#E7EAEF",
        display: "flex",
        justifyContent: "center",
        padding: "18px 0",
      }}
    >
      <div style={{ transform: "scale(0.6)", transformOrigin: "top center", width: 816, flex: "0 0 auto" }}>
        <EditorProvider
          worksheetId={templateId}
          initialContent={parseContent(content)}
          initialCalcMode="auto"
          initialUnits="si"
          canEdit={false}
        >
          <Canvas worksheetTitle={title} />
        </EditorProvider>
      </div>
    </div>
  );
}
