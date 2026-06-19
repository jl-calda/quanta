"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PresenceUser } from "./presence";

// Re-export the type and server-safe helpers so existing client imports from
// this module keep working. Server code must import them from "./presence"
// directly — they cannot be pulled through this "use client" module.
export type { PresenceUser } from "./presence";
export { avatarColor, initialsOf } from "./presence";

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
