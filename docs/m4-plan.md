# M4-Plan – Eingabe auf mehreren Geräten

> Detailplan zu `project.md` M4 und Entscheidung E13 (`architecture.md` §11). Braucht die Sessions aus M3. Reihenfolge: Schema und Rechte mit Tests zuerst, dann Spielübersicht, dann Live-Stand, zuletzt Setup-Pille und Smoke-Test. Jeder grüne Schritt ist ein Commit.
> Stand: umgesetzt am 23.10.2026 (Schritte 3–7 bis auf Deploy und DoD). Offene Fragen in §9 mit Defaults umgesetzt.
> Luca: Deine Aufgaben stehen in §0, die offenen Fragen in §9.

---

## 0. Was Luca tut

1. DoD von M3 mit zwei Handys abnehmen (Einladung, Reset, Login löschen), bevor M4 beginnt.
2. Für die DoD von M4 zwei Handys mit Login bereithalten, eines davon kann das Tablet sein.
3. Die offenen Fragen in §9 beantworten; ohne Antwort gelten die Defaults.

---

## 1. Was sich ändert (E13 in einem Absatz)

Heute zählt genau das Gerät, das ein Match gestartet hat; andere Geräte könnten das Match zwar laden, kennen es aber nicht und dürften technisch ebenfalls eingeben. Ab M4 wählt man beim Start **Eingabe: ein Handy** (Default, wie heute) oder **Eingabe: jeder selbst**. Im zweiten Modus öffnet jeder Mitspieler das Match über die neue **Spielübersicht** auf seinem Handy. Das Keypad ist nur aktiv, wenn der Spieler am Zug der eingeloggte Spieler dieses Geräts ist. Gäste und Spieler ohne Login werfen auf dem Handy, das gestartet hat (**Host**). Die anderen Geräte zeigen den Stand live und „… ist dran“. Der Server prüft die Berechtigung bei jeder Aufnahme und jedem Undo; die Oberfläche sperrt nur zusätzlich.

## 2. Grundentscheidungen

- **`input_mode` am Match**, nicht am Gerät oder Spieler. Wer das Match startet, ist der Host (`host_player_id` = Spieler der Session). Im Modus `single` darf nur der Host eingeben; damit ist das heutige Verhalten erstmals auch serverseitig abgesichert. Ein Host-Wechsel (Handy leer) ist nicht vorgesehen, der Host meldet sich auf einem anderen Gerät an und hat dort dieselbe Session-Identität.
- **Berechtigung bei `per-player`**: Spieler am Zug hat Login → nur er darf werfen. Spieler am Zug ohne Login → nur der Host. Undo: wer die letzte gespeicherte Aufnahme hätte eingeben dürfen (also Spieler der letzten Aufnahme oder Host), nicht „wer gerade dran ist“; damit stimmt es auch direkt nach dem Spielerwechsel.
- **Die Aufnahme bleibt die Einheit über das Netz (E11).** Fremde Geräte sehen jede abgeschlossene Aufnahme, nicht jeden Dart. Die offene Aufnahme liegt weiter im localStorage des eingebenden Geräts.
- **Live-Stand per Server-Sent Events** über eine Route `GET /api/match/[id]/events`. Der Server hält pro Match eine Versionsnummer (= Zahl der gespeicherten Aufnahmen plus Status) im Prozess-Speicher, Clients bekommen bei jeder Änderung ein Ereignis und laden dann den Stand über die bestehende `loadMatchAction`. Fällt die Verbindung weg, verbindet der Browser SSE von selbst neu; zusätzlich lädt der Client beim Sichtbarwerden des Tabs (`visibilitychange`) einmal nach. Kein WebSocket, kein Polling-Timer, läuft durch Caddy und Funnel ohne Konfiguration (`flush_interval -1` in Caddy für die Route).
- **Spielübersicht** auf der Startseite unter der Spielwahl: nur Matches mit Status `running` **und** `started_at` nicht älter als 24 h, mit Teilnehmern, Modus-Kennzeichen und „seit …“; Tippen öffnet den Zählscreen. Ältere laufende Matches fallen aus der Liste, bleiben aber in der Datenbank (ihre Aufnahmen zählen für die Statistik, Gast-Matches räumt der Tagesjob ohnehin ab). Später (M5) kommen beendete Matches dazu. Es gibt keinen Einladungslink für ein Match (E13).
- **Geschlossene Matches**: Ein Match, das abgebrochen ist (`abandoned`) oder älter als 24 h und noch `running`, lässt sich über die URL öffnen und ansehen, aber nicht mehr eingeben; `commitVisit`/`undoVisit` antworten `match-closed`, der Zählscreen sperrt Keypad und Undo und zeigt „Spiel beendet“ in der Hinweiszeile.
- **Abbrechen**: Host oder Admin sehen im Zählscreen oben links statt des Zurück-Buttons einen Abbrechen-Button (`xmark.circle`). Tippen öffnet eine Rückfrage in der App (kein Browser-`confirm`): „Spiel abbrechen? Die Aufnahmen bleiben gespeichert.“ mit „Abbrechen“ und „Zurück“. Bestätigen setzt `status = 'abandoned'`, veröffentlicht ein Ereignis an die anderen Geräte und leitet auf die Spielwahl `/`. Alle anderen Geräte behalten den Zurück-Button; für sie ist der Screen danach geschlossen (siehe oben).
- **Zuschauen ist erlaubt**: Jeder Eingeloggte darf jedes laufende Match öffnen und sehen, eingeben nur nach den Regeln oben. Damit ist die Live-Ansicht aus dem Backlog nebenbei da.
- **Restart** („Nochmal, gleiche Spieler“) übernimmt `input_mode` und Host vom alten Match.

