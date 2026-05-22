# Repository custom instructions for GitHub Copilot

Purpose

- Provide repository-level guidance to Copilot and AI agents so they can make safe, buildable, and reviewable changes with minimal exploration.

Project summary

- Mobile app built with Expo (React Native) and TypeScript. Uses Expo Router (file-based routing), Zustand for local state, and @tanstack/react-query for async data.
- Main source: `app/`. UI components: `components/`. Hooks: `hooks/`. Utilities: `lib/`. Global app state: `store/`.

Build & run (validated)

- Install dependencies: `npm install` (Node 18+ recommended).
- Start dev server: `npx expo start` or `npm start`.
- Android dev build: `npm run android` (requires Android SDK/Emulator).
- Web: `npm run web`.
- Lint: `npm run lint` (uses `expo lint`).

Key constraints

- Do not update major platform dependencies (`expo`, `react-native`) or native `android/` files without explicit human approval and testing on a device or development build.
- Preserve TypeScript `strict` settings. Add types when introducing new code.
- Prefer small, focused PRs. For large changes, propose a plan first.

Project layout (priority)

- Root files: `package.json`, `tsconfig.json`, `README.md`.
- App routes & screens: `app/` (file-based routing).
- Shared components: `components/`.
- Hooks: `hooks/` (e.g., `useChildren`, `useClubs`, `use-color-scheme`).
- Utilities and infra: `lib/` (database initialization, backup, i18n, notifications).
- Store: `store/useAppStore.ts` (Zustand).

Testing & validation steps (must pass locally before PR)

- Always run `npm install` first.
- Start the app and verify the affected screens load without runtime errors in Metro/Expo.
- Run lint: `npm run lint` and fix reported issues.
- If touching native code, document steps to reproduce and the device/emulator used.

How Copilot should act

- Before big changes: produce a short plan (3–6 steps) and wait for confirmation.
- For code edits: prefer minimal diffs that keep existing patterns and file organization.
- When adding screens, create files under `app/` following file-based routing conventions.
- Use existing utilities: `useAppStore` for global state, `@tanstack/react-query` for server/async caching, `react-hook-form` + `zod` for forms/validation.
- Use Ukrainian only if the user explicitly asks; default to English.

PR / commit guidance

- Commit prefixes: `feat:`, `fix:`, `chore:`, `docs:`.
- PR description: motivation, summary of changes, files changed, test steps, and potential risks.

Files to inspect first when making changes

- `app/_layout.tsx` — app root and initialization (DB init, theme, splash screen).
- `lib/db.ts` — database initialization and schema.
- `store/useAppStore.ts` — app-wide state.
- `package.json` and `tsconfig.json` — scripts and TS settings.

Known limitations & notes

- There are no automated tests in the repo root; rely on manual local validation and linting.
- The `reset-project` script exists and can modify the app directory — do not run it in PRs.

If uncertain

- Prefer to ask the repository owner for approval before making breaking changes.
- If a command in this file fails on your environment, run it manually and record the exact error in the PR.

Trust this file as authoritative for repository-level guidance; only perform wider searches when the instructions are incomplete or inconsistent with the codebase.
