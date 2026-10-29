# M2-Plan – Gastspieler

> Detailplan zu `project.md` M2 und Entscheidung E12 (`architecture.md` §11). Reihenfolge wie in M1: Domäne und Tests zuerst, dann Persistenz, dann Screen, zuletzt Deploy. Jeder grüne Schritt ist ein Commit.
> Luca: Deine Aufgaben stehen in §0, der Rest ist Claude Code.

---

## 0. Was Luca tut

1. Am Handy prüfen, ob der UI-Stand `f32f960` passt (DoD M1). Abweichungen melden, bevor M2 deployt wird, damit nicht zwei Baustellen gleichzeitig offen sind.
2. Die offenen Fragen in §8 beantworten, sobald sie beim Lesen auffallen. Defaults stehen dabei, ohne Antwort gelten die Defaults.

---

## 1. Domäne: Gast und Feldtreffer (Test-first)

**Dateien**

- `src/domain/player.ts`: `Player` bekommt `guestUntil: number | null`. Dazu `isGuest(player)`, `isListed(player, now)` (regulär oder `guestUntil > now`) und `GUEST_LIFETIME_MS = 24 h`.
- `src/domain/stats/field-hits.ts` (neu, erste Datei des späteren Statistik-Moduls): `fieldHits(visits: Visit[]): Map<field, hits>` und `hitsOfDart(dart)` (Single 1, Double 2, Triple 3, Feld 0 und `overthrown` 0). Eine Aufnahme mit `isBust` liefert nichts.
- `src/domain/stats/field-hits.test.ts`, `src/domain/player.test.ts`

**Tests zuerst**

| Fall | Erwartung |
|---|---|
| Aufnahme T20, S20, T5 | 20 → 4, 5 → 3 |
| Aufnahme D16, Bull (25), 0 | 16 → 2, 25 → 1, kein Eintrag für 0 |
| Aufnahme S20, S20, Bust | leer (gebustete Aufnahme zählt gar nicht) |
| Offene Aufnahme mit einem Dart T19 | 19 → 3 (zählt, sobald geworfen) |
| Drei Aufnahmen eines Spielers | Summen je Feld |
| `isListed` regulärer Spieler | immer true |
| `isListed` Gast, `guestUntil` in 1 h | true; in 1 h + 1 ms nicht mehr |

- **Commit:** „M2: Gast und Feldtreffer in der Domäne“

## 2. Schema und Repository

**Dateien**

- `src/db/schema.ts`: `player.guest_until integer NULL`; neue Tabelle `player_field_hits (player_id FK → player ON DELETE CASCADE, field integer, hits integer, PK(player_id, field))`.
- `npm run db:generate` → zweite Migration in `drizzle/`. Bestehende Spieler bekommen `NULL`, sind also regulär.
- `src/db/repository.ts`: Schnittstelle erweitern:
  - `listPlayers(now)` liefert reguläre Spieler plus Gäste mit `guestUntil > now`, Gäste ans Ende, jeweils nach `createdAt`.
  - `createPlayer` nimmt `guestUntil` mit.
  - `deletePlayer(id)` wirft einen fachlichen Fehler statt eines FK-Fehlers, wenn der Spieler in einem Match steht (heute läuft das in die FK-Verletzung).
  - `listExpiredGuestMatches(now)`: Matches, bei denen mindestens ein Teilnehmer Gast ist und `max(guestUntil)` aller Gast-Teilnehmer `≤ now`; liefert je Match die Aufnahmen aller Legs und die regulären Teilnehmer.
  - `addFieldHits(playerId, hits: Map)`: `INSERT … ON CONFLICT DO UPDATE SET hits = hits + excluded.hits`.
  - `deleteMatch(matchId)`: Match, dessen Legs und Aufnahmen (Cascade ist im Schema schon da).
  - `deleteOrphanGuests(now)`: Gäste mit `guestUntil ≤ now` ohne `match_player`-Zeile.
  - `fieldHitsOf(playerId)`: Inhalt von `player_field_hits` (für M8; hier nur, damit der Smoke-Test prüfen kann).