## 3. Schema, Domäne, Rechte (Test-first)

**Dateien**

- `src/db/schema.ts`: `match.input_mode text ('single'|'per-player') default 'single'`, `match.host_player_id text NULL → player`. Migration 0004. Bestehende Matches: `single`, Host NULL (= nur Admin darf, siehe `canEnter`).
- `src/domain/x01/permissions.ts` (rein, neben `selectors.ts`): `isOpen(match: { status, startedAt }, now)` (running und jünger als `MATCH_OPEN_MS = 24 h`), `canEnter(state, match: { status, startedAt, inputMode, hostPlayerId, players: { id, hasLogin }[] }, actorId, now) → boolean` für die nächste Aufnahme, `canUndo(...)` für die letzte gespeicherte, `canCancel(match, actor: { id, isAdmin })` (Host oder Admin, nur wenn offen). Keine DB, nur Werte.
- `src/db/repository.ts`: `NewMatch` und `LoadedMatch` tragen `inputMode` und `hostPlayerId`; `listRunningMatches(now)` → `{ id, inputMode, players: Player[], startedAt }[]` nach `startedAt` absteigend; beide Implementierungen.
- `src/server/match-service.ts`: `createMatch` nimmt `inputMode` und `hostPlayerId` (aus der Session); `commitVisit` und `undoVisit` bekommen die `Session` und antworten `match-closed` (abgebrochen oder älter als 24 h) bzw. `forbidden`, wenn `canEnter`/`canUndo` nein sagt; `cancelMatch(deps, session, matchId)` (nur `canCancel`, setzt `abandoned`); `MatchView` bekommt `inputMode`, `hostPlayerId`, `isOpen`, `canEnter`, `canUndo`, `canCancel` für das Gerät (der Client sperrt damit, prüft aber nichts selbst); `listOpenMatches(now)` für die Übersicht (running, jünger als 24 h).

**Tests (`permissions.test.ts`, `match-service.test.ts`)**

