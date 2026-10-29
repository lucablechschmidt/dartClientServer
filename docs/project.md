# Projektplan – Darts Scorer Web

> Umsetzung mit Claude Code in der CLI. Grundlage sind `architecture.md` und `legacy-analysis.md`.
> Prinzip: **so früh wie möglich ein vertikaler Durchstich**, der schon der echte Zählscreen ist, danach Schicht für Schicht ausbauen.

---

## Arbeitsweise mit Claude Code

1. **Ein Repo, eine `CLAUDE.md`.** Sie nennt Stack, Befehle (`npm run dev`, `npm test`, `./scripts/deploy.sh`), Konventionen und verweist auf die Docs. Nach M1 schärfen.
2. **Ein Meilenstein ist eine Session.** Bei größeren Schritten zuerst den **Plan-Modus** nutzen (Claude plant, ihr prüft, dann wird umgesetzt).
3. **Klein schneiden.** Jeweils eine Aufgabe aus der Liste unten in den Prompt geben, nicht den ganzen Meilenstein auf einmal.
4. **Test-first bei Logik.** „Schreib zuerst Vitest-Fälle für diese Regeln, zeig sie mir, dann implementieren.“
5. **Jeder grüne Schritt ist ein Commit.** Claude committen lassen oder selbst committen. Ein Diff, der nicht verstanden wird, wird nicht committet; dann fragt man Claude, was er tut.
6. **Definition of Done prüfen lassen.** Am Ende eines Meilensteins: „Prüf die DoD aus project.md und sag mir, was fehlt.“
7. **Den Kontext sauber halten.** `/clear` zwischen unabhängigen Aufgaben. Entscheidungen gehören in `architecture.md`, nicht nur in den Chat.
8. **Abhaken.** Erledigte Aufgaben in dieser Datei mit `[x]` markieren.

---

## Übersicht

Die Meilensteine sind in der Reihenfolge nummeriert, in der sie umgesetzt werden (seit 23.10.2026). Commits davor nennen noch die alten Nummern (Spalte „früher“):

| Meilenstein | Inhalt | Stand | früher |
|---|---|---|---|
| M0 | Vorbereitung und Analyse | fertig | M0 |
| M1 | Vertikaler Durchstich | fertig, DoD am Handy geprüft | M1 |
| M2 | Gastspieler | fertig, DoD am Handy geprüft | M1b |
| M3 | Accounts per Einladung | fertig, deployt, DoD mit zwei Handys geprüft | M4 |
| M4 | Eingabe auf mehreren Geräten | fertig, deployt, DoD mit Rate-Limit-Probe geprüft | M4b |
| M5 | X01 vollständig | geplant | M2 |
| M6 | Robustheit am Board | geplant (lokales Zählen schon da) | M3 |
| M7 | Cricket, Elimination, SplitScore | geplant | M3b |
| M8 | Statistiken und Reporting | geplant | M5 |
| M9 | Turniere | geplant | M7 |
| M10 | Achievements | geplant | M8 |
| M11 | Sound und Komfort am Board | geplant, Reihenfolge nach Lust | M9 |
| M12 | Betrieb und Härtung, inkl. Ingress prüfen (Caddy, Rate-Limit) | geplant, bewusst zuletzt | M6 und M4c |

Jeder Meilenstein hat einen Detailplan `docs/mN-plan.md`; erledigte liegen in `docs/archive/`.

---

## M0 – Vorbereitung und Analyse

**Ziel:** Repo steht, die alte App ist verstanden, der Pi ist erreichbar, der Netzwerkpfad ist klar.

- [x] Das Swift-Repo als Unterordner `Legacy/` (nur lesen) im Repo
- [x] `docs/legacy-analysis.md`: Datenmodell, Spielregeln, Screens und Abläufe, berechnete Statistiken
- [x] Swift-Modell mit `architecture.md` §6 verglichen, Zielmodell festgelegt, E2–E5, E7, E8 entschieden
- [x] FritzBox: Anschlussart geprüft (E1): DS-Lite → Tailscale Funnel, keine Portfreigabe
- [x] Pi: Raspberry Pi OS Lite 64-bit, SSH-Key, Docker und Compose installieren, `ssh pi` als Alias in `~/.ssh/config`
- [x] Tailscale auf dem Pi, MagicDNS + HTTPS + Funnel aktiviert, `tailscale funnel --bg 8080` → `https://dartserver.swallow-pythagorean.ts.net`
- [ ] Entscheidung SD oder SSD (E6) festhalten

