# Legacy-Analyse – iOS-App „Dart“ (Swift)

> Quelle: `Legacy/Dart/` (SwiftUI + SwiftData, Jan 2025). Diese Datei ist die Referenz für den Port:
> Datenmodell, Regeln, Screens und Statistiken, plus die Stellen, an denen die Web-App bewusst abweicht.
> Testfälle für M1/M5 werden aus den Abschnitten 3 bis 6 abgeleitet.

---

## 1. Datenmodell

| Swift | Bedeutung | Web-Gegenstück |
|---|---|---|
| `Player` (`@Model`, SwiftData) | Einziges persistiertes Objekt: `playerId`, `name`, `timestamp`. Gleichheit über Objektidentität. | Tabelle `player` |
| `SingleDartsScore` | Ein Dart: `field` 0–20 oder 25 (Bull), `scoreType` normal/double/triple/overthrown/unset, `totalScoreOfDart` = field × Multiplikator. `overthrown` und `unset` zählen 0. | Zwei Spalten pro Dart-Platz in `visit`: `dN_field`, `dN_type` |
| `DartThrow` | Eine **Aufnahme**: `FixedSizeArray` mit genau 3 Plätzen, `dartThrowScore` (abgeleitet), `faulty` (Bust). | Zeile in `visit` |
| `Game` | Laufendes Spiel im Speicher: `players`, `playerScores[playerId]`, `dartThrows[playerId] → [DartThrow]`, `currentPlayer`, `currentDartThrow`, `gameHasEnded`. Nichts davon wird gespeichert. | `match` + `leg` + `visit`, Zustand wird per Replay abgeleitet |
| `Leg` | Angelegt, aber nicht wirksam: `switchLegs`/`switchSets` sind leer, `createClassicGame` ignoriert `setsToWinGame`/`legsToWinSet`. | Tabelle `leg`, Sets abgeleitet |

**Grundprinzip, das übernommen wird:** Es werden nur Darts in Aufnahmen gespeichert. Restpunkte, Durchschnitte, Sieger sind abgeleitet. Undo arbeitet auf der Historie.

---

## 2. Aufnahme (`DartThrow`) im Detail

- `addSingleDartScore(score)`: Dart auf den nächsten freien Platz, Score neu berechnen.
- `addFaultyDartScore()` (**Bust, X01**): alle noch freien Plätze werden mit `overthrown` gefüllt, `faulty = true`. Die Aufnahme zählt 0, die Darts davor bleiben sichtbar.
- `addSingleFaultyDartScore()` (Elimination, SplitScore): nur **ein** Platz wird `overthrown`, kein `faulty`.
- `removeLastDartThrow()`: bei `faulty` werden alle `overthrown`-Plätze auf einmal entfernt und `faulty` zurückgesetzt; sonst nur der letzte Dart.
- Darstellung eines Darts: `D20`, `T19`, `20`, `Bull`, `DBull`.

---

## 3. X01 („Classic Game“)

**Setup** (`ClassicGameSetUpView`): In-Regel (SingleIn, DoubleIn, TripleIn), Out-Regel (SingleOut, DoubleOut, TripleOut), Startpunkte 501/401/301, Sets 1/3/5, Legs 1/3/5, Spielerauswahl in Reihenfolge. Default: SingleIn, DoubleOut, 501, 1 Set, 1 Leg. Start erst, wenn mindestens ein Spieler gewählt ist.

**Pro Dart** (`ClassicGame.addDartThrow`), in dieser Reihenfolge:

1. **Gültigkeit** (`isValidDartScore`):
   - Spieler steht noch auf Startpunkten → In-Regel: DoubleIn verlangt ein Doppel, TripleIn ein Triple, sonst ist der Dart ungültig.
   - Dart bringt Rest exakt auf 0 → Out-Regel: DoubleOut verlangt ein Doppel, TripleOut ein Triple.
   - Sonst Bust-Grenze: Rest nach dem Dart darf nicht unter 1 (SingleOut), 2 (DoubleOut), 3 (TripleOut) fallen.
2. **Ungültig → Bust**: Punkte der bereits geworfenen Darts dieser Aufnahme werden zurückgebucht, Aufnahme wird `faulty`, Spielerwechsel.
3. **Rest 0 → Sieg**: Dart wird gebucht, Aufnahme in die Historie, `gameHasEnded = true`. Kein Spielerwechsel.
4. **Sonst**: Dart buchen. Nach dem dritten Dart Spielerwechsel; bei 180 wird ein Sound abgespielt (`180-1`…`180-3`).

