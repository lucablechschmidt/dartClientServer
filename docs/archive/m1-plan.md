# M1-Plan – Vertikaler Durchstich

> Detailplan zu `project.md` M1. Reihenfolge ist so gewählt, dass jeder Schritt ohne den Pi testbar ist, und der Pi erst in Schritt 7 gebraucht wird.
> Luca: Deine Aufgaben stehen in §0. Alles andere macht Claude Code, Schritt für Schritt, mit Commit nach jedem grünen Schritt.

---

## 0. Was Luca tut (parallel zu Schritt 1–6)

1. **E1 ist geklärt:** DS-Lite, daher Tailscale Funnel statt Portfreigabe. An der FritzBox ist **nichts** einzustellen.
2. **Pi aufsetzen:** Raspberry Pi OS Lite 64-bit flashen (Raspberry Pi Imager, dort SSH-Key und Hostname `pi` setzen). Dann auf dem Pi:
   ```
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER
   sudo apt-get install -y docker-compose-plugin
   ```
   Auf dem Mac in `~/.ssh/config`:
   ```
   Host pi
     HostName <IP des Pi>
     User <dein User>
   ```
   Prüfung: `ssh pi docker run --rm hello-world`
3. **Tailscale auf dem Pi** (erledigt, Hostname `dartserver.swallow-pythagorean.ts.net`):
   ```
   curl -fsSL https://tailscale.com/install.sh | sh
   sudo tailscale up
   ```
   Den angezeigten Link im Browser öffnen und mit Google/Apple/Microsoft/GitHub anmelden (das legt dein Tailnet an). Danach in der Admin-Konsole (login.tailscale.com/admin):
   - *DNS* → **MagicDNS** an, **HTTPS Certificates** an. Dort steht auch dein Tailnet-Name (`tailXXXX.ts.net`).
   - *Access controls* → in die Richtlinie aufnehmen:
     ```
     "nodeAttrs": [{ "target": ["autogroup:member"], "attr": ["funnel"] }]
     ```
   - Optional *Machines* → den Pi umbenennen in `darts`, dann heißt die URL `https://darts.tailXXXX.ts.net`.
   Dann auf dem Pi:
   ```
   sudo tailscale funnel --bg 8080
   tailscale funnel status
   ```
   Den Hostnamen aus `funnel status` an Claude geben. Bis Caddy läuft, antwortet die URL mit einem Fehler, das ist in Ordnung.
4. **Basic-Auth-Zugangsdaten** aussuchen. `./scripts/hash-password.sh` auf dem Mac ausführen und die ausgegebene Zeile zusammen mit `BASIC_AUTH_USER` in `~/darts/.env` auf dem Pi eintragen (Vorlage `deploy/env.example`). Nichts davon ins Repo.
5. **SD oder SSD (E6)** entscheiden. Für M1 reicht SD.

---

## 1. Projektgerüst

- `npx create-next-app@latest` im Repo-Root: App Router, TypeScript, Tailwind, ESLint, `src/`-Verzeichnis, kein Turbopack-Zwang
- `tsconfig` strict, `next.config` mit `output: 'standalone'`
- Vitest einrichten, `npm test` läuft (leerer Test)
- shadcn/ui initialisieren (Button, Input, Dialog, Select)
- `.gitignore` um `data/`, `.env` ergänzen; `.env.example`
- Ordnerstruktur und Import-Richtung laut `architecture.md` §9: `src/domain`, `src/db`, `src/server`, `src/components/{ui,darts,screens}`, `src/app`, `src/i18n`; ESLint `no-restricted-imports` dafür
- **Commit:** „M1: Projektgerüst“

## 1b. Theme und Layout-Grundgerüst

Vor dem ersten Screen, damit kein Screen je eine Farbe oder Pixelhöhe direkt enthält.

- `src/app/globals.css`: alle Tokens aus `theme.md` §1 für `:root`, `[data-theme="dark"]` und `prefers-color-scheme`; `color-scheme: light dark`
- `tailwind.config`: Tokens als Farben registrieren (`bg`, `fg`, `frame`, `key`, …), shadcn-Variablen (`--primary`, `--background` …) auf dieselben Tokens mappen
- `ThemeToggle` + Inline-Script im Root-Layout (`localStorage`, `data-theme`, kein Flackern)
- `ScoreGrid`: das `100dvh`-Grid aus `theme.md` §3 mit Hoch- und Querformat-Variante, als Komponente mit Slots (`header`, `panels`, `hint`, `keypad`)
- `/dev/theme`: Seite, die alle Tokens, beide Modi und die Bausteine mit Fixtures zeigt (bleibt im Repo, wird in Produktion per Middleware gesperrt)
- Prüfung: Chrome DevTools in 375 × 667, 667 × 375, 768 × 1024, 1024 × 768 und 1280 × 800, Light und Dark, kein Scrollen
- **Commit:** „M1: Theme und Layout-Grid“