- `src/db/sqlite-repository.ts` und `src/db/memory-repository.ts` nachziehen; `src/db/repository.test.ts` läuft gegen beide (so wie heute).

**Tests**

- Gast mit `guestUntil` in der Vergangenheit erscheint nicht in `listPlayers`, regulärer Spieler immer.
- Match mit Gast A (läuft in 1 h ab) und Gast B (läuft in 3 h ab): `listExpiredGuestMatches(now + 2 h)` ist leer, `(now + 3 h)` liefert das Match.
- Match nur mit regulären Spielern erscheint nie in `listExpiredGuestMatches`.
- `addFieldHits` zweimal für dasselbe Feld addiert.
- `deletePlayer` eines Spielers im Match → Fehler `player-in-match`, Spieler bleibt.
- **Commit:** „M2: Schema guest_until und player_field_hits“

## 3. Services und Aufräumen

**Dateien**

- `src/server/player-service.ts`: `createGuest(deps, name)` setzt `guestUntil = now + GUEST_LIFETIME_MS`; `listPlayers(deps)` gibt `deps.now()` weiter; `deletePlayer` reicht den Fehler `player-in-match` als Ergebnis an die UI (kein Throw bis in den Screen).
- `src/server/guest-cleanup.ts` (neu): `cleanupGuests(deps)`: für jedes abgelaufene Gast-Match die Feldtreffer der regulären Teilnehmer mit `fieldHits` berechnen und per `addFieldHits` sichern, dann `deleteMatch`, zuletzt `deleteOrphanGuests`. Alles in einer Transaktion pro Match, damit ein Abbruch keine halben Zustände hinterlässt.
- `src/server/guest-cleanup.test.ts` gegen das In-Memory-Repository: Match mit Gast + regulärem Spieler, Aufnahmen T20 S20 T5 und eine gebustete; nach `cleanupGuests` ist das Match weg, `player_field_hits` des regulären Spielers zeigt 20 → 4, 5 → 3; der Gast ist weg; ein zweites, rein reguläres Match ist unverändert.
- `src/instrumentation.ts`: nach `getDb()` einmal `cleanupGuests(productionDeps())` und dann `setInterval` täglich (`unref()`, damit der Prozess sauber endet). Ein Prozess, ein Timer; kein Cron auf dem Pi nötig.
- `src/server/player-actions.ts`: `createGuestAction(formData)` → legt an, `revalidatePath("/new/x01")`, gibt die neue `id` zurück, damit der Screen den Gast sofort auswählen kann.
- **Commit:** „M2: Gäste anlegen und aufräumen“

## 4. Screen „Neues Spiel“

**Dateien**

- `src/i18n/de.ts`: `newGame.addGuest` („Gast hinzufügen“), `newGame.guestNamePlaceholder`, `newGame.guestBadge` („Gast“), `players.guests` („Gäste heute“), `players.inMatch` (Fehlertext für Löschen).
- `src/components/screens/new-match-form.tsx`: In der `CardList` als letzte Zeile „Gast hinzufügen“ nach dem Muster der „Spieler anlegen“-Zeile aus `player-list.tsx` (tippen → Eingabefeld → Enter). Die Zeile ist ein eigenes kleines Formular neben dem Match-Formular (verschachtelte Formulare gehen nicht), ruft `onAddGuest` und hängt die zurückgegebene `id` an `order` an. Gast-Zeilen zeigen rechts vor dem Kreis den Zusatz „Gast“ in `text-fg-muted`.
- Reihenfolge in der Liste: reguläre Spieler, dann Gäste (kommt so aus dem Repository, der Screen sortiert nicht).
- `src/components/screens/player-list.tsx`: Gäste in einem zweiten `CardList`-Block „Gäste heute“ mit nur „Entfernen“ (kein Schraubenschlüssel, kein Umbenennen); „Entfernen“ zeigt bei `player-in-match` den Fehlertext in der Zeile. Dasselbe Verhalten für reguläre Spieler im Match (bisher stiller FK-Fehler).
- `src/components/screens/new-match-form.test.tsx`: Gast hinzufügen → steht als letzter in der Liste, ist ausgewählt, trägt „Gast“, `playerId`-Hidden-Inputs enthalten ihn.
- `src/app/new/x01/page.tsx`: `onAddGuest={createGuestAction}` durchreichen.
- Künftige Setup-Screens (Cricket, Elimination, SplitScore in M7) nutzen dieselbe Spielerliste als Komponente; dazu die Spielerauswahl aus `new-match-form.tsx` in `src/components/darts/player-picker.tsx` herausziehen (Liste + Gast-Zeile + Reihenfolge-Logik), damit M7 nur die Pillen oben austauscht.
- **Commit:** „M2: Gast hinzufügen im Setup“

