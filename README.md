# Hurtky

A mobile app built with Expo, React Native, and TypeScript for managing children, clubs, schedules, and payments.

## App overview

- `Home` tab shows registered children and upcoming lessons.
- `Schedule` tab displays weekly lessons in a grid or list view.
- `Payments` tab tracks club payments and allows marking items as paid.
- `Settings` tab manages theme mode, backup export/import, and app info.

This app uses local persistence with SQLite, Expo Router for navigation, Zustand for global state, and React Query for asynchronous data loading.

## Getting started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Run on Android:

```bash
npm run android
```

Run on web:

```bash
npm run web
```

Run lint checks:

```bash
npm run lint
```

## Project structure

- `app/` — main app routes and screens
- `components/` — shared UI components
- `hooks/` — reusable hooks for theme, children, and clubs
- `lib/` — database setup, repositories, backup, and utilities
- `store/` — Zustand app state
- `scripts/` — project helper scripts

## Important files

- `app/_layout.tsx` — root layout, theme and database initialization
- `app/(tabs)/_layout.tsx` — bottom tab navigation
- `lib/db.ts` — SQLite database initialization and schema
- `store/useAppStore.ts` — global app state and theme handling
- `AGENTS.md` — guidance for coding agents working on this repo

## Notes

- The repository currently does not include an automated test suite in the root.
- Preserve TypeScript strict mode and existing app patterns when modifying code.
- Do not update major native dependencies or `android/` files without explicit approval.
