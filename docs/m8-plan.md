# M8-Plan – Statistiken und Reporting

> Detailplan zu `project.md` M8. Alles leitet sich aus den gespeicherten Aufnahmen ab (Architektur §6), plus `player_field_hits` aus aufgeräumten Gast-Matches (E12). Gast-Matches zählen in keiner Rangliste und nicht für Elo. Test-first in `src/domain/stats/`, jeder grüne Schritt ein Commit.
> Stand: erste Fassung, 23.10.2026. Noch nicht umgesetzt.
> Luca: §0 und §9.

---

## 0. Was Luca tut

1. Ein reales Match aus M6 aussuchen und die Kennzahlen eines Spielers von Hand nachrechnen (Average, First-9, Checkout-Quote, 180er). Das ist die DoD.
2. Die Fragen in §9 beantworten, vor allem zur Checkout-Quote und zum Elo-Startwert.

---

## 1. Definitionen (verbindlich, Tests folgen daraus)

Alle Kennzahlen gelten pro Spieler über X01-Legs, sofern nicht anders gesagt; Gast-Matches sind ausgeschlossen, außer bei den Feldtreffern.

| Kennzahl                  | Definition                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3-Dart-Average**        | Punkte aller abgeschlossenen, nicht gebusteten Aufnahmen ÷ Anzahl dieser Aufnahmen (wie Legacy, `legacy-analysis.md` §8). Darts-Average = Punkte ÷ Darts, nur auf dem Sieg-Screen. |
| **First-9**               | 3-Dart-Average über die ersten drei Aufnahmen jedes Legs                                                                                                                           |
| **Checkout-Quote**        | Legs gewonnen ÷ Darts auf ein Doppel (siehe §9) bzw. gewonnene Legs ÷ Legs mit Checkout-Chance (Rest ≤ 170 am Anfang einer Aufnahme)                                               |
| **180 / 140+ / 100+**     | Anzahl Aufnahmen mit genau 180 / ≥ 140 / ≥ 100 Punkten (nicht gebustet)                                                                                                            |
| **Highest Finish**        | höchster Rest, der in einer Aufnahme auf 0 gebracht wurde                                                                                                                          |
| **Best Leg**              | wenigste Darts in einem gewonnenen Leg (501/401/301 getrennt)                                                                                                                      |
| **Highest Score**         | höchste Aufnahme                                                                                                                                                                   |
| **Feldtreffer**           | aus `fieldHits` (M2) über alle Modi plus `player_field_hits`                                                                                                                       |
| **Siege / Legs / Spiele** | Matches gewonnen (Platz 1), Legs gewonnen, Matches gespielt; getrennt nach 1 vs 1 und 3+                                                                                           |
| **Elo**                   | nur 1 vs 1, nur beendete Matches, K = 32, Start 1000, nach Matches sortiert nach `finished_at`; Mehrspieler-Matches zählen nicht (E8)                                              |
| **Verlauf**               | 3-Dart-Average pro Match über die Zeit                                                                                                                                             |

## 2. Grundentscheidungen

- **Erst alles in TypeScript**, aus den Aufnahmen gerechnet, mit einem `StatsRepository`, das die Rohdaten liefert (`visitsOfPlayer`, `finishedMatches`). Bei wenigen Dutzend Spielern und ein paar hundert Matches im Jahr reicht das auf dem Pi. Erst wenn eine Seite über 500 ms braucht, kommt SQL-Aggregation (§7).
- **Keine neue Persistenz außer `player_field_hits`** (gibt es schon) und optional einer `elo_snapshot`-Tabelle, falls die Berechnung über alle Matches zu lange dauert (§7).
- **Charts mit Recharts**, nur auf dem Profil (Verlauf und Feldtreffer), Tokens aus dem Theme; keine Charts auf der Rangliste.
- **Seiten unter einem vierten Tab „Statistik“**: `/stats` Rangliste, `/stats/player/[id]` Profil, `/stats/match/[id]` Match-Detail. Alles hinter `requireSession`, für alle Eingeloggten sichtbar.
- **Zeitfilter**: Rangliste und Profil mit Pille „Alles / Dieses Jahr / 30 Tage“.

## 3. Domäne (Test-first)

**Dateien**: `src/domain/stats/x01.ts` (Average, First-9, Checkout, 180er, Finish, Best Leg, Highest Score aus `LegState[]`), `src/domain/stats/elo.ts`, `src/domain/stats/aggregate.ts` (Summen über Matches, Zeitfilter), `src/domain/stats/field-hits.ts` (vorhanden), Tests dazu mit kleinen, von Hand gerechneten Legs.

