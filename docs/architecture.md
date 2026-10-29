# Architektur – Darts Scorer Web

> Portierung der bestehenden iOS-App (Swift, siehe `legacy-analysis.md`) zu einer Web-App mit Persistenz auf eigenem Raspberry Pi.
> Zielgruppe: ein Spieler (Owner) und seine Mitspieler. Privat, wenige Dutzend Nutzer.

---

## 1. Ziele und Nicht-Ziele

**Ziele**
- Live-Zählen am Board, mobile-first (Handy oder Tablet neben dem Board)
- Vorhandener Legacy-Code wird bezüglich Logik, Spielmodi und UI komplett übernommen. Reihenfolge: X01 zuerst (v1), danach Cricket, Elimination und SplitScore als eigener Meilenstein (E4)
- **Freie Spiele:** 2 bis n Spieler; es wird heruntergespielt, bis alle Platzierungen feststehen (wer auscheckt, bekommt den nächsten Platz, die übrigen spielen weiter)
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
| UI | **Tailwind CSS, eigene Bausteine** (kein shadcn) | Alle Screens sind nach den Fotos der Swift-App gebaut (`Legacy/Screenshots/`); die Bausteine in `src/components/ui` (`TabBar`, `ScreenHeader`, `OptionMenu`, `CardList`, `ConfirmSheet`, `icons.tsx`) und `src/components/darts` (Keypad, Panels) sind die einzige Komponentenbasis |
| Charts | **Recharts** | Reicht für Verläufe und Balken; ECharts nur bei Bedarf |
| Datenbank | **SQLite (WAL) mit better-sqlite3** | Eine Datei, kein DB-Server; für diese Last mehr als ausreichend. Migrationen mit Drizzle beim App-Start |
| ORM/Migrationen | **Drizzle ORM + drizzle-kit** | Typsicher, SQL-nah, Migrationen als Dateien im Repo |
| Validierung | **Zod** | Eingaben aus Server Actions prüfen |
| Auth (seit M3) | **eigene Sessions** (Name/Passwort, bcrypt, Cookie 1 Jahr), Einladung per QR-Code durch den Admin (E10) | Kein E-Mail-Versand nötig, kein Fremddienst, keine Auth-Bibliothek; die Logik ist 300 Zeilen mit Tests |
| CI | **ein Skript `scripts/ci.sh`**, aufgerufen von GitHub Actions (`.github/workflows/ci.yml`, E15) | Die Pipeline-Datei ist nur ein Aufruf; der Inhalt lebt im Repo und wandert mit |
| Tests | **Vitest** (Domänenlogik), **Playwright** (1–2 Smoke-Tests) | Die Darts-Regeln sind reine Funktionen und gut testbar |
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
- **Vor jedem Deploy:** `npm test`, `npm run lint`, `npm run typecheck`, `./scripts/smoke.sh` (Browser-Durchlauf gegen den Produktions-Build). Dieselben Schritte laufen in der CI (`scripts/ci.sh`); der Smoke-Test dort gegen den Standalone-Build auf dem Runner.

**Bewusste Grenzen (ein Prozess, ein Pi)**

- Rate-Limit, Event-Hub für den Live-Stand und Session-Prüfung laufen im Speicher **eines** Node-Prozesses. Ein zweiter Container oder Prozess würde beides aushebeln; das ist hier kein Ziel.
- Zeit kommt von der Uhr des Pi (`deps.now()`); Gäste, Sessions und Einladungen laufen danach ab. Die Uhr wird per NTP gestellt.
- Gast-Matches werden nach 24 h gelöscht (E12), Sessions nach einem Jahr ungültig (E10), laufende Matches gelten nach 24 h als beendet (E13). Nichts davon ist umkehrbar; es ist so gewollt.
- SQLite ist im WAL-Modus. Jede Service-Funktion, die mehr als einmal schreibt, legt ihre Schreibvorgänge in `deps.transaction(() => …)`. Das ist die native Transaktion von better-sqlite3 über die eine Verbindung, die Match- und Auth-Repository teilen; innere Transaktionen der Repositories werden automatisch zu Savepoints. Weil alle Repository-Aufrufe synchron sind, kann sich in Node nichts dazwischenschieben; die Transaktion schützt vor Ausnahmen und Abbrüchen mitten im Schreiben. Asynchrones (bcrypt) passiert vorher, die Transaktion selbst ist synchron (better-sqlite3 lehnt eine Promise als Rückgabe ab).