| Fall                                                   | Erwartung                                                                        |
| ------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `single`, Host am Gerät                                | darf eingeben und undo, egal wer dran ist                                        |
| `single`, anderer Spieler mit Login                    | `forbidden`, auch wenn er selbst dran ist                                        |
| `per-player`, Spieler am Zug mit Login, eigenes Gerät  | darf eingeben                                                                    |
| `per-player`, Spieler am Zug mit Login, Host-Gerät     | `forbidden`                                                                      |
| `per-player`, Gast am Zug                              | nur Host darf                                                                    |
| `per-player`, Undo direkt nach Spielerwechsel          | nur der Spieler der letzten Aufnahme (oder Host, wenn der ein Gast war)          |
| Match ohne Host (Bestand)                              | nur Admin                                                                        |
| Zuschauer lädt das Match                               | `loadMatchView` klappt, `canEnter` false                                         |
| Match `abandoned` oder `running` seit 24 h + 1 ms      | `commitVisit`/`undoVisit` → `match-closed`, auch für den Host; `canCancel` false |
| `cancelMatch` als Host, als Admin, als dritter Spieler | ok, ok, `forbidden`; danach Status `abandoned`, Aufnahmen unverändert            |
| `listOpenMatches`                                      | enthält kein abgebrochenes, kein beendetes und kein 24 h altes Match             |

- **Commit:** „M4: input_mode, Host und Eingaberechte“

## 4. Spielübersicht

**Dateien**

- `src/components/screens/game-menu.tsx`: unter den vier Modi ein Block „Laufende Spiele“ als `CardList`: Zeile je Match mit Spielernamen (Kurzform wie im Kleinpanel), Modus-Kennzeichen („jeder selbst“ als Zusatz), Startzeit relativ („vor 12 min“ aus `startedAt`, ohne Bibliothek); Zeile ist ein Link auf `/match/[id]`. Leer: kein Block.
- `src/app/(site)/page.tsx`: lädt `listOpenMatches` mit `requireSession`.
- `src/i18n/de.ts`: `overview.*`, `game.cancel*`, `game.closed`.
- Test: `game-menu.test.tsx` rendert zwei Matches, eines leer.
- **Abbrechen im Zählscreen**: `ScreenHeader` links `CancelButton` statt `BackButton`, wenn `view.canCancel`; `src/components/ui/confirm-sheet.tsx` (neu, wiederverwendbar): kleine Rückfrage als Overlay mit Text und zwei Buttons, kein Browser-`confirm`; `cancelMatchAction` → `redirect("/")`. Geschlossene Matches: Keypad und Undo `disabled`, Hinweiszeile „Spiel beendet“.
- Test: `confirm-sheet.test.tsx` (bestätigen ruft den Callback, „Zurück“ nicht).
- **Commit:** „M4: Spielübersicht und Abbrechen“

## 5. Live-Stand

**Dateien**

- `src/server/match-events.ts`: `MatchHub` im Prozess-Speicher (`globalThis`, wie der Limiter): `subscribe(matchId, send)`, `publish(matchId)`; `commitVisit`, `undoVisit`, `cancelMatch` und `restartMatch` rufen `publish` nach dem Speichern (über eine `deps.events`-Abhängigkeit, im Test ein Spion).
- `src/app/api/match/[id]/events/route.ts`: `requireSession`, dann SSE-Stream (`ReadableStream`, `text/event-stream`, Heartbeat alle 25 s gegen Proxy-Timeouts, Aufräumen bei `request.signal.abort`).
- `src/components/screens/scoreboard-screen.tsx`: `useMatchEvents(matchId, onChange)` (neuer Hook in `src/components/darts/`): `EventSource` öffnen, bei Ereignis und bei `visibilitychange` den Stand über `onLoad` holen und wie heute mit der offenen Aufnahme zusammenführen. Eigene Commits lösen ebenfalls ein Ereignis aus; der Client ignoriert es, wenn seine Warteschlange gerade etwas unterwegs hat (das gibt es schon: `open.current > 0`).
- Keypad und Undo: `disabled`, wenn `view.canEnter` bzw. `view.canUndo` false; statt des Checkout-Hinweises steht dann „{Name} ist dran“ in der Hinweiszeile (gleiche Höhe, nichts springt). Im Modus `single` ändert sich für den Host nichts.
- `Caddyfile`: für `/api/match/*/events` `flush_interval -1`, damit Caddy die Ereignisse nicht puffert.
- Tests: `match-events.test.ts` (publish erreicht alle Abonnenten des Matches, keine anderen; abbestellen), Hook-Test mit einem `EventSource`-Stub.
- **Commit:** „M4: Live-Stand per SSE“

