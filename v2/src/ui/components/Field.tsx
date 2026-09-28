import { forwardRef, type InputHTMLAttributes, useId } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  trailing?: string;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, trailing, className, id, ...rest },
  ref,
) {
  const reactId = useId();
  const inputId = id ?? reactId;
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2.5 rounded-[var(--radius-sm)]',
            'bg-[var(--color-card)] text-[var(--color-ink)]',
            'border border-[var(--color-rule)]',
            'placeholder:text-[var(--color-ink-muted)]',
            'focus:outline-none focus:border-[var(--color-fairway)] focus:ring-2 focus:ring-[var(--color-fairway)]/15',
            'transition',
            trailing && 'pr-12',
            error && 'border-[var(--color-red)] focus:border-[var(--color-red)] focus:ring-[var(--color-red)]/15',
            className,
          )}
          {...rest}
        />
        {trailing ? (
          <span className="absolute inset-y-0 right-3 grid place-items-center text-[12px] uppercase tracking-[0.16em] text-[var(--color-ink-muted)]">
            {trailing}
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="text-[12px] text-[var(--color-red)]">{error}</p>
      ) : hint ? (
        <p className="text-[12px] text-[var(--color-ink-muted)]">{hint}</p>
      ) : null}
    </div>
  );
});
