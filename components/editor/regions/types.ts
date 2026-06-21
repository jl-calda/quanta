import type { Dispatch } from "react";
import type { RegionResult } from "@/lib/calc";
import type { Region } from "@/lib/worksheet/content";
import type { EditorAction } from "../state/editor-reducer";

/** Props every region renderer receives from the canvas. */
export interface RegionRenderProps<R extends Region = Region> {
  region: R;
  /** The engine result for this region (math regions only), if computed. */
  result?: RegionResult;
  /** True when this region is the primary/active selection. */
  selected: boolean;
  /** True when 2+ regions are selected — plain clicks then collapse the group. */
  multiActive: boolean;
  editing: boolean;
  canEdit: boolean;
  dispatch: Dispatch<EditorAction>;
}
