/**
 * Real worksheet content for the six public starter templates seeded in
 * `0006_seed_templates.sql` (which ship empty, `{version:1,rows:[]}`). This is the
 * single source of truth: `0010_seed_template_content.sql` embeds the
 * `JSON.stringify` of each entry, and `starter-content.test.ts` asserts both that
 * every sheet is engine-clean (no error regions, a green utilization result) and
 * that the migration's JSON matches these objects verbatim (a drift guard).
 *
 * Keyed by the EXACT title in 0006 so the migration's title join lines up. Each
 * sheet is a small, dimensionally-correct calc ending in a `≤ 1` utilization
 * check styled pass/"OK" — so the gallery, files grid and dashboard render a real
 * `ContentSnapshot` (typeset math + the signature green result) instead of the
 * procedural placeholder. Keep text free of apostrophes — the JSON is embedded in
 * a single-quoted SQL literal.
 */
import type { CondRule, MathRegion, TextRegion, WorksheetContent } from "@/lib/worksheet/content";

/** Pass rule: utilization ≤ 1 → green "OK" chip (design tokens flow to dark mode). */
const OK_RULE: CondRule = {
  op: "<=",
  value: 1,
  style: { color: "var(--status-pass)", fill: "var(--status-pass-bg)", label: "OK" },
};

/** A section heading (eyebrow + h3). */
function head(id: string, text: string, eyebrow: string): TextRegion {
  return { id, indent: 0, type: "text", text, heading: 3, eyebrow };
}

/** A definition / intermediate result, optionally pinned to a display `unit`. */
function def(id: string, source: string, unit?: string): MathRegion {
  return unit
    ? { id, indent: 0, type: "math", source, unit }
    : { id, indent: 0, type: "math", source };
}

/** The final dimensionless utilization check — 2 decimals + green "OK" when ≤ 1. */
function check(id: string, source: string): MathRegion {
  return { id, indent: 0, type: "math", source, format: { decimals: 2 }, conditional: [OK_RULE] };
}

/** One single-column row holding the heading + calc, in reading order. */
function sheet(rowId: string, regions: (TextRegion | MathRegion)[]): WorksheetContent {
  return { version: 1, rows: [{ id: rowId, columns: 1, cells: [{ regions }] }] };
}

export const STARTER_CONTENT: Record<string, WorksheetContent> = {
  "Lifeline span deflection": sheet("ll-row", [
    head("ll-h", "Horizontal lifeline — mid-span sag", "EN 795 · fall arrest"),
    def("ll-f", "F := 6 kN", "kN"),
    def("ll-l", "L := 10 m", "m"),
    def("ll-t", "T := 20 kN", "kN"),
    def("ll-d", "d := F * L / (4 * T)", "mm"),
    def("ll-dl", "d_lim := 900 mm", "mm"),
    check("ll-ur", "UR := d / d_lim"),
  ]),

  "Guardrail point-load check": sheet("gr-row", [
    head("gr-h", "Guardrail post — point load", "AS 1657 · barriers"),
    def("gr-p", "P := 1.5 kN", "kN"),
    def("gr-h2", "h := 1.1 m", "m"),
    def("gr-m", "M := P * h", "kN m"),
    def("gr-z", "Z := 12000 mm^3", "mm^3"),
    def("gr-sig", "sigma := M / Z", "MPa"),
    def("gr-fy", "f_y := 250 MPa", "MPa"),
    check("gr-ur", "UR := sigma / f_y"),
  ]),

  "Bolt group capacity": sheet("bg-row", [
    head("bg-h", "Bolt group — eccentric shear", "Eurocode 3 · §3.12"),
    def("bg-v", "V_Ed := 84 kN", "kN"),
    def("bg-n", "n := 6"),
    def("bg-fv", "F_v := V_Ed / n", "kN"),
    def("bg-frd", "F_Rd := 60 kN", "kN"),
    check("bg-ur", "UR := F_v / F_Rd"),
  ]),

  "Beam UDL — moment & shear": sheet("bm-row", [
    head("bm-h", "Simply-supported beam — UDL", "Eurocode 3 · §6.2"),
    def("bm-w", "w := 12 kN/m", "kN/m"),
    def("bm-l", "L := 6 m", "m"),
    def("bm-m", "M := w * L^2 / 8", "kN m"),
    def("bm-v", "V := w * L / 2", "kN"),
    def("bm-mrd", "M_Rd := 90 kN m", "kN m"),
    check("bm-ur", "UR := M / M_Rd"),
  ]),

  "Anchor pull-out (concrete)": sheet("an-row", [
    head("an-h", "Cast-in anchor — steel pull-out", "ETAG 001 · tension"),
    def("an-as", "A_s := 157 mm^2", "mm^2"),
    def("an-fu", "f_uk := 500 MPa", "MPa"),
    def("an-nrd", "N_Rd := 0.6 * A_s * f_uk", "kN"),
    def("an-ned", "N_Ed := 18 kN", "kN"),
    check("an-ur", "UR := N_Ed / N_Rd"),
  ]),

  "Ladder cage loading": sheet("ld-row", [
    head("ld-h", "Fixed ladder rung — point load", "OSHA 1910 · access"),
    def("ld-p", "P := 1.33 kN", "kN"),
    def("ld-l", "L := 400 mm", "mm"),
    def("ld-m", "M := P * L / 4", "kN m"),
    def("ld-z", "Z := 1800 mm^3", "mm^3"),
    def("ld-sig", "sigma := M / Z", "MPa"),
    def("ld-fy", "f_y := 250 MPa", "MPa"),
    check("ld-ur", "UR := sigma / f_y"),
  ]),
};
