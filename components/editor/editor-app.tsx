"use client";

import "katex/dist/katex.min.css";
import "./editor.css";
import type { WorksheetContent } from "@/lib/worksheet/content";
import { EditorProvider } from "./state/editor-provider";
import type { CalcMode, UnitsSystem } from "./state/editor-reducer";
import type { PresenceUser } from "./use-presence";
import type { CommentItem } from "@/lib/worksheet/comments";
import { CommentsProvider } from "./comments/comments-provider";
import { EditorAppBar } from "./app-bar";
import { EditorKeyboard } from "./editor-keyboard";
import { Ribbon } from "./ribbon";
import { LeftPanel } from "./left-panel";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { RightDrawer } from "./right-drawer";
import { StatusBar } from "./status-bar";
import { Keypad } from "./keypad";
import { ReferenceOverlay } from "./reference-overlay";
import { ExportOverlay } from "./export-overlay";

export interface EditorWorksheet {
  id: string;
  title: string;
  content: WorksheetContent;
  calcMode: CalcMode;
  unitsSystem: UnitsSystem;
}

/**
 * EditorApp — the worksheet editor shell. A full-height flex column: app bar →
 * ribbon → [left panel | canvas | inspector] → status bar, plus the floating
 * math keypad. All state flows through the EditorProvider (reducer + calc engine
 * + autosave).
 */
export function EditorApp({
  worksheet,
  canEdit,
  canManage,
  canExport,
  canComment,
  initialComments,
  me,
}: {
  worksheet: EditorWorksheet;
  canEdit: boolean;
  canManage: boolean;
  canExport: boolean;
  canComment: boolean;
  initialComments: CommentItem[];
  me: PresenceUser;
}) {
  return (
    <EditorProvider
      worksheetId={worksheet.id}
      initialContent={worksheet.content}
      initialCalcMode={worksheet.calcMode}
      initialUnits={worksheet.unitsSystem}
      canEdit={canEdit}
    >
      <CommentsProvider
        worksheetId={worksheet.id}
        me={me}
        canComment={canComment}
        initial={initialComments}
      >
        <div className="editor-root">
          <EditorKeyboard />
          <EditorAppBar initialTitle={worksheet.title} canManage={canManage} canExport={canExport} me={me} />
          <Ribbon />
          <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
            <LeftPanel worksheetTitle={worksheet.title} />
            <Canvas worksheetTitle={worksheet.title} />
            <Inspector />
            <RightDrawer />
          </div>
          <StatusBar />
          <Keypad />
          <ReferenceOverlay />
          <ExportOverlay canExport={canExport} worksheetTitle={worksheet.title} />
        </div>
      </CommentsProvider>
    </EditorProvider>
  );
}
