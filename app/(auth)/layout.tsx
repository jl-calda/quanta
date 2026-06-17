import "./auth.css";

/**
 * The auth route group owns its full-bleed chrome (the sign-in split, the
 * reset-password card), so the layout is a passthrough — the global AppBar is
 * suppressed on these routes (see components/conditional-app-bar.tsx). This file
 * also loads the shared auth styles.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
