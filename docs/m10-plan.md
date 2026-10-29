# M10-Plan – Achievements

> Detailplan zu `project.md` M10 (aus dem Backlog, Idee von Luca). Achievements sind Auszeichnungen, die ein Spieler einmal verdient und behält; sie werden aus den Aufnahmen erkannt, wie alles andere (Architektur §6). Kommt nach M7 und M8, weil Cricket/Elimination/SplitScore und die Statistik-Domäne gebraucht werden. Test-first, jeder grüne Schritt ein Commit.
> Stand: erste Fassung, 23.10.2026. Noch nicht umgesetzt.
> Luca: §0 und §9.

---

## 0. Was Luca tut

1. Die Liste in §1 ergänzen oder streichen, Namen und Bedingungen festlegen (§9).
2. Entscheiden, ob Gäste Achievements bekommen (§9, Frage 2).

---

## 1. Die Achievements (Startliste)

| Schlüssel | Name | Bedingung | Modus |
|---|---|---|---|
| `180` | 180 | eine Aufnahme mit 180 | X01, Elimination, Cricket, SplitScore |
| `gone-fishing` | Gone Fishing | Checkout 170 (T20 T20 Bull) | X01, Eliminiation |
| `all-finishes` | Gotta catch 'Em All! | Mit jedem Doppel ein Leg gewinnen, D1-DBull(Fortschritt sichtbar) | X01 |
| `split-one` | Auf der Kante | SplitScore mit genau 1 Punkt beendet | SplitScore |
| `never-halved` | Ungeteilt | SplitScore-Spiel ohne eine einzige Halbierung | SplitScore |
| `first-blood` | First Blood | in einem Elimination-Spiel als Erster einen Mitspieler genullt | Elimination |
| `nine-darter` | 9-Darter | 501 in 9 Darts | X01 |
| `shanghai` | Shanghai | Single, Double und Triple desselben Felds in einer Aufnahme als finish | X01 |

Weitere kommen über dieselbe Tabelle dazu; jede Zeile ist eine Erkennerfunktion.

## 2. Grundentscheidungen

- **Erkennung beim Match-Ende**, nicht pro Dart: `commitVisit` ruft nach `finished` einmal `detectAchievements(matchState)` für alle Teilnehmer; neue Einträge landen in `achievement (player_id, key, match_id, earned_at)` mit Unique auf `(player_id, key)`. Für `all-finishes` zusätzlich `achievement_progress (player_id, key, value)` mit der Menge der schon gespielten Finishes als JSON.
- **Rückwirkend**: Beim ersten Start nach M10 läuft `detectAchievements` einmal über alle beendeten Matches (Migration-Hook in `instrumentation.ts`), damit alte 180er zählen.
- **Undo** vom Sieg-Screen nimmt die Achievements dieses Matches wieder zurück (gelöscht nach `match_id`), beim erneuten Ende werden sie neu erkannt.
- **Gast-Matches**: Achievements für reguläre Spieler werden auch aus Gast-Matches erkannt (es sind persönliche Leistungen, keine Rangliste), Gäste selbst bekommen keine, weil sie nach 24 h verschwinden (§9).
- **Anzeige**: auf dem Sieg-Screen ein Banner „Neu: 180“ für frisch verdiente, im Profil (M8) eine Galerie aller Achievements mit Datum und Fortschritt für `all-finishes` (z. B. „87 von 162“), in der Rangliste eine Spalte mit der Anzahl.
- **Kein Sound, keine Push-Nachricht**; das Banner reicht. Der 180-Sound ist M11.

## 3. Domäne (Test-first)

`src/domain/achievements/`: `types.ts` (Schlüssel, Name, Beschreibung aus `i18n`), `detect.ts` mit einer Erkennerfunktion je Zeile aus §1 über `MatchState` aller Modi, `finishes.ts` (Liste der ausmachbaren Rests), Tests mit einem Leg je Fall und je einem Negativfall (z. B. 170 als Bust ist kein Gone Fishing; Shanghai über zwei Aufnahmen zählt nicht).

- **Commit:** „M10: Achievement-Erkennung“

## 4. Schema, Services, rückwirkender Lauf

- Tabellen aus §2, Migration; Repository-Methoden `achievementsOf(playerId)`, `award(...)`, `revokeForMatch(matchId)`, `progress(...)`; Hook in `commitVisit`/`undoVisit`; Backfill beim Start mit Logzeile.
- Tests: Match-Ende verleiht genau einmal; Undo nimmt zurück; Backfill erkennt alte Matches und ist idempotent.
- **Commit:** „M10: Achievements speichern und rückwirkend erkennen“

## 5. Seiten

- Sieg-Screen: Banner-Liste der neuen Achievements (wiederverwendbare `Badge`-Komponente mit Icon aus `icons.tsx`, Icons als einfache Linienzeichnungen).
- Profil: Galerie (verdient in Farbe, offen grau mit Beschreibung), Fortschrittsbalken für `all-finishes`.
- Rangliste: Spalte Anzahl.
- **Commit:** „M10: Achievements im Sieg-Screen und Profil“

## 6. DoD

Ein 180er im Spiel zeigt das Banner; im Profil erscheint es; Undo vom Sieg-Screen nimmt es zurück; nach dem Backfill haben die alten Matches aus M6 ihre 180er.
- **Commit:** „M10: done“

---

## 8. Nicht in M10

Tages- oder Saison-Achievements, Mehrfach-Stufen (Bronze/Silber/Gold), Teilen.

## 9. Offene Fragen (Defaults gelten ohne Antwort)

1. **Liste und Namen** aus §1: ergänzen, streichen, umbenennen.
2. **Gäste**: keine Achievements (Default), weil sie nach 24 h verschwinden.
3. **`all-finishes`**: nur Doppel-Out-Finishes (Default) oder je Out-Regel getrennt. Nur doppel out
4. **Rückwirkender Lauf** (Default ja) oder erst ab M10.
