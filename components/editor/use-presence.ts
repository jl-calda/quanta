"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** A peer present on the worksheet (for the app-bar avatars). */
export interface PresenceUser {
  userId: string;
  name: string;
  initials: string;
  color: string;
}

/**
 * Join the worksheet's Realtime presence channel and return the *other* peers
 * currently viewing it. Degrades gracefully to an empty list when the Supabase
 * env is absent (e.g. local scaffold), so the editor never crashes over it.
 */
export function usePresence(worksheetId: string, me: PresenceUser): PresenceUser[] {
  const [others, setOthers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return; // no env configured → presence simply off
    }

    const channel = supabase.channel(`ws:${worksheetId}`, {
      config: { presence: { key: me.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const presence = channel.presenceState<PresenceUser>();
        const seen = new Map<string, PresenceUser>();
        for (const key of Object.keys(presence)) {
          const meta = presence[key]?.[0];
          if (meta && meta.userId !== me.userId) {
            seen.set(meta.userId, {
              userId: meta.userId,
              name: meta.name,
              initials: meta.initials,
              color: meta.color,
            });
          }
        }
        setOthers([...seen.values()]);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track(me);
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
    // me is derived from the signed-in user and is stable for the session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worksheetId, me.userId]);

  return others;
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
