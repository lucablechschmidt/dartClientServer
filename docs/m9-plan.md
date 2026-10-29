# M9-Plan – Turniere

> Detailplan zu `project.md` M9. Turniere sind immer 1 vs 1 (Entscheidung „Spielerzahl“, `project.md` Geklärte Fragen 4). Kommt nach M8, weil Rangliste und Elo die Setzliste liefern. Jedes Turnierspiel ist ein normales X01-Match (`is_tournament`, Spalte gibt es seit M1); der Turnier-Code organisiert nur, wer wann gegen wen spielt. Test-first, jeder grüne Schritt ein Commit.
> Stand: erste Fassung, 23.10.2026. Noch nicht umgesetzt.
> Luca: §0 und §9.

---

## 0. Was Luca tut

1. Entscheiden, welche Turnierform zuerst kommt (§9, Frage 1): Jeder gegen jeden (Round Robin, wie der Generator in `Tournament.swift`) oder K.-o.-Baum. Default: beides, Round Robin zuerst.
2. Für die DoD einen Abend mit mindestens vier Spielern.

---

## 1. Grundentscheidungen

- **Turnier = Container über Matches.** Neue Tabellen `tournament (id, name, format 'round-robin'|'knockout'|'groups-playoffs', mode, rules…, legs_to_win_set, sets_to_win_match, status, created_by, created_at, finished_at)`, `tournament_player (tournament_id, player_id, seed, group_no NULL)`, `tournament_match (tournament_id, match_id NULL, round, slot, player_a NULL, player_b NULL, winner NULL)`. Das Match selbst entsteht erst, wenn das Spiel gestartet wird (`match.is_tournament = true`, `tournament_match.match_id` wird gesetzt).
- **Spielplan ist reine Domäne**: `src/domain/tournament/round-robin.ts` (Port des Generators aus `Tournament.swift`, Berger-Tabelle: n−1 Runden, jeder spielt pro Runde höchstens einmal, bei ungerader Zahl ein Freilos), `knockout.ts` (Baum mit 2^k Plätzen, Freilose für die höchsten Setzplätze, Sieger rückt auf), `groups.ts` (Gruppen mit Round Robin, dann K.-o. mit den besten je Gruppe). `standings(tournament, results)` berechnet die Tabelle (Siege, Leg-Differenz, direkter Vergleich, Average als letzter Tie-Break).
- **Setzliste** aus der Elo-Rangliste (M8), Gäste erlaubt und ans Ende gesetzt (ohne Elo); Turniere mit Gästen sind Gast-Matches wie gehabt (E12) und zählen nicht für Elo.
- **Ablauf am Abend**: Turnierseite zeigt die nächsten offenen Spiele; „Spielen“ startet das Match mit den Regeln des Turniers (Modus `single` oder `per-player` wie in M4 wählbar beim Turnierstart) und kommt nach dem Match-Ende zur Turnierseite zurück. Spiele können in beliebiger Reihenfolge innerhalb einer Runde gespielt werden; die nächste Runde öffnet, wenn die vorige voll ist (K.-o.) bzw. jederzeit (Round Robin).
- **Undo nach Match-Ende**: Ein beendetes Turniermatch lässt sich über „Letzten Wurf rückgängig“ auf dem Sieg-Screen wieder öffnen, solange das nächste Spiel des Siegers nicht begonnen hat; danach ist es fest.
- **Rechte**: Turnier anlegen und Spiele starten darf jeder Eingeloggte; löschen nur der Ersteller oder der Admin.

## 2. Domäne (Test-first)

`src/domain/tournament/`: `types.ts`, `round-robin.ts`, `knockout.ts`, `groups.ts`, `standings.ts`, Tests.

| Fall | Erwartung |
|---|---|
| Round Robin 4 Spieler | 3 Runden à 2 Spiele, jeder gegen jeden genau einmal |
| Round Robin 5 Spieler | 5 Runden, je ein Freilos, jeder spielt 4 Spiele |
| K.-o. 6 Spieler | 8er-Baum, Setzplätze 1 und 2 mit Freilos in Runde 1 |
| K.-o. Sieger rückt auf | nächstes Spiel hat den Sieger, Verlierer ist raus |
| Gruppen 8 Spieler, 2 Gruppen, je 2 weiter | Halbfinale A1–B2, A2–B1 |
| Tabelle | Siege vor Leg-Differenz vor direktem Vergleich vor Average |
| Turnier zu Ende | Round Robin: alle Spiele gespielt; K.-o.: Finale gespielt |

- **Commit:** „M9: Turnier-Domäne“

## 3. Schema, Repository, Services

- Tabellen aus §1, Migration; `TournamentRepository` (+ Memory), `tournament-service.ts`: `createTournament`, `startTournamentMatch` (legt das Match an, verknüpft), `onMatchFinished` (Hook aus `match-service`, trägt Sieger ein, öffnet die nächste Runde), `reopenTournamentMatch`, `deleteTournament`; Tests.
- **Commit:** „M9: Turniere im Server“

## 4. Seiten

- `/tournaments` (Liste, laufend und beendet; Link aus der Spielwahl „Turnier“), `/tournaments/new` (Name, Format, Spieler per `PlayerPicker`, Regeln per `OptionMenu`, Setzliste automatisch aus Elo mit Möglichkeit zum Umsortieren per Pfeile), `/tournaments/[id]` (Spielplan nach Runden, Tabelle bzw. Baum, offene Spiele mit „Spielen“, Sieger-Banner am Ende).
- Baum als einfache CSS-Grid-Darstellung, keine Bibliothek; auf dem Handy pro Runde untereinander.
- Tests: Fixtures für Tabelle und Baum.
- **Commit:** „M9: Turnierseiten“

## 5. DoD

Ein Round-Robin-Abend zu viert komplett über die App, Tabelle stimmt mit der Handrechnung; ein K.-o. zu sechst mit Freilosen läuft bis zum Finale.
- **Commit:** „M9: done“

---

## 8. Nicht in M9

Doppel-Teams, Turniere über mehrere Abende mit Terminen, Turnier-Statistik über die Rangliste hinaus.

## 9. Offene Fragen (Defaults gelten ohne Antwort)

1. **Format zuerst:** Round Robin (Default), K.-o., oder beides gleich. Möglich erst Round Robin dann K.-o. oder direkt K.-o.
2. **Tie-Break-Reihenfolge** in der Tabelle (Default wie §1). Wie Tabelle
3. **Freilos-Vergabe** im K.-o.: nach Setzliste (Default) oder zufällig. Nach Setzliste
4. **Legs/Sets im Turnier** als Turnier-Einstellung für alle Spiele (Default) oder je Runde anders (z. B. Finale Best of 5). Je nach Runde, Zusätzlich in der Runde, wenn die Zeit Knapp wird Match nach jedem gespielten Leg Sieger festlegen mit bestätigings Knopf und ins nächste Match kommen
