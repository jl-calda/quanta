import type { CalcStatus } from "@/lib/supabase/types";
import type { BadgeTone } from "@/components/ds";

/**
 * Pure display helpers for the dashboard. Kept deterministic and free of React
 * so they're trivially unit-testable.
 */

/** Map a worksheet's calc status to a badge tone + label for the status chip. */
export function calcStatusMeta(status: CalcStatus): {
  tone: BadgeTone;
  label: string;
} {
  switch (status) {
    case "current":
      return { tone: "pass", label: "All current" };
    case "stale":
      return { tone: "warning", label: "Needs recalculate" };
    case "error":
      return { tone: "error", label: "Has errors" };
    default:
      return { tone: "neutral", label: status };
  }
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * Human "edited" label: "Just now", "5 minutes ago", "2 hours ago",
 * "Yesterday", then a calendar date ("28 Apr", or "28 Apr 2024" across years).
 * `now` is injectable for testing.
 */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  if (Number.isNaN(ms)) return "";
  const mins = Math.floor(ms / 60000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;

  const date = `${then.getDate()} ${MONTHS[then.getMonth()]}`;
  return then.getFullYear() === now.getFullYear()
    ? date
    : `${date} ${then.getFullYear()}`;
}

/** Up to two uppercase initials from a name, e.g. "Maya Okafor" → "MO". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const letters = parts.map((p) => p[0]).join("");
  return letters.slice(0, 2).toUpperCase();
}

/** Time-of-day greeting. `date` is injectable for testing. */
export function greeting(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** First name from a full name / email, for the greeting. */
export function firstName(value: string | null | undefined): string {
  if (!value) return "there";
  const name = value.includes("@") ? value.split("@")[0] : value;
  const first = name.trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "there";
}