## 6. Setup-Pille und Restart

- `new-match-form.tsx`: dritte Zeile mit `OptionMenu name="inputMode"`, Werte „ein Handy“ (Default) / „jeder selbst“; `createMatchAction` liest sie und setzt den Host aus der Session.
- `restartMatch` übernimmt `inputMode` und Host.
- Test in `new-match-form.test.tsx`: Default `single`, Umschalten setzt das Hidden-Input.
- **Commit:** „M4: Eingabemodus im Setup“

## 7. Smoke-Test und Deploy

- `scripts/smoke-match.mjs`: Abbrechen: Host startet ein Match, tippt Abbrechen, bestätigt → landet auf `/`, das Match fehlt in der Übersicht, die URL zeigt es gesperrt. Zweig „jeder selbst“: Admin lädt A ein (Kontext A existiert aus M3), Admin startet Match A gegen Admin im Modus „jeder selbst“; Kontext A öffnet die Startseite, findet das Match in der Übersicht, sieht das Keypad gesperrt, solange Admin dran ist; Admin wirft eine Aufnahme → Kontext A sieht ohne Reload den neuen Rest (SSE) und darf jetzt werfen; Undo von A auf Admins Gerät wird abgelehnt (`forbidden`-Text in der Statuszeile), von A selbst klappt. Dazu ein Gast im Match: wenn der Gast dran ist, darf nur Admin (Host).
- Deploy nur auf Zuruf; danach DoD aus `project.md` M4.
- **Commit:** „M4: Smoke-Test zwei Geräte“, nach der DoD „M4: done“

- **Rate-Limit-Probe beim Deploy** (Teil der DoD in `project.md`, kein Code): zehn Fehlversuche von Handy A, elfter mit richtigem Passwort wird abgewiesen; Handy B aus einem anderen Netz versucht sich danach anzumelden. Wird B mitgesperrt, zählt das Limit alle Geräte gemeinsam (Vermutung aus `docs/m12-plan.md` Teil B). Danach `docker compose restart app` auf dem Pi.

---

## 8. Nicht in M4

Host wechseln, Zuschauer-Modus als eigene Seite, Dart-für-Dart-Übertragung an fremde Geräte, Push-Benachrichtigung „du bist dran“, Historie beendeter und abgebrochener Matches (M5).

## 9. Offene Fragen (Defaults gelten ohne Antwort)

1. **Zuschauen für alle Eingeloggten** (§2): Default ja. Alternative: nur Teilnehmer dürfen das Match öffnen - Zuschauen soll für alle möglich sein
2. **Bestehende Matches ohne Host** nach der Migration: Default nur Admin darf eingeben; nach dem DB-Neustart in M3 gibt es ohnehin keine.
3. **„Du bist dran“-Hinweis** auf dem eigenen Gerät: Default nur die Hinweiszeile; Alternative kurzer Vibrationsimpuls (`navigator.vibrate`, nur Android) oder Ton. Hinweiston ist gut
4. **Heartbeat-Intervall** 25 s gegen Verbindungsabbrüche durch Funnel/Caddy; wenn am Board Abbrüche auffallen, auf 15 s verkürzen.