---

## 6. Datenmodell

Grundprinzip (aus dem Swift-Code übernommen): **Gespeichert werden Aufnahmen mit ihren drei Dart-Plätzen. Restpunkte, Bust-Folgen, Sieger, Platzierungen und alle Statistiken werden daraus abgeleitet.** Legs und Matches sind strukturelle Container; ihr Status ist eine *zwischengespeicherte Projektion*, die bei jedem Dart und jedem Undo neu berechnet wird. Eine Aufnahme entspricht genau `DartThrow`, ein Dart-Platz genau `SingleDartsScore`.

```
player          id, name (unique, ohne Groß/Klein), created_at,
                guest_until NULL,                                (E12: Gast bis zu diesem Zeitpunkt sichtbar, NULL = regulär)
                password_hash NULL, is_admin                     (M3: Hash gesetzt = Login möglich; keine eigene Nutzer-Tabelle, E10)

session         id (sha256 des Cookie-Tokens), player_id, created_at, expires_at                         (M3)
invite          id (sha256 des Tokens), kind ('register'|'password'), player_id NULL, reset_sessions,
                created_at, expires_at, used_at NULL                                                     (M3)

match           id, mode ('x01' | 'cricket' | 'elimination' | 'splitscore'),
                input_mode ('single' | 'per-player'), host_player_id          (E13, M4)
                start_score (501|401|301, X01), in_rule ('single'|'double'|'triple'),
                out_rule ('single'|'double'|'triple'), legs_to_win_set, sets_to_win_match,
                status ('running'|'finished'|'abandoned'),
                is_tournament, created_by NULL, started_at, finished_at NULL
match_player    match_id, player_id, seat (Reihenfolge), placement NULL   PK(match_id, player_id)

player_field_hits player_id, field (0–20|25), hits                      PK(player_id, field)
                (E12: Feldtreffer regulärer Spieler aus gelöschten Gast-Matches; Treffer = 1/2/3 je Single/Double/Triple)

leg             id, match_id, set_no, leg_no, starter_player_id,
                winner_player_id NULL, finished_at NULL
                (Sets sind kein eigener Datensatz: Set-Sieger = erster mit legs_to_win_set Legs in set_no)

visit           id (UUID, vom Client erzeugt → idempotente Retries),
                leg_id, player_id, seq (fortlaufend im Leg),
                d1_field, d1_type,            -- field 0–20 | 25 (Bull); type 'single'|'double'|'triple'|'overthrown'; beides NULL = Platz leer
                d2_field, d2_type,
                d3_field, d3_type,
                is_bust,                      -- DartThrow.faulty
                created_at
```

**Konsequenzen**
- Der **Score einer Aufnahme** wird nie gespeichert, sondern wie `getDartThrowScore` aus den Plätzen berechnet (`overthrown` zählt 0, Bust zählt 0).
- Eine **laufende Aufnahme** ist eine Zeile mit leeren Plätzen. Dadurch überlebt sie Reload und Container-Neustart.
- **Undo** entfernt den letzten belegten Platz der letzten Aufnahme des Legs (bei Bust alle `overthrown`-Plätze und das Flag auf einmal); ist die Aufnahme danach leer, wird sie gelöscht. Hat der Dart ein Leg, Set oder Match beendet, wird auch das zurückgenommen, weil `winner_player_id`, `placement` und `status` reine Projektionen sind.
- **Platzierungen** (freie Spiele, 2–n Spieler): Wer auscheckt, erhält die nächste freie `placement`; das Leg läuft für die übrigen weiter, bis nur noch einer übrig ist.
- **Neue Statistiken** funktionieren rückwirkend über alle alten Spiele, auch Feldtreffer.
- **Gäste** (E12) sind normale `player`-Zeilen mit `guest_until`; Matches, Legs und Aufnahmen referenzieren sie wie jeden anderen Spieler. Ein Match ist ein **Gast-Match**, sobald ein Teilnehmer `guest_until` gesetzt hat; es zählt in keiner Rangliste. Es wird gelöscht, sobald der letzte beteiligte Gast abgelaufen ist (max. `guest_until` der Teilnehmer), zusammen mit Legs und Aufnahmen; vorher werden die **Feldtreffer** der regulären Teilnehmer nach `player_field_hits` übernommen (Triple = 3, Double = 2, Single = 1 Treffer; gebustete Aufnahmen zählen nicht). Die Feldtreffer-Statistik eines regulären Spielers ist also `player_field_hits` plus die Treffer aus seinen noch vorhandenen Matches.
- Cricket, Elimination und SplitScore brauchen **keine** zusätzlichen Tabellen; ihr Zustand (Marks, Eliminationen, Zielfeld) ist aus den Aufnahmen replaybar.

