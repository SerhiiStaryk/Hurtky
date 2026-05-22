# AGENTS.md

This repository uses `Expo` + `React Native` + `TypeScript` with file-based routing under `app/`.

`AGENTS.md` is the canonical place for coding agents to find build, test, and contribution guidance without cluttering the human-focused `README.md`.

## Project overview

- Mobile app built with Expo and TypeScript.
- Main app source is `app/`.
- Shared UI components live in `components/`.
- Hooks are in `hooks/`.
- Utilities and data access are in `lib/`.
- Global app state is in `store/useAppStore.ts`.
- The app uses Expo Router for navigation and local persistence via SQLite.

## Setup commands

- Install dependencies: `npm install`
- Start development server: `npx expo start`
- Run on Android (requires Android SDK/emulator): `npm run android`
- Run on web: `npm run web`
- Run lint: `npm run lint`

## Build and test guidance

- This repo does not include a dedicated test suite in the root.
- Before making code changes, run `npm install` and `npm run lint`.
- Verify the app loads in Metro/Expo after edits.
- Do not update native `android/` files or major platform dependencies (`expo`, `react-native`) without explicit approval.

## Coding conventions

- Preserve TypeScript `strict` settings.
- Keep diffs small and focused.
- Use existing patterns rather than introducing new architecture.
- When adding screens, create files under `app/` following file-based routing conventions.
- Prefer existing utilities and hooks instead of duplicate logic.

## Files to inspect first

- `app/_layout.tsx` — app root, initialization, theming, and splash screen.
- `lib/db.ts` — database initialization and schema.
- `store/useAppStore.ts` — app-wide global state.
- `package.json` and `tsconfig.json` — scripts and TypeScript settings.

## PR and commit guidance

- Use commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- Keep PRs small and focused.
- Document any native or platform-specific changes and the device/emulator used.
- Ensure lint passes before merging.

## Additional notes for agents

- Use AI guidance from `.github/copilot-instructions.md` when available.
- If unsure about a larger change, propose a short plan first.
- Treat `AGENTS.md` as agent-friendly instructions; explicit user requests override these guidelines.
