"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * A single nav-rail entry. Active state is derived from the pathname (Home =
 * `/app`). Screens that aren't built yet are rendered as disabled with a
 * "Coming soon" tooltip rather than linking to a 404.
 */
export interface NavItemProps {
  href: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
}

export function NavItem({ href, label, icon, disabled = false }: NavItemProps) {
  const pathname = usePathname();
  const active = !disabled && (pathname === href || pathname.startsWith(`${href}/`));

  const className = [
    "flex w-full items-center gap-[11px] rounded-sm px-2.5 py-2 text-left text-13",
    "transition-colors duration-[var(--dur-fast)]",
    active
      ? "bg-accent-tint font-semibold text-accent"
      : disabled
        ? "cursor-not-allowed font-medium text-muted/60"
        : "font-medium text-ink hover:bg-hover",
  ].join(" ");

  const content = (
    <>
      <span
        className={
          active ? "inline-flex text-accent" : "inline-flex text-muted"
        }
      >
        {icon}
      </span>
      {label}
    </>
  );

  if (disabled) {
    return (
      <span
        className={className}
        aria-disabled="true"
        title="Coming soon"
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={className}
      aria-current={active ? "page" : undefined}
    >
      {content}
    </Link>
  );
}