**DoD:** `ssh pi docker run --rm hello-world` läuft; `tailscale funnel status` zeigt den Hostnamen; E6 ist in `architecture.md` eingetragen.

---

## M1 – Vertikaler Durchstich 🎯

**Ziel:** Aus dem Internet per Handy ein X01-Leg mit 2–n Spielern auf dem **Legacy-Zählscreen** zählen, mit In/Out-Regeln, Bust, Undo und Checkout-Hinweis. Die Aufnahmen landen in SQLite auf dem Pi. **Nach einem Reload und nach einem Container-Neustart geht es an derselben Stelle weiter.**

Detailplan: `docs/archive/m1-plan.md`.

- [x] Next.js-Projekt (TypeScript strict, Tailwind, ESLint, Vitest), `output: 'standalone'`, Schichten und Lint-Regel laut `architecture.md` §9
- [x] Theme laut `docs/theme.md`: Tokens Light/Dark aus den Legacy-Assets, Toggle, Layout-Grid für den Zählscreen, Storybook-artige Seite `/dev/theme` mit allen Bausteinen
- [x] `src/domain/x01/`: Port von `DartThrow` + `ClassicGame` als reine Funktionen, **Tests zuerst** (Bust-Grenzen, In/Out, Checkout, Spielerwechsel, Undo über den Spielerwechsel, Undo nach Bust)
- [x] `src/domain/checkouts.ts` aus `Checkouts.swift`
- [x] Drizzle + better-sqlite3, Schema `player`, `match`, `match_player`, `leg`, `visit` laut `architecture.md` §6, erste Migration, Migration beim App-Start
- [x] Spielerliste: anlegen, umbenennen, löschen
- [x] Neues Spiel: Spieler in Reihenfolge wählen, 501/401/301, In- und Out-Regel (Sets/Legs noch fix 1/1)
- [x] Wiederverwendbare Bausteine `Keypad`, `KeypadButton`, `PlayerPanel`, `DartSlots`, `CheckoutHint` mit Fixtures und Tests für die Modifier-Logik
- [x] Zählscreen `/match/[id]`: Spieler-Panels (≤2 groß, ≥3 Multiplayer-Variante), Checkout-Hinweis, Keypad; jede abgeschlossene Aufnahme ist eine Server Action über das `MatchRepository` (E11, ursprünglich pro Dart)
- [x] Sieg-Screen: Sieger, Darts, Average, Rest der anderen, „Letzten Wurf rückgängig“, „Restart“ (gleiche Spieler, Anwurf wechselt)
- [x] `/api/health`
- [x] `Dockerfile` (multi-stage, arm64), `docker-compose.yml` mit Volume `./data:/data`
- [x] Caddy-Container auf `127.0.0.1:8080` mit `Caddyfile` (`basic_auth`, kein TLS; TLS macht Tailscale Funnel)
- [x] `scripts/deploy.sh` (buildx arm64 → `docker save | ssh pi docker load` → `compose up -d`)
- [x] `README.md`: Entwicklung, Deploy, Logs (`docker compose logs -f app`), Neustart
- [x] `CLAUDE.md` schärfen

**DoD (live vorführen), am Handy geprüft (23.10.2026):**
1. Auf dem Handy **im Mobilfunknetz, ohne WLAN** die URL öffnen → gültiges HTTPS → Login-Abfrage
2. Zwei Spieler anlegen, 501 Double-Out starten, eine Aufnahme mit Bust und eine mit T20 eingeben, Rest und Panels stimmen
3. Seite neu laden → gleicher Stand, gleicher Spieler am Zug, angefangene Aufnahme noch da (auf demselben Gerät, E11)
4. `ssh pi docker compose restart app` → erneut laden → gleicher Stand
5. Undo über den Spielerwechsel zurück funktioniert; Leg auschecken → Sieg-Screen
6. Die Datei `darts.db` liegt auf dem Pi im Volume
7. Zählscreen in Light und Dark, hoch und quer, auf Handy und Tablet ohne Scrollen und Abschneiden

