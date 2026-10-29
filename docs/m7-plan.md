# M7-Plan – Cricket, Elimination, SplitScore

> Detailplan zu `project.md` M7. Regeln aus `legacy-analysis.md` §4–6 und den Swift-Klassen `CricketGame`, `Field`, `EliminationGame`, `Elimination`, `SplitScoreGame`. Jeder Modus ist ein eigenes Domänenmodul hinter derselben Schnittstelle; Server, Zählscreen, Rechte und Netzprotokoll bleiben, nur Panels, Hinweiszeile und Setup bekommen Varianten. Test-first, jeder grüne Schritt ein Commit.
> Stand: Fragen in §9 am 29.10.2026 beantwortet (1, 2, 5) bzw. Default (3, 4). M6 wird zunächst übersprungen; die Playwright-Tests aus §7 kommen deshalb als Erweiterung von `scripts/smoke-match.mjs`. Noch nicht umgesetzt.
> Luca: §0.

---

## 0. Was Luca tut

1. ~~Die Regelfragen in §9 beantworten~~ (erledigt 29.10.2026).
2. Für die DoD jeden Modus einmal am Board spielen, mindestens Cricket zu dritt.

---

## 1. Grundentscheidungen

- **Eine Modus-Schnittstelle** (`architecture.md` §9, bisher nicht gebraucht): `src/domain/mode.ts` mit `GameMode<State, Options>`: `initialState(players, options, starter)`, `applyDart(state, dart) → Result`, `undoDart(state) → Result`, `isFinished(state)`, `winner(state)`, `placements(state)`, `currentPlayer(state)`, `replay(...)`, `panelData(state, names) → PanelData[]`, `hint(state) → string | null`. X01 wird in `src/domain/x01/mode.ts` an diese Schnittstelle angepasst, ohne die bestehenden Funktionen zu ändern. `src/domain/modes.ts` ist die Registry `{ x01, cricket, elimination, splitscore }`.
- **Server und Zählscreen werden modusunabhängig**: `match-service.ts` holt den Modus über `match.mode` aus der Registry; `commitVisit`/`undoVisit`/`replay` rufen nur die Schnittstelle. Der Zählscreen bekommt `PanelData` und `hint` fertig projiziert und wählt die Panel-Variante über ein `mode`-Feld.
- **Aufnahmen bleiben das Speicherformat** (§6 der Architektur): Marks, Eliminationen und Zielfelder sind reines Replay aus `visit`-Zeilen; keine neuen Tabellen. Modus-Optionen (Elimination: `finishPoints`, Out-Regel) liegen in den bestehenden Spalten `start_score`/`out_rule`; Cricket und SplitScore brauchen keine.
- **Sets und Legs** gibt es nur für X01. Die drei Modi sind ein Leg; Platzierungen bei 3+ Spielern wie in M5 (Reihenfolge, in der Spieler fertig werden, bei Cricket und Elimination gibt es nur einen Sieger, der Rest wird nach Punkten sortiert; siehe §9).
- **Setup-Screens** teilen `PlayerPicker` und `OptionMenu`; je Modus eine Seite `/new/<mode>` mit den passenden Pillen. Die Spielwahl auf `/` wird scharf.
- **Keypad** ist für alle gleich; bei SplitScore bleibt es gleich, obwohl nur ein Feld zählt (Fehlwürfe sind `overthrown`, wie in Legacy).

## 2. Schnittstelle und X01-Anpassung

- `src/domain/mode.ts`, `src/domain/modes.ts`, `src/domain/x01/mode.ts` + Test, der X01 über die Schnittstelle gegen die direkten Funktionen vergleicht (Property-Test).
- `match-service.ts` und `scoreboard-screen.tsx` auf die Schnittstelle umgestellt; alle bestehenden Tests bleiben grün.
- **Commit:** „M7: Modus-Schnittstelle, X01 dahinter“

## 3. Cricket (Test-first)

`src/domain/cricket/`: `state.ts` (Marks je Spieler und Feld 15–20, Bull; Punkte je Spieler), `apply.ts`, `undo.ts`, `selectors.ts` (geschlossen pro Spieler, von allen geschlossen, Führender), `mode.ts`, `cricket.test.ts`.

| Fall                                 | Erwartung                                                              |
| ------------------------------------ | ---------------------------------------------------------------------- |
| T20 als erster Dart                  | 3 Marks auf 20, 0 Punkte                                               |
| vierter Mark auf 20 (T20 dann S20)   | 20 Punkte                                                              |
| D20 bei 2 Marks                      | ein Mark schließt, einer bringt 20 Punkte                              |
| Feld von allen Spielern geschlossen  | weitere Treffer bringen nichts                                         |
| Dart auf 14                          | zählt nichts, ist aber ein geworfener Dart                             |
| Sieg                                 | alle Felder zu und höchste Punktzahl; mit gleicher Punktzahl kein Sieg |
| Sieg-Prüfung beim Spielerwechsel     | wenn der Gegner punktgleich zieht, läuft es weiter                     |
| Undo eines Marks, der Punkte brachte | Punkte zurück, Mark zurück                                             |
| 3 Spieler, Replay                    | identisch zur Folge von applyDart                                      |

Panel: statt Rest die Punkte, darunter die sieben Felder mit 0–3 Strichen (`/`, `X`, `Ⓧ`), geschlossene Felder in `--cricket-closed`. Hinweiszeile: „20 fehlt noch 1 Mark“ oder leer.

