# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

GitHub repo `lucablechschmidt/dartClientServer` (moved from GitLab, E15): a web port ("Darts Scorer Web", Next.js + SQLite on a
Raspberry Pi) of an earlier iOS dart-scoring app whose Swift source lives in
`Legacy/Dart/` (read-only reference, never edit). The owner wrote the Swift app
and is the end user. Read the docs before touching anything:

- `docs/architecture.md`: stack, network path, data model (§6), security (§10), decisions (§11)
- `docs/project.md`: milestones M0–M12 in execution order, with checklists and DoD (old numbers mapped at the top); tick items off
- `docs/legacy-analysis.md`: the Swift rules, screens and stats the port must match
- `docs/m*-plan.md`: step-by-step plan per milestone (every milestone gets one before code), finished plans move to `docs/archive/`; numbered in execution order: M4 devices → M5 X01 complete → M6 robustness → M7 other modes → M8 statistics → M9 tournaments → M10 achievements → M11 sound, comfort → M12 operations incl. ingress/Caddy check (deliberately last)
- `docs/theme.md`: color tokens (light/dark) from the legacy assets and the layout rules
- `Legacy/Screenshots/`: photos of the Swift app; the web screens are built to match these

Code conventions (layering, game-mode interface, repository injection, reusable
components) are in `architecture.md` §9 and are not optional.

Decisions already made (do not re-open without being asked): storage is per
visit with three dart slots (mirrors `DartThrow`), input is per dart via the
legacy keypad, X01 first and the other three modes later, free games have 2–n
players with placements, tournaments are 1 vs 1, Pi 3 B+ so builds happen only
on the dev machine. Docs in `docs/` and UI texts (`src/i18n/de.ts`) are German; everything else is English, including `README.md`: identifiers, comments, JSDoc, test names, log and error messages, script output, config comments and commit messages.

Note: `/Users/utrapp/repos/CLAUDE.md` (one directory up) belongs to a different
project, the HCI/Flutter course material. Its rules about labs, personas and
anchor validation do not apply here.

## Build / test

```
npm run dev                      # http://localhost:3000; /dev/theme and /dev/tokens only in dev
npm test                         # Vitest once; projects: domain (node, *.test.ts) and ui (jsdom, *.test.tsx)
npx vitest run src/domain/x01    # one folder or file
npm run lint                     # ESLint incl. the layering rule (no-restricted-imports)
npm run typecheck                # tsc; run `npm run build` first if .next/types is stale
npm run build                    # production build, output: standalone
npm run db:generate              # drizzle-kit migration after editing src/db/schema.ts
node scripts/screenshots.mjs DIR # layout check, needs `npx next dev --port 3100`
node scripts/smoke-match.mjs DIR # browser flow against port 3100 (BASE_URL/BASIC_AUTH env for the container)
./scripts/smoke.sh               # production build + standalone on :3100 + browser flow, screenshots → docs/screenshots
./scripts/ci.sh                  # everything the CI runs (install, lint, typecheck, test, smoke); .github/workflows/ci.yml only calls this
./scripts/deploy.sh              # buildx arm64 → ssh pi docker load → compose up (see README), only when asked
```

Stack: Next 16 (App Router, Cache Components on: pages that read SQLite
call `connection()` inside a Suspense boundary, see `src/server/request.ts`),
Tailwind 4 (tokens in `globals.css`, no tailwind.config), Drizzle + better-sqlite3
(pinned to 12, v13 segfaults on Node 22.13 darwin-arm64), Vitest, Playwright
(scripts only until M6). npm install scripts are gated: `allowScripts` in
package.json lists the approved packages. The machine's `~/.npm` cache has
root-owned files; use `npm install --cache <tmpdir>` until it is chowned.

Routes: `/` game menu, `/new/x01` setup, `/players`, `/account` (own name, password,
logout; admin: invites, players, guests), `/match/[id]` scoreboard, `/login`,
`/einladung/[token]` (public). Auth (M3, E10): a player with `password_hash` is a login,
`is_admin` is a column; `requireSession()` in every page and action, `src/proxy.ts` only
checks the cookie. Env: `ADMIN_USER`, `ADMIN_PASSWORD_HASH` (bcrypt, first admin bootstrap),
`APP_URL`, `COOKIE_SECURE=false` for local http. Input rights (E13, M4): `match.input_mode` and
`host_player_id`, pure checks in `src/domain/x01/permissions.ts`, enforced in `match-service.ts`;
live updates via SSE at `/api/match/[id]/events` (`src/server/match-events.ts`, Caddy `flush_interval -1`). Shared UI
building blocks (tab bar, screen header, option pills, card lists, icons) live in
`src/components/ui/`; new screens compose those instead of adding one-off classes.

