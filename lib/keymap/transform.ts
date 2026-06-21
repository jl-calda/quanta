/**
 * Mathcad-style live entry transforms for the (secondary) plain-text formula
 * field. The primary MathLive 2D editor will own these natively later; until
 * then this gives the mono field the headline Mathcad move: typing `:` yields
 * the `:=` assignment. The transforms are pure so they can be unit-tested and
 * reused by the eventual MathLive macro config.
 */

export interface EntryEdit {
  value: string;
  caret: number;
}

/**
 * Typing `:` inserts `:=` (the Mathcad assign), unless the user is clearly
 * already forming `:=` themselves (the next char is `=`). Returns the edited
 * value + caret, or `null` to fall through to the browser's default insert.
 */
export function applyColonAssign(value: string, caret: number): EntryEdit | null {
  const after = value.slice(caret);
  if (after.startsWith("=")) return null; // user is typing ":=" by hand
  return {
    value: value.slice(0, caret) + ":=" + after,
    caret: caret + 2,
  };
}
