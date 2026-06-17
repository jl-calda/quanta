"use client";

import "katex/dist/katex.min.css";
import "./editor.css";
import type { WorksheetContent } from "@/lib/worksheet/content";
import { EditorProvider } from "./state/editor-provider";
import type { CalcMode, UnitsSystem } from "./state/editor-reducer";
import type { PresenceUser } from "./use-presence";
import { EditorAppBar } from "./app-bar";
import { EditorKeyboard } from "./editor-keyboard";
import { Ribbon } from "./ribbon";
import { LeftPanel } from "./left-panel";
import { Canvas } from "./canvas";
import { Inspector } from "./inspector";
import { StatusBar } from "./status-bar";
import { Keypad } from "./keypad";
import { ReferenceOverlay } from "./reference-overlay";

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
  me,
}: {
  worksheet: EditorWorksheet;
  canEdit: boolean;
  canManage: boolean;
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
      <div className="editor-root">
        <EditorKeyboard />
        <EditorAppBar initialTitle={worksheet.title} canManage={canManage} me={me} />
        <Ribbon />
        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <LeftPanel worksheetTitle={worksheet.title} />
          <Canvas worksheetTitle={worksheet.title} />
          <Inspector />
        </div>
        <StatusBar />
        <Keypad />
        <ReferenceOverlay />
      </div>
    </EditorProvider>
  );
}
