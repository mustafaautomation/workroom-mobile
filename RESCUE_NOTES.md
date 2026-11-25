# Rescued from Cursor

Source: Workroom Mobile — Expo app | Cursor https://cursor.com/agents/bc-9d95f911-85a5-57c3-9f8f-93eebf93c12b
Scope: All Commits
Captured: 2026-11-25T12:20:48.386Z
Files written: 74

Not in this copy: files Cursor's template created and the agent never changed (e.g. tsconfig, shadcn ui components, lockfiles, public assets) when scope is 'Last Agent Turn'; binaries.

- binary not recoverable from diff view: assets/expo.icon/Assets/grid.png
- binary not recoverable from diff view: assets/images/tabIcons/explore.png
- binary not recoverable from diff view: assets/images/tabIcons/explore@2x.png
- binary not recoverable from diff view: assets/images/tabIcons/explore@3x.png
- binary not recoverable from diff view: assets/images/tabIcons/home.png
- binary not recoverable from diff view: assets/images/tabIcons/home@2x.png
- binary not recoverable from diff view: assets/images/tabIcons/home@3x.png
- binary not recoverable from diff view: assets/images/android-icon-background.png
- binary not recoverable from diff view: assets/images/android-icon-foreground.png
- binary not recoverable from diff view: assets/images/android-icon-monochrome.png
- binary not recoverable from diff view: assets/images/expo-badge-white.png
- binary not recoverable from diff view: assets/images/expo-badge.png
- binary not recoverable from diff view: assets/images/expo-logo.png
- binary not recoverable from diff view: assets/images/favicon.png
- binary not recoverable from diff view: assets/images/icon.png
- binary not recoverable from diff view: assets/images/logo-glow.png
- binary not recoverable from diff view: assets/images/react-logo.png
- binary not recoverable from diff view: assets/images/react-logo@2x.png
- binary not recoverable from diff view: assets/images/react-logo@3x.png
- binary not recoverable from diff view: assets/images/splash-icon.png
- binary not recoverable from diff view: assets/images/tutorial-web.png
- binary not recoverable from diff view: docs/screenshots/agency-queue-dark.png
- binary not recoverable from diff view: docs/screenshots/agency-queue.png
- binary not recoverable from diff view: docs/screenshots/client-home.png
- binary not recoverable from diff view: docs/screenshots/demo.png
- binary not recoverable from diff view: docs/screenshots/more-dark.png
- binary not recoverable from diff view: docs/screenshots/review.png
- binary not recoverable from diff view: docs/screenshots/welcome.png
- lockfile incomplete, regenerate: package-lock.json

## Repair pass (Claude, 2026-11-25)

Recreated:
- assets/ (every binary listed above under assets/): copied from expo-template-default@58.0.35, which is exactly where they came from (the agent never changed them). Stock Expo icons, not Workroom branding.
- package-lock.json: regenerated with npm (the rescued one was incomplete).
- docs/screenshots/*.png (all 7 listed above): re-captured from the rebuilt web export with scripts/capture-screenshots.mjs (real captures, not the originals).
- .gitignore: added .env.* (keeping !.env.example).

No source changes were needed.

Checks run locally on 2026-11-25 (Node 22.23.4, the CI version; npm install was done with Node 25):
- npm install: OK, package-lock.json regenerated (all from registry.npmjs.org)
- npm run lint: pass
- npm run typecheck (tsc --noEmit): pass
- jest: 5 suites, 17 tests pass (matches the Cursor run)
- npx expo export --platform web: pass (dist/)
- Playwright web e2e (chromium, CI=true): 5 passed (matches the Cursor run)

Note: under heavy machine load the first cold Jest run timed out on the first component test of a few suites (default 5s timeout while modules transform); a warm re-run passes. Not a code problem, but CI on a cold cache could be slow on that first test.

Still missing / needs a person: real app icons; Maestro flows not run; Apple/Google/Expo accounts, Supabase URL + anon key + migration, DNS. No EAS build was run.
