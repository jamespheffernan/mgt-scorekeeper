import { cn } from '@/lib/cn';

interface PillToggleProps<T extends string> {
  label?: string;
  options: { value: T; label: string; tone?: 'red' | 'blue' | 'neutral' }[];
  value: T;
  onChange: (value: T) => void;
}

export function PillToggle<T extends string>({ label, options, value, onChange }: PillToggleProps<T>) {
  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
          {label}
        </span>
      ) : null}
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex p-0.5 rounded-[var(--radius-pill)] border border-[var(--color-rule)] bg-[var(--color-card)] shadow-[var(--shadow-card)]"
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                'px-4 py-1.5 text-[12px] uppercase tracking-[0.18em] rounded-[var(--radius-pill)] transition',
                active
                  ? toneClasses(opt.tone)
                  : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]',
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function toneClasses(tone: 'red' | 'blue' | 'neutral' | undefined): string {
  switch (tone) {
    case 'red':
      return 'bg-[var(--color-red)] text-white';
    case 'blue':
      return 'bg-[var(--color-blue)] text-white';
    default:
      return 'bg-[var(--color-fairway)] text-[var(--color-paper)]';
  }
}