> Bewusst noch nicht enthalten: Sets und Legs, Platzierungen bei 3+ Spielern, Spielübersicht, Auth-System, Offline-Puffer, 180-Sound.

---

## M2 – Gastspieler

**Ziel:** Wer nur heute Abend mitwirft, wird im Screen „Neues Spiel“ als Gast hinzugefügt, ohne Login. Gast-Matches zählen in keiner Rangliste; nur die Feldtreffer der regulären Mitspieler bleiben erhalten (E12).

Detailplan: `docs/archive/m2-plan.md`.

- [x] Schema: `player.guest_until` (NULL = regulärer Spieler; Gast = Zeitpunkt, bis zu dem er in Listen erscheint, Anlegen + 24 h), Migration
- [x] `src/domain/player`: `isGuestVisible(player, now)`; Repository listet reguläre Spieler plus sichtbare Gäste
- [x] `src/domain/stats/fieldHits.ts` mit Tests: Treffer pro Feld aus Aufnahmen (Single 1, Double 2, Triple 3; eine gebustete Aufnahme zählt gar nicht; T20 S20 T5 → 4×20, 3×5)
- [x] Schema `player_field_hits` (§6); Aufräumen beim App-Start und einmal am Tag: Gast-Matches, deren letzter Gast abgelaufen ist → Feldtreffer der regulären Teilnehmer addieren, Match samt Legs und Aufnahmen löschen, Gäste ohne Matches löschen; Test gegen das In-Memory-Repository
- [x] Screen „Neues Spiel“ (jeder Modus): Zeile „Gast hinzufügen“ in der Spielerliste (Name eingeben, Server Action), der Gast ist sofort ausgewählt und als Gast markiert (Icon oder Beschriftung); erscheint in allen Setup-Screens des Abends, nicht im Tab „Spieler“
- [x] Namen sind eindeutig über alle Spieler, Gäste eingeschlossen, ohne Groß/Klein (Unique-Index auf `lower(name)`, Fehlertext in der UI)
- [x] Gast nachträglich: Tab „Spieler“ zeigt sichtbare Gäste in einem eigenen Abschnitt mit Umbenennen und „Entfernen“ (nur ohne Matches); der Zusatz „Gast“ steht nur im Setup, nicht im Spiel; „Dauerhaft übernehmen“ (setzt `guest_until` auf NULL; seine Matches bleiben Gast-Matches, solange ein anderer Gast beteiligt ist) gibt es erst in M3 im Admin-Tab, weil nur der Admin das darf
- [x] Rangliste und Elo (M8) ignorieren Gast-Matches komplett, auch für reguläre Teilnehmer
- [x] Smoke-Test: Gast anlegen, Match spielen, Seite neu laden, zweites Match in anderem Modus (sobald vorhanden) mit demselben Gast

**DoD (live vorführen):** Am Handy im Setup „Gast hinzufügen“ → Name → Gast ist ausgewählt; Match spielen; Browser schließen und neu öffnen → zweites Match, Gast steht noch in der Liste; am nächsten Tag sind Gast und seine Matches weg; die Feldtreffer der regulären Mitspieler aus diesen Matches stehen in `player_field_hits` (nachgerechnet an einer Aufnahme T20 S20 T5); in der Rangliste (M8) ändert sich durch ein Gast-Match nichts.

---

## M3 – Accounts per Einladung

**Ziel:** Jeder Mitspieler hat einen eigenen Login, eingeladen per QR-Code vom Admin. Die Basic Auth in Caddy entfällt.

Detailplan: `docs/archive/m3-plan.md`.

