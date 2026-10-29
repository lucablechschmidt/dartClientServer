# M5-Plan – X01 vollständig

> Detailplan zu `project.md` M5. Kommt nach M4. Alles hier ist Domäne plus die Projektion auf den Zählscreen; am Netzprotokoll (E11) und an den Rechten (E13) ändert sich nichts. Test-first, jeder grüne Schritt ein Commit.
> Stand: erste Fassung, 23.10.2026. Noch nicht umgesetzt.
> Luca: §0 und die Fragen in §9.

---

## 0. Was Luca tut

1. Die Fragen in §9 beantworten (Anwurf bei Sets, Platzierungsregel, Sieg-Screen bei Best-of).
2. Für die DoD ein Best-of-3-Legs-Match zu zweit und ein 4-Spieler-Spiel am Board bereithalten.

---

## 1. Was sich ändert

Heute ist ein Match genau ein Leg: Sieg = Match zu Ende. Ab M5 besteht ein Match aus Legs und Sets (Setup-Pillen Sets und Legs werden scharf), der Anwurf wechselt pro Leg, bei 3+ Spielern wird ein Leg bis zur letzten Platzierung ausgespielt, und Undo geht über Leg-, Set- und Match-Grenzen zurück. Die Spielübersicht aus M4 bekommt die Historie beendeter und abgebrochener Matches.

## 2. Grundentscheidungen

- **Ein `MatchState` über den Legs.** `LegState` bleibt wie heute die Einheit, die `applyDart` und `undoDart` kennen. Neu: `src/domain/x01/match.ts` mit `MatchState = { rules, players, legs: LegState[], legsToWinSet, setsToWinMatch }` und reinen Funktionen `matchStatus(state)` (laufend, Leg zu Ende, Set zu Ende, Match zu Ende), `legWins`, `setWins`, `nextStarter`, `placements(leg)`. `replay` liest alle Legs eines Matches, nicht nur das letzte.
- **Leg-Ende ist eine Projektion**, kein Ereignis: Ein Leg ist zu Ende, wenn bei 2 Spielern einer ausgecheckt hat, bei 3+ Spielern alle bis auf einen (E7). Die Platzierung ist die Reihenfolge der Checkouts, der letzte bekommt den letzten Platz. Der Server legt das nächste Leg erst an, wenn die erste Aufnahme darin kommt (`commitVisit` mit `legNo + 1`); damit ist Undo über die Leg-Grenze schlicht „letzte Aufnahme des vorigen Legs löschen, leeres Leg löschen“.
- **Sets und Legs nur bei 2 Spielern (E7).** Bei 3+ Spielern erzwingt das Setup Sets 1 und Legs 1; die Pillen sind dann deaktiviert. Ein Mehrspieler-Match ist ein Leg mit Platzierungen.
- **Anwurf**: wechselt pro Leg zyklisch in Setup-Reihenfolge, beginnend beim Starter des Matches. Vor dem ersten Dart eines Legs kann der Host den Starter per Tipp auf ein Panel ändern („ToStart“ aus Legacy, hier bei jeder Spielerzahl). Beim Set-Wechsel: siehe §9.
- **Match-Ende**: Sieger = erster mit `setsToWinMatch` Sets; `match.status = finished`, Sieg-Screen zeigt Legs und Sets. Restart übernimmt Regeln, Modus, Host; Starter rückt einen weiter (wie heute).
- **Undo** bleibt „letzte gespeicherte Aufnahme weg“ (`undoVisit`), aber über Leg- und Set-Grenzen: Ist das aktuelle Leg leer, wird es gelöscht und die letzte Aufnahme des vorigen Legs geöffnet; `winner_player_id`, `placement`, `finished_at` und `status` werden neu projiziert. Vom Sieg-Screen aus heißt das weiterhin „Letzten Wurf rückgängig“.
- **Historie**: Spielübersicht bekommt unter den laufenden Matches „Letzte Spiele“ (beendet oder abgebrochen, letzte 20) mit Sieger und Ergebnis; Tippen öffnet den Zählscreen schreibgeschützt (M4: `match-closed`). Eine Match-Detailansicht mit Statistik kommt erst in M8.

