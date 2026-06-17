/** Shared client types for the file browser row interactions. */

export type RowKind = "folder" | "sheet";
export type RowAction = "open" | "rename" | "move" | "duplicate" | "delete";

export interface RowItem {
  id: string;
  kind: RowKind;
  name: string;
}
