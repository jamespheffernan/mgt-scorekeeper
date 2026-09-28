import { cn } from '@/lib/cn';

interface StepperProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label?: string;
  /** Tone of the central number — defaults to neutral. */
  tone?: 'red' | 'blue' | 'neutral';
}

export function Stepper({ value, onChange, min = 1, max = 15, disabled, label, tone = 'neutral' }: StepperProps) {
  const dec = () => !disabled && value > min && onChange(value - 1);
  const inc = () => !disabled && value < max && onChange(value + 1);
  return (
    <div className={cn('flex items-center gap-1 select-none', disabled && 'opacity-50')}>
      <StepperBtn onClick={dec} disabled={disabled || value <= min} ariaLabel={`${label ?? 'value'} decrement`}>
        −
      </StepperBtn>
      <div
        className={cn(
          'min-w-12 px-2 py-1 text-center font-[var(--font-display)] text-2xl leading-none num',
          tone === 'red' && 'text-[var(--color-red)]',
          tone === 'blue' && 'text-[var(--color-blue)]',
        )}
        aria-label={label}
      >
        {value}
      </div>
      <StepperBtn onClick={inc} disabled={disabled || value >= max} ariaLabel={`${label ?? 'value'} increment`}>
        +
      </StepperBtn>
    </div>
  );
}

function StepperBtn({
  onClick,
  disabled,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'h-9 w-9 grid place-items-center rounded-[var(--radius-pill)] text-[18px] font-[var(--font-display)]',
        'bg-[var(--color-card)] border border-[var(--color-rule)] text-[var(--color-ink)]',
        'transition active:scale-95',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'hover:bg-[var(--color-paper-deep)]',
      )}
    >
      {children}
    </button>
  );
}