**Ablauf (E10, Details und Fälle in `docs/archive/m3-plan.md` §1–2):**
1. Es gibt keine getrennten Nutzer: ein **Spieler mit `password_hash`** kann sich einloggen, `is_admin` ist eine Spalte am Spieler. Der erste Admin wird beim App-Start aus `ADMIN_USER`/`ADMIN_PASSWORD_HASH` in `.env` angelegt, wenn noch keiner existiert. Die Datenbank wird beim M3-Deploy geleert; alle Mitspieler kommen per Einladung neu hinein.
2. Tab **Konto** (für alle): eigener Name (umbenennen), Passwort ändern, Abmelden. Für den Admin zusätzlich: „Einladungslink erzeugen“ (Token 24 h, einmal nutzbar) als QR-Code und Link; Liste aller Spieler mit Umbenennen, „Login erzeugen“ (Spieler ohne Login), „Passwort zurücksetzen“, „Spieler löschen“ (das ursprüngliche „Login löschen“ ist seit 29.10.2026 entfernt, ebenso die Login-Kennzeichnung; nur „Admin“ steht noch an der Zeile); Gäste des Tages mit „Dauerhaft übernehmen“.
3. Der Eingeladene scannt den Code, Seite `/einladung/<token>`: Name und Passwort → Spieler mit Login entsteht, der Token ist verbraucht, er ist eingeloggt. Ein schon vergebener Name wird abgelehnt (für Gäste und Spieler ohne Login erzeugt der Admin stattdessen einen Login).
4. Login-Seite für alle (Name + Passwort), Logout. Session-Cookie 1 Jahr ab Login (`httpOnly`, `secure`, `sameSite=lax`). Ohne Session ist nur Login und Einladung erreichbar.
5. Rechte: Eingeloggte benennen sich selbst und Gäste um und entfernen Gäste; Admins benennen alle um und löschen Spieler, außer sich selbst und andere Admins; „Spieler löschen“ geht nur ohne Matches.
6. **Neues Spiel:** wie heute, Liste aller Spieler plus Gäste, in Reihenfolge antippen. Gezählt wird weiter auf einem Gerät (E3).

- [x] Schema: `player` + `password_hash NULL`, `is_admin`; `session` (id, player_id, expires_at); `invite` (id, kind register|password, player_id, reset_sessions, expires_at, used_at) (§6)
- [x] Passwort-Hash mit bcrypt (`bcryptjs`, kompatibel zu `caddy hash-password`, damit der Admin-Hash aus `.env` weiter gilt), Session-Cookie httpOnly/secure/sameSite=lax, 1 Jahr ab Login
- [x] Admin-Bootstrap beim Start aus `.env`, nur wenn kein Admin existiert
- [x] Services mit Tests: `login`, `logout`, `createRegisterInvite`, `createPasswordInvite`, `redeem`, `promoteGuest`, `renamePlayer` mit Rechteprüfung, `changeOwnPassword`; Autorisierung serverseitig in jeder Action
- [x] Seiten: `/login`, `/einladung/[token]`, Tab `/account` (QR-Code als SVG serverseitig mit `qrcode`), Tab „Spieler“ ohne „Spieler anlegen“ (nur noch Gäste)
- [x] Rate-Limit für Login und Token-Einlösen (in der App, pro IP)
- [x] Caddy: `basic_auth` entfernen, `deploy/env.example`, `scripts/hash-password.sh` und README anpassen; `.env` auf dem Pi umstellen, `darts.db` leeren

**DoD (live vorführen):** Admin loggt sich mit den `.env`-Zugangsdaten ein, erzeugt einen QR-Code; ein zweites Handy scannt ihn, legt „Name + Passwort“ an und landet eingeloggt in der App; derselbe QR-Code funktioniert kein zweites Mal; der Name des Admins wird beim Einlösen abgelehnt; der neue Spieler erscheint bei „Neues Spiel“ und kann ausgewählt werden; er kann sich selbst umbenennen, den Admin nicht; ohne Login zeigt jede andere Seite die Login-Seite; nach Logout ist der Zugriff weg; nach Browser-Neustart ist man noch eingeloggt; Passwort-Reset über einen zweiten QR-Code klappt; ein Gast wird vom Admin übernommen und bekommt per „Login erzeugen“ einen Login.

---

## M4 – Eingabe auf mehreren Geräten

**Ziel:** Beim Start entscheidet man, ob ein Handy alle Darts eingibt (Default) oder jeder Spieler auf seinem eigenen Gerät (E13).

Detailplan: `docs/archive/m4-plan.md`.