| Fall                                                              | Erwartung                                                                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Leg mit Aufnahmen 180, 60 (Bust), 100, Checkout 161 (T20 T17 D25) | Average (180+100+161)/3; First-9 = (180+0+100)/… siehe §9; 180er 1, 140+ 2, 100+ 3, Highest Finish 161, Darts 12 |
| Best Leg 501 in 15 Darts, später 18 Darts                         | 15                                                                                                               |
| Checkout: 3 Legs mit Chance, 1 gewonnen                           | 33 %                                                                                                             |
| Elo: A (1000) schlägt B (1000)                                    | A 1016, B 984; erneuter Sieg A → kleiner als 16 Punkte Zuwachs                                                   |
| Gast-Match                                                        | fließt in nichts ein außer Feldtreffer                                                                           |
| Zeitfilter 30 Tage                                                | ältere Matches fehlen                                                                                            |

- **Commit:** „M8: Statistik-Domäne“

## 4. Repository und Services

- `src/db/stats-repository.ts` (+ Memory-Variante, Test gegen beide): `legsOfPlayer(playerId, since)` → `LegState[]` mit Match-Metadaten (Modus, Gast-Match ja/nein, Gegner, Datum, Sieger), `finishedOneOnOneMatches(since)` für Elo, `fieldHitsStored(playerId)`.
- `src/server/stats-service.ts`: `playerProfile(deps, playerId, range)`, `leaderboard(deps, range, sortBy)`, `matchDetail(deps, matchId)`; Tests mit In-Memory-Daten.
- **Commit:** „M8: Statistik-Services“

## 5. Seiten

- Tab „Statistik“ (`ChartBarIcon` neu in `icons.tsx`), `/stats`: Rangliste als `CardList`, Spalten Siegquote, Average, Checkout, Elo; Sortier-Pille; Zeitfilter-Pille; Tipp öffnet das Profil.
- `/stats/player/[id]`: Kennzahlen als Kacheln (`StatTile`, neu in `src/components/ui/`), Verlauf (Recharts `LineChart`), Feldtreffer als Balken 1–20 + Bull (Heatmap auf dem Board erst, wenn es eine SVG-Scheibe gibt, §9), Liste der letzten Matches.
- `/stats/match/[id]`: pro Leg Aufnahmen beider Spieler nebeneinander, Average und Checkout je Leg; Link vom Sieg-Screen und aus der Historie.
- Tests: `StatTile`-Fixture, Rangliste sortiert korrekt (UI-Test mit Fixtures).
- **Commit:** „M8: Rangliste, Profil, Match-Detail“

## 6. DoD

- Das von Hand nachgerechnete Match (§0) stimmt in allen Kennzahlen.
- Deploy auf Zuruf.
- **Commit:** „M8: done“

## 7. Performance (nur bei Bedarf)

- Messen: Serverzeit der Rangliste mit allen Spielern loggen. Schwelle 500 ms.
- Dann: Elo-Snapshot je Match in einer Tabelle `elo_snapshot(match_id, player_id, elo_after)`, inkrementell beim Match-Ende, und Aggregate (Averages, Zähler) per SQL über `visit` mit berechneten Spalten.

---

## 8. Nicht in M8

Achievements (Backlog), Statistiken für Cricket/Elimination/SplitScore außer Feldtreffern und Siegen, Export.

## 9. Offene Fragen (Defaults gelten ohne Antwort)

1. **Checkout-Quote:** Default: gewonnene Legs ÷ Legs, in denen der Spieler mindestens eine Aufnahme mit Rest ≤ 170 begonnen hat. Alternative (üblicher, braucht mehr Daten): Checkouts ÷ Darts auf ein Doppel; dafür müsste man wissen, welche Darts auf ein Doppel gingen, das gibt die Eingabe nicht her.
2. **First-9 mit Bust-Aufnahme:** Default: Bust zählt als 0 Punkte und als Aufnahme (anders als beim Average, der Busts auslässt). Alternative: wie Average.
3. **Elo-Start und K:** 1000 und 32. Alternative: K größer für die ersten 10 Matches.
4. **Feldtreffer-Darstellung:** Balken (Default) oder eine SVG-Dartscheibe als Heatmap (schöner, ein halber Tag mehr). SVG-Dartscheibe
5. **Wer sieht Statistiken:** alle Eingeloggten (Default) oder nur das eigene Profil plus Rangliste. Nur eigenes Profil, plus Rangliste und anzahl an gespielten Spielen