**Geprüft gegen das Swift-Modell (M0, erledigt)**
- Speichert es pro Aufnahme, pro Dart oder nur Endstände? Pro Aufnahme mit drei Dart-Plätzen, nichts geht verloren.
- Sind Spieler und Nutzer getrennt? Nein, es gibt keine Nutzer. (Die Web-App bleibt dabei: ein Login ist ein Spieler mit Passwort-Hash, E10.)
- Ist der Restpunktestand gespeichert oder abgeleitet? Abgeleitet.
- Sets/Legs: im Setup wählbar, aber nicht implementiert. Anwurf: wechselt bei „Restart“ mit gleichen Spielern, vor dem ersten Dart per „ToStart“ wählbar. Bust: Aufnahme wird `faulty`, geworfene Darts bleiben gespeichert, Aufnahme zählt 0.

---

## 7. Domänenlogik

Reines TypeScript in `src/domain/`, ohne Datenbank- oder React-Abhängigkeit, Test-first mit Vitest.

- `src/domain/x01/`: Port von `ClassicGame` + `DartThrow` + `Game` (Regeln in `legacy-analysis.md` §2–3). Kern: `replay(match, legs, visits) → MatchState` und `applyDart(state, dart) → Ereignisse`. Undo ist kein eigener Algorithmus, sondern Löschen des letzten Platzes und erneutes Replay.
- `src/domain/checkouts.ts`: die drei Finish-Tabellen aus `Checkouts.swift`.
- `src/domain/stats/` (M8): Averages wie im Legacy definiert, dazu First-9, Checkout-Quote, 180/140+/100+, Highest Finish, Best Leg, Feldtreffer, Elo (nur 1 vs 1).
- Cricket, Elimination, SplitScore (M7): je ein Modul mit gleicher Schnittstelle.

Neu gegenüber Legacy: Leg-, Set- und Match-Ende, wechselnder Anwurf pro Leg, Platzierungen bei 2–n Spielern.

---

## 8. Eingabe, UX und Theme

Aufbau 1:1 wie im Legacy-Code (`legacy-analysis.md` §7): Spieler-Panels oben, Checkout-Hinweis und 5-Reihen-Keypad unten, Double/Triple als Modifier-Toggles, Undo auf dem Keypad. Mindest-Tipphöhe 48 px, keine Hover-Zustände, kein Scrollen auf dem Zählscreen.

**Theme** (`theme.md`): Die Legacy-Farben aus `Assets.xcassets` werden als CSS-Tokens mit Light- und Dark-Werten übernommen, Dark Mode folgt der Systemeinstellung und ist per Toggle überschreibbar. Das Theme entsteht **vor** dem ersten Screen. Kein Screen verwendet Farbwerte, Radien oder Größen direkt: alles kommt aus Tokens in `globals.css` (`theme.md` §3 Regel 8), `style={…}` verbietet ESLint, Tailwind-Ad-hoc-Werte (`rounded-[18px]`) sind nicht erlaubt; ein neuer Wert wird ein Token.

**Layout**: Legacy rechnet mit festen Bruchteilen der Bildschirmgröße und skaliert deshalb nicht. Die Web-App baut den Zählscreen als `100dvh`-Grid mit `clamp()`-Schriften, Querformat-Variante und Container Queries (Regeln in `theme.md` §3).