- [x] Schema: `match.input_mode` ('single' | 'per-player'), Default 'single'; `match.host_player_id` (Spieler, dessen Gerät das Match gestartet hat)
- [x] Setup: Pille „Eingabe: ein Handy / jeder selbst“ neben den anderen Optionen, Wert geht mit dem Formular
- [x] **Spielübersicht** (vorgezogen aus M5): Matches mit Status `running` und jünger als 24 h, mit Teilnehmern; Tippen öffnet den Zählscreen; nur darüber findet das zweite Handy das Match
- [x] Geschlossene Matches (abgebrochen oder älter als 24 h): über die URL noch ansehbar, Eingabe und Undo gesperrt (`match-closed`)
- [x] **Abbrechen**: Host oder Admin sehen oben links statt „Zurück“ einen Abbrechen-Button, Rückfrage in der App, dann Status `abandoned` und zurück zur Spielwahl
- [x] Zählscreen bei `per-player`: Keypad und Undo nur aktiv, wenn der Spieler am Zug der eingeloggte Spieler dieses Geräts ist; Spieler ohne Login (Gäste) wirft das Start-Handy (`host_player_id`); andere Geräte zeigen „… ist dran“
- [x] Live-Aktualisierung: Server liefert den Stand nach jeder abgeschlossenen Aufnahme an alle Geräte (SSE über eine Route, Fallback Polling); die offene Aufnahme bleibt wie bei E11 nur auf dem eingebenden Gerät
- [x] Server prüft die Berechtigung bei `commitVisit`/`undoVisit` (Session = Spieler am Zug, oder Host-Gerät für Spieler ohne Login)
- [x] Smoke-Test mit zwei Browser-Kontexten: zwei Logins, je ein Handy, abwechselnd werfen, Undo nur vom berechtigten Gerät

**DoD (live vorführen):** Drei Spieler, einer davon Gast; zwei Handys mit Login, Spiel auf Handy A im Modus „jeder selbst“ gestartet; Handy B sieht das Match in der Spielübersicht und kann nur werfen, wenn B dran ist; der Gast wirft auf Handy A; nach jeder Aufnahme zeigen beide Handys denselben Stand; Undo geht nur vom Gerät, das zuletzt eingegeben hat; Handy A bricht das Spiel ab, Handy B sieht es gesperrt und nicht mehr in der Übersicht.

**Rate-Limit-Probe** (gehört zur DoD, nur prüfen, kein Code): Handy A meldet sich zehnmal mit falschem Passwort an, der elfte Versuch mit richtigem Passwort muss „Zu viele Versuche“ zeigen. Direkt danach meldet sich Handy B aus einem anderen Netz an (Mobilfunk gegen WLAN). Wird B auch gesperrt, zählt das Limit alle Geräte gemeinsam; dann entscheiden, ob M12 Teil B vorgezogen wird. Zum Schluss `ssh pi 'cd darts && docker compose restart app'`, das gibt den Login sofort wieder frei (das Limit liegt nur im Speicher), auch für den Admin.

---

## M5 – X01 vollständig

Detailplan: `docs/m5-plan.md`.

**Ziel:** Alle X01-Regeln aus Legacy plus das, was Legacy nur angefangen hat, als getestetes reines TypeScript.

- [x] Sets und Legs: Leg-Ende, Set-Ende, Match-Ende, wechselnder Anwurf pro Leg (E7: nur bei 2 Spielern)
- [x] Platzierungen bei 3+ Spielern: herunterspielen, bis alle Plätze feststehen; der Letzte kann zu Ende spielen oder aufgeben
- [x] Anwurf vor dem ersten Dart wählbar („ToStart“), bei jeder Spielerzahl
- [x] Undo über Leg-, Set- und Match-Grenzen
- [x] Historie: beendete und abgebrochene Matches (Spielübersicht und Abbrechen: M4)

**DoD:** `npm test` ist grün, die Abdeckung von `src/domain` liegt über 90 %, mindestens 30 Regel-Testfälle; ein Best-of-3-Legs-Match und ein 4-Spieler-Spiel mit Platzierungen laufen durch.

---

## M6 – Robustheit am Board

Detailplan: `docs/m6-plan.md`.

