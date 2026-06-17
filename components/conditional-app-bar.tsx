"use client";

import { usePathname } from "next/navigation";
import { AppBar } from "./app-bar";

/**
 * The auth screens own their full-bleed chrome (the sign-in split, the
 * reset-password card), the dashboard shell (`/app`) renders its own nav rail +
 * top bar, and the worksheet editor (`/w/[id]`) owns its full editor chrome — so
 * the global AppBar is suppressed on those routes. Everywhere else it renders as
 * usual.
 */
const HIDE_ON = ["/sign-in", "/sign-up", "/reset-password", "/app", "/w"];

export function ConditionalAppBar() {
  const pathname = usePathname();
  const hide = HIDE_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hide) return null;
  return <AppBar />;
}
