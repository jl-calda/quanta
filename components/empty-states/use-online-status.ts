"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Live connection status for the empty-state connection card (Mockup 4.12 —
 * "the offline state reflects real connection status"). Combines two signals:
 *
 *  1. Browser reachability — `navigator.onLine` + window `online`/`offline`
 *     events. Always available; a hard offline always wins.
 *  2. Supabase Realtime — a channel whose subscription status confirms the app
 *     can actually reach Supabase (a finer "are we really connected" signal).
 *
 * Precedence: navigator offline → "offline"; else channel SUBSCRIBED (or Realtime
 * unavailable) → "online"; else (CHANNEL_ERROR / TIMED_OUT / CLOSED / not yet
 * established, while the browser is online) → "reconnecting".
 *
 * SSR-safe: `navigator` is never read during render. State starts at the
 * optimistic "online" so the server HTML and first client render match, then the
 * effect syncs the real status — no hydration mismatch. Modeled on
 * `components/editor/use-presence.ts` (try/catch around `createClient`, channel
 * cleanup via `removeChannel`).
 */

export type ConnectionState = "online" | "offline" | "reconnecting";

const CHANNEL_PREFIX = "connection:status";

export function useOnlineStatus(): {
  state: ConnectionState;
  retry: () => void;
} {
  const [state, setState] = useState<ConnectionState>("online");

  // Latest signals, read by the combiner. Refs (not state) so `recompute` and
  // `retry` stay referentially stable and never go stale.
  const navOnlineRef = useRef(true);
  const channelStatusRef = useRef<string | null>(null);
  const realtimeAvailableRef = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const attemptRef = useRef(0);

  const recompute = useCallback(() => {
    if (!navOnlineRef.current) {
      setState("offline");
      return;
    }
    // Browser is online. Without Realtime we have no finer signal — trust it.
    if (!realtimeAvailableRef.current) {
      setState("online");
      return;
    }
    setState(channelStatusRef.current === "SUBSCRIBED" ? "online" : "reconnecting");
  }, []);

  const subscribe = useCallback(() => {
    const supabase = supabaseRef.current;
    if (!supabase) return;
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelStatusRef.current = null;
    attemptRef.current += 1;
    const channel = supabase.channel(`${CHANNEL_PREFIX}:${attemptRef.current}`);
    channelRef.current = channel;
    channel.subscribe((status) => {
      channelStatusRef.current = status;
      recompute();
    });
  }, [recompute]);

  useEffect(() => {
    navOnlineRef.current =
      typeof navigator !== "undefined" ? navigator.onLine : true;

    const onOnline = () => {
      navOnlineRef.current = true;
      recompute();
    };
    const onOffline = () => {
      navOnlineRef.current = false;
      recompute();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    try {
      supabaseRef.current = createClient();
      realtimeAvailableRef.current = true;
    } catch {
      // No Supabase env configured → Realtime simply off; the navigator signal
      // still drives the card.
      supabaseRef.current = null;
      realtimeAvailableRef.current = false;
    }

    subscribe();
    recompute();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      const supabase = supabaseRef.current;
      if (supabase && channelRef.current) {
        void supabase.removeChannel(channelRef.current);
      }
      channelRef.current = null;
    };
  }, [recompute, subscribe]);

  const retry = useCallback(() => {
    navOnlineRef.current =
      typeof navigator !== "undefined" ? navigator.onLine : true;
    if (!navOnlineRef.current) {
      recompute();
      return;
    }
    // Browser reports online: show the in-between state and re-probe Realtime.
    setState("reconnecting");
    if (realtimeAvailableRef.current) {
      subscribe();
    } else {
      recompute();
    }
  }, [recompute, subscribe]);

  return { state, retry };
}