## 3. Domäne: Legs, Sets, Platzierungen (Test-first)

**Dateien**

- `src/domain/x01/match.ts`: Typen und Funktionen aus §2; `src/domain/x01/match.test.ts`.
- `src/domain/x01/selectors.ts`: `placements(state)` für ein Leg mit 3+ Spielern (Reihenfolge der Checkouts); `isLegFinished(state)` ersetzt `winnerOf` als Abbruchkriterium (bei 2 Spielern identisch).
- `src/domain/x01/apply.ts`: nach einem Checkout bei 3+ Spielern wechselt der Zug zum nächsten Spieler, der noch im Leg ist; ausgeschiedene Spieler werden übersprungen (heute endet das Leg).
- `src/domain/x01/replay.ts`: `replayMatch(players, rules, legs: Visit[][], starters) → MatchState`.

**Tests (Tabelle, Auszug)**

| Fall                                             | Erwartung                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2 Spieler, Best of 3 Legs, A gewinnt Leg 1 und 2 | Set 1 an A, Match `finished`, Sieger A                                                                                                                       |
| 2 Spieler, 3 Sets × 3 Legs                       | Set-Zähler stimmt, Match erst nach 2 Sets vorbei                                                                                                             |
| Anwurf                                           | Leg 1 Starter A, Leg 2 B, Leg 3 A (2 Spieler); 3 Spieler zyklisch                                                                                            |
| 4 Spieler, Platzierungen                         | C checkt zuerst aus → Platz 1, Zug geht zu D (nicht zu A), A ausgeschieden wird übersprungen, letzter Spieler bekommt Platz 4 ohne zu werfen, Leg `finished` |
| 4 Spieler, Undo nach dem ersten Checkout         | Platz 1 wieder offen, Zug wieder bei C                                                                                                                       |
| Undo über Leg-Grenze                             | leeres Leg 2 verschwindet, Leg 1 wieder offen, Sieger weg                                                                                                    |
| Undo über Set-Grenze                             | Set-Zähler zurück                                                                                                                                            |
| Starter ändern nach dem ersten Dart              | abgelehnt                                                                                                                                                    |
| Replay von 3 Legs == Folge von applyDart         | identisch (Property-Test mit Zufallsdarts)                                                                                                                   |

- **Commit:** „M5: Legs, Sets, Platzierungen in der Domäne“

## 4. Persistenz und Services

- `src/db/repository.ts`: `loadMatch` liefert alle Legs mit Aufnahmen (bisher nur das letzte) und `match_player.placement`; neu `createLeg(matchId, setNo, legNo, starterPlayerId)`, `deleteLeg(legId)`, `setPlacement(matchId, playerId, placement | null)`, `setLegStarter(legId, playerId)`, `listFinishedMatches(limit)` mit Sieger und Ergebnis (Legs/Sets oder Platzierungen).
- `src/server/match-service.ts`: `commitVisit` nimmt zusätzlich `legNo` (Client sagt, in welchem Leg die Aufnahme liegt; stimmt es nicht mit der Projektion überein → `out-of-sync`); legt bei Bedarf das nächste Leg an; projiziert nach jeder Aufnahme Leg-Sieger, Platzierungen, Set- und Match-Ende. `undoVisit` über Leg-Grenzen wie in §2. Neu `setStarter(deps, session, matchId, playerId)` (nur Host/Admin, nur vor dem ersten Dart des Legs). `createMatch` validiert: 3+ Spieler → Sets 1, Legs 1.
- `MatchView` bekommt `legs: { setNo, legNo, winner }[]`, `score: { legs, sets }` je Spieler, `placements`, `currentLeg`.
- Tests in `match-service.test.ts`: Best-of-3 komplett über `commitVisit`, Undo über die Leg-Grenze, 4-Spieler-Leg bis Platz 4, `setStarter` nach dem ersten Dart abgelehnt.
- **Commit:** „M5: Legs und Sets im Server“

## 5. Zählscreen und Sieg-Screen

