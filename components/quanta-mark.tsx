/**
 * Quanta mark — a rounded-square calc region containing a fraction rule and a
 * green result dot (a calculation cell in miniature). Monochrome ink stroke
 * with the single pass-green accent dot; recolor only within blueprint/ink/pass.
 */
export function QuantaMark({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M7 14.5h7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="17" cy="14.5" r="1.6" fill="var(--status-pass)" />
    </svg>
  );
}
