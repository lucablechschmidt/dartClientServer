# M10-Plan – Achievements

> **Archiviert am 11.11.2026:** im Code umgesetzt; die offene Abnahme am Board steht in `docs/test-pi.md`.
> Detailplan zu `project.md` M10 (aus dem Backlog, Idee von Luca). Achievements sind Auszeichnungen, die ein Spieler einmal verdient und behält; sie werden aus den Aufnahmen erkannt, wie alles andere (Architektur §6). Test-first, jeder grüne Schritt ein Commit (`feat(achievements): …`).
> Stand: umgesetzt am 6.11.2026 (Schritte 1–7, §6), DoD am Board offen (§7). Plan überarbeitet am 5.11.2026 nach dem Abgleich mit dem Code und Lucas Antworten (§9), erste Fassung vom 23.10.2026. Abweichung bei der Umsetzung: der Banner lädt über eine eigene Server-Action (`newAchievementsAction`), sobald das Spiel auf dem Server gespeichert ist, statt mit der Match-Ansicht mitzukommen; die Galerie ist seit 6.11.2026 eine eigene Seite `/account/achievements` (Zeile „Erfolge“ im Konto).

---

## 0. Was Luca tut

Am Board: ein 180er zeigt den Banner auf dem Sieg-Screen und steht danach in der Galerie im Konto; Undo vom Sieg-Screen nimmt ihn wieder weg; alte Spiele mit 180ern zählen sofort.

---

## 1. Die Achievements

| Schlüssel             | Name                    | Bedingung (verbindlich, Tests folgen daraus)                                                                                                   | Modus                                  |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `180`                 | 180                     | eine nicht gebustete Aufnahme aus drei T20                                                                                                      | alle                                   |
| `gone-fishing`        | Gone Fishing            | eine Aufnahme mit 170 Punkten, die das Leg für den Spieler beendet (X01: Checkout; Elimination: genau aufs Ziel)                                 | X01, Elimination                       |
| `all-finishes`        | Gotta catch 'Em All!    | mit jedem Doppel D1–D20 und Bull mindestens ein Leg gewonnen (letzter Dart des Checkouts), nur Legs mit Double Out; Fortschritt „x von 21“      | X01                                    |
| `split-one`           | Auf der Kante           | SplitScore-Spiel mit genau 1 Punkt beendet                                                                                                      | SplitScore                             |
| `never-halved`        | Ungeteilt               | SplitScore-Spiel ohne eine einzige eigene Halbierung beendet                                                                                    | SplitScore                             |
| `bearly-never-halved` | Ein gutes Pferd         | SplitScore-Spiel ohne Halbierung und mit genau 175 Punkten beendet                                                                              | SplitScore                             |
| `first-blood`         | First Blood             | in einem Elimination-Spiel als Erster einen Mitspieler auf 0 geschickt                                                                           | Elimination                            |
| `nine-darter`         | 9-Darter                | ein Leg mit 501 Startpunkten und Double Out in 9 eigenen Darts gewonnen                                                                          | X01                                    |
| `shanghai`            | Shanghai                | Checkout-Aufnahme mit Single, Double und Triple desselben Felds                                                                                 | X01                                    |
| `almostDone`          | Done but not finished   | im Cricket alle eigenen Felder zugemacht, während die eigenen Punkte noch 0 waren, und das Spiel danach gewonnen                                 | Cricket                                |

Weitere kommen über dieselbe Tabelle dazu; jede Zeile ist eine Erkennerfunktion.

## 2. Grundentscheidungen (5.11.2026)

- **Berechnet, nicht gespeichert:** wie die Statistik (M8) aus `MatchRepository.listFinishedMatches` erkannt. Verdient hat ein Achievement, wer die Bedingung in einem **beendeten** Spiel erfüllt; das Datum ist das `finished_at` des ersten solchen Spiels. Damit stimmen Undo vom Sieg-Screen, vom Admin gelöschte Spiele und alte Spiele (rückwirkend) ohne Hook, Zurücknehmen oder Backfill.
- **Gast-Spiele zählen** für die regulären Spieler (persönliche Leistung, keine Rangliste). Weil sie nach 24 h gelöscht werden, sichert die Aufräumroutine (`guest-cleanup.ts`) vorher die erkannten Achievements und Doppel-Finishes der regulären Spieler in `player_achievement (player_id, key, earned_at)` mit PK `(player_id, key)` – wie die Feldtreffer in `player_field_hits`. Die Galerie vereint beides. Gäste selbst bekommen keine.
- **Gelöschte Spieler** haben keine Galerie (sie sehen nichts mehr); vom Admin gelöschte Spiele zählen nicht mehr.
- **Anzeige:** Banner „Neu: …“ auf dem Sieg-Screen für das, was ein Spieler in **diesem** Spiel erfüllt und in keinem früheren (für alle Teilnehmer, nach dem Spielende). Galerie in „Meine Statistik“ im Konto (nur die eigene): verdient mit Datum, offen grau mit Bedingung, Fortschritt „x von 21“ für `all-finishes`. Kein Zeitfilter (immer alles). **Keine Spalte in den Ranglisten** (die sind je Modus).
- Ein gemeinsames Medaillen-Icon (`MedalIcon` in `icons.tsx`) und ein Baustein `Badge` in `src/components/ui/`; eigene Icons je Achievement später.
- Kein Sound, keine Push-Nachricht. Der 180-Sound ist M11.