**Ziel:** Ein echtes Match komplett am Board zählen, auch bei wackligem Netz.

- [x] Darts zählen lokal, nur die fertige Aufnahme geht an den Server (`commitVisit`/`undoVisit`, E11); Retry-Warteschlange mit Backoff, Anzeige „nicht gespeichert“, offene Aufnahme im localStorage des Geräts
- [ ] Playwright-Test für den Netz-Ausfall: Flugmodus während einer Aufnahme, danach ist alles gespeichert
- [ ] Playwright-Smoke-Test: Spieler anlegen → Match anlegen → Leg auschecken → Match-Ende
- [ ] Deploy und **Praxistest am echten Board**

**DoD:** Ein komplettes Best-of-3-Match wird am Board gezählt. Danach wird der Flugmodus kurz ein- und wieder ausgeschaltet, und es geht nichts verloren.

---

## M7 – Cricket, Elimination, SplitScore

Detailplan: `docs/m7-plan.md`.

**Ziel:** Die drei übrigen Legacy-Modi, je ein Domänenmodul und ein Screen (Regeln: `legacy-analysis.md` §4–6).

- [ ] `src/domain/cricket/` mit Tests: Marks, Punkte ab dem 4. Mark, geschlossene Felder, Sieg
- [ ] `src/domain/elimination/` mit Tests: hochzählen, Out-Regel, Elimination und ihr Undo
- [ ] `src/domain/splitscore/` mit Tests: Zielfeld-Reihenfolge, Halbieren, Replay
- [ ] Setup-Screens und Panel-Varianten (Cricket-Marks, „nächste Elimination“, aktuelles Zielfeld)

**DoD:** Jeder Modus wird einmal am Board durchgespielt; Undo stimmt in allen dreien.

---

## M8 – Statistiken und Reporting

Detailplan: `docs/m8-plan.md`.

**Ziel:** Die Auswertungen, für die es die App gibt.

- [ ] `src/domain/stats/` mit Tests: 3-Dart-Average (Definition wie Legacy), First-9, Checkout-Quote, 180/140+/100+, Highest Finish, Best Leg (Darts), Highest Score, Feldtreffer, Elo (nur 1 vs 1, E8); Gast-Matches (E12) zählen in keiner Rangliste und nicht für Elo; Feldtreffer = Treffer aus vorhandenen Aufnahmen plus `player_field_hits`
- [ ] **Spielerprofil:** Kennzahlen gesamt, Average-Verlauf über die Zeit (Recharts), Feldtreffer als Board-Heatmap oder Balken
- [ ] **Spieler-Rangliste:** sortierbar nach Siegquote, Average, Checkout-Quote, Elo
- [ ] Match-Detailansicht mit Statistik pro Leg
- [ ] Performance prüfen (SQL-Aggregation statt alles in JS, wenn es langsam wird)

**DoD:** Die Berichte zeigen für reale Daten aus M6 korrekte Werte (mit einem von Hand nachgerechneten Match gegengeprüft).

---

## M9 – Turniere

**Ziel:** Ein Abend als Turnier, immer 1 vs 1: Jeder gegen jeden oder K.-o.-Baum, Setzliste aus der Elo-Rangliste, jedes Turnierspiel ist ein normales X01-Match.

Detailplan: `docs/m9-plan.md`.

- [ ] `src/domain/tournament/`: Round Robin (Port des Generators aus `Tournament.swift`, Berger-Tabelle, Freilos bei ungerader Zahl), K.-o.-Baum mit Freilosen nach Setzliste, Gruppen + Playoffs, Tabelle mit Tie-Breaks; Tests
- [ ] Schema `tournament`, `tournament_player`, `tournament_match`; Match entsteht beim Start des Spiels (`is_tournament`)
- [ ] Seiten `/tournaments`, `/tournaments/new`, `/tournaments/[id]` (Spielplan, Tabelle oder Baum, „Spielen“, Sieger)
- [ ] Match-Ende trägt den Sieger ein und öffnet die nächste Runde; Undo vom Sieg-Screen, solange das nächste Spiel des Siegers nicht begonnen hat

**DoD:** Round Robin zu viert komplett über die App, Tabelle stimmt mit der Handrechnung; K.-o. zu sechst mit Freilosen bis zum Finale.

