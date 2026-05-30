import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 select-none',
    'font-medium tracking-tight transition',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brass)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-paper)]',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'active:translate-y-[1px]',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--color-fairway)] text-[var(--color-paper)] shadow-[var(--shadow-card)] hover:bg-[var(--color-fairway-dim)]',
        secondary:
          'bg-[var(--color-card)] text-[var(--color-ink)] border border-[var(--color-rule)] shadow-[var(--shadow-card)] hover:bg-[var(--color-paper-deep)]',
        ghost:
          'bg-transparent text-[var(--color-ink-soft)] hover:text-[var(--color-fairway)]',
        danger:
          'bg-[var(--color-red)] text-white shadow-[var(--shadow-card)] hover:bg-[#a82d20]',
      },
      size: {
        sm: 'text-[13px] px-3 py-1.5 rounded-[var(--radius-sm)]',
        md: 'text-[14px] px-4 py-2 rounded-[var(--radius-md)]',
        lg: 'text-[15px] px-5 py-3 rounded-[var(--radius-md)]',
        pill: 'text-[11px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-[var(--radius-pill)]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={cn(button({ variant, size }), className)} {...rest} />;
});
