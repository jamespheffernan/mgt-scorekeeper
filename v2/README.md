# Millbrook Scorekeeper — v2

A faithful, beautiful, well-engineered rebuild of the Millbrook Game scorekeeper.

The rulebook of record is [`../Millbrook-Game-and-Big-Game-Rulebooks.md`](../Millbrook-Game-and-Big-Game-Rulebooks.md). Every calculation in `src/engine/` cites the section it implements.

## Stack

- **Vite 6** + **React 19** + **TypeScript** (strict, `noUncheckedIndexedAccess`)
- **Tailwind v4** (CSS-first `@theme`) for design tokens
- **Zustand 5** + **Immer** for state, **Dexie 4** for IndexedDB persistence
- **React Router 7** for navigation
- **vite-plugin-pwa** for offline-first install
- **Vitest** + **React Testing Library** for tests
- **Radix UI** primitives + **cva**/**clsx**/**tailwind-merge** for the design system

## Architecture

```
src/
├── rules/         Frozen rulebook constants, with section citations
├── domain/        Entity types + Zod schemas
├── engine/        Pure calculation functions — no React, no logging
├── store/         Zustand slices (match, roster, courses)
├── persistence/   Dexie schema + adapters
├── courses/       Course data (Millbrook baked in from rulebook)
├── ui/            Design-system components
├── routes/        Page-level routes
├── lib/           Small cross-cutting helpers
├── App.tsx
└── main.tsx
```

The engine is pure. It transforms inputs to outputs deterministically and has no
side effects. UI imports from the engine, never the other way around.

## Develop

```
npm install
npm run dev        # http://localhost:5174
npm run test       # vitest
npm run typecheck
npm run build
```

## Status

Built in 2026. See `../README.md` for v1.
