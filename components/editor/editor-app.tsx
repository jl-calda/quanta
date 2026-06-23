"use client";

import "katex/dist/katex.min.css";
import "./editor.css";
import type { WorksheetContent } from "@/lib/worksheet/content";
import type { LayoutSettings, PageSettings } from "@/lib/schema/page";
import type { ProjectTree } from "@/lib/worksheet/project-tree";
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
import { DialogHost } from "./dialogs";

export interface EditorWorksheet {
  id: string;
  title: string;
  content: WorksheetContent;
  calcMode: CalcMode;
  unitsSystem: UnitsSystem;
  /** The owning project, or null for a workspace-root sheet (Files tab). */
  projectId: string | null;
  /** The owning workspace (for workspace-default settings writes). */
  workspaceId: string;
  /** Page setup + headers/footers (worksheets.page_settings). */
  pageSettings: PageSettings;
  /** Columns/indent + text styles (worksheets.layout_settings). */
  layoutSettings: LayoutSettings;
}

/**
 * EditorApp — the worksheet editor shell. A full-height flex column: app bar →
 * ribbon → [left panel | canvas | inspector] → docked math keypad → status bar.
 * All state flows through the EditorProvider (reducer + calc engine + autosave).
 */
export function EditorApp({
  worksheet,
  projectTree,
  canEdit,
  canManage,
  canExport,
  canComment,
  initialComments,
  me,
}: {
  worksheet: EditorWorksheet;
  projectTree: ProjectTree;
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
      workspaceId={worksheet.workspaceId}
      initialContent={worksheet.content}
      initialCalcMode={worksheet.calcMode}
      initialUnits={worksheet.unitsSystem}
      initialPageSettings={worksheet.pageSettings}
      initialLayoutSettings={worksheet.layoutSettings}
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
            <LeftPanel
              worksheetTitle={worksheet.title}
              currentSheetId={worksheet.id}
              currentProjectId={worksheet.projectId}
              projectTree={projectTree}
            />
            <Canvas worksheetTitle={worksheet.title} />
            <Inspector />
            <RightDrawer />
          </div>
          <Keypad />
          <StatusBar />
          <ReferenceOverlay />
          <ExportOverlay canExport={canExport} worksheetTitle={worksheet.title} />
          <DialogHost />
        </div>
      </CommentsProvider>
    </EditorProvider>
  );
}