---

## 9. Code-Konventionen

Ziel: SOLID, testbar, wiederverwendbar. Konkret:

- **Schichten mit klarer Richtung:** `src/domain` (reine Funktionen, kennt weder DB noch React) ← `src/db` (Drizzle-Schema, Queries) ← `src/server` (Server Actions: laden, Domäne aufrufen, speichern, Zod-Validierung) ← `src/components` und `src/app` (UI). Imports gehen nur nach links, nie nach rechts. ESLint-Regel `no-restricted-imports` erzwingt das.
- **Single Responsibility:** eine Datei, eine Aufgabe. Regeln (`rules.ts`), Zustandsübergang (`apply.ts`), Undo, Replay und Statistik sind getrennte Module mit eigenen Tests.
- **Open/Closed über die Spielmodus-Schnittstelle (ab M7, heute nur X01):** jeder Modus implementiert dasselbe `GameMode<State>`-Interface (`initialState`, `applyDart`, `undoDart`, `isFinished`, `panelData`). Zählscreen, Server Actions und Replay kennen dann nur das Interface; Cricket, Elimination und SplitScore kommen als neue Module hinzu, ohne bestehende zu ändern. Bis M7 ruft der Server die X01-Funktionen direkt.
- **Liskov/Interface Segregation:** Komponenten bekommen schmale Props-Typen (z. B. `PlayerPanelData`), nie das ganze `LegState` oder DB-Zeilen. Views sind damit mit Fixtures renderbar.
- **Dependency Inversion:** Server Actions bekommen das Repository (`MatchRepository`-Interface) injiziert; in Tests ersetzt ein In-Memory-Repository SQLite. Zeit und IDs kommen über `clock()`/`newId()`, nicht aus `Date.now()`/`crypto` direkt.
- **Komponenten:** dumme, wiederverwendbare Bausteine in `src/components/ui` (`TabBar`, `ScreenHeader`, `BackButton`, `OptionMenu`, `CardList`/`CardRow`/`GroupedSection`, `AddRow`, `ConfirmSheet`, `QrCode`, `icons.tsx`, Formular-Bausteine in `form-controls.tsx`: `TextInput`, `TextButton`, `PrimaryButton`, `Field`, `FormError`, `FormNote`, `SectionHeading`; Hook `useConfirmTap`) und `src/components/darts` (`Keypad`, `PlayerPanel`, `PlayerPanels`, `DartSlots`, `CheckoutHint`, `ScoreGrid`, `PlayerPicker`; Hooks `useVisitSync` für Zählen und Server-Abgleich, `useMatchEvents` für den Live-Stand), zusammengesetzt in `src/components/screens` (der Konto-Tab in Abschnitten unter `screens/account/`). Keine Datenzugriffe in Komponenten, Zustand kommt per Props, Ereignisse gehen per Callback hoch. Wiederkehrende Formen (Zeile „tippen → Eingabefeld → Speichern“) gehören als Baustein nach `ui`, nicht kopiert in Screens. Ein Screen über etwa 200 Zeilen wird geteilt (Hooks für Logik, Unterkomponenten für Abschnitte). Bekommt ein `ui`-Baustein Zustand, Seiteneffekte oder Fachlogik, ist er keiner mehr: die Logik wandert in einen Hook oder der Baustein nach `darts`/`screens`. Jeder neue `ui`-Baustein bekommt einen Eintrag auf `/dev/theme` (ersetzt Storybook).
- **Repositories nach Verantwortung:** `PlayerRepository` (Spieler, Login-Daten, Admin, Gäste, gesicherte Feldtreffer), `MatchRepository` (Matches, Legs, Aufnahmen, Gast-Matches aufräumen), `AuthRepository` (Sessions, Einladungen); in `Deps` als `players`, `matches`, `auth`. Alle drei teilen in Produktion eine SQLite-Verbindung (daher eine Transaktion über alle), in Tests einen `MemoryStore`. Statistik (M8) und Turniere (M9) bekommen eigene. Eine Schnittstelle, die über etwa 15 Methoden wächst, wird geteilt.
- **Fehler und Logs:** Server Actions antworten mit `Result`-Werten, Ausnahmen sind Bugs. Unerwartete Fehler landen über `error.tsx`/`not-found.tsx` je Route-Gruppe nie als weiße Seite beim Nutzer, sondern mit Zurück-Button; der Server loggt sie als eine JSON-Zeile (`src/server/log.ts`: `log.info|warn|error(event, fields)`). Geloggt werden Start und Aufräumen, Login und Fehlversuch mit IP, Sperre durch das Rate-Limit, eingelöste Einladung und Spielabbruch; nie Passwörter, Hashes oder Tokens.
- **Tests:** Domäne mit Vitest (Tabellen-Tests, Property-Test für Replay), Server Actions gegen das In-Memory-Repository, Komponenten mit Testing Library nur dort, wo es Logik in der UI gibt (Keypad-Modifier, Panel-Varianten), Playwright für den Durchstich (M6).
- **Fehler:** Domäne wirft nie, sondern liefert `Result`-Werte (`{ ok, state } | { ok: false, reason }`); Server Actions übersetzen in Nutzertexte.
- **Texte** zentral in `src/i18n/de.ts`, auch wenn v1 nur Deutsch ist.