- **Commit:** „M7: Cricket“

## 4. Elimination (Test-first)

`src/domain/elimination/`: Punkte zählen hoch von 0 bis `finishPoints` (Setup 301/501, Out-Regel wie X01), `mode.ts`, Test.

| Fall                                                 | Erwartung                                    |
| ---------------------------------------------------- | -------------------------------------------- |
| Dart führt über das Ziel                             | nur dieser Dart `overthrown`, Spielerwechsel |
| Ziel exakt mit falscher Out-Regel                    | wie oben                                     |
| Ziel exakt mit Double bei DoubleOut                  | Sieg                                         |
| A landet exakt auf B's Stand                         | B auf 0, A behält den Stand                  |
| Undo dieses Darts                                    | B hat seinen Stand zurück                    |
| zwei Spieler auf demselben Stand, Dritter trifft ihn | beide auf 0 (siehe §9)                       |
| 180                                                  | wie X01 (Sound im Backlog)                   |

Panel: Punkte, darunter „nächste Elimination in N“ (kleinster positiver Abstand zu einem Mitspieler) als Hinweiszeile statt Checkout.

- **Commit:** „M7: Elimination“

## 5. SplitScore (Test-first)

`src/domain/splitscore/`: alle starten mit 40; Zielfelder 15, 16, Doppel, 17, 18, Triple, 19, 20, Bull; eine Runde pro Ziel; Treffer addieren die Aufnahme, kein Treffer halbiert `(score+1)/2`; nach Bull ist Schluss, Sieger = höchste Punktzahl, Platzierung nach Punkten. Zusätzlich Summe aller Spieler im Spiel zeigen.

| Fall                        | Erwartung                                      |
| --------------------------- | ---------------------------------------------- |
| Ziel 15: S15, T15, 0        | +60                                            |
| Ziel 15: 0, 0, 0 bei 40     | 20                                             |
| 41 ohne Treffer             | 21 (aufgerundet)                               |
| Ziel Doppel: D5             | Treffer, +10                                   |
| Ziel Triple: Bull           | kein Treffer                                   |
| Rundenwechsel               | nach dem letzten Spieler rückt das Ziel weiter |
| Undo über den Rundenwechsel | Ziel zurück, Punkte neu berechnet              |
| Ende nach Bull              | `isFinished`, Platzierung nach Punkten         |

Panel: Punkte, Hinweiszeile „Ziel: Doppel“ bzw. „Ziel: 17“, bei Rundenwechsel kurz „Runde 4 von 9“.

- **Commit:** „M7: SplitScore“

## 6. Setup-Screens und Zählscreen-Varianten

- `src/app/new/cricket`, `/new/elimination` (Pillen Ziel 301/501, Out-Regel), `/new/splitscore`; `new-match-form.tsx` wird `x01-setup.tsx`, die gemeinsame Hülle (Kopfzeile, Picker, Eingabemodus aus M4) wird `setup-shell.tsx`.
- `game-menu.tsx`: alle vier Modi als Links; Spielübersicht zeigt den Modus.
- `player-panel.tsx`: Varianten `x01` (wie heute), `cricket` (Marks-Raster), `points` (Elimination, SplitScore); Kleinpanel zeigt Punkte bzw. geschlossene Felder als Zahl.
- `checkout-hint.tsx` bleibt; der Text kommt aus `mode.hint`.
- Tests: Panel-Fixtures je Variante; Setup-Tests analog zu X01.
- **Commit:** „M7: Setup und Panels je Modus“

## 7. Tests am Ende, DoD

- Playwright (M6): je Modus ein Durchlauf (`e2e/modes.spec.ts`) inklusive Undo.
- Deploy auf Zuruf, dann jeden Modus am Board, Cricket zu dritt.
- **Commit:** „M7: done“

---

## 8. Nicht in M7

Sets/Legs für die drei Modi, modusspezifische Statistiken (M8 nimmt nur X01-Kennzahlen plus Feldtreffer aus allen Modi), Sound.

## 9. Fragen (beantwortet 29.10.2026)

1. **Cricket Platzierungen bei 3+:** Default: Sieger Platz 1, Rest nach Punkten, bei Gleichstand nach geschlossenen Feldern. Alternative: wie X01 bis zur letzten Platzierung weiterspielen (Legacy beendet beim ersten Sieger).
   **Antwort:** Cricket nicht bis zur letzten Platzierung weiterspielen, also Default.
2. **Elimination, mehrere Spieler auf demselben Stand:** Default: alle werden genullt (Legacy nullt nur den ersten gefundenen).
   **Antwort:** Kommt nicht vor, weil der erste Spieler den anderen schon genullt hätte. Umgesetzt wird der Default; gleiche Stände gibt es nur bei 0, dort ändert das Nullen nichts.
3. **Elimination Platzierungen:** Default: Sieger, Rest nach Punkten.
   **Ohne Antwort:** Default.
4. **SplitScore Gleichstand am Ende:** Default: geteilter Platz.
   **Ohne Antwort:** Default.
5. **SplitScore Hinweiszeile** „Ziel: 17“ oder zusätzlich auf dem Keypad das Zielfeld hervorheben (Default: nur Hinweiszeile; Hervorhebung ist eine kleine Ergänzung, falls gewünscht).
   **Antwort:** Nur „Ziel: 17“.