## 3. Domäne (Test-first)

`src/domain/achievements/`: `types.ts` (Schlüssel), `detect.ts` (`factsOf(match, player)`: welche Schlüssel ein beendetes Spiel einem Spieler bringt, dazu Doppel-Finishes als `double-1` … `double-25`), `gallery.ts` (aus Fakten mit Datum die Galerie: verdient/offen, Fortschritt, `all-finishes` ab 21 Doppeln). Tests mit einem Leg je Fall und je einem Negativfall (170 als Bust ist kein Gone Fishing; Shanghai über zwei Aufnahmen zählt nicht; 9 Darts mit Single Out ist kein 9-Darter).

## 4. Speicher für Gast-Spiele, Service

- Tabelle `player_achievement`, Migration; `PlayerRepository.addAchievements(playerId, facts, earnedAt)` (vorhandene bleiben, das frühere Datum gewinnt) und `achievementsStored(playerId)`.
- `guest-cleanup.ts`: vor dem Löschen eines Gast-Spiels `factsOf` für jeden regulären Teilnehmer sichern. Dafür liefert `listExpiredGuestMatches` den `MatchState`, Modus, Platzierungen und `finished_at` (nur beendete Spiele bringen Fakten).
- `src/server/achievement-service.ts`: `myAchievements(deps, session)` (Galerie), `newInMatch(deps, matchId)` (Banner je Teilnehmer). Tests mit `memoryDeps()`/`sqliteDeps()`.

## 5. Seiten

- Sieg-Screen: Banner-Liste „Neu: …“ (Name des Spielers und des Achievements).
- Konto → Meine Statistik: Galerie mit `Badge`, Fortschrittsbalken für `all-finishes`.
- Nachtrag 6.11.2026 (Luca): Ein offener Erfolg mit Fortschritt klappt beim Antippen auf und zeigt „Fehlen noch“ und „Geschafft“ als Kürzel (D1 … D20, Bull). Allgemein über `progress.steps` (`src/domain/achievements/gallery.ts`); jeder spätere Erfolg mit zählbaren Teilen füllt `steps` und klappt genauso auf.

## 6. Schritte

1. `docs(m10)`: dieser Plan.
2. `feat(achievements)`: Erkenner (Domäne).
3. `feat(achievements)`: Galerie aus Fakten (Domäne).
4. `feat(achievements)`: Tabelle und Sicherung beim Aufräumen der Gast-Spiele.
5. `feat(achievements)`: Service (Galerie, neu in einem Spiel).
6. `feat(achievements)`: Galerie im Konto, Banner auf dem Sieg-Screen.
7. e2e (180 → Banner → Galerie → Undo nimmt es weg), `./scripts/smoke.sh`, Screenshots, Doku.

## 7. DoD

Ein 180er im Spiel zeigt das Banner; in der Galerie erscheint er; Undo vom Sieg-Screen nimmt ihn zurück; alte Spiele mit 180ern zählen sofort.

---

## 8. Nicht in M10

Tages- oder Saison-Achievements, Mehrfach-Stufen (Bronze/Silber/Gold), Teilen, eigene Icons je Achievement, eine Spalte in den Ranglisten.

## 9. Entschiedene Fragen (5.11.2026)

1. **Liste und Namen:** wie §1 (Luca hat `almostDone` und `bearly-never-halved` ergänzt).
2. **Gäste:** bekommen keine; Gast-Spiele zählen aber für die regulären Spieler und werden beim Aufräumen gesichert.
3. **`all-finishes`:** nur Double-Out-Finishes, 21 Doppel (D1–D20, Bull).
4. **Rückwirkend:** ja, von selbst, weil berechnet wird.
5. **Speichern:** nein, berechnen (bis auf die Sicherung aus Gast-Spielen).
6. **9-Darter:** nur 501 Double Out.
7. **Rangliste:** keine Spalte.