---

## 10. Sicherheit

- HTTPS überall (Tailscale Funnel, TLS-Endpunkt auf dem Pi). Der Hostname ist öffentlich auffindbar, deshalb steht der Login vor allem außer `/login`, `/einladung/<token>` und `/api/health`.
- Caddy und App sind nur auf `localhost` des Pi gebunden, nicht im Heimnetz erreichbar.
- **Login (E10):** ein Spieler mit `password_hash` (bcrypt, Kostenfaktor 12; der erste Admin aus `.env`) kann sich einloggen. Session-Token 32 Zufallsbytes im Cookie `darts_session` (`httpOnly`, `sameSite=lax`, `secure`, 1 Jahr fest), in der DB nur der SHA-256. Einladungs- und Reset-Token ebenso, 24 h, einmalig.
- **Autorisierung serverseitig** in jeder Seite und Action (`requireSession`, `requireAdmin`); `src/proxy.ts` leitet nur ohne Cookie um und ersetzt keine Prüfung. Eingaberechte am Match (E13) prüft `src/domain/x01/permissions.ts`, aufgerufen im Service, nie nur in der UI.
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
| E7 | Sets/Legs bei 2–n Spielern? | **Default:** Sets und Legs nur bei 2 Spielern (und Turnieren); freie Spiele mit 3+ Spielern sind ein Leg mit Platzierungen |
| E8 | Elo bei Mehrspieler-Matches? | **Default:** Elo nur aus 1-vs-1-Matches; Mehrspieler-Matches zählen für alle übrigen Statistiken |
| E9 | Dark Mode | **Entschieden:** Light und Dark von Anfang an, Tokens aus den Legacy-Assets (`theme.md`), Systemeinstellung plus Toggle |
| E10 | Wie kommen Mitspieler zu einem Login? | **Entschieden (M3-Plan, 22.10.2026):** Keine eigene Nutzer-Tabelle: ein Spieler mit `password_hash` kann sich einloggen, `is_admin` ist eine Spalte am Spieler. Der erste Admin wird beim Start aus `.env` angelegt, wenn noch keiner existiert. Er lädt per QR-Code ein (Einmal-Token, 24 h, ohne Namen); der Eingeladene wählt Name und Passwort. Vergebene Namen werden abgelehnt; für Gäste und Spieler ohne Login erzeugt der Admin einen Login mit festem Spieler (Passwort-Token). Eingeloggte benennen sich selbst und Gäste um und ändern ihr Passwort; Admins benennen alle um, löschen Spieler außer sich und andere Admins, erzeugen Resets; „Login löschen“ gibt es seit 29.10.2026 nicht mehr. Session-Cookie 1 Jahr ab Login, ohne Verlängerung. Basic Auth in Caddy entfällt mit M3; die Datenbank wird beim M3-Deploy geleert |
| E11 | Was geht beim Zählen über das Netz? | **Entschieden:** Darts werden am Gerät lokal durch die Domäne gezählt (sofortige Anzeige); erst die abgeschlossene Aufnahme (3 Darts, Bust oder Checkout) geht als `commitVisit(seq, geworfene Darts)` an den Server, der sie selbst nachrechnet; Undo einer gespeicherten Aufnahme ist `undoVisit`. Die offene Aufnahme liegt im localStorage des Geräts, Aufrufe laufen in einer Warteschlange mit Retry. Ein Bust zählt 0, egal wie weit überworfen; Undo stellt den letzten regulären Stand wieder her |
| E12 | Spieler, die nur einen Abend mitwerfen? | **Entschieden:** Gäste werden im Setup „Neues Spiel“ angelegt (`player.guest_until` = jetzt + 24 h), liegen in der DB (überleben Reload und Gerätewechsel) und stehen 24 h in allen Setup-Screens (jeder Modus, jede Runde), im Tab „Spieler“ unter „Gäste heute“ (umbenennen, entfernen); der Zusatz „Gast“ erscheint nur im Setup. Namen sind über alle Spieler eindeutig, Gäste eingeschlossen. **Matches mit mindestens einem Gast zählen in keiner Rangliste und nicht für Elo**, auch nicht für die regulären Teilnehmer. Einzige Ausnahme: die **Feldtreffer** der regulären Spieler werden auch aus Gast-Matches erfasst (Triple = 3 Treffer, Double = 2, Single = 1; T20 S20 T5 → 4×20, 3×5; in einer gebusteten Aufnahme zählt kein Dart). Ein Gast-Match lebt nur so lange wie der am längsten sichtbare beteiligte Gast; beim Aufräumen werden die Feldtreffer der regulären Spieler in `player_field_hits` übernommen, dann werden Match, Legs, Aufnahmen und zuletzt der Gast gelöscht. „Dauerhaft übernehmen“ (nur Admin, ab M3) macht aus einem Gast einen regulären Spieler; seine bisherigen Matches bleiben Gast-Matches, solange ein anderer Gast beteiligt ist. Kein Login nötig, ab M3 darf jeder eingeloggte Nutzer Gäste anlegen |
| E13 | Ein Handy für alle oder jeder sein eigenes? | **Entschieden (22.10.2026):** Beim Start wird pro Match gewählt: `input_mode` `single` (Default, das startende Handy gibt alle Darts ein) oder `per-player` (jeder Spieler mit Login auf seinem Gerät; Keypad nur aktiv, wenn der eigene Spieler am Zug ist). Spieler ohne Login (Gäste) werfen immer auf dem Start-Handy (`host_player_id`). Undo folgt denselben Rechten wie die Eingabe. Andere Geräte sehen den Stand nach jeder abgeschlossenen Aufnahme (Live-Aktualisierung vom Server); die offene Aufnahme bleibt wie bei E11 auf dem eingebenden Gerät. Das zweite Handy findet das Match über die Spielübersicht, es gibt keinen Einladungslink dafür. Braucht Sessions, daher M4 nach M3 |
| E14 | Backup der Datenbank? | **Entschieden (23.10.2026): nein.** Es ist ein Spiel; geht `darts.db` verloren, legt der nächste Start sie mit dem Admin aus `.env` neu an, die Mitspieler werden neu eingeladen. Kein Backup-Job, kein Restore, keine Backup-Doku; M12 enthält nur Neustart-Robustheit, Updates und PWA |
| E15 | Wo liegt das Repo, wie läuft CI? | **Entschieden (23.10.2026, umgezogen bis 29.10.2026):** das Repo liegt auf GitHub (`lucablechschmidt/dartClientServer`), vorher GitLab.com. Alles Plattformspezifische bleibt minimal: die CI-Schritte stehen in `scripts/ci.sh` (Install, Lint, Typecheck, Tests, Build, Smoke-Test), `.github/workflows/ci.yml` ruft nur dieses Skript. Keine Plattform-Features (Environments, Pages, Registry) im Workflow; Issues und Pläne bleiben in `docs/`, nicht im Tracker, damit sie mitziehen. Deploy bleibt manuell vom Mac (`scripts/deploy.sh`), nie aus der CI, weil der Pi nicht aus dem Internet erreichbar ist |