- `scoreboard-screen.tsx`: lokale Zustände über `MatchState` statt `LegState`; Leg-Ende ohne Match-Ende zeigt kurz „Leg für A“ als Overlay (2 s oder Tipp, wiederverwendbares `ConfirmSheet` aus M4 ohne Buttons), danach startet das nächste Leg mit neuem Anwurf. Kopfzeile zeigt bei Sets/Legs den Stand „Legs 1:0 · Sets 0:0“ an Stelle der Regel-Zeile, wenn Platz fehlt.
- `player-panel.tsx`: Legs/Sets-Zähler klein unter dem Namen (nur wenn > 1 konfiguriert); bei 3+ Spielern Platzierung „1.“ statt Rest, sobald ein Spieler ausgecheckt hat; ausgeschiedene Panels gedimmt. Tipp auf ein Panel vor dem ersten Dart des Legs → `setStarter` (nur wenn `canEnter`).
- `victory-screen.tsx`: Ergebnis in Legs/Sets, bei 3+ Spielern die Platzierungstabelle; Buttons wie heute.
- `new-match-form.tsx`: Pillen Sets und Legs aktiv (1/3/5), deaktiviert ab 3 gewählten Spielern mit Hinweistext.
- Tests: `player-panel`-Fixtures für Platzierung und Legs-Zähler; `new-match-form.test.tsx` für die Sperre ab 3 Spielern.
- **Commit:** „M5: Zählscreen mit Legs, Sets und Platzierungen“

## 6. Historie

- `game-menu.tsx`: Block „Letzte Spiele“ unter den laufenden (`listFinishedMatches(20)`): Datum, Teilnehmer, Ergebnis („A 2:1“ oder „1. C, 2. A, …“), abgebrochene mit Kennzeichen; Tippen öffnet `/match/[id]` schreibgeschützt.
- **Commit:** „M5: Historie in der Spielübersicht“

## 7. Smoke-Test, Abdeckung, DoD

- `scripts/smoke-match.mjs`: Best-of-3 zu zweit (Leg-Overlay, Anwurfwechsel, Undo über die Leg-Grenze zurück ins erste Leg), 4-Spieler-Spiel bis Platz 4 (Admin + Gäste), Historie zeigt beide.
- `npm run test:coverage`: `src/domain` über 90 % (DoD); fehlende Zweige nachziehen.
- Deploy nur auf Zuruf, danach DoD am Board.
- **Commit:** „M5: Smoke-Test Legs und Platzierungen“, nach der DoD „M5: done“

---

## 8. Nicht in M5

Turniermodus, 180-Sound, Statistik (M8), andere Modi (M7), Netzausfall-Tests (M6).

## 9. Offene Fragen (Defaults gelten ohne Antwort)

1. **Anwurf beim Set-Wechsel:** Default: der Anwurf läuft einfach weiter zyklisch über alle Legs des Matches (Leg 1 A, Leg 2 B, Leg 3 A, Set 2 Leg 1 B …). Alternative: jedes Set beginnt der, der das vorige Set nicht begonnen hat. Anwurf läuft einfach yklisch über Legs udn Sets weiter
2. **Platzierung des letzten Spielers:** Default: Der letzte Spieler bekommt den letzten Platz, sobald alle anderen ausgecheckt haben, ohne selbst noch zu werfen. Alternative: Er spielt zu Ende (bringt nichts für die Platzierung, aber Statistik). Im endscreen kann man auswählen ob der letzte Spieler noch auschecken muss, jedoch kann dieser jederzeit "aufgeben"
3. **Leg-Overlay:** 2 s automatisch oder per Tipp weg (Default: beides, was zuerst kommt). Alternative: eigener Leg-Sieg-Screen wie `LegVictoryView` in Legacy. Eigener Leg-Sieg-Screen um Undo beim letzten dart im leg einfacher zu machen, Leg-Sieg-Screen wird beendet wenn man irgendwo auf den Bildschirm tippt, bis auf einen Undo button
4. **„Legs 1:0“ in der Kopfzeile** statt der Regel-Zeile, nur wenn Sets oder Legs > 1 (Default). Alternative: immer im Panel. Nur wenn Sets oder Legs > 1
