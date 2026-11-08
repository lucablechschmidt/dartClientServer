# Architektur – Darts Scorer Web

> Portierung der bestehenden iOS-App (Swift, siehe `legacy-analysis.md`) zu einer Web-App mit Persistenz auf eigenem Raspberry Pi.
> Zielgruppe: ein Spieler (Owner) und seine Mitspieler. Privat, wenige Dutzend Nutzer.

---

## 1. Ziele und Nicht-Ziele

**Ziele**
- Live-Zählen am Board, mobile-first (Handy oder Tablet neben dem Board)
- Vorhandener Legacy-Code wird bezüglich Logik und Spielmodi komplett übernommen, die UI ebenso, außer wo ein Figma-Entwurf in `Design/` vorliegt: dann gelten dessen Layout und Bedienung, die Farben bleiben die Tokens aus `theme.md` (seit 29.10.2026: Setup-Screens, Cricket-Zählscreen). Reihenfolge: X01 zuerst (v1), danach Cricket, Elimination und SplitScore als eigener Meilenstein (E4)
- **Freie Spiele:** 2 bis n Spieler; bei X01 wird heruntergespielt, bis alle Platzierungen feststehen (wer auscheckt, bekommt den nächsten Platz, die übrigen spielen weiter; der Letzte kann noch zu Ende spielen oder aufgeben, M5). Cricket und Elimination enden beim ersten Sieger, SplitScore nach der Bull-Runde (M7)
- **Turniere:** immer 1 vs 1; direkter Turnierbaum oder Gruppenphase + Playoffs (Backlog)
- Aussagekräftige Statistiken: Spielerprofil, Elo (nur aus 1-vs-1-Matches), Anzahl Treffer pro Feld
- Daten liegen persistent auf dem eigenen Pi und sind per HTTPS aus dem Internet erreichbar (Anschluss ist DS-Lite, daher über Tailscale Funnel statt Portfreigabe)

**Nicht-Ziele (v1)**
- Native App (eine installierbare PWA genügt)
- Vollständige Offline-Fähigkeit (nur: ein laufendes Leg überlebt einen kurzen Verbindungsabbruch)
- Mehrsprachigkeit (Deutsch; die Texte liegen trotzdem zentral)
- Hochverfügbarkeit und Datensicherung (ein Pi, kein Backup: E14, es ist ein Spiel)
- Datenübernahme aus der iOS-App (E5: nein)

---

## 2. Systemüberblick

```
 Handy/Tablet (Browser, PWA)
        │  HTTPS  →  https://dartserver.swallow-pythagorean.ts.net
        ▼
 Tailscale-Ingress (Funnel)          nur TLS-Durchleitung, Inhalt bleibt verschlüsselt
        │  ausgehende Verbindung des Pi (kein offener Port, kein IPv4 nötig)
        ▼
 FritzBox (DS-Lite)  →  Raspberry Pi 3 B+ (1 GB RAM)
   tailscaled (Host)   TLS-Endpunkt mit Let's-Encrypt-Zertifikat, leitet an :8080
   └─ Docker Compose ──────────────────────────────────────────
      ├─ caddy   :8080  (Reverse Proxy, kein TLS, SSE ungepuffert)
      └─ app     :3000  (Next.js standalone, Node LTS, ein Prozess)
                   ├─ Login/Session, Rechte, Rate-Limit, Event-Hub (im Prozess)
                   └─ /data/darts.db  (SQLite, WAL)  ← Volume
```

---

## 3. Tech-Stack und Begründung

| Bereich | Wahl | Warum |
|---|---|---|
| Framework | **Next.js (App Router), TypeScript strict** | UI und Server in einem Projekt, Server Actions statt eigener REST-API, großes Ökosystem |
| UI | **Tailwind CSS, eigene Bausteine** (kein shadcn) | Alle Screens sind nach den Fotos der Swift-App gebaut (`Legacy/Screenshots/`); die Bausteine in `src/components/ui` (`TabBar`, `ScreenHeader`, `ChoiceMenu`, `Stepper`, `CardList`, `ConfirmSheet`, `icons.tsx`) und `src/components/darts` (Keypad, Panels) sind die einzige Komponentenbasis |
| Charts | **eigene SVGs** (`AverageChart`, `Dartboard`) mit `sr-only`-Tabelle, keine Chart-Bibliothek (bis 6.11.2026 stand hier Recharts, nie eingebaut) | Verläufe und Heatmap brauchen keine Bibliothek; eine kommt nur bei Bedarf |
| Datenbank | **SQLite (WAL) mit better-sqlite3** | Eine Datei, kein DB-Server; für diese Last mehr als ausreichend. Migrationen mit Drizzle beim App-Start |
| ORM/Migrationen | **Drizzle ORM + drizzle-kit** | Typsicher, SQL-nah, Migrationen als Dateien im Repo |
| Validierung | **Zod** | Eingaben aus Server Actions prüfen |
| Auth (seit M3) | **eigene Sessions** (Name/Passwort, bcrypt, Cookie 1 Jahr), Einladung per QR-Code durch den Admin (E10) | Kein E-Mail-Versand nötig, kein Fremddienst, keine Auth-Bibliothek; die Logik ist 300 Zeilen mit Tests |
| CI | **ein Skript `scripts/ci.sh`**, aufgerufen von GitHub Actions (`.github/workflows/ci.yml`, E15) | Die Pipeline-Datei ist nur ein Aufruf; der Inhalt lebt im Repo und wandert mit |
| Code-Qualität | **Prettier** (mit `prettier-plugin-tailwindcss`), **ESLint** mit `typescript-eslint` strict + stylistic (typgeprüft) und `eslint-plugin-better-tailwindcss`, **commitlint** in **lefthook**-Hooks | Das Gegenstück zu `very_good_analysis` in Flutter: Stil, Typsicherheit, Theme-Tokens und Commit-Format werden geprüft statt nur vereinbart (§9) |
| Tests | **Vitest** (Domänenlogik, Server, UI-Logik), **Playwright** (`e2e/`, seit M6: alle Abläufe und Modi, Netzausfälle, Layout, gegen den Produktions-Build) | Die Darts-Regeln sind reine Funktionen und gut testbar |
| Deployment | **Docker Compose** auf dem Pi | Reproduzierbar, einfacher Rollback |
| Ingress | **Tailscale Funnel** (auf dem Host, nicht im Container) | Einziger gangbarer Weg bei DS-Lite ohne eigene Domain; TLS endet auf dem Pi |
| Build | **ausschließlich auf dem Entwicklungsrechner** (`docker buildx --platform linux/arm64`) | Ein Next.js-Build auf einem Pi 3 B+ mit 1 GB RAM und SD-Karte scheitert am Speicher. Auf dem Pi laufen nur Caddy und der fertige Standalone-Server (zusammen ca. 250–350 MB) |

**Bewusst verworfen**
- Postgres: Ein zusätzlicher Dienst und RAM-Verbrauch auf dem Pi bringen bei dieser Last keinen Nutzen.
- Separate API plus SPA: Mehr Code und mehr Deployment ohne Gewinn.
- Flutter Web: Schwächer beim Web-Feeling und beim Reporting; die bestehende App ist ohnehin Swift, ein Code-Reuse fällt also weg.

---

## 4. Netzwerk und Erreichbarkeit

**Befund (E1, geprüft):** Der Anschluss ist **DS-Lite** (FritzBox Online-Monitor: „IPv4 über DS-Lite-Tunnel, AFTR-Gateway“). Es gibt keine eigene öffentliche IPv4-Adresse, Portfreigaben und MyFRITZ! über IPv4 funktionieren nicht. DynDNS und das FritzBox-VPN helfen nicht, weil beide über DS-Lite nur per IPv6 erreichbar wären und das VPN jedem Mitspieler ein Profil abverlangen würde.

