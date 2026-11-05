# M8-Plan – Statistiken und Reporting

> Detailplan zu `project.md` M8. Alles leitet sich aus den gespeicherten Aufnahmen ab (Architektur §6), plus `player_field_hits` aus aufgeräumten Gast-Matches (E12). Gast-Matches zählen in keiner Rangliste und nicht für Elo. Test-first in `src/domain/stats/`, jeder grüne Schritt ein Commit (`feat(stats): …`).
> Stand: überarbeitet am 5.11.2026 nach dem Abgleich mit dem Code (M5–M9 und die Board-Änderungen vom 5.11.) und Lucas Antworten (§9). Erste Fassung vom 23.10.2026.
> Luca: §0.

---

## 0. Was Luca tut

1. Ein reales X01-Match aussuchen und die Kennzahlen eines Spielers von Hand nachrechnen (Average, First-9, 180er, Highest Finish, Best Leg). Das ist die DoD.
2. Elo eines Modus an zwei, drei Matches von Hand nachrechnen.

---

## 1. Definitionen (verbindlich, Tests folgen daraus)

**Welche Matches zählen:** nur **beendete** Matches (`status = finished`, auch per „Sieger festlegen“ beendete Turnierspiele). Laufende und abgebrochene Matches zählen in keiner Kennzahl. **Gast-Matches** (mindestens ein Teilnehmer ist Gast) zählen in keiner Kennzahl, keiner Rangliste und nicht für Elo, nur für die Feldtreffer. Kampflos entschiedene Turnierpaarungen sind keine Matches und zählen nirgends. Aufnahmen beim „Zu Ende spielen“ (M5) zählen mit.

**Gelöschte Spieler** stehen in keiner Rangliste; ihre beendeten Matches zählen für die Gegner weiter, auch für deren Elo.

X01-Kennzahlen gelten pro Spieler über die Legs seiner gezählten X01-Matches:

| Kennzahl                  | Definition                                                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3-Dart-Average**        | Punkte aller abgeschlossenen Aufnahmen ÷ Anzahl abgeschlossener Aufnahmen; ein Bust zählt 0 Punkte und als Aufnahme (wie Legacy und `threeDartAverage`/`matchResult`) |
| **First-9**               | dasselbe über die ersten drei Aufnahmen des Spielers in jedem Leg (Bust = 0, zählt als Aufnahme)                                                               |
| **180 / 140+ / 100+**     | Anzahl Aufnahmen mit genau 180 / 140–179 / 100–139 Punkten (nicht gebustet), wie auf Dartboards üblich getrennt                                                |
| **Highest Finish**        | höchster Rest, der in einer Aufnahme auf 0 gebracht wurde                                                                                                       |
| **Best Leg**              | wenigste Darts in einem gewonnenen Leg, je Startpunktzahl getrennt (501/401/301/eigene)                                                                         |
| **Highest Score**         | höchste nicht gebustete Aufnahme                                                                                                                                |
| **Verlauf**               | 3-Dart-Average pro Match über die Zeit                                                                                                                          |

Für alle Modi:

| Kennzahl          | Definition                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Spiele / Siege** | je Modus: gezählte Matches, davon Platz 1                                                                                                           |
| **Elo**           | **je Modus eigene Elo**, nur aus beendeten 1-vs-1-Matches dieses Modus ohne Gast, in der Reihenfolge von `finished_at`; Start 1000, K = 32; Mehrspieler-Matches zählen nicht (E8) |
| **Feldtreffer**   | über alle Modi: Treffer aus den vorhandenen Aufnahmen (`fieldHits`, auch aus Gast-Matches, solange sie leben) plus `player_field_hits`               |

**Nicht in M8:** Checkout-Quote (vielleicht später als eigener Meilenstein, siehe `project.md`), Achievements (M10), Export.

## 2. Grundentscheidungen

