# M9-Plan – Turniere

> Detailplan zu `project.md` M9. Turniere sind immer 1 vs 1 (Entscheidung „Spielerzahl“, `project.md` Geklärte Fragen 4). Wird vor M8 umgesetzt (30.10.2026); bis Elo existiert, wird die Setzliste ausgelost. Jedes Turnierspiel ist ein normales X01-Match (`is_tournament`, Spalte gibt es seit M1); der Turnier-Code organisiert nur, wer wann gegen wen spielt. Test-first, jeder grüne Schritt ein Commit.
> Stand: Fragen in §9 am 30.10.2026 beantwortet und eingearbeitet; §2–§4 umgesetzt am 30.10.2026 (Domäne, Server, Seiten, Smoke-Test mit K.-o. zu dritt). Offen: Deploy und DoD am Board.
> Luca: §0.

---

## 0. Was Luca tut

1. ~~Entscheiden, welche Turnierform zuerst kommt~~ (erledigt 30.10.2026: alle drei Formate unabhängig voneinander).
2. Für die DoD einen Abend mit mindestens vier Spielern.

---

## 1. Grundentscheidungen

- **Drei Formate, unabhängig voneinander (§9.1):** `round-robin` (jeder gegen jeden, der Tabellenerste gewinnt das Turnier), `knockout` (K.-o.-Baum) und `groups-knockout` (Gruppen mit jeder gegen jeden, danach K.-o.; Gruppenzahl 1–4 und Aufsteiger je Gruppe 1, 2 oder 4 beim Anlegen wählbar; ergeben die Aufsteiger keine Zweierpotenz, bekommen die besten Freilose).
- **Turnier = Container über Matches.** Neue Tabellen `tournament (id, name, format 'round-robin'|'knockout'|'groups-knockout', group_count, advance_per_group, rules…, status, created_by, created_at, finished_at)`, `tournament_round_format (tournament_id, phase 'group'|'knockout', round, legs_to_win_set, sets_to_win_match)`, `tournament_player (tournament_id, player_id, seed, group_no NULL)`, `tournament_match (tournament_id, match_id NULL, round, slot, player_a NULL, player_b NULL, winner NULL)`. Das Match selbst entsteht erst, wenn das Spiel gestartet wird (`match.is_tournament = true`, `tournament_match.match_id` wird gesetzt).
- **Spielplan ist reine Domäne**: `src/domain/tournament/round-robin.ts` (Port des Generators aus `Tournament.swift`, Berger-Tabelle: n−1 Runden, jeder spielt pro Runde höchstens einmal, bei ungerader Zahl ein Freilos), `knockout.ts` (Baum mit 2^k Plätzen, Freilose für die höchsten Setzplätze, Sieger rückt auf), `groups.ts` (Gruppen mit Round Robin, dann K.-o. mit den besten je Gruppe). `standings(tournament, results)` berechnet die Tabelle (Siege, Leg-Differenz, direkter Vergleich, Average als letzter Tie-Break).
- **Setzliste wird ausgelost (§9, 30.10.2026)**, mit „Neu auslosen“, solange noch kein Turnierspiel begonnen hat (Zufall über `deps.random`, damit testbar). Mit M8 kann die Elo-Reihenfolge als Vorschlag dazukommen. Gäste erlaubt; Turniere mit Gästen sind Gast-Matches wie gehabt (E12) und zählen nicht für Elo.
- **Legs/Sets je Runde (§9.4):** Die Gruppen- bzw. Round-Robin-Phase hat ein Format, jede K.-o.-Runde ihr eigenes (z. B. Finale Best of 5), beim Anlegen einstellbar.
- **Sieger festlegen (§9.4):** Wird die Zeit knapp, kann in einem Turnierspiel nach jedem beendeten Leg der Sieger festgelegt werden: Knopf „Sieger festlegen“ auf dem Leg-Sieg-Screen, in der Bestätigung frei wählbar, vorausgewählt ist, wer nach Legs führt. Das Match endet damit (`match.decided_winner_id`); Undo vom Sieg-Screen nimmt zuerst die Festlegung zurück.
- **Ablauf am Abend**: Turnierseite zeigt die nächsten offenen Spiele; „Spielen“ startet das Match mit den Regeln des Turniers (Modus `single` oder `per-player` wie in M4 wählbar beim Turnierstart) und kommt nach dem Match-Ende zur Turnierseite zurück. Spiele können in beliebiger Reihenfolge gespielt werden, sobald beide Spieler feststehen: Round Robin und Gruppen jederzeit, im K.-o. sobald beide Vorrunden-Spiele entschieden sind. Turnierspiele sind X01.
- **Undo nach Match-Ende**: Ein beendetes Turniermatch lässt sich über „Letzten Wurf rückgängig“ auf dem Sieg-Screen wieder öffnen, solange das nächste Spiel des Siegers nicht begonnen hat; danach ist es fest.
- **Rechte**: Turnier anlegen und Spiele starten darf jeder Eingeloggte; löschen nur der Ersteller oder der Admin.