---

## M10 – Achievements

**Ziel:** Auszeichnungen, die ein Spieler einmal verdient und behält, erkannt aus den Aufnahmen: 180, 170-Checkout („Gone Fishing“), alle Finishes einmal gespielt, SplitScore mit 1 Punkt beendet, SplitScore ohne Halbierung, Elimination als Erster einen Mitspieler genullt („First Blood“), dazu 9-Darter, Shanghai, Bullseye-Finish.

Detailplan: `docs/m10-plan.md`.

- [ ] `src/domain/achievements/`: eine Erkennerfunktion je Achievement über `MatchState` aller Modi, Fortschritt für „alle Finishes“; Tests mit Positiv- und Negativfall
- [ ] Schema `achievement`, `achievement_progress`; Erkennung beim Match-Ende, Rücknahme beim Undo, rückwirkender Lauf beim ersten Start
- [ ] Sieg-Screen-Banner „Neu: …“, Galerie im Profil, Spalte in der Rangliste

**DoD:** 180 im Spiel zeigt das Banner und steht im Profil; Undo nimmt es zurück; alte Matches haben ihre 180er nach dem rückwirkenden Lauf.

---

## M11 – Sound und Komfort am Board

**Ziel:** Kleine Dinge, die das Zählen am Board angenehmer machen; jeder Punkt einzeln weglassbar.

Detailplan: `docs/m11-plan.md`.

- [ ] 180-Sound: die drei `.m4a` aus `Legacy/Dart/Assets.xcassets` per `<audio>`, zufällig eine, auf jedem Gerät, das die Aufnahme sieht; Schalter „Ton“ im Konto
- [ ] Haptik bei Bust und Match-Ende (Android), sichtbare Tastenrückmeldung
- [ ] Schnelleingabe pro Aufnahme, nur falls die Dart-Eingabe am Board nervt (M6): Summe wird in drei Darts zerlegt, `visit.is_quick`, Feldtreffer lassen solche Aufnahmen aus
- [ ] Kleinkram vom Board (Sammelstelle aus M6)

**DoD:** 180 löst den Sound aus, auch auf dem Zuschauer-Handy; Bust vibriert auf Android.

---

## M12 – Betrieb und Härtung

Detailplan: `docs/m12-plan.md`. Kein Backup (E14, bewusst: Spiel-Projekt).

- [ ] PWA: Manifest, Icon, „Zum Startbildschirm hinzufügen“
- [ ] unattended-upgrades auf dem Pi, Healthcheck auch für Caddy, stündlicher Funnel-Check mit Logzeile
- [ ] Optional: Umzug auf USB-SSD (E6, nur bei SD-Fehlern)
- [ ] Security-Durchgang über den ganzen Code gegen `architecture.md` §10 (`docs/m12-plan.md` §5a), Befunde behoben oder bewusst akzeptiert

**Teil B – Ingress prüfen** (früher eigener Meilenstein, `docs/m12-plan.md` Teil B):

- [ ] Diagnose-Seite `/diag` (nur Admin, hinter `DIAG_ENABLED`): ankommende Header, abgeleitete Client-IP, SSE-Ticks, Server-Action-Probe
- [ ] Probe A über den heutigen Weg (Funnel → Caddy → App), Probe B mit Funnel direkt auf die App
- [ ] Entscheidung E16: Caddy entfällt oder bleibt mit Begründung
- [ ] Rate-Limit zählt pro Gerät (wenn Funnel die IP liefert) oder pro Spielername
- [ ] Diagnose-Code wieder entfernt, README und `architecture.md` nachgezogen

**DoD:** Der Pi wird hart vom Strom getrennt und wieder eingeschaltet; die App läuft wieder, ein laufendes Match ist noch da; die App ist am Handy als Icon auf dem Home-Bildschirm und startet im Vollbild. Teil B: Messwerte in `docs/m12-plan.md` §B6, E16 eingetragen, zehn Fehlversuche von Handy A sperren Handy B nicht, Diagnose-Code entfernt.

---

## Entscheidungen

Alle geklärten Fragen stehen als Entscheidungen E1–E15 in `docs/architecture.md` §11.