- **Alles in TypeScript** aus den Aufnahmen gerechnet (Replay wie heute in `replayMatch`), Rohdaten aus einem `StatsRepository`. Bei wenigen Dutzend Spielern und ein paar hundert Matches im Jahr reicht das auf dem Pi; SQL-Aggregation erst, wenn eine Seite über 500 ms braucht (§7).
- **Keine neue Persistenz** außer der Spalte `tournament.seeding` (§5).
- **Keine Chart-Bibliothek:** Verlauf als kleines eigenes SVG-Liniendiagramm, Feldtreffer als SVG-Dartscheibe (Heatmap), beides mit Theme-Tokens (`dataviz`-Regeln beachten). Keine neue Abhängigkeit.
- **Sichtbarkeit (Lucas Antwort, 5.11.):** genaue Statistik nur im **eigenen** Profil, auch der Admin sieht nur seins. Für alle sichtbar: die Ranglisten je Modus (Platz, Name, Elo, Spiele). Die Match-Detailseite sehen nur die Teilnehmer.
- **Ort (Lucas Antwort, 5.11.):** alles im Tab **Konto**, kein neuer Tab:
  - Box **„Meine Statistik“**: Kacheln mit den Kennzahlen (Spiele, Siege, X01-Average, First-9, 180/140+/100+, Highest Finish, Best Leg, Highest Score), Zeitfilter-Pille „Alles / Dieses Jahr / 30 Tage“, Verlauf, Feldtreffer-Dartscheibe, die letzten eigenen Matches mit Link zur Match-Detailseite.
  - Je Modus eine **ausklappbare Karte** („Rangliste X01“ …, `FoldCard`): zugeklappt nur der eigene Platz und die eigene Elo, aufgeklappt die ganze Rangliste. In der Rangliste steht, wer in dem Modus mindestens ein gezähltes Match hat (ohne 1-vs-1-Match mit Elo 1000), sortiert nach Elo, bei Gleichstand nach Spielen.
- **Match-Detail** `/match/[id]/stats`: pro Leg die Aufnahmen aller Spieler nebeneinander, Average je Leg; Link vom Sieg-Screen und aus „Letzte Spiele“ (nur für Teilnehmer).

## 3. Domäne (Test-first)

**Dateien** in `src/domain/stats/`: `x01.ts` (Kennzahlen aus `LegState[]` eines Spielers), `elo.ts` (Elo je Modus aus einer Matchliste), `aggregate.ts` (Spiele/Siege je Modus, Zeitfilter, Rangliste), `field-hits.ts` (vorhanden), Tests mit kleinen, von Hand gerechneten Legs.

| Fall                                                                 | Erwartung                                                                              |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Leg mit Aufnahmen 180, Bust (60 geworfen), 100, Checkout 161 (T20 T17 D25) | Average (180+0+100+161)/4; First-9 (180+0+100)/3; 180er 1, 140+ 1, 100+ 1; Highest Finish 161; Highest Score 180 |
| Best Leg 501 in 15 Darts, später 18 Darts; 301 in 9                  | 501: 15, 301: 9                                                                         |
| Elo: A (1000) schlägt B (1000)                                       | A 1016, B 984; zweiter Sieg A → Zuwachs unter 16                                        |
| Elo je Modus                                                         | ein Cricket-Sieg ändert die X01-Elo nicht                                              |
| Mehrspieler-Match                                                    | zählt bei Spielen/Siegen, nicht bei Elo                                                 |
| Gast-Match, abgebrochenes Match                                      | fließen in nichts ein (Gast-Match nur in Feldtreffer)                                  |
| Zeitfilter 30 Tage                                                   | ältere Matches fehlen                                                                   |

## 4. Repository und Services

- `src/db/stats-repository.ts` (Interface) mit SQLite- und Memory-Variante, Test gegen beide: `finishedMatches({ since?, playerId? })` → beendete Matches mit Modus, Teilnehmern (Gast? gelöscht?), Platzierungen, `finishedAt` und den Legs als `MatchState`; `fieldHitsStored(playerId)` gibt es schon im PlayerRepository.
- `src/server/stats-service.ts`: `myStats(deps, session, range)`, `leaderboards(deps, session)` (je Modus Rangliste plus eigener Platz), `matchDetail(deps, session, matchId)` (nur Teilnehmer). Tests mit `memoryDeps()`.