**Spielerwechsel**: zyklisch in Setup-Reihenfolge. Die fertige Aufnahme wandert in `dartThrows[player]`, neue leere Aufnahme.

**Undo** (`removeDartThrow`):
- Nichts zu tun, wenn noch kein Dart im Spiel geworfen wurde.
- Ist die aktuelle Aufnahme leer, wird zum vorherigen Spieler gewechselt und dessen letzte Aufnahme wieder geöffnet.
- Dann letzter Dart raus (bei Bust: alle `overthrown` auf einmal) und Rest korrigieren.
- Vom Sieg-Screen aus: „Letzten Wurf rückgängig machen“ (`removeWinningDart`) nimmt den Siegdart zurück und geht ins Spiel zurück.

**Anwurf**: Button „ToStart“ im Spieler-Panel, nur solange noch kein Dart geworfen ist, und nur bei genau 2 Spielern. **Restart** setzt alles zurück und lässt den **letzten** Spieler der Reihenfolge anfangen (Anwurf wechselt).

**Checkout-Hinweis** (`Checkouts.swift`): drei Tabellen Rest → Finish-Weg, für 3, 2 und 1 verbleibende Darts (z. B. 170 → „T20, T20, Bullseye“). Angezeigt wird der erste Eintrag, sobald der Rest mit den verbleibenden Darts der aktuellen Aufnahme ausmachbar ist.

**Sieg-Screen**: „You Win! Name“, Darts des Siegers, Average (per Tipp umschaltbar zwischen 3-Dart-Average und Average pro Dart), die anderen Spieler mit Rest sortiert, Buttons „Letzten Wurf rückgängig“, „Restart Game“ (gleiche Spieler, Anwurf wechselt), zurück ins Setup.

---

## 4. Cricket

Felder 15–20 und Bull. Jeder Treffer zählt `Multiplikator` Marks auf das Feld (T20 = 3 Marks). Ab dem 4. Mark eines Spielers auf einem Feld gibt es Punkte (Feldwert × überzählige Marks), **solange das Feld nicht von allen Spielern geschlossen ist** (3 Marks pro Spieler). Treffer außerhalb 15–20/Bull landen auf Feld „0“ und zählen nichts. Sieg: aktueller Spieler hat alle Felder geschlossen **und** die höchste Punktzahl; geprüft nach jedem Dart und beim Spielerwechsel. Undo nimmt Marks und Punkte zurück.

## 5. Elimination

Startpunkte 0, Ziel `finishPoints` (Setup, z. B. 301) mit Out-Regel. Punkte zählen **hoch**. Dart ungültig, wenn er über das Ziel führt oder das Ziel ohne passende Out-Regel trifft → nur dieser Dart wird `overthrown`, Spielerwechsel. Landet ein Spieler **exakt** auf dem Punktestand eines Mitspielers, wird dieser auf 0 zurückgesetzt (`Elimination` merkt sich Dart und Opfer, damit Undo es zurückholt). Anzeige „nächste Elimination in N Punkten“. 180-Sound.

## 6. SplitScore

Alle starten mit 40. Reihenfolge der Zielfelder: 15, 16, Doppel (beliebig), 17, 18, Triple (beliebig), 19, 20, Bull. Pro Runde ein Zielfeld; nach dem letzten Spieler rückt das Ziel weiter, nach Bull ist das Spiel vorbei. Ein Dart, der das Ziel nicht trifft, wird `overthrown`. Beim Spielerwechsel: mindestens ein Treffer → Punkte der Aufnahme addiert, sonst Punkte **halbiert** (aufgerundet, `(score+1)/2`). Undo rechnet den Punktestand aus der Historie neu (`recalculateScores`).

---

## 7. Screens und Zustandsautomat

```
HomeView (Tabs: New Game | Players)
 └ NewGameView  ── GameViews: GameSelection → ClassicGame | CricketGame | EliminationGame | SplitScore
     └ <Mode>ManagerView ── GameViewStates: gameSetUp → gameInProgress → gameVictory (→ gameInProgress per Undo/Restart | → gameSetUp)
         ├ <Mode>SetUpView          Optionen + PlayerSelectionView
         ├ <Mode>InProgressView     oben 2/5 Spieler-Panels, unten 2/5 Checkout-Hinweis + Keypad
         └ <Mode>VictoryView
```

