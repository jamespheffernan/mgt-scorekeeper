import { cn } from '@/lib/cn';

/** Tabular-figure money chip. Negative numbers render with a minus, never paren. */
export function Money({
  value,
  className,
  tone,
  align = 'right',
}: {
  value: number;
  className?: string;
  tone?: 'win' | 'loss' | 'mute' | 'neutral';
  align?: 'right' | 'left' | 'center';
}) {
  const v = Math.round(value * 100) / 100;
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  const formatted = Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(2);
  return (
    <span
      className={cn(
        'num tabular-nums',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        tone === 'win' && 'text-[var(--color-win)]',
        tone === 'loss' && 'text-[var(--color-loss)]',
        tone === 'mute' && 'text-[var(--color-ink-muted)]',
        className,
      )}
    >
      {sign}${formatted}
    </span>
  );
}
