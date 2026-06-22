/**
 * Region clipboard — pure (de)serialization for copy/cut/paste of worksheet
 * regions. Lives in the lower `lib/worksheet` layer so it has no React/DOM
 * dependency and is unit-testable; the editor's keyboard handler owns the actual
 * `navigator.clipboard` I/O and the editor reducer owns the in-session clipboard.
 *
 * The system clipboard carries plain text, so we wrap regions in a versioned,
 * self-describing envelope. `parseRegions` is deliberately tolerant: any text
 * that isn't a Quanta region payload (a table's TSV/CSV copy, a stray string,
 * JSON of another shape) parses to `null`, so paste falls back cleanly.
 */
import { z } from "zod";
import { regionSchema, reidRegions, type Region } from "./content";

/** MIME-ish discriminator stamped into the clipboard envelope. */
export const CLIPBOARD_KIND = "quanta/regions" as const;
export const CLIPBOARD_VERSION = 1 as const;

interface ClipboardPayload {
  kind: typeof CLIPBOARD_KIND;
  version: typeof CLIPBOARD_VERSION;
  regions: Region[];
}

const payloadSchema = z.object({
  kind: z.literal(CLIPBOARD_KIND),
  version: z.literal(CLIPBOARD_VERSION),
  regions: z.array(regionSchema),
});

/**
 * Regions → the JSON text written to the system clipboard. The caller has
 * already snapshotted the regions (in reading order); we clone defensively so a
 * later mutation of the live tree can't bleed into the serialized copy.
 */
export function serializeRegions(regions: Region[]): string {
  const payload: ClipboardPayload = {
    kind: CLIPBOARD_KIND,
    version: CLIPBOARD_VERSION,
    regions: structuredClone(regions),
  };
  return JSON.stringify(payload);
}

/**
 * Clipboard text → regions, or `null` when the text isn't a valid Quanta region
 * payload. `regionSchema` is a discriminated union, so an unknown region `type`,
 * a wrong `kind`/`version`, or non-JSON text all yield `null`.
 */
export function parseRegions(text: string): Region[] | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const result = payloadSchema.safeParse(json);
  return result.success ? (result.data.regions as Region[]) : null;
}

export { reidRegions };