Player names are unique across regular players and guests (case-insensitive).
Guests (E12): `player.guest_until` set = guest, listed 24 h, their matches are deleted daily by
`src/server/guest-cleanup.ts` (started from `instrumentation.ts`) after saving regular players'
field hits to `player_field_hits`. `src/domain/stats/` is the start of the M8 statistics module.

Writes: every service that writes more than once wraps them in `deps.transaction(() => …)`
(synchronous; bcrypt before it). Service tests build deps with `memoryDeps()`; atomicity is
tested against SQLite with `sqliteDeps()` (both in `src/server/testing.ts`).

Layering is enforced by ESLint: `src/domain` (pure) ← `src/db` ← `src/server`
← `src/components` ← `src/app`; `src/i18n` holds every visible text.
Components never import db/server; pages pass server actions as props.

`Legacy/Dart/` cannot be built here: Swift sources only, no `.xcodeproj`, no
`Package.swift`, depends on `OrderedCollections` and on sound/color assets that
are not in the repo.

## Architecture of the legacy Swift app

**Domain model** (`Legacy/Dart/Classes/GeneralClasses/`)
- `SingleDartsScore` = one dart (field 0–20/bull, `ScoreType` normal/double/
  triple/overthrown/unset, precomputed `totalScoreOfDart`).
- `DartThrow` = one visit of up to three darts, backed by `FixedSizeArray`
  (max 3). A visit can be marked `faulty` (bust): the remaining slots are
  filled with `.overthrown` darts so undo can pop the whole bust at once.
- `Game` (`ObservableObject`) is the base class: players, per-player score
  dictionary, per-player visit history, current player, current visit, undo
  (`removeDartThrow` walks back across the player switch), averages, and the
  "180" sound. Base `Game` *adds* points; subclasses override `addDart` /
  `addDartThrow` / `switchPlayers` to change the rules.
- `Player` is the only SwiftData `@Model` (persisted); everything else is
  in-memory per game. Equality/hash use object identity, not `playerId`.

**Game variants**, each a `Game` subclass in its own folder under `Classes/`:
- `ClassicGame` (x01): subtracts points, enforces `GameType` in/out
  constraints (single/double/triple in and out) via `isValidDartScore`, busts
  the visit on an invalid dart, tracks `Leg`s, and `Checkouts.swift` is a
  lookup table of finishing combinations.
- `CricketGame`: `Field` objects per cricket number tracking hits/closed state.
- `EliminationGame`: scores count *up* toward `finishPoints` with an out
  constraint; overshooting busts the dart, and landing exactly on another
  player's score resets that player to 0 (tracked in `Elimination`).
- `SplitScoreGame`: everyone starts at 40; each round targets the next field
  in `fieldToHit` (15, 16, any double, 17, 18, any triple, 19, 20, bull). A
  hit adds the visit's points, a miss halves the score (`recalculateScores`
  rebuilds the score from history, which is how undo works here).

Each variant also has a `createDummy…Game()` helper used by SwiftUI previews.

**View layer** (`Legacy/Dart/Views/`), one folder per variant, each following
the same four-file pattern:
- `…ManagerView` owns the `GameViewStates` state machine (gameSetUp →
  gameInProgress → gameVictory/gameEnded), builds the game object and injects
  it via `.environmentObject`.
- `…SetUpView` (player selection, options), `…InProgressView`, `…VictoryView`,
  wrapped by `…GameView`.
- `NewGameView` switches between variants using the `GameViews` enum;
  `HomeView` is the app root (tabs: New Game, Players). `RootView`,
  `ContentView`, `Item`, `TestingView`, `TextTestView` and `CustomTabBar` are
  Xcode-template or experimental leftovers that the app does not navigate to.
- Shared in-game widgets live in `Views/GeneralViews/GameInProgress/`
  (`ScoreInputView` with the `InputButtons` enum for the keypad, player detail
  panels, leg victory). Game-specific logic should stay in the model classes,
  not in these views.
