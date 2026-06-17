/**
 * The app's externally reachable origin, used to build OAuth / magic-link
 * redirect targets. Prefer an explicit env var; fall back to localhost in dev.
 *
 * Set NEXT_PUBLIC_SITE_URL in production (e.g. https://quanta.app). On Vercel,
 * VERCEL_URL is used as a fallback for preview deployments.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
