import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  description?: string;
}

export function Checkbox({ label, description, className, id, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 cursor-pointer select-none paper-card px-4 py-3"
    >
      <input
        type="checkbox"
        id={id}
        className={cn(
          'mt-0.5 h-4 w-4 rounded-sm border border-[var(--color-rule)] bg-[var(--color-card)] accent-[var(--color-fairway)]',
          className,
        )}
        {...rest}
      />
      <span className="flex-1">
        <span className="block text-[14px] text-[var(--color-ink)]">{label}</span>
        {description ? (
          <span className="block text-[12px] text-[var(--color-ink-muted)] mt-0.5">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