## 2. Domäne X01 (Test-first)

Dateien unter `src/domain/x01/`:

- `types.ts`: `Dart { field: 0..20|25, type: 'single'|'double'|'triple'|'overthrown' }`, `Visit { darts: (Dart|null)[3], isBust }`, `Rules { startScore, inRule, outRule }`, `LegState { scores, visitsByPlayer, currentPlayer, currentVisit, winner }`
- `scoring.ts`: `dartScore`, `visitScore` (Port von `getDartThrowScore`)
- `rules.ts`: `isValidDart(state, rules, dart)` (Port von `isValidDartScore`, drei Blöcke: In-Regel, Out-Regel, Bust-Grenze)
- `apply.ts`: `applyDart(state, rules, dart) → LegState` (Port von `addDartThrow`: Bust → Rest zurück, `overthrown` auffüllen, Spielerwechsel; Rest 0 → Sieger; dritter Dart → Spielerwechsel)
- `undo.ts`: `undoDart(state) → LegState` (Port von `removeDartThrow` und `removeWinningDart`)
- `replay.ts`: `replay(players, rules, visits[]) → LegState` (für Server und Client dieselbe Funktion)
- `src/domain/checkouts.ts`: die drei Tabellen aus `Checkouts.swift`, `checkoutHint(rest, dartsLeft)`

Tests **vor** der Implementierung, aus `legacy-analysis.md` §2–3:

| Fall | Erwartung |
|---|---|
| 501, SingleIn, T20 T20 T20 | Rest 321, Spielerwechsel, Aufnahme = 180 |
| DoubleIn, erster Dart 20 | Bust, Rest bleibt 501, Aufnahme gebustet |
| DoubleIn, erster Dart D20 | gültig, Rest 461 |
| DoubleOut, Rest 40, Dart 20 | gültig, Rest 20 |
| DoubleOut, Rest 40, Dart D20 | Sieger, kein Spielerwechsel |
| DoubleOut, Rest 20, Dart 20 (einfach) | Bust (Rest 0 ohne Doppel) |
| DoubleOut, Rest 3, Dart 2 | Bust (Rest 1 < 2) |
| SingleOut, Rest 3, Dart 2 | gültig, Rest 1 |
| TripleOut, Rest 60, T20 | Sieger |
| Bust nach zwei Darts (20, 20, dann Bust) | Rest wieder Startwert der Aufnahme, Plätze = 20, 20, overthrown, isBust |
| Undo bei leerer Aufnahme | vorheriger Spieler, dessen letzte Aufnahme offen, letzter Dart weg, Rest korrigiert |
| Undo nach Bust | alle overthrown-Plätze weg, isBust false, Rest = Startwert minus geworfene Darts |
| Undo vom Sieg | Sieger weg, Rest wieder vor dem Siegdart, Spieler bleibt am Zug |
| Undo ohne Darts im Leg | kein Effekt |
| Spielerwechsel zyklisch mit 3 Spielern | A → B → C → A |
| 0-Taste | Dart `{field:0,type:'single'}`, zählt als Dart, Rest unverändert |
| checkoutHint(170, 3) | „T20, T20, Bullseye“; (170, 2) → nichts |
| replay == Folge von applyDart | für 20 zufällige gültige Darts identischer Zustand |

- **Commit:** „M1: X01-Domäne mit Tests“

## 3. Datenbank

- `drizzle.config.ts`, `src/db/schema.ts` laut `architecture.md` §6 (`player`, `match`, `match_player`, `leg`, `visit`), `src/db/index.ts` (better-sqlite3, WAL, Pfad aus `DATABASE_PATH`, Default `./data/darts.db`)
- Migration generieren, beim App-Start anwenden (`migrate()` in `instrumentation.ts` oder beim ersten DB-Zugriff)
- `src/db/queries.ts`: `loadLeg(legId)` → Spieler, Regeln, Aufnahmen in `seq`-Reihenfolge → `replay`
- **Commit:** „M1: Schema und Migration“

## 4. Spieler und neues Spiel

- `/players`: Liste, anlegen, umbenennen, löschen (Server Actions, Zod)
- `/` = Startseite mit „Neues Spiel“: Spieler antippen in Reihenfolge (Reihenfolge = Seat), Startpunkte 501/401/301, In- und Out-Regel, Button „Start“. Legt `match`, `match_player`, erstes `leg` an, Weiterleitung auf `/match/[id]`
- **Commit:** „M1: Spieler und Spielstart“