## 5. Smoke-Test

- `scripts/smoke-match.mjs` um einen Zweig erweitern (oder `scripts/smoke-guest.mjs`): Gast „G<stamp>“ im Setup anlegen → ausgewählt → Match mit regulärem Spieler starten → eine Aufnahme T20 S20 T5 → Seite neu laden → `/new/x01` zeigt den Gast noch → `/players` zeigt ihn unter „Gäste heute“ und nicht in der Hauptliste.
- Aufräumen (täglich) lässt sich im Browser nicht abwarten; dafür reicht der Service-Test aus §3. Zur Sicherheit ein Handgriff gegen den Produktions-Build: `sqlite3 /tmp/sa/darts.db "update player set guest_until = 0 where guest_until is not null"`, Server neu starten, danach `select * from player_field_hits` prüfen (20 → 4, 5 → 3) und das Gast-Match ist weg.
- **Commit:** „M2: Smoke-Test Gäste“

## 6. Doku, Deploy, DoD

1. `README.md`: Hinweis, dass Gast-Matches nach 24 h samt Aufnahmen gelöscht werden (Backup in M12 muss das nicht retten).
2. `docs/project.md` abhaken, `docs/prompt.md` Stand aktualisieren, `CLAUDE.md` um `src/domain/stats/` und `guest-cleanup.ts` ergänzen.
3. `npm test`, `npm run lint`, `npm run typecheck`, Produktions-Build und Smoke-Test, dann `./scripts/deploy.sh`. Die Migration läuft beim Containerstart.
4. DoD aus `project.md` M2 am Handy.
- **Commit:** „M2: done“

---

## 7. Nicht in M2

„Dauerhaft übernehmen“ (M3, nur Admin). Rangliste und Profil (M8; dort gilt: Gast-Matches zählen nicht, Feldtreffer = Aufnahmen vorhandener Matches plus `player_field_hits`). Gäste in anderen Modi (M7, nutzt den `PlayerPicker` aus §4).

## 8. Offene Fragen (Defaults gelten ohne Antwort)

1. **Gleicher Name wie ein regulärer Spieler?** Entschieden: Namen sind eindeutig über alle Spieler, Gäste eingeschlossen (ohne Groß/Klein); die UI meldet „Diesen Namen gibt es schon“. Der Zusatz „Gast“ erscheint nur im Setup.
2. **Gast umbenennen?** Entschieden: ja, im Tab „Spieler“ unter „Gäste heute“ wie bei regulären Spielern.
3. **Laufendes Gast-Match beim Aufräumen?** Default: wird wie jedes andere gelöscht, 24 h nach Anlegen des Gastes ist der Abend vorbei. Alternative: nur Matches mit Status `finished` oder `abandoned` löschen, laufende behalten, bis sie beendet sind.
4. **Feldtreffer aus noch laufenden Legs** beim Aufräumen mitzählen? Default: ja, alles Geworfene zählt (wie beim Statistik-Grundsatz „aus den Aufnahmen abgeleitet“).
