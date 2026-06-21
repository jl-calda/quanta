"use client";

import { useEditor } from "../state/editor-provider";
import { InsertSymbolDialog } from "./insert-symbol-dialog";
import { ResultFormatDialog } from "./result-format-dialog";
import { ConditionalFormatDialog } from "./conditional-format-dialog";
import { PageSetupDialog } from "./page-setup-dialog";
import { HeadersFootersDialog } from "./headers-footers-dialog";
import { TextStylesDialog } from "./text-styles-dialog";
import { FindReplaceDialog } from "./find-replace-dialog";
import { GoToPageDialog } from "./go-to-page-dialog";
import { ShortcutsDialog } from "./shortcuts-dialog";
import { CommandPalette } from "./command-palette";
import { WorksheetSettingsDialog } from "./worksheet-settings-dialog";
import { TableImportDialog } from "./table-import-dialog";

/**
 * DialogHost — the single mount point for every centrally-hosted editor dialog.
 * Reads `ui.activeDialog` and renders the match; each closes via `CLOSE_DIALOG`.
 * Confirmations are separate (the app-wide `ConfirmProvider`).
 */
export function DialogHost() {
  const { state, dispatch } = useEditor();
  const dialog = state.ui.activeDialog;
  if (!dialog) return null;
  const close = () => dispatch({ type: "CLOSE_DIALOG" });

  switch (dialog.kind) {
    case "insertSymbol":
      return <InsertSymbolDialog onClose={close} />;
    case "resultFormat":
      return <ResultFormatDialog regionId={dialog.regionId ?? null} onClose={close} />;
    case "conditionalFormat":
      return <ConditionalFormatDialog regionId={dialog.regionId ?? null} onClose={close} />;
    case "pageSetup":
      return <PageSetupDialog onClose={close} />;
    case "headersFooters":
      return <HeadersFootersDialog onClose={close} />;
    case "textStyles":
      return <TextStylesDialog onClose={close} />;
    case "findReplace":
      return <FindReplaceDialog onClose={close} />;
    case "goToPage":
      return <GoToPageDialog onClose={close} />;
    case "shortcuts":
      return <ShortcutsDialog onClose={close} />;
    case "commandPalette":
      return <CommandPalette onClose={close} />;
    case "worksheetSettings":
      return <WorksheetSettingsDialog onClose={close} />;
    case "tableImport":
      return <TableImportDialog regionId={dialog.regionId ?? null} onClose={close} />;
    default:
      return null;
  }
}
