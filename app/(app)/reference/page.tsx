import { ReferenceLibrary } from "@/components/reference/reference-library";

export const metadata = { title: "Reference library · Quanta" };

/**
 * Reference library (§4.6) — the standalone screen. Renders inside the `(app)`
 * shell so it inherits the real nav rail; the catalog is shipped, static data
 * (no DB reads). The primary action here is Copy signature — there's no
 * worksheet caret to insert into. Inside the editor, the same browser is hosted
 * by the ribbon overlay with an "Insert into worksheet" action instead.
 */
export default function ReferencePage() {
  return <ReferenceLibrary variant="standalone" className="flex-1 min-h-0" />;
}
