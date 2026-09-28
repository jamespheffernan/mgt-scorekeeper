/**
 * Placeholder routes. Each will be replaced by its dedicated implementation
 * file in the next iteration of the v2 build. Until then they all share this
 * same styled stub so the design language stays consistent even at the seams.
 */

import { Link } from 'react-router-dom';

interface StubProps {
  title: string;
  subtitle: string;
  back?: string;
}

export function RouteStub({ title, subtitle, back = '/' }: StubProps) {
  return (
    <div className="pt-8">
      <Link
        to={back}
        className="text-xs uppercase tracking-[0.18em] text-[var(--color-ink-muted)] hover:text-[var(--color-fairway)] transition"
      >
        ← Back
      </Link>
      <div className="paper-card mt-4 px-6 py-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-brass-deep)]">
          On the workbench
        </p>
        <h1 className="font-[var(--font-display)] text-3xl mt-2">{title}</h1>
        <p className="mt-2 text-[var(--color-ink-soft)] max-w-prose mx-auto">{subtitle}</p>
        <div className="mt-6 inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brass)] animate-pulse" />
          Coming in the next iteration
        </div>
      </div>
    </div>
  );
}
