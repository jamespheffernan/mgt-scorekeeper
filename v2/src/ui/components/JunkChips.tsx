import { cn } from '@/lib/cn';
import type { JunkFlags } from '@/domain/types';

interface JunkChipsProps {
  flags: JunkFlags;
  par: number;
  isPar3: boolean;
  is17th: boolean;
  ld10Active: boolean;
  disabled?: boolean;
  onChange: (next: JunkFlags) => void;
}

/** Toggle row for the per-player junk eligibility flags. */
export function JunkChips({ flags, par, isPar3, is17th, ld10Active, disabled, onChange }: JunkChipsProps) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', disabled && 'opacity-40 pointer-events-none')}>
      <Chip
        active={Boolean(flags.hadBunkerShot)}
        onClick={() => onChange({ ...flags, hadBunkerShot: !flags.hadBunkerShot })}
        title={`Sandie: par or better after a bunker shot (par ${par})`}
      >
        Sand
      </Chip>
      {isPar3 ? (
        <Chip
          active={Boolean(flags.onGreenFromTee)}
          onClick={() => onChange({ ...flags, onGreenFromTee: !flags.onGreenFromTee })}
          title="Greenie candidate: tee ball on the green"
        >
          Green
        </Chip>
      ) : null}
      {isPar3 ? (
        <Chip
          active={Boolean(flags.threePutts)}
          onClick={() => onChange({ ...flags, threePutts: !flags.threePutts })}
          title="Three putts — Greenie penalty"
        >
          3-putt
        </Chip>
      ) : null}
      {is17th && ld10Active ? (
        <Chip
          active={Boolean(flags.ld10Winner)}
          tone="brass"
          onClick={() => onChange({ ...flags, ld10Winner: !flags.ld10Winner })}
          title="LD10: longest drive in upper fairway / collar / green"
        >
          LD10
        </Chip>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  title,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  tone?: 'brass';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'px-2.5 py-1 rounded-[var(--radius-pill)] text-[11px] uppercase tracking-[0.16em] border transition',
        active
          ? tone === 'brass'
            ? 'bg-[var(--color-brass)] text-[var(--color-ink)] border-[var(--color-brass)]'
            : 'bg-[var(--color-fairway)] text-[var(--color-paper)] border-[var(--color-fairway)]'
          : 'bg-[var(--color-card)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:text-[var(--color-ink)]',
      )}
    >
      {children}
    </button>
  );
}
