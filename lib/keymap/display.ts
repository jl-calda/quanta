/**
 * Platform-aware presentation for keymap chords. The same binding renders ⌘ on
 * macOS and Ctrl elsewhere, so the reference modal and the keypad hints match
 * the keys a given user actually presses.
 */
import type { KeyBinding, KeyBindingGroup, Keymap } from "./types";

export type Platform = "mac" | "other";

/**
 * Best-effort platform detection. Runs on the client (the modal/keypad are
 * client-rendered); defaults to `"other"` on the server so SSR is deterministic
 * and never assumes macOS.
 */
export function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const data = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
  const hint = data?.platform || navigator.platform || navigator.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(hint) ? "mac" : "other";
}

const MAC_TOKENS: Record<string, string> = { Mod: "⌘", Alt: "⌥", Shift: "⇧", Ctrl: "⌃", Enter: "↩", Del: "⌫" };
const OTHER_TOKENS: Record<string, string> = { Mod: "Ctrl" };

/** Render one display token for the given platform (chips, hints, titles). */
export function formatKeyToken(token: string, platform: Platform): string {
  const map = platform === "mac" ? MAC_TOKENS : OTHER_TOKENS;
  return map[token] ?? token;
}

/** Flatten a binding's tokens into a single readable string (tooltips, a11y). */
export function formatKeys(binding: KeyBinding, platform: Platform): string {
  return binding.keys
    .map((k) => (k === "+" ? " + " : k === "or" ? " or " : formatKeyToken(k, platform)))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** Group a keymap's bindings preserving first-seen group order (modal layout). */
export function groupBindings(keymap: Keymap): Array<{ group: KeyBindingGroup; items: KeyBinding[] }> {
  const order: KeyBindingGroup[] = [];
  const byGroup = new Map<KeyBindingGroup, KeyBinding[]>();
  for (const b of keymap.bindings) {
    if (!byGroup.has(b.group)) {
      byGroup.set(b.group, []);
      order.push(b.group);
    }
    byGroup.get(b.group)!.push(b);
  }
  return order.map((group) => ({ group, items: byGroup.get(group)! }));
}