**Spieler-Panels** (`PlayerDetailView`): Name, Rest, 🎯 Anzahl Darts, 3-Dart-Average, die drei Dart-Plätze der letzten/aktuellen Aufnahme (leerer Platz = noch nicht geworfen, aktueller Platz markiert), blauer Rahmen für den Spieler am Zug. Bis 2 Spieler: zwei große Panels untereinander. Ab 3 Spielern (`MultiplayerView`): großes Panel für den aktuellen Spieler, darunter horizontal scrollbare Kleinpanels aller Spieler.

**Keypad** (`ScoreInputView` + `ButtonsView`), fünf Reihen:

```
 1   2   3   4   5
 6   7   8   9  10
11  12  13  14  15
16  17  18  19  20
Bull  0  Undo  Double  Triple
```

- Double/Triple sind **Modifier-Toggles** (gegenseitig ausschließend), gelten für den nächsten Zahl-Tipp und springen danach zurück. Zahlentasten färben sich im Modifier-Modus (Doppel gelb, Triple grün).
- Bei aktivem Triple ist Bull ausgeblendet (es gibt kein Triple-Bull).
- 0 = Fehlwurf (zählt als geworfener Dart mit 0 Punkten).
- Undo wie in §3.

**Spielerverwaltung** (`PlayersListView`): Liste, Anlegen per Textfeld, Umbenennen, Löschen per Swipe. Keine Nutzerkonten, keine Trennung Spieler/Nutzer.

**Farben** (`Assets.xcassets`, je Light und Dark): `TextColor`, `FrameBackground`, `FrameForeground`, `ScoreButtonsBackgroundColor`, `ScoreButtonsForegroundColor`, `zero`, `double`, `triple`, `undo`, `CricketFieldClosed`. Übersetzung in CSS-Tokens: `theme.md`.

**Layout**: alle Höhen und Breiten sind Bruchteile von `UIScreen.main.bounds` (Panels 2/5, Keypad 2/5, Hinweis 1/30 der Höhe), Schrift fest 50 pt im Tab-View. Skaliert nicht auf andere Geräte oder Querformat; der Port ersetzt das (`theme.md` §3).

---

## 8. Statistiken in der App

- **Darts geworfen** pro Spieler (`getPlayerDarts`), inklusive aktueller Aufnahme.
- **3-Dart-Average** (`getPlayerAverage`): Punkte aller **abgeschlossenen, nicht gebusteten** Aufnahmen ÷ Anzahl abgeschlossener Aufnahmen. Die laufende Aufnahme zählt nicht.
- **Average pro Dart** (`getPlayerDartAverage`): gleiche Punkte ÷ Aufnahmen (im Spiel) bzw. ÷ Darts (nach Sieg). Nur auf dem Sieg-Screen, per Tipp umschaltbar.
- Sortierung nach Rest auf dem Sieg-Screen.

Nichts wird über das Spiel hinaus gespeichert. Alles in `project.md` M8 (First-9, Checkout-Quote, 180er, Elo, Feldtreffer) ist neu.

---

## 9. Bekannte Lücken und Eigenheiten im Legacy-Code

Werden im Port **nicht** übernommen:

- Sets und Legs sind im Setup wählbar, aber nicht implementiert (Leg-Wechsel, Set-Wechsel, Match-Ende fehlen). → M5.
- `Leg.getAverage` hat Integer-Division und einen Off-by-one; wird durch die Statistik-Domäne ersetzt.
- `Game.removeDartThrow` prüft „darf Undo“ über `dart.darts.count > 1` statt `> 0`; der Port prüft schlicht, ob irgendein Dart existiert.
- „ToStart“ nur bei genau 2 Spielern; der Port erlaubt Anwurf-Wahl bei jeder Spielerzahl vor dem ersten Dart.
- Nach einem Sieg mit 3+ Spielern ist das Spiel vorbei; der Port spielt **alle Platzierungen aus** (siehe `architecture.md` §1, E7).
- `ContentView`, `Item`, `RootView`, `CustomTabBar`, `TestingView`, `TextTestView`, `LegVictoryView`, `Tournament.swift` (Round-Robin-Generator, unbenutzt) sind Platzhalter oder Experimente.
- Der 180-Sound: drei `.m4a`-Dateien in `Assets.xcassets/180-*.dataset`, eine wird zufällig gespielt. Web: Backlog (`<audio>` mit den drei Dateien, nach Konvertierung zu `.mp3`/`.ogg`).