## 5. Zählscreen

Layout wie Legacy (`legacy-analysis.md` §7), Vollbild ohne Scrollen, obere Hälfte Panels, untere Hälfte Hinweis + Keypad.

Zuerst die Bausteine in `src/components/darts/`, jeder mit Fixture und, wo Logik drin ist, mit Test; dann der Screen, der sie zusammensetzt.

- `DartSlots`: drei Plätze einer Aufnahme (belegt, leer, aktuell, gebustet), Props `slots`, `activeIndex`, `isBust`
- `PlayerPanel`: Name, Rest, 🎯 Darts, 3-Dart-Average, `DartSlots`, Rahmen für den Spieler am Zug; Variante `size: 'large' | 'small'` über Container Query, Props-Typ `PlayerPanelData`
- `PlayerPanels`: ≤2 Spieler untereinander, ≥3 großes Panel plus horizontale Kleinpanels
- `CheckoutHint`: Text oder leerer Platzhalter gleicher Höhe
- `KeypadButton` und `Keypad`: fünf Reihen, Double/Triple als gegenseitig ausschließende Toggles (Zustand im `useKeypad`-Hook, getestet), Bull bei Triple ausgeblendet, Farben über Tokens; Ausgabe ist ein `Dart` per Callback `onDart`, plus `onUndo`
- `ScoreboardScreen` in `src/components/screens/`: setzt `ScoreGrid`, `PlayerPanels`, `CheckoutHint`, `Keypad` zusammen, bekommt `LegState`-Projektion und Callbacks, hat keinen Datenzugriff
- `src/app/match/[id]/page.tsx`: lädt per `MatchRepository`, `replay`, rendert `ScoreboardScreen` mit den Server Actions als Callbacks
- `src/server/match-actions.ts`: `throwDart(matchId, dart)` und `undoDart(matchId)`: laden, `applyDart`/`undoDart`, Aufnahme-Zeile einfügen oder aktualisieren, bei Sieg `leg.winner_player_id` und `match.status`. Repository injiziert, Test gegen In-Memory-Repository. Client zeigt den neuen Zustand aus der Action-Antwort; Optimistic UI kommt erst in M6
- Sieg-Screen: Sieger, Darts, Average (umschaltbar), übrige Spieler mit Rest, „Letzten Wurf rückgängig“, „Restart“ (neues Match mit gleichen Spielern, Anwurf rückt einen weiter), „Zur Startseite“
- **Commit:** „M1: Zählscreen“

## 6. Health, Docker, Caddy, Deploy

- `src/app/api/health/route.ts`: `SELECT 1`, 200/503
- `Dockerfile` multi-stage (deps → build → runner mit Standalone-Output, `node server.js`, User `node`, `DATABASE_PATH=/data/darts.db`)
- `docker-compose.yml`: `app` (Volume `./data:/data`, healthcheck gegen `/api/health`, `restart: unless-stopped`, kein veröffentlichter Port), `caddy` (Port `127.0.0.1:8080:8080`, Volume für `Caddyfile`)
- `Caddyfile`: `:8080 { basic_auth { <user> <hash> } reverse_proxy app:3000 }`; kein TLS, das macht `tailscaled`. Hash mit `docker run --rm caddy caddy hash-password`
- `scripts/deploy.sh`: `docker buildx build --platform linux/arm64 -t darts-app:$(git rev-parse --short HEAD) --load .` → `docker save | ssh pi docker load` → `scp docker-compose.yml Caddyfile pi:~/darts/` → `ssh pi "cd darts && IMAGE_TAG=… docker compose up -d"`
- Lokal prüfen: `docker compose up` auf dem Mac, dasselbe Caddyfile, `http://localhost:8080`, DoD-Schritte 2–5 lokal durchspielen
- **Commit:** „M1: Docker, Caddy, Deploy“

## 7. Deploy auf den Pi und DoD

Braucht §0 komplett.

1. `./scripts/deploy.sh`
2. `ssh pi tailscale funnel status` zeigt `https://darts.<tailnet>.ts.net → http://127.0.0.1:8080`; der erste Aufruf dauert einige Sekunden, weil das Zertifikat geholt wird
3. DoD aus `project.md` M1 Punkt 1–6 am Handy im Mobilfunknetz durchgehen
4. `README.md` und `CLAUDE.md` nachziehen, `project.md` abhaken
- **Commit:** „M1: done“

---

## Nicht in M1

Sets/Legs, Platzierungen, Spielübersicht, Optimistic UI, Auth, PWA, Sound, Statistiken. Alles in M5–M12 eingeplant.
