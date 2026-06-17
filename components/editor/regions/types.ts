import type { Dispatch } from "react";
import type { RegionResult } from "@/lib/calc";
import type { Region } from "@/lib/worksheet/content";
import type { EditorAction } from "../state/editor-reducer";

/** Props every region renderer receives from the canvas. */
export interface RegionRenderProps<R extends Region = Region> {
  region: R;
  /** The engine result for this region (math regions only), if computed. */
  result?: RegionResult;
  selected: boolean;
  editing: boolean;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}