**Lösung: Tailscale Funnel.** Der Pi baut eine ausgehende Verbindung zu Tailscale auf; Tailscale nimmt Anfragen an **`https://dartserver.swallow-pythagorean.ts.net`** entgegen und leitet den verschlüsselten TLS-Strom unverändert an den Pi weiter. TLS endet auf dem Pi (`tailscaled` holt das Let's-Encrypt-Zertifikat). Keine Domain, keine Kosten, keine Portfreigabe, funktioniert aus IPv4- und IPv6-Netzen.

Einrichtung (einmalig, Details in `archive/m1-plan.md` §0):
1. Tailscale auf dem Pi-Host installieren und mit dem Tailscale-Konto anmelden (Login über Google, Apple, Microsoft oder GitHub).
2. In der Tailscale-Admin-Konsole MagicDNS und HTTPS-Zertifikate aktivieren und Funnel in der Zugriffsrichtlinie erlauben (`nodeAttrs` → `funnel`).
3. `tailscale funnel --bg 8080` auf dem Pi; Caddy lauscht auf 8080.

Grenzen: Funnel erlaubt nur die Ports 443, 8443 und 10000 nach außen, ist für private Nutzung gedacht und nicht für hohe Bandbreite. Für diese App irrelevant.

**Datenschutz bei Funnel**
- Inhalte (Namen, Scores, später Logins) sind Ende-zu-Ende zwischen Browser und Pi verschlüsselt; Tailscale kann sie nicht lesen, weil TLS erst auf dem Pi endet.
- Tailscale sieht Metadaten: IP-Adressen der Besucher, den Hostnamen, Zeitpunkte und Datenmengen. Außerdem die Tailnet-Verwaltungsdaten (Gerätename, Schlüssel, Konto-E-Mail). Tailscale ist ein US-Unternehmen; eine DSGVO-Auftragsverarbeitungsvereinbarung ist auf deren Seite verfügbar.
- Der Hostname wird durch das Let's-Encrypt-Zertifikat in öffentlichen Certificate-Transparency-Logs sichtbar und ist damit auffindbar. **Deshalb stand ab der ersten Minute Basic Auth (M1) und seit M3 der Login der App davor; ohne Session gibt es nur die Login- und die Einladungsseite.**
- Die eigentlichen Daten liegen nur in `darts.db` auf dem Pi.

**Später optional:** Wechsel auf Cloudflare Tunnel mit eigener Domain (ca. 10 €/Jahr), wenn ein schöner Name gewünscht ist. Ändert nur den Ingress, nicht die App.

---

## 5. Deployment und Betrieb

- **Pi:** Raspberry Pi OS Lite 64-bit, nur SSH-Key-Login, Docker und Compose-Plugin, unattended-upgrades.
- **Speicher:** Die SD-Karte ist das größte Betriebsrisiko (Verschleiß, Korruption bei Stromausfall). Es gibt **bewusst kein Backup** (E14): Geht die Datenbank verloren, legt der nächste Start sie samt Admin neu an, und die Mitspieler werden neu eingeladen. Wer das Risiko senken will, nimmt eine High-Endurance-Karte oder eine USB-SSD (E6).
- **Release:** `scripts/deploy.sh` → `docker buildx build --platform linux/arm64 -t darts-app:<git-sha>` → `docker save | ssh pi docker load` → `docker compose up -d` auf dem Pi.
- **Health:** `/api/health` (prüft den DB-Zugriff), Docker-`healthcheck`, `restart: unless-stopped`. `tailscaled` läuft als Systemdienst auf dem Host und startet mit dem Pi; Funnel-Konfiguration ist persistent (`--bg`).
- **Vor jedem Deploy:** `npm test`, `npm run lint`, `npm run typecheck`, `./scripts/smoke.sh` (Produktions-Build, dann die Playwright-Tests in `e2e/`). Dieselben Schritte laufen in der CI (`scripts/ci.sh`); die Browser-Tests dort gegen den Standalone-Build auf dem Runner.

**Bewusste Grenzen (ein Prozess, ein Pi)**

- Rate-Limit, Event-Hub für den Live-Stand und Session-Prüfung laufen im Speicher **eines** Node-Prozesses. Ein zweiter Container oder Prozess würde beides aushebeln; das ist hier kein Ziel.
- Zeit kommt von der Uhr des Pi (`deps.now()`); Gäste, Sessions und Einladungen laufen danach ab. Die Uhr wird per NTP gestellt.
- Gast-Matches werden nach 24 h gelöscht (E12), Sessions nach einem Jahr ungültig (E10), laufende Matches gelten nach 24 h als beendet (E13). Nichts davon ist umkehrbar; es ist so gewollt.
- SQLite ist im WAL-Modus. Jede Service-Funktion, die mehr als einmal schreibt, legt ihre Schreibvorgänge in `deps.transaction(() => …)`. Das ist die native Transaktion von better-sqlite3 über die eine Verbindung, die Match- und Auth-Repository teilen; innere Transaktionen der Repositories werden automatisch zu Savepoints. Weil alle Repository-Aufrufe synchron sind, kann sich in Node nichts dazwischenschieben; die Transaktion schützt vor Ausnahmen und Abbrüchen mitten im Schreiben. Asynchrones (bcrypt) passiert vorher, die Transaktion selbst ist synchron (better-sqlite3 lehnt eine Promise als Rückgabe ab).

---

## 6. Datenmodell

Grundprinzip (aus dem Swift-Code übernommen): **Gespeichert werden Aufnahmen mit ihren drei Dart-Plätzen. Restpunkte, Bust-Folgen, Sieger, Platzierungen und alle Statistiken werden daraus abgeleitet.** Legs und Matches sind strukturelle Container; ihr Status ist eine *zwischengespeicherte Projektion*, die bei jedem Dart und jedem Undo neu berechnet wird. Eine Aufnahme entspricht genau `DartThrow`, ein Dart-Platz genau `SingleDartsScore`.

```
player          id, name (unique ohne Groß/Klein unter nicht gelöschten), created_at,
                guest_until NULL,                                (E12: Gast bis zu diesem Zeitpunkt sichtbar, NULL = regulär)
                password_hash NULL, is_admin                     (M3: Hash gesetzt = Login möglich; keine eigene Nutzer-Tabelle, E10)
                deleted_at NULL                                  (5.11.2026: gelöscht, Zeile bleibt für alte Matches, siehe unten)

session         id (sha256 des Cookie-Tokens), player_id, created_at, expires_at                         (M3)
invite          id (sha256 des Tokens), kind ('register'|'password'), player_id NULL, reset_sessions,
                created_at, expires_at, used_at NULL                                                     (M3)

match           id, mode ('x01' | 'cricket' | 'elimination' | 'splitscore'),
                input_mode ('single' | 'per-player'), host_player_id          (E13, M4)
                start_score (X01 Start 501|401|301, Elimination Ziel, SplitScore Start 40, Cricket 0), in_rule ('single'|'double'|'triple'),
                out_rule ('single'|'double'|'triple'), legs_to_win_set, sets_to_win_match,
                status ('running'|'finished'|'abandoned'),
                is_tournament, decided_winner_id NULL (M9: Sieger nach einem Leg festgelegt),
                created_by NULL, started_at, finished_at NULL
match_player    match_id, player_id, seat (Reihenfolge), placement NULL (gleiche Plätze möglich, SplitScore)   PK(match_id, player_id)

tournament      id, name, format ('round-robin'|'knockout'|'groups-knockout'), group_count, advance_per_group,
                start_score, in_rule, out_rule, input_mode, seeding ('random'|'fixed', M8), created_by NULL, created_at   (M9)
tournament_player       tournament_id, player_id, seed (ausgelost oder vom Ersteller festgelegt)   PK(tournament_id, player_id)
tournament_round_format tournament_id, phase ('group'|'knockout'), round (0 = Gruppenphase),
                        legs_to_win_set, sets_to_win_match                 PK(tournament_id, phase, round)
tournament_match        tournament_id, fixture_id, match_id                PK(tournament_id, fixture_id)
                (Der Spielplan wird nicht gespeichert: die Domäne baut ihn aus Format und Setzliste,
                 Ergebnisse kommen aus den verknüpften Matches.)

player_field_hits player_id, field (0–20|25), hits                      PK(player_id, field)
player_achievement      player_id, key, earned_at                           PK(player_id, key)   (M10: nur aus gelöschten Gast-Matches gesichert)
                (E12: Feldtreffer regulärer Spieler aus gelöschten Gast-Matches; Treffer = 1/2/3 je Single/Double/Triple)

leg             id, match_id, set_no, leg_no, starter_player_id,
                winner_player_id NULL, finished_at NULL,
                play_out                      -- M5: X01, 3+ Spieler, der Letzte spielt noch zu Ende
                (Sets sind kein eigener Datensatz: Set-Sieger = erster mit legs_to_win_set Legs in set_no)

visit           id (vom Server vergeben), leg_id, player_id,
                seq (fortlaufend im Leg; mit der Leg-Position macht sie Wiederholungen idempotent, E11),
                d1_field, d1_type,            -- field 0–20 | 25 (Bull); type 'single'|'double'|'triple'|'overthrown'; beides NULL = Platz leer
                d2_field, d2_type,
                d3_field, d3_type,
                is_bust,                      -- DartThrow.faulty
                created_at
```

**Konsequenzen**
- Der **Score einer Aufnahme** wird nie gespeichert, sondern wie `getDartThrowScore` aus den Plätzen berechnet (`overthrown` zählt 0, Bust zählt 0).
- Gespeichert werden nur **abgeschlossene Aufnahmen** (drei Darts, Bust, Checkout). Die laufende Aufnahme liegt auf dem eingebenden Gerät im localStorage und überlebt dort einen Reload (E11).
- **Undo** nimmt auf dem Gerät den letzten Dart zurück (bei Bust alle `overthrown`-Plätze auf einmal); auf dem Server löscht `undoVisit` die letzte gespeicherte Aufnahme oder nimmt eine Zu-Ende-Spielen-Entscheidung zurück. Ein geleertes Leg wird gelöscht. Hat die Aufnahme ein Leg, Set oder Match beendet, wird auch das zurückgenommen, weil `winner_player_id`, `placement`, `play_out`-Folgen und `status` reine Projektionen sind.
- **Platzierungen** (X01, 3+ Spieler): Wer auscheckt, erhält die nächste freie `placement`; das Leg läuft für die übrigen weiter, bis nur noch einer übrig ist. Die anderen Modi platzieren nach ihren Regeln (Sieger, dann Punkte).
- **Darts, die nichts zählen**, stehen als `overthrown` in der Aufnahme: Bust-Füllplätze (X01), der überwerfende Dart (Elimination) und Darts neben dem Zielfeld (SplitScore). Sie fließen nie in Statistiken ein.
- **Neue Statistiken** funktionieren rückwirkend über alle alten Spiele, auch Feldtreffer.
- **Spieler löschen** (Admin, 5.11.2026) geht immer, außer für sich selbst und andere Admins. Die Zeile bleibt (`deleted_at` gesetzt), weil beendete Matches, Legs und Aufnahmen sie referenzieren und für die anderen Spieler in der Statistik zählen. Beim Löschen werden in einer Transaktion Login, Sessions und Einladungen entfernt und alle offenen Matches abgebrochen, in denen der Spieler mitspielt oder Host ist. Ein gelöschter Spieler taucht in keiner Liste und keiner Suche auf (Name wieder frei, kein Login), in alten Matches heißt er „Name (gelöscht)“. Offene Turnierpaarungen gegen ihn sind kampflos verloren (Walkover, siehe `docs/m9-plan.md`). Nicht-Admins entfernen weiterhin nur Gäste ohne Matches.
- **Spiele und Turniere löschen** (Admin, Tab „Verwaltung“, 5.11.2026; `src/server/cleanup-service.ts`): für versehentlich angelegte Spiele und Testspiele. Ein Spiel wird hart gelöscht (Legs, Aufnahmen, Sitze per Cascade) und zählt damit in keiner Statistik mehr; war es ein Turnierspiel, ist die Paarung wieder offen. Ein Turnier wird hier **mit allen seinen Spielen** gelöscht (anders als „Turnier löschen“ auf der Turnierseite, das die Spiele als normale Spiele behält). Schon nach `player_field_hits` übernommene Feldtreffer aus aufgeräumten Gast-Matches bleiben.
- **Gäste** (E12) sind normale `player`-Zeilen mit `guest_until`; Matches, Legs und Aufnahmen referenzieren sie wie jeden anderen Spieler. Ein Match ist ein **Gast-Match**, sobald ein Teilnehmer `guest_until` gesetzt hat; es zählt in keiner Rangliste. Es wird gelöscht, sobald der letzte beteiligte Gast abgelaufen ist (max. `guest_until` der Teilnehmer), zusammen mit Legs und Aufnahmen; vorher werden die **Feldtreffer** der regulären Teilnehmer nach `player_field_hits` übernommen (Triple = 3, Double = 2, Single = 1 Treffer; gebustete Aufnahmen zählen nicht). Die Feldtreffer-Statistik eines regulären Spielers ist also `player_field_hits` plus die Treffer aus seinen noch vorhandenen Matches.
- Cricket, Elimination und SplitScore brauchen **keine** zusätzlichen Tabellen; ihr Zustand (Marks, Eliminationen, Zielfeld) ist aus den Aufnahmen replaybar. Sets und Legs gibt es nur bei X01 mit 2 Spielern (E7).

**Geprüft gegen das Swift-Modell (M0, erledigt)**
- Speichert es pro Aufnahme, pro Dart oder nur Endstände? Pro Aufnahme mit drei Dart-Plätzen, nichts geht verloren.
- Sind Spieler und Nutzer getrennt? Nein, es gibt keine Nutzer. (Die Web-App bleibt dabei: ein Login ist ein Spieler mit Passwort-Hash, E10.)
- Ist der Restpunktestand gespeichert oder abgeleitet? Abgeleitet.
- Sets/Legs: im Setup wählbar, aber nicht implementiert. Anwurf: wechselt bei „Restart“ mit gleichen Spielern, vor dem ersten Dart per „ToStart“ wählbar. Bust: Aufnahme wird `faulty`, geworfene Darts bleiben gespeichert, Aufnahme zählt 0.

---

## 7. Domänenlogik

Reines TypeScript in `src/domain/`, ohne Datenbank- oder React-Abhängigkeit, Test-first mit Vitest.

- `src/domain/game/` (seit M7): alles Modusunabhängige. Gemeinsame Typen (`LegState` mit `mode`, `MatchState`), die Schnittstelle `GameMode` und die Registry `modes.ts` mit den Funktionen, die alle anderen aufrufen (`applyDart`, `undoDart`, `openVisit`, `currentPlayer`, `isLegFinished`, `standings`, `projectBoard` …), Matches über Legs und Sets (`match.ts`), Rechte (`permissions.ts`, E13), Replay und die Projektion für den Zählscreen (`board.ts`, `view.ts`).
- `src/domain/x01/`, `cricket/`, `elimination/`, `splitscore/`: je ein Modus hinter `GameMode` (Regeln in `legacy-analysis.md` §2–6). Der Zustand eines Legs ist immer die Liste seiner Aufnahmen; jede Funktion ist `(state, …) → Result<state>` ohne Seiteneffekte, Undo ist Löschen des letzten Platzes und erneutes Auswerten.
- `src/domain/tournament/` (M9): Spielplan als Liste von Spielen, deren Seiten aus einem Spieler, dem Sieger eines anderen Spiels, einem Gruppenplatz oder einem Freilos kommen; `resolve` leitet daraus ab, wer spielt. Round Robin per Berger-Tabelle, K.-o. mit Standard-Setzpositionen, Gruppen per Schlangen-Auslosung, Tabelle mit Siegen, Leg-Differenz, direktem Vergleich, Average.
- `src/domain/checkouts.ts`: die Finish-Tabelle aus `Checkouts.swift`, am Board geprüft (7.11.2026): eine Tabelle mit dem jeweils kürzesten Weg (Double-out), vier Legacy-Einträge korrigiert. Innerhalb einer Aufnahme bleibt der Hinweis auf dem begonnenen Weg (`visitCheckoutHint`): trifft ein Dart eines der Vorbereitungsfelder, zeigt der Hinweis den Rest des Wegs, sonst einen neuen Weg für den neuen Rest.
- `src/domain/achievements/` (M10, `docs/m10-plan.md`): `detect.ts` (`factsOf`: was ein beendetes Spiel einem Spieler bringt, je Modus, plus `double-N` für „Gotta catch 'Em All!“), `gallery.ts` (Galerie und „neu in diesem Spiel“). **Berechnet, nicht gespeichert:** aus `listFinishedMatches` wie die Statistik, also stimmen Undo, gelöschte Spiele und alte Spiele von selbst. Nur was reguläre Spieler in Gast-Spielen verdient haben, sichert die Aufräumroutine vor dem Löschen in `player_achievement (player_id, key, earned_at)`. Service: `src/server/achievement-service.ts`.
- `src/domain/stats/` (M8, `docs/m8-plan.md`): `x01.ts` (Average wie Legacy, ein Bust zählt 0 und als Aufnahme; First-9, 180/140+/100+, Highest Finish, Highest Score, Best Leg je Startpunktzahl), `elo.ts` (Elo **je Modus**, nur 1 vs 1, Start 1000, K 32), `aggregate.ts` (Spiele/Siege je Modus, Rangliste, Zeitfilter), `field-hits.ts`. Gezählt werden nur beendete Matches ohne Gast; Feldtreffer auch aus Gast-Matches plus `player_field_hits`. Die Daten liefert `MatchRepository.listFinishedMatches(since)`, der Service ist `src/server/stats-service.ts`. Genaue Statistik sieht jeder nur für sich selbst (Tab Konto, auch der Admin), die Ranglisten je Modus alle; die X01-Matchseite `/match/[id]/stats` nur die Teilnehmer.

Neu gegenüber Legacy: Leg-, Set- und Match-Ende, wechselnder Anwurf pro Leg, Platzierungen bei 2–n Spielern.

---

## 8. Eingabe, UX und Theme

Aufbau wie im Legacy-Code (`legacy-analysis.md` §7): Spieler-Panels oben, Checkout-Hinweis und 5-Reihen-Keypad unten, Double/Triple als Modifier-Toggles, Undo auf dem Keypad. Wo ein Figma-Entwurf in `Design/` vorliegt, gelten dessen Layout und Bedienung (Setup-Screens; Cricket-Zählscreen mit Tabelle und verkleinertem Keypad). Mindest-Tipphöhe 48 px, nichts hängt an Hover (Hover nur als Zusatz für Zeiger-Geräte, Tailwind 4 `hover:` greift nur bei `@media (hover: hover)`; seit M14 gibt es ein Desktop-Layout), kein Scrollen auf dem Zählscreen.

**Theme** (`theme.md`): Die Legacy-Farben aus `Assets.xcassets` werden als CSS-Tokens mit Light- und Dark-Werten übernommen, Dark Mode folgt der Systemeinstellung und ist per Toggle überschreibbar. Das Theme entsteht **vor** dem ersten Screen. Kein Screen verwendet Farbwerte, Radien oder Größen direkt: alles kommt aus Tokens in `globals.css` (`theme.md` §3 Regel 8), `style={…}` verbietet ESLint, Tailwind-Ad-hoc-Werte (`rounded-[18px]`) sind nicht erlaubt; ein neuer Wert wird ein Token.

**Layout**: Legacy rechnet mit festen Bruchteilen der Bildschirmgröße und skaliert deshalb nicht. Die Web-App baut den Zählscreen als `100dvh`-Grid mit `clamp()`-Schriften, Querformat-Variante und Container Queries (Regeln in `theme.md` §3).

---

## 9. Code-Konventionen

Ziel: SOLID, testbar, wiederverwendbar. Konkret:

- **Schichten mit klarer Richtung:** `src/domain` (reine Funktionen, kennt weder DB noch React) ← `src/db` (Drizzle-Schema, Queries) ← `src/server` (Server Actions: laden, Domäne aufrufen, speichern, Zod-Validierung) ← `src/components` und `src/app` (UI). Imports gehen nur nach links, nie nach rechts. ESLint-Regel `no-restricted-imports` erzwingt das.
- **Single Responsibility:** eine Datei, eine Aufgabe. Regeln (`rules.ts`), Zustandsübergang (`apply.ts`), Undo, Replay und Statistik sind getrennte Module mit eigenen Tests.
- **Open/Closed über die Spielmodus-Schnittstelle (seit M7):** jeder Modus implementiert `GameMode` (`applyDart`, `undoDart`, `isOpenVisit`, `currentPlayer`, `isLegFinished`, `standings`, `board`, optional `playOut` für X01) und wird in `src/domain/game/modes.ts` eingetragen. Server, Rechte, Client-Abgleich und Zählscreen rufen nur die Funktionen aus `@/domain/game`; ein neuer Modus ändert keinen bestehenden.
- **Liskov/Interface Segregation:** Komponenten bekommen schmale Props-Typen (z. B. `PlayerPanelData`), nie das ganze `LegState` oder DB-Zeilen. Views sind damit mit Fixtures renderbar.
- **Dependency Inversion:** Server Actions bekommen das Repository (`MatchRepository`-Interface) injiziert; in Tests ersetzt ein In-Memory-Repository SQLite. Zeit, IDs und Zufall kommen über `deps.now()`/`deps.newId()`/`deps.random()` (`src/server/deps.ts`), nie aus `Date.now()`/`crypto` direkt (seit M13 Paket D auch beim Rate-Limit in Login und Einladung, R-11).
- **Komponenten:** dumme, wiederverwendbare Bausteine in `src/components/ui` (`TabBar`, `ScreenHeader`, `BackButton`, `ChoiceMenu` und `Stepper` (Setup im Figma-Layout, `Design/`), `CardList`/`CardRow`/`GroupedSection`, `PageFrame` (Seitenspalte schmal/breit, `theme.md` §4), `AddRow`, `ConfirmSheet`, `QrCode`, `FoldCard`, `StatTile`, `PillLinks`, `Badge`, `icons.tsx`, Formular-Bausteine in `form-controls.tsx`: `TextInput`, `TextButton`, `PrimaryButton`, `Field`, `FormError`, `FormNote`, `SectionHeading`; `Skeleton` für Ladezustände; Hooks `useConfirmTap` und `useAsyncAction` für Buttons, die eine Action rufen) und `src/components/darts` (`Keypad`, `PlayerPanel`, `PlayerPanels`, `DartSlots`, `CheckoutHint`, `ScoreGrid`, `PlayerPicker`, `Dartboard` (Feldtreffer-Heatmap, M8); Hooks `useVisitSync` für Zählen und Server-Abgleich, `useMatchEvents` für den Live-Stand), zusammengesetzt in `src/components/screens` (Konto- und Verwaltungs-Tab in Abschnitten unter `screens/account/`). Keine Datenzugriffe in Komponenten, Zustand kommt per Props, Ereignisse gehen per Callback hoch. Wiederkehrende Formen (Zeile „tippen → Eingabefeld → Speichern“) gehören als Baustein nach `ui`, nicht kopiert in Screens. Ein wiederverwendbarer `ui`-Baustein über etwa 150 Zeilen wird geteilt; Screens, Hooks und Services werden nach Verantwortung geteilt, wenn es nötig wird, nicht nach Zeilenzahl (`m13-plan.md` §6 Frage 4, §12.6). Bekommt ein `ui`-Baustein Zustand, Seiteneffekte oder Fachlogik, ist er keiner mehr: die Logik wandert in einen Hook oder der Baustein nach `darts`/`screens`. Jeder neue `ui`-Baustein bekommt einen Eintrag auf `/dev/theme` (ersetzt Storybook). ⚠️ *Nie umgesetzt, `/dev/theme` zeigt nur Tokens und Zählscreen; Frage in `docs/fragen.md` (8.11.2026).*
- **Repositories nach Verantwortung:** `PlayerRepository` (Spieler, Login-Daten, Admin, Gäste, gesicherte Feldtreffer), `MatchRepository` (Matches, Legs, Aufnahmen, Gast-Matches aufräumen), `AuthRepository` (Sessions, Einladungen), `TournamentRepository` (Turniere, M9); in `Deps` als `players`, `matches`, `auth`, `tournaments`. Alle drei teilen in Produktion eine SQLite-Verbindung (daher eine Transaktion über alle), in Tests einen `MemoryStore`. Turniere (M9) haben ein eigenes; die Statistik (M8) liest über `MatchRepository.listFinishedMatches`. Eine Schnittstelle, die über etwa 15 Methoden wächst, wird geteilt.
- **Fehler und Logs:** Server Actions antworten mit `Result`-Werten, Ausnahmen sind Bugs. Unerwartete Fehler landen über `error.tsx`/`not-found.tsx` je Route-Gruppe nie als weiße Seite beim Nutzer, sondern mit Zurück-Button; der Server loggt sie als eine JSON-Zeile (`src/server/log.ts`: `log.info|warn|error(event, fields)`). Die Dateien: `src/app/error.tsx` und `not-found.tsx` im Root (gelten für alle Routen) und `global-error.tsx` für Fehler im Root-Layout. `onRequestError` (`instrumentation.ts`) loggt unerwartete Fehler als `request.failed`; ungültige Eingaben enden als `Result`, nie als Ausnahme (§12.3). Geloggt werden Start und Aufräumen, Login und Fehlversuch mit IP, Sperre durch das Rate-Limit, eingelöste Einladung und Spielabbruch; nie Passwörter, Hashes oder Tokens.
- **Tests:** Domäne mit Vitest (Tabellen-Tests, Property-Test für Replay), Server Actions gegen das In-Memory-Repository, Komponenten mit Testing Library nur dort, wo es Logik in der UI gibt (Keypad-Modifier, Panel-Varianten, Sync-Warteschlange), Playwright in `e2e/` für die Abläufe im Browser (M6). Sichtbare Texte holen alle Tests aus `de`, nie als Literal.
- **Fehler:** Domäne wirft nie, sondern liefert `Result`-Werte (`{ ok, state } | { ok: false, reason }`); Server Actions übersetzen in Nutzertexte.
- **Texte** zentral in `src/i18n/de.ts`, auch wenn v1 nur Deutsch ist; Code, Kommentare und Commits sind englisch.
- **Werkzeuge erzwingen die Regeln** (seit 30.10.2026):
  - **Prettier** formatiert alles außer Doku und Generiertem (`printWidth` 140, Tailwind-Klassen in fester Reihenfolge); `npm run format`, in der CI `format:check`.
  - **ESLint**: Next-Presets, `typescript-eslint` `strictTypeChecked` + `stylisticTypeChecked` mit Typinformation (eingestellt auf `type` statt `interface`, kurze Void-Pfeile und Zahlen in Template-Strings erlaubt, `||` bei Strings erlaubt; in Tests `!` und leere Callbacks), dazu die Schichtregel (`no-restricted-imports`) und das Verbot von `style={…}`.
  - **Tailwind-Lint** (`eslint-plugin-better-tailwindcss`, liest `globals.css`): unbekannte, widersprüchliche, doppelte und veraltete Klassen sind Fehler; `no-restricted-classes` setzt `theme.md` §3 Regel 8 durch (keine beliebigen Werte `-[…]`, keine rohen Radien, keine `/Deckkraft`-Tönungen, keine rohen Schatten, kein `text-2xl` und größer, kein `white`/`black`). Grenze: geprüft werden `className`-Attribute, nicht Klassen-Strings, die eine Hilfsfunktion zusammenbaut.
  - **TypeScript** `strict` plus `noFallthroughCasesInSwitch`, `noImplicitOverride`, `noImplicitReturns`. `noUncheckedIndexedAccess` bewusst nicht: Die Zugriffe auf Spieler-Records bräuchten Assertions ohne Gewinn; wo ein Platz wirklich fehlen kann, liest der Code mit `.at()`.
  - **Commits** nach Conventional Commits (`CLAUDE.md`), geprüft von `commitlint`; `lefthook` führt vor jedem Commit Prettier und ESLint auf den gestagten Dateien aus.

---

## 10. Sicherheit

- HTTPS überall (Tailscale Funnel, TLS-Endpunkt auf dem Pi). Der Hostname ist öffentlich auffindbar, deshalb steht der Login vor allem außer `/login`, `/einladung/<token>` und `/api/health`.
- Caddy und App sind nur auf `localhost` des Pi gebunden, nicht im Heimnetz erreichbar.
- **Login (E10):** ein Spieler mit `password_hash` (bcrypt, Kostenfaktor 12; der erste Admin aus `.env`) kann sich einloggen. Session-Token 32 Zufallsbytes im Cookie `darts_session` (`httpOnly`, `sameSite=lax`, `secure`, 1 Jahr fest), in der DB nur der SHA-256. Einladungs- und Reset-Token ebenso, 24 h, einmalig.
- **Autorisierung serverseitig** in jeder Seite und Action (`requireSession`, `requireAdmin`); `src/proxy.ts` leitet nur ohne Cookie um und ersetzt keine Prüfung. Eingaberechte am Match (E13) prüft `src/domain/game/permissions.ts`, aufgerufen im Service, nie nur in der UI.
- **Rate-Limit** im Prozess: 10 Fehlversuche je IP in 15 min für Login und Token-Einlösen; die IP kommt aus `X-Forwarded-For` von Caddy.
- Server Actions sind durch Nexts Origin-Prüfung gegen CSRF geschützt; `COOKIE_SECURE=false` nur lokal über http.
- **Sicherheits-Header** (`next.config.ts`): Content-Security-Policy nur mit eigener Herkunft (`default-src 'self'`, `frame-ancestors 'none'`, `form-action 'self'`, `object-src 'none'`), dazu `X-Frame-Options: DENY`, `Referrer-Policy: same-origin`, `X-Content-Type-Options: nosniff`, `Permissions-Policy` ohne Kamera, Mikrofon, Ort; kein `X-Powered-By`. **Bewusster Kompromiss:** `script-src` und `style-src` erlauben `'unsafe-inline'`, weil Next.js seine Daten als Inline-Skripte streamt und das Theme-Skript vor dem ersten Paint läuft; eine Nonce pro Request würde das Root-Layout dynamisch machen und das partielle Prerendering brechen. Externe Skripte sind trotzdem blockiert. Der Smoke-Test prüft die Header und schlägt bei jeder CSP-Verletzung im Browser fehl.
- **Abhängigkeiten:** `scripts/ci.sh` bricht bei bekannten Lücken mit Schweregrad hoch oder kritisch in Laufzeit-Abhängigkeiten ab (`npm audit --omit=dev --audit-level=high`).
- Keine Secrets im Repo (`.env` auf dem Pi, `.env.example` lokal; Hash-Escaping siehe README).
- Pi: SSH nur mit Key, kein Passwort-Login, keine Portfreigabe in der FritzBox (Funnel ist ausgehend).

---

## 11. Entscheidungen

| # | Frage | Stand |
|---|---|---|
| E1 | Anschluss: öffentliche IPv4 oder DS-Lite? | **Entschieden:** DS-Lite → Tailscale Funnel (§4); Cloudflare Tunnel mit Domain als spätere Option |
| E2 | Eingabe- und Speicher-Granularität | **Entschieden:** pro Aufnahme mit drei Dart-Plätzen (= `DartThrow`), Eingabe pro Dart über das Legacy-Keypad |
| E3 | Loggen sich alle Spieler selbst ein oder zählt nur ein Gerät? | **Entschieden:** alle Mitspieler können sich einloggen (M3). Gezählt wird pro Match entweder auf einem Gerät (Default) oder jeder auf seinem eigenen (E13, M4) |
| E4 | Cricket, Elimination, SplitScore in v1? | **Entschieden:** eigener Meilenstein M7 nach M6; v1 = X01 |
| E5 | Daten aus der iOS-App übernehmen? | **Entschieden:** nein |
| E6 | SD-Karte oder SSD | **Entschieden (23.10.2026):** SD bleibt, solange sie keine Fehler zeigt; ohne Backup (E14) ist ein Ausfall ein Neustart, kein Verlust, der schmerzt |
| E7 | Sets/Legs bei 2–n Spielern? | **Entschieden (umgesetzt in M5):** Sets und Legs nur bei X01 mit 2 Spielern (und Turnieren), im Setup als „Best of“ 1, 3, 5 …; freie Spiele mit 3+ Spielern und die übrigen Modi sind ein Leg mit Platzierungen |
| E8 | Elo bei Mehrspieler-Matches? | **Default:** Elo nur aus 1-vs-1-Matches; Mehrspieler-Matches zählen für alle übrigen Statistiken |
| E9 | Dark Mode | **Entschieden:** Light und Dark von Anfang an, Tokens aus den Legacy-Assets (`theme.md`), Systemeinstellung plus Toggle |
| E10 | Wie kommen Mitspieler zu einem Login? | **Entschieden (M3-Plan, 22.10.2026):** Keine eigene Nutzer-Tabelle: ein Spieler mit `password_hash` kann sich einloggen, `is_admin` ist eine Spalte am Spieler. Der erste Admin wird beim Start aus `.env` angelegt, wenn noch keiner existiert. Er lädt per QR-Code ein (Einmal-Token, 24 h, ohne Namen); der Eingeladene wählt Name und Passwort. Vergebene Namen werden abgelehnt; für Gäste und Spieler ohne Login erzeugt der Admin einen Login mit festem Spieler (Passwort-Token). Eingeloggte benennen sich selbst und Gäste um und ändern ihr Passwort; Admins benennen alle um, löschen Spieler außer sich und andere Admins (seit 5.11.2026 immer, auch mit Matches: weiches Löschen, §6), erzeugen Resets; „Login löschen“ gibt es seit 29.10.2026 nicht mehr. Session-Cookie 1 Jahr ab Login, ohne Verlängerung. Basic Auth in Caddy entfällt mit M3; die Datenbank wird beim M3-Deploy geleert |
| E11 | Was geht beim Zählen über das Netz? | **Entschieden:** Darts werden am Gerät lokal durch die Domäne gezählt (sofortige Anzeige); erst die abgeschlossene Aufnahme (3 Darts, Bust oder Checkout) geht als `commitVisit(legIndex, seq, geworfene Darts)` an den Server, der sie selbst nachrechnet; Undo einer gespeicherten Aufnahme ist `undoVisit`. Die offene Aufnahme liegt im localStorage des Geräts, Aufrufe laufen in einer Warteschlange mit Retry. Seit M6 liegt auch die Warteschlange im localStorage (überlebt Reload und geschlossenen Tab); ein wiederholt gesendeter Commit gilt als gespeichert, ein Undo nennt den Schritt, den es zurücknimmt (`undoStep`), damit doppelt Gesendetes nie doppelt wirkt. Ein Bust zählt 0, egal wie weit überworfen; Undo stellt den letzten regulären Stand wieder her |
| E12 | Spieler, die nur einen Abend mitwerfen? | **Entschieden:** Gäste werden im Setup „Neues Spiel“ angelegt (`player.guest_until` = jetzt + 24 h), liegen in der DB (überleben Reload und Gerätewechsel) und stehen 24 h in allen Setup-Screens (jeder Modus, jede Runde), im Tab „Spieler“ unter „Gäste heute“ (umbenennen, entfernen); der Zusatz „Gast“ erscheint nur im Setup. Namen sind über alle Spieler eindeutig, Gäste eingeschlossen. **Matches mit mindestens einem Gast zählen in keiner Rangliste und nicht für Elo**, auch nicht für die regulären Teilnehmer. Einzige Ausnahme: die **Feldtreffer** der regulären Spieler werden auch aus Gast-Matches erfasst (Triple = 3 Treffer, Double = 2, Single = 1; T20 S20 T5 → 4×20, 3×5; in einer gebusteten Aufnahme zählt kein Dart). Ein Gast-Match lebt nur so lange wie der am längsten sichtbare beteiligte Gast; beim Aufräumen werden die Feldtreffer der regulären Spieler in `player_field_hits` übernommen, dann werden Match, Legs, Aufnahmen und zuletzt der Gast gelöscht. „Dauerhaft übernehmen“ (nur Admin, ab M3) macht aus einem Gast einen regulären Spieler; seine bisherigen Matches bleiben Gast-Matches, solange ein anderer Gast beteiligt ist. Kein Login nötig, ab M3 darf jeder eingeloggte Nutzer Gäste anlegen |
| E13 | Ein Handy für alle oder jeder sein eigenes? | **Entschieden (22.10.2026):** Beim Start wird pro Match gewählt: `input_mode` `single` (Default, das startende Handy gibt alle Darts ein) oder `per-player` (jeder Spieler mit Login auf seinem Gerät; Keypad nur aktiv, wenn der eigene Spieler am Zug ist). Spieler ohne Login (Gäste) werfen immer auf dem Start-Handy (`host_player_id`). Undo folgt denselben Rechten wie die Eingabe. Andere Geräte sehen den Stand nach jeder abgeschlossenen Aufnahme (Live-Aktualisierung vom Server); die offene Aufnahme bleibt wie bei E11 auf dem eingebenden Gerät. Das zweite Handy findet das Match über die Spielübersicht, es gibt keinen Einladungslink dafür. Braucht Sessions, daher M4 nach M3 |
| E14 | Backup der Datenbank? | **Entschieden (23.10.2026): nein.** Es ist ein Spiel; geht `darts.db` verloren, legt der nächste Start sie mit dem Admin aus `.env` neu an, die Mitspieler werden neu eingeladen. Kein Backup-Job, kein Restore, keine Backup-Doku; M12 enthält nur Neustart-Robustheit, Updates und PWA |
| E15 | Wo liegt das Repo, wie läuft CI? | **Entschieden (23.10.2026, umgezogen bis 29.10.2026):** das Repo liegt auf GitHub (`lucablechschmidt/dartClientServer`), vorher GitLab.com. Alles Plattformspezifische bleibt minimal: die CI-Schritte stehen in `scripts/ci.sh` (Install, Lint, Typecheck, Tests, Build, Smoke-Test), `.github/workflows/ci.yml` ruft nur dieses Skript. Keine Plattform-Features (Environments, Pages, Registry) im Workflow; Issues und Pläne bleiben in `docs/`, nicht im Tracker, damit sie mitziehen. Deploy bleibt manuell vom Mac (`scripts/deploy.sh`), nie aus der CI, weil der Pi nicht aus dem Internet erreichbar ist |

---

## 12. Ziel-Architektur und verbindliche Konventionen (Code-Review, 6.11.2026)

> Ergebnis des vollständigen Code-Reviews (`docs/m13-plan.md`). Dieser Abschnitt fasst zusammen, wie der Code **gebaut ist** und wie er **gebaut werden soll**; er ergänzt §9 und ersetzt nichts. Kennzeichnung: **Ist** = so umgesetzt und geprüft; **Ziel** = kommt mit `m13-plan.md`, Paket in Klammern. Was hier steht, gilt für jede künftige Änderung; Abweichungen werden vorher in `docs/fragen.md` vorgeschlagen.

### 12.1 Schichten und Abhängigkeitsrichtung

**Ist.** `src/domain` ← `src/db` ← `src/server` ← `src/components` ← `src/app`; `src/i18n` wird von allem außer `domain` gelesen. ESLint (`no-restricted-imports`, `eslint.config.mjs`) erzwingt die Richtung; das Review fand keine Verletzung.

| Schicht | Gehört hinein | Gehört nicht hinein |
|---|---|---|
| `src/domain` | Regeln, Zustandsübergänge, Projektionen, Rechte als reine Funktionen über Werte; `Result`-Typen; Konstanten wie `MATCH_OPEN_MS`, `GUEST_LIFETIME_MS` | DB, React, Next, `Date.now()`, `crypto`, Texte |
| `src/db` | Drizzle-Schema, Repository-Interfaces (`repository.ts`, `auth-repository.ts`, `tournament-repository.ts`), SQLite- und Memory-Implementierungen, Zeilen ↔ Domänentypen (`visit-mapping.ts`) | Fachregeln (außer Replay zum Laden), Rechte |
| `src/server` | Services (`*-service.ts`: laden → Domäne → `deps.transaction` → speichern → `deps.events.publish`), Server Actions (`*-actions.ts`: `requireSession`, Eingabe prüfen, Service rufen, `Result` oder `redirect`), `Deps`, Request-Kontext, Log, Rate-Limit, Event-Hub, Umgebungs-Schema | JSX, Texte außer `shownName` (einzige bewusste Ausnahme, `player-names.ts`) |
| `src/components/ui` | Dumme Bausteine ohne Fachwissen: Props rein, Callbacks raus; dürfen lokalen UI-Zustand haben (offen/zu, Entwurf im Feld) | Datenzugriff, Fachregeln, Server-Typen |
| `src/components/darts` | Dart-spezifische Bausteine und Hooks (`Keypad`, Panels, `useVisitSync`, `useMatchEvents`) | Datenzugriff |
| `src/components/screens` | Ganze Screens aus Bausteinen; Server Actions kommen als Props | `import` aus `@/server` oder `@/db` |
| `src/app` | Routen: `page.tsx` liest (`requireSession`, Service), bindet Actions, rendert den Screen in `<Suspense>`; `layout.tsx`, `error.tsx`, `not-found.tsx`, Route Handler | Fachlogik, Markup über einen `<main>`-Rahmen hinaus |

**Server Components vs. Client Components.** Eine Komponente bekommt `"use client"` nur, wenn sie Hooks, Browser-APIs oder Event-Handler braucht. **Ist:** 30 Dateien, alle begründet (Formulare mit `useActionState`, Overlays, Hooks, `usePathname`). Server-only-Code (`better-sqlite3`, `node:crypto`, `bcryptjs`, `process.env`) liegt nur in `src/db`, `src/server`, `src/app/api`, `instrumentation.ts`, `proxy.ts`; es gibt kein `NEXT_PUBLIC_*`. **Ist (D):** `import type` aus `@/server` ist in `src/components` erlaubt (`@typescript-eslint/no-restricted-imports` mit `allowTypeImports` nur für `server`); Laufzeit-Imports bleiben verboten. View-Typen kommen so direkt vom Server (`Pick`, wo ein Screen nur einen Teil braucht), es gibt keine „strukturellen Kopien“ mehr (R-08).

**Server Actions vs. Route Handler.** Alles, was der Client ändert oder lädt, ist eine Server Action (`src/server/*-actions.ts`); Route Handler gibt es nur für das, was eine Action nicht kann: den Stream `/api/match/[id]/events` und `/api/health` für Docker. Das bleibt so.

### 12.2 Datenabruf und Rendering

**Ist.** Cache Components sind an (`next.config.ts`); jede Seite, die SQLite liest, tut das in einer async Unterkomponente innerhalb von `<Suspense>`, die zuerst `requireSession()` ruft (dessen `connection()` wartet auf den echten Request). So bleibt die Hülle (Layout, Tab-Leiste, Überschrift) statisch, der Inhalt streamt. Daten fließen nur als serialisierbare, fachliche View-Typen an die Screens (`MatchView`, `MyStats`, `TournamentView` …), nie als DB-Zeilen. Das Lesen passiert einmal pro Request; `productionDeps()` baut die Repositories pro Aufruf über die eine Verbindung (`getDb()`, `globalThis`-Singleton).

**Nach Schreibvorgängen** leitet eine Action um (`redirect`, bei Formularen), liefert den neuen Stand als `Result` (Zählscreen) oder ruft `revalidatePath` für die betroffenen Seiten (Spieler, Admin). Live-Änderungen anderer Geräte kommen per SSE-Ping, der Client lädt dann über `loadMatchAction` nach.

**Regel (Ist seit Paket B für beendete Matches und Turnierspiele):** Lese-Methoden der Repositories laden Mengen **batchweise** (ein Select je Tabelle mit `inArray`, Gruppierung in JS), nie in Schleifen pro Datensatz; Filter (Spieler, Zeitraum) gehören in die SQL-Abfrage, nicht ins JS danach (R-01). Jede neue Liste bekommt dafür einen Test, der die Query-Anzahl zählt (Muster: `vi.spyOn(db.$client, "prepare")` in `repository.test.ts`). **Noch pro Datensatz:** `listOpenMatches`, `listMatches` und `listRecentMatches` (Spieler bzw. Sitze je Match); die Listen sind auf 20 bzw. wenige Einträge begrenzt.

### 12.3 Validierung, Fehler und Rückmeldung

**Regel (Ist seit Paket A):** Eine Server Action **wirft nie** wegen Nutzereingaben. Am Rand der Action steht ein Zod-Schema für genau ihre Eingabe (FormData-Felder sind Strings; JSON-Argumente ihre Typen); `safeParse` scheitert → `{ ok: false, reason: "invalid-input" | "invalid-name" }`. Services bekommen geparste Werte oder liefern selbst `Result`; Zod-`parse` (werfend) ist dort nicht erlaubt. **Ist:** `src/server/action-input.ts` baut die Eingaben für Match und Turnier aus dem Formular und prüft Argumente vom Client (IDs → `not-found`, Position, Undo-Schritt, Offset); `form.ts` hat `validate(schema, raw)` → `Result`. Namen liefern `invalid-name`. Ausnahme: `createMatch` und `createTournament` behalten ihr werfendes `parse` für Aufrufer **im** Server (Restart, Turnierpaarung), deren Werte schon geprüft sind; scheitert es dort, ist es ein Bug.

**Fehlerweitergabe Server → Client.** Ein `Result` mit einem **Grund-Code** (Union-Typ, z. B. `ActionError`), nie ein Text. Den Text liefert `src/i18n/de.ts` (`de.<bereich>.errors[<reason>]`); der Screen zeigt ihn an der Stelle der Aktion: `FormError` (`role="alert"`) unter dem Feld oder der Zeile (`ErrorLine`), im Zählscreen die Statuszeile des Headers. Jeder neue Grund-Code braucht seinen Text, sonst scheitert der Typcheck (`keyof Texts[…]["errors"]`). **Ist:** so umgesetzt für Login, Einladung, Konto, Spieler, Zählscreen, Turnier, Admin.

**Unerwartete Fehler** (Bugs, DB weg): `src/app/error.tsx` zeigt `ErrorScreen` mit „Noch einmal“ und „Zur Startseite“; `not-found.tsx` für fehlende Objekte (`notFound()` in der Seite). **Ist (A):** `onRequestError` in `instrumentation.ts` schreibt jede solche Ausnahme als JSON-Zeile (`request.failed` mit Pfad, Methode, Route, Art, Digest; `redirect`/`notFound` nicht) über `src/server/log.ts` (`src/server/request-error.ts`, R-03). **Ist (C):** `global-error.tsx` fängt Fehler im Root-Layout mit eigenem `<html>`, Styles und Theme-Script (R-17); beide Fehlerseiten rufen `retry()` (lädt neu), nicht `reset()`. Eine abgelaufene Session leitet auch aus JSON-Actions des Zählscreens auf `/login` um (`m13-plan.md` §6 Frage 7); der Zählscreen wird dabei verlassen, die offene Aufnahme bleibt in der Warteschlange (R-19, getestet in `use-visit-sync.test.tsx`).

**Rückmeldung an den Nutzer.** Jede Aktion hat drei sichtbare Zustände: **in Arbeit** (Button `disabled` + `aria-busy`, Text wie `de.game.saving`), **Erfolg** (Navigation, aktualisierte Liste oder `FormNote` „Gespeichert.“) und **Fehler** (siehe oben). Doppelte Ausführung verhindert der Pending-Zustand. **Ist:** Formulare mit `useActionState` (Login, Einladung, Passwort) und der Zählscreen (`sync`-Status in der Statuszeile) erfüllen das. **Ist (C):** Buttons, die eine Action direkt rufen, gehen über `useAsyncAction` (`src/components/ui/use-async-action.ts`, auf `useTransition`): ein zweiter Tipp während des Aufrufs wird ignoriert, `pending` bleibt bis die Antwort oder die Umleitung sichtbar ist, `error` ist der Grund eines gescheiterten `Result`, `rowButton(id)` markiert die Zeile, deren Aufruf läuft. `TextButton`/`PrimaryButton` nehmen `pending` (`disabled` + `aria-busy`, R-16). Ein Ergebnis einer Action wird nie mit `void` verworfen, wenn es einen Fehlergrund tragen kann (R-15, Abbrechen im Zählscreen zeigt den Grund in der Statuszeile).

**Ladezustände.** **Ist (C):** Jede Seite hat `<Suspense fallback={<Skeleton … />}>` (`src/components/ui/skeleton.tsx`: Überschriftbalken und Karte mit Zeilen in der Seitenspalte, `inline` nur die Karte innerhalb von `SubPage`; `bg-fill`/`bg-fill-strong`, `motion-safe:animate-pulse`; `role="status"` mit `de.ui.loading`, sichtbar kein Text). Der Zählscreen behält sein leeres `score-grid`. Kein `loading.tsx`: die Seiten in `(site)` teilen ein Layout, ein `loading.tsx` dort zeigte für alle Tabs dasselbe (R-04). Kein Spinner.

**Keine Toasts.** Rückmeldungen stehen dort, wo die Aktion war (Zeile, Formular, Statuszeile); am Board wird nicht gelesen, was oben kurz einblendet. Diese Entscheidung bleibt; wer eine globale Meldung braucht, nutzt die Statuszeile des Zählscreens oder `FormNote`.

### 12.4 Effects, Cleanup und Abbruch

**Regeln (Ist, bestätigt an allen sieben Effekt-Stellen):**

1. Jeder `useEffect`, der etwas registriert (Listener, Timer, `EventSource`, Intervall), gibt eine Cleanup-Funktion zurück, die genau das wieder entfernt.
2. Abgeleitete Werte werden im Render berechnet (`useMemo` nur bei messbarem Nutzen, z. B. `projectMatch`), nie per Effect in State kopiert. Einzige erlaubte Ausnahme: das einmalige Lesen von `localStorage` nach dem Mount in `useVisitSync` (kommentiert, `eslint-disable` lokal), weil Storage nur im Browser existiert (R-14).
3. Externe Quellen, die mehrere Komponenten teilen (Theme), laufen über `useSyncExternalStore`, nicht über Effects.
4. **Veraltete Antworten**: ein asynchroner Aufruf, dessen Ergebnis in State landet, prüft vor dem `setState`, ob er noch gilt: `live`-Flag im Cleanup (`AchievementBanner`) oder Generationszähler (`useVisitSync.generation`). **Ist (C):** der Zähler wird auch beim Unmount erhöht, damit die Retry-Schleife endet; die Warteschlange bleibt im localStorage (R-05).
5. **Hintergrund-Tab**: Polling gibt es nicht; die einzige Dauerverbindung (SSE) wird bei `visibilitychange` → `hidden` geschlossen und bei `visible` neu geöffnet; das `open` der neuen Verbindung lädt einmal nach (**Ist seit C**, R-12). Ein Tab, der im Hintergrund geöffnet wird, verbindet erst beim Anzeigen.
6. `AbortController` ist bei Server Actions nicht verfügbar (Next steuert den Transport); Abbruch heißt deshalb „Ergebnis ignorieren“ (Regel 4), nie „Request abbrechen“. Für `fetch` in Route-Handler-Clients (gibt es derzeit nicht) wäre `AbortController` im Cleanup Pflicht.
7. Zeit im Client: `Date.now()` ist erlaubt, wo der Server nicht beteiligt ist (Backoff, Stale-Prüfung); Server-Zeit (`now` aus der Seite) überall, wo Server und Client dasselbe rendern müssen (`relativeTime`).

### 12.5 Theme und Design-Tokens

**Ist.** Alle Tokens stehen in `src/app/globals.css`: Farben als CSS-Variablen auf `:root` mit `light-dark()` (Dark folgt `color-scheme`; `data-theme` setzt nur `color-scheme`), eingebunden über `@theme inline` als `--color-*`, dazu `--radius-*`, `--shadow-floating`, `--text-*`, `--spacing-*` und `@utility` für wiederkehrende Layouts (`score-grid`, `header-grid`, `pt-safe` …). Komponenten verwenden ausschließlich die daraus erzeugten Klassen. Verboten und per ESLint geprüft (`eslint.config.mjs`, `better-tailwindcss/no-restricted-classes`, `react/forbid-dom-props`): `style={…}`, beliebige Werte `-[…]`, rohe Radien, `/Deckkraft`-Tönungen, rohe Schatten, `text-2xl` und größer, `white`/`black`. Texte kommen aus `src/i18n/de.ts`. Das Review fand keine Verletzung; der einzige Hover-Zustand (`theme-toggle.tsx`) bleibt: er ist reine Zusatz-Rückmeldung am Desktop, Touch sieht ihn nicht (R-30, Entscheidung 8.11.2026).

**Neue Werte** werden Tokens in `globals.css` und bekommen eine Zeile in `theme.md` §1 bzw. §3; neue Bausteine einen Eintrag auf `/dev/theme`. Breiten (`PageFrame`) und Bewegung (Dauer, Kurve) kommen mit M14 (`docs/m14-plan.md`) und stehen dann in `theme.md` §4 und §5.

### 12.6 Komponentenstruktur und Namen

**Ist.**

- Dateien `kebab-case.tsx`, Komponenten `PascalCase`, Hooks `use-*.ts` / `useX`, reine Hilfslogik neben der Komponente als `*-logic.ts` (`keypad-logic.ts`) oder `*.ts` (`hint-text.ts`, `rounds.ts`); Tests `*.test.ts(x)` daneben.
- Ein Screen ist eine Funktion, die ihre Daten als **View-Typ** und ihre Aktionen als Callbacks bekommt; Texte als `texts: Texts["bereich"]`. Seiten (`src/app`) binden Actions und Texte, sonst nichts.
- Bausteine (`ui`) sind fachfrei und erscheinen auf `/dev/theme` (⚠️ nie umgesetzt, `/dev/theme` zeigt nur Tokens und Zählscreen; ob die Regel bleibt, steht in `docs/fragen.md`).
- Charts sind eigene SVGs (`AverageChart`, `Dartboard`) mit `sr-only`-Tabelle, keine Bibliothek (korrigiert §3).
- Icons: `src/components/ui/icons.tsx`, `aria-hidden`, Größe über `size-icon*`-Tokens.

**Richtwert (Frage 4, 8.11.2026):** nur wiederverwendbare `ui`-Bausteine haben einen festen Wert (≤ 150 Zeilen); Screens, Hooks und Services werden nach Verantwortung geteilt, wenn eine Änderung es nahelegt, nicht nach Zeilenzahl. **Ist (E):** `choice-menu.tsx` (148 Zeilen) und `choice-number-field.tsx`, die Markierung beider als `ChoiceMark`; kein `ui`-Baustein liegt über 150 Zeilen außer `icons.tsx` (SVG-Pfade) (R-25). Die früher genannten Schnitte (`useVisitSync`, `scoreboard-screen`, `setup-shell`, `match-service`) sind zurückgestellt.

**Barrierefreiheit (Ziel F, Ist weitgehend):** nie auf Kosten der UX für Sehende (Luca, 8.11.2026): Aussehen und Bedienung bleiben, was sie ändern würde, wird vorgeschlagen. Native Elemente zuerst (`<button>`, `<dialog>`, `<table>` mit `scope`); keine interaktiven Elemente in Elementen mit `role="button"` (R-26); Overlays mit Fokus-Fang und Rückfokus, als `<dialog>` nur, wenn Aussehen und Einblenden gleich bleiben (R-28); aufklappbare Bereiche mit `aria-expanded` **und** `aria-controls` (R-29); jede Seite setzt `metadata.title` (R-29); Mindest-Tipphöhe `min-h-touch`; Fehlertexte `role="alert"`, Status `role="status"`/`aria-live`.

### 12.7 Tests

**Ist.** Domäne test-first mit Vitest (Schwellen 90 % für `src/domain`, 85 % `src/db`, 85/80 % `src/server`), Services gegen `memoryDeps()`, Atomarität gegen `sqliteDeps()`, UI-Logik mit Testing Library (Keypad, Panels, Sync-Queue, Menüs), Abläufe mit Playwright gegen den Produktions-Build (`e2e/`, eine DB, ein Worker). Texte in Tests immer aus `de`.

**Ist (D):** `src/components/**` zählt mit einer niedrigen Schwelle in die Coverage (Statements 60 %, ohne `icons.tsx`; R-34); `e2e/` wartet auf konkrete Signale statt `networkidle`: `settled(page)` (kein Lade-Platzhalter mehr) und der gespeicherte Stand im Zählscreen (R-35). Jedes Arbeitspaket aus `m13-plan.md` bringt seinen Test mit (Unmount, Pending, Query-Anzahl, Tastaturbedienung).

### 12.8 Ressourcen und Betrieb auf dem Pi

**Ist.** Ein Node-Prozess, eine SQLite-Verbindung (`globalThis`), WAL, `busy_timeout 5 s`, Migrationen beim Start; Event-Hub und Rate-Limit im Speicher (§5); SSE-Streams räumen bei `abort`/`cancel` auf (Hub-Abmeldung, Intervall, `close`); Aufräumjob einmal täglich (`setInterval(...).unref()`); Bundle ohne Fremd-UI-Bibliotheken (`.next/static` ≈ 940 KB); Docker-Image ohne `data`, `.env`, `Legacy`, `docs` (`.dockerignore`).

**Bewusste Grenzen (Ist):** jede Session darf jede Match-ID abonnieren (nur Pings, keine Daten, R-24); `/api/health` ist öffentlich; das Rate-Limit vertraut `X-Forwarded-For` von Caddy (M12 Teil B prüft das).

**Ist (B):** Beendete Matches und Turnierspiele laden batchweise (12.2); die Rate-Limit-Map räumt ab 1 000 Einträgen abgelaufene auf (R-20); das Aufräum-Intervall liegt auf `globalThis`, die Datenbank wird beim Prozessende geschlossen (`exit`-Hook; Next beendet sich bei `SIGTERM` selbst, R-22). **Offen:** `PRAGMA synchronous = NORMAL` nur nach Entscheidung (`docs/fragen.md`, R-21); `/api/health` antwortet seit Paket A ohne Fehlermeldung und loggt sie (R-23). Nach Paket B misst Luca die Statistik-Seiten mit der Pi-Datenbank (`m13-plan.md` §7); eine Aggregat-Tabelle kommt nur, wenn das nicht reicht (`m13-plan.md` §5).
