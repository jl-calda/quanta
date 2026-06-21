"use client";

import { Button } from "@/components/ds";
import { EmptyStateCard } from "./empty-state-card";
import type { EmptyStateTone } from "./empty-state-card";
import { SPOT_ICONS } from "./spot-icons";
import { useOnlineStatus } from "./use-online-status";
import type { ConnectionState } from "./use-online-status";

/**
 * The connection card (#7) — the one live card. It reflects real connection
 * status (`navigator.onLine` + a Supabase Realtime channel) rather than a static
 * "You're offline" mock, swapping tone, icon, headline and copy as the status
 * changes. "Retry now" / "Recheck connection" re-probes the connection.
 */

const VARIANTS: Record<
  ConnectionState,
  {
    tone: EmptyStateTone;
    icon: typeof SPOT_ICONS[keyof typeof SPOT_ICONS];
    headline: string;
    body: string;
    action: string;
  }
> = {
  offline: {
    tone: "warning",
    icon: SPOT_ICONS.offline,
    headline: "You’re offline",
    body: "Changes are saved locally and will sync automatically when you reconnect.",
    action: "Retry now",
  },
  reconnecting: {
    tone: "warning",
    icon: SPOT_ICONS.cloud,
    headline: "Reconnecting…",
    body: "Hang tight — we're restoring the live connection. Your changes are safe.",
    action: "Retry now",
  },
  online: {
    tone: "pass",
    icon: SPOT_ICONS.cloud,
    headline: "You’re online — changes sync in real time",
    body: "Connected to Quanta. Edits save and recalculate the moment you make them.",
    action: "Recheck connection",
  },
};

export function ConnectionCard({ index }: { index: number }) {
  const { state, retry } = useOnlineStatus();
  const v = VARIANTS[state];

  return (
    <EmptyStateCard
      index={index}
      ctx="Connection"
      icon={v.icon}
      tone={v.tone}
      headline={v.headline}
      body={v.body}
    >
      <Button variant="secondary" onClick={retry}>
        {v.action}
      </Button>
    </EmptyStateCard>
  );
}