## 2. Domäne (Test-first)

`src/domain/tournament/`: `types.ts`, `round-robin.ts`, `knockout.ts`, `groups.ts`, `standings.ts`, Tests.

| Fall | Erwartung |
|---|---|
| Round Robin 4 Spieler | 3 Runden à 2 Spiele, jeder gegen jeden genau einmal (Berger-Tabelle; der Legacy-Generator verteilt zufällig und kann Spiele unverteilt lassen) |
| Round Robin 5 Spieler | 5 Runden, je ein Freilos, jeder spielt 4 Spiele |
| K.-o. 6 Spieler | 8er-Baum, Setzplätze 1 und 2 mit Freilos in Runde 1 |
| K.-o. Sieger rückt auf | nächstes Spiel hat den Sieger, Verlierer ist raus |
| Gruppen 8 Spieler, 2 Gruppen, je 2 weiter | Halbfinale A1–B2, A2–B1 |
| Gruppen 9 Spieler, 3 Gruppen, je 2 weiter | 6 Aufsteiger im 8er-Baum, die zwei besten Gruppensieger mit Freilos |
| Auslosung | gleiche Zufallsquelle, gleiche Setzliste; neue Auslosung nur ohne begonnenes Spiel |
| Sieger festlegen | Match endet mit dem gewählten Spieler, Turnier rückt weiter; Undo nimmt die Festlegung zurück |
| Tabelle | Siege vor Leg-Differenz vor direktem Vergleich vor Average |
| Turnier zu Ende | Round Robin: alle Spiele gespielt; K.-o.: Finale gespielt |

- **Commit:** „M9: Turnier-Domäne“

## 3. Schema, Repository, Services

- Tabellen aus §1, Migration; `TournamentRepository` (+ Memory), `tournament-service.ts`: `createTournament`, `startTournamentMatch` (legt das Match an, verknüpft), `onMatchFinished` (Hook aus `match-service`, trägt Sieger ein, öffnet die nächste Runde), `reopenTournamentMatch`, `deleteTournament`; Tests.
- **Commit:** „M9: Turniere im Server“

## 4. Seiten

- `/tournaments` (Liste, laufend und beendet; Link aus der Spielwahl „Turnier“), `/tournaments/new` (im Setup-Layout aus `Design/`: Name, Format, Gruppen und Aufsteiger, Spieler per `PlayerPicker`, X01-Regeln und Best of Legs/Sets je Phase bzw. K.-o.-Runde per `ChoiceMenu`/`Stepper`), Setzliste ausgelost mit „Neu auslosen“ auf der Turnierseite, `/tournaments/[id]` (Spielplan nach Runden, Tabelle bzw. Baum, offene Spiele mit „Spielen“, Sieger-Banner am Ende).
- Baum als einfache CSS-Grid-Darstellung, keine Bibliothek; auf dem Handy pro Runde untereinander.
- Tests: Fixtures für Tabelle und Baum.
- **Commit:** „M9: Turnierseiten“

## 5. DoD

Ein Round-Robin-Abend zu viert komplett über die App, Tabelle stimmt mit der Handrechnung; ein K.-o. zu sechst mit Freilosen läuft bis zum Finale.
- **Commit:** „M9: done“

---

## 8. Nicht in M9

Doppel-Teams, Turniere über mehrere Abende mit Terminen, Turnier-Statistik über die Rangliste hinaus.

## 9. Fragen (beantwortet 30.10.2026)

1. **Format zuerst:** Round Robin (Default), K.-o., oder beides gleich.
   **Antwort:** Erst Round Robin dann K.-o. oder direkt K.-o.; nachgefragt: Gruppen und Aufsteiger wählbar, dazu reines Round Robin, alle drei unabhängig voneinander.
2. **Tie-Break-Reihenfolge** in der Tabelle (Default wie §1).
   **Antwort:** Wie in der Tabelle (§1): Siege, Leg-Differenz, direkter Vergleich, Average.
3. **Freilos-Vergabe** im K.-o.: nach Setzliste (Default) oder zufällig.
   **Antwort:** Nach Setzliste. Die Setzliste selbst wird bis M8 ausgelost (nachgefragt).
4. **Legs/Sets im Turnier** als Turnier-Einstellung für alle Spiele (Default) oder je Runde anders (z. B. Finale Best of 5).
   **Antwort:** Je nach Runde. Zusätzlich, wenn die Zeit knapp wird, nach jedem gespielten Leg den Sieger festlegen (Bestätigungsknopf) und ins nächste Match kommen; nachgefragt: der Sieger ist in der Bestätigung immer frei wählbar, vorausgewählt der Führende.
