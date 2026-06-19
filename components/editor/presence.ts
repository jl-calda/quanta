// Server-safe presence helpers. Kept out of `use-presence.ts` (a "use client"
// module) so Server Components and server queries can call them: a function
// exported from a client module can only be rendered/passed as a prop, not
// invoked on the server.

/** A peer present on the worksheet (for the app-bar avatars). */
export interface PresenceUser {
  userId: string;
  name: string;
  initials: string;
  color: string;
}

const AVATAR_COLORS = [
  "#1F5FBF",
  "#1E8E5A",
  "#C6890B",
  "#8B5CF6",
  "#C2392B",
  "#0E7490",
];

/** Stable avatar colour from a user id. */
export function avatarColor(userId: string): string {
  let sum = 0;
  for (let i = 0; i < userId.length; i += 1) sum += userId.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/** Up-to-two-letter initials from a display name / email. */
export function initialsOf(name: string): string {
  const clean = name.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}