## 5. Turniere: Setzliste ausgelost oder festgelegt (Lucas Antwort zu §9.8)

- Beim Anlegen wählt der Ersteller **„Setzliste: Ausgelost“** (Default, wie bisher) oder **„Wie ausgewählt“**: die Reihenfolge, in der die Spieler angetippt wurden, ist die Setzliste (Platz 1 zuerst). Elo hat keinen Einfluss.
- Neue Spalte `tournament.seeding ('random' | 'fixed')`, Migration; „Neu auslosen“ gibt es nur bei `random`.
- Nachgetragen in `docs/m9-plan.md`.

## 6. Schritte

1. `docs(m8)`: dieser Plan, `project.md` (Checkliste, Checkout-Quote als späterer Meilenstein), `m9-plan.md` (Setzliste).
2. `feat(stats)`: Domäne X01-Kennzahlen.
3. `feat(stats)`: Elo je Modus, Spiele/Siege, Rangliste, Zeitfilter.
4. `feat(stats)`: StatsRepository (SQLite + Memory) und Stats-Service.
5. `feat(stats)`: Konto-Tab: „Meine Statistik“ mit Kacheln (`StatTile` in `src/components/ui/`), Zeitfilter, letzte Matches.
6. `feat(stats)`: Verlauf (SVG-Linie) und Feldtreffer-Dartscheibe (`Dartboard` in `src/components/darts/`).
7. `feat(stats)`: Ranglisten je Modus als `FoldCard`.
8. `feat(stats)`: Match-Detail `/match/[id]/stats`, Links vom Sieg-Screen und aus „Letzte Spiele“.
9. `feat(tournament)`: Setzliste ausgelost oder festgelegt.
10. e2e für Statistik und Setzliste, `./scripts/smoke.sh`, Screenshots, Doku (`project.md`, `architecture.md`, README).

## 7. Performance (nur bei Bedarf)

- Messen: Serverzeit des Konto-Tabs mit allen Spielern loggen. Schwelle 500 ms.
- Dann: Elo-Snapshot je Match in einer Tabelle `elo_snapshot(match_id, player_id, mode, elo_after)`, inkrementell beim Match-Ende, und Aggregate per SQL über `visit`.

## 8. DoD

- Das von Hand nachgerechnete Match (§0) stimmt in allen Kennzahlen, die Elo stimmt an zwei, drei Matches.
- Turnier mit festgelegter Setzliste startet in der angetippten Reihenfolge.
- Deploy auf Zuruf.

## 9. Entschiedene Fragen (5.11.2026)

1. **Checkout-Quote:** nicht in M8, vielleicht später als eigener Meilenstein (dann über Checkout-Darts: Darts bei einem Rest, der mit einem Doppel auszuchecken ist).
2. **First-9 mit Bust:** wie der Average (Bust = 0 Punkte, zählt als Aufnahme); der Average war im ersten Plan falsch beschrieben und folgt jetzt Legacy.
3. **Elo-Start und K:** 1000 und 32.
4. **Feldtreffer-Darstellung:** SVG-Dartscheibe als Heatmap.
5. **Sichtbarkeit:** genaue Statistik nur im eigenen Profil (auch für den Admin); Ranglisten (Platz, Elo, Spiele) für alle.
6. **Modi:** jeder Modus hat eigene Elo und eigene Rangliste.
7. **Ort:** Tab Konto, eigene Box plus ausklappbare Ranglisten je Modus (zugeklappt: eigener Platz und Elo).
8. **Turnier-Setzliste:** ausgelost oder vom Ersteller festgelegt, ohne Elo.
9. **Gezählte Matches:** nur beendete; Charts ohne Bibliothek.
