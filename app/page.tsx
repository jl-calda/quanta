const SCAFFOLD = [
  "Next.js App Router · TypeScript · Tailwind v4",
  "Supabase wired via @supabase/ssr (browser · server · middleware)",
  "Design tokens ported from the _ds export into a global CSS + Tailwind theme",
  "Geist Sans · Geist Mono · STIX Two Text loaded via next/font",
  "Pyodide (SymPy · NumPy · SciPy) lazy-loaded in a Web Worker",
  "Pure calc-engine seed in /lib/calc · Mathcad keymap in /lib/keymap",
  "Comfortable / Compact density toggle — Compact by default",
];

export default function Home() {
  return (
    <main className="q-grid flex-1 bg-paper px-6 py-[var(--d-section)]">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <span className="q-eyebrow">Foundation · M0</span>
          <h1 className="text-28 font-semibold tracking-[-0.01em] text-ink">
            Quanta scaffold
          </h1>
          <p className="max-w-prose text-14 text-muted">
            The project foundation is in place. The live-math editor, region
            types, and pages build on top of this in the milestones that follow.
          </p>
        </header>

        {/* A static preview of the live-math signature — formula in mono,
            committed notation in STIX, result + unit in pass green. */}
        <section className="rounded-md border border-hairline bg-raised shadow-[var(--shadow-sm)]">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2">
            <span className="q-eyebrow">Live-math preview</span>
            <span className="inline-flex h-[19px] items-center rounded-sm bg-pass-bg px-2 text-11 font-semibold tracking-[0.08em] text-pass uppercase">
              Pass
            </span>
          </div>
          <div className="flex flex-col gap-3 px-4 py-4">
            <code className="q-formula text-muted">
              sigma_max := M * c / I
            </code>
            <div className="q-math flex items-baseline gap-2 text-[28px] leading-tight">
              <span>
                σ<sub className="text-[16px]">max</sub>
              </span>
              <span>=</span>
              <span className="inline-flex flex-col items-center">
                <span className="px-2">M · c</span>
                <span className="my-0.5 h-px w-full bg-ink" />
                <span className="px-2">I</span>
              </span>
              <span>=</span>
              <span className="text-pass">142</span>
              <span className="text-pass">MPa</span>
            </div>
          </div>
        </section>

        <section className="rounded-md border border-hairline bg-chrome p-[var(--d-card-pad)]">
          <span className="q-eyebrow">Wired in this scaffold</span>
          <ul className="mt-3 flex flex-col">
            {SCAFFOLD.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 border-b border-hairline py-2 text-13 text-ink last:border-b-0"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-pass"
                  aria-hidden="true"
                >
                  <path d="m20 6-11 11-5-5" />
                </svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
