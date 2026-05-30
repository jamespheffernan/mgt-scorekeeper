import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface AppShellProps {
  children: ReactNode;
}

interface Tab {
  to: string;
  label: string;
  matchPrefix?: string;
}
const TABS: Tab[] = [
  { to: '/', label: 'Home' },
  { to: '/hole/1', label: 'Hole', matchPrefix: '/hole' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/settlement', label: 'Settle' },
];

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-dvh flex flex-col">
      <AppHeader />
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pb-24 pt-4 mx-auto w-full max-w-3xl">
        {children}
      </main>
      <BottomBar />
    </div>
  );
}

function AppHeader() {
  return (
    <header
      className={cn(
        'sticky top-0 z-30',
        'backdrop-blur-sm',
        'border-b border-[var(--color-rule)]',
        'bg-[color-mix(in_srgb,var(--color-paper)_88%,transparent)]',
      )}
    >
      <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 h-14 flex items-center gap-3">
        <Crest />
        <div className="flex-1">
          <div className="text-[15px] tracking-tight font-medium font-[var(--font-display)]">
            Millbrook
          </div>
          <div className="text-[11px] -mt-0.5 text-[var(--color-ink-muted)] uppercase tracking-[0.14em]">
            Scorekeeper
          </div>
        </div>
        <NavLink
          to="/roster"
          className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)] hover:text-[var(--color-fairway)] transition"
        >
          Roster
        </NavLink>
        <NavLink
          to="/courses"
          className="text-xs uppercase tracking-[0.14em] text-[var(--color-ink-soft)] hover:text-[var(--color-fairway)] transition"
        >
          Courses
        </NavLink>
      </div>
    </header>
  );
}

function Crest() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
      <circle cx="14" cy="14" r="13" fill="var(--color-fairway)" />
      <circle cx="14" cy="14" r="9" fill="none" stroke="var(--color-brass)" strokeWidth="0.8" />
      <text
        x="14"
        y="18"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="11"
        fontWeight="700"
        fill="var(--color-paper)"
      >
        M
      </text>
    </svg>
  );
}

function BottomBar() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed bottom-0 inset-x-0 z-30',
        'border-t border-[var(--color-rule)]',
        'bg-[color-mix(in_srgb,var(--color-paper)_92%,transparent)]',
        'backdrop-blur-sm',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="mx-auto w-full max-w-3xl px-2 grid grid-cols-4 h-14">
        {TABS.map((tab) => {
          const active = tab.matchPrefix
            ? pathname.startsWith(tab.matchPrefix)
            : pathname === tab.to;
          return (
            <li key={tab.to} className="flex">
              <NavLink
                to={tab.to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center text-[11px] uppercase tracking-[0.14em] transition',
                  active
                    ? 'text-[var(--color-fairway)] font-semibold'
                    : 'text-[var(--color-ink-muted)] hover:text-[var(--color-fairway)]',
                )}
              >
                {tab.label}
                {active ? (
                  <span className="mt-1 h-0.5 w-6 bg-[var(--color-brass)] rounded-full" />
                ) : (
                  <span className="mt-1 h-0.5 w-6 bg-transparent" />
                )}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
