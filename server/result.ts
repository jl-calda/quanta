/**
 * Typed result shape returned by every Server Action (Func §1 SHARED
 * CONVENTIONS). Errors are surfaced in the app's voice — specific and fixable —
 * never a raw Postgres/Supabase error string.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function err(
  error: string,
  fieldErrors?: Record<string, string>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Flatten a ZodError's issues into a `{ field: message }` map for inline form
 * errors, keeping only the first message per field.
 */
export function fieldErrorsFromZod(
  issues: { path: (string | number)[]; message: string }[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
