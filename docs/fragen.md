# Offene Fragen an Luca

> Fragen, die auf eine Entscheidung warten. Antworten direkt darunter eintragen („**Antwort:** …“); beantwortete Fragen wandern in den passenden Plan oder nach `architecture.md` §11 und werden hier gelöscht.

---

## 1. Responsives Layout auf dem Desktop (6.11.2026)

> **Zurückgestellt** am 6.11.2026 (Luca). Die Fragen bleiben stehen, bis wir es wieder aufnehmen.

Grundlage sind die Screenshots `docs/screenshots/*-desktop.png` (1440×900, hell, aus `e2e/desktop.spec.ts`).

### Befund

1. **Uneinheitliche Breiten:** `CardList` und das Setup sind auf `max-w-xl` begrenzt und mittig. Überschriften, Abschnittslabels, `FoldCard`, `SubPage` und die Statistik gehen über die volle Breite. Im Admin stehen die Labels deshalb links außen, die Karten in der Mitte und „Spiele und Turniere“ wieder über die volle Breite (`admin-desktop.png`, ähnlich `overview-desktop.png`).
2. **Average-Diagramm skaliert mit:** Die viewBox wird auf die volle Breite gestreckt, mit ihr die Achsenschrift. Bei 1440 px ist die „200“ riesig, und man sieht praktisch nur eine Achse (`account-stats-desktop.png`). Das betrifft auch Tablets.
3. **Viel leere Fläche:**
   - Die Statistik-Kacheln werden etwa 450 px breit für eine einzelne Zahl.
   - Die Spielstatistik verteilt zwei Spalten auf 1400 px, die Rangliste auch.
4. **Zählscreen:** Der ist im Querformat brauchbar (links die Panels, rechts das Keypad) und wird nicht angefasst.

### Vorschlag

- **A. Einheitlicher Seitenrahmen (Grundlage für den Rest):**
  - Ein Baustein `PageFrame` in `src/components/ui/` mit zwei Breiten als Tokens in `globals.css`:
    - schmal (`max-w-xl`) für Listen und Formulare,
    - breit (etwa `max-w-5xl`) für Statistik und Ranglisten.
  - Überschrift, Zurück-Button, Abschnittslabels und Karten sitzen in derselben Spalte.
  - Die einzelnen Bausteine verlieren ihr eigenes `max-w-xl`.
  - `theme.md` bekommt einen Abschnitt „Breiten“.
- **B. Statistik ab `lg` zweispaltig:**
  - Oben die Kacheln: am Handy 3 Spalten wie bisher, im breiten Rahmen 4 bis 5.
  - Darunter links das Average-Diagramm, rechts die Dartscheibe.
  - Das Diagramm bekommt eine feste Höhe, und seine Schrift bleibt bei `text-xs`. Dafür wird die Breite gemessen, statt die viewBox zu strecken.
  - Die letzten Spiele kommen daneben oder darunter.
- **C. Spielstatistik und Rangliste:**
  - Die Spielstatistik zeigt die Legs nebeneinander, als Raster aus Leg-Tabellen.
  - Die Rangliste bleibt eine Spalte, aber im breiten Rahmen.
- **D. Kleinere Punkte:**
  - Spielmenü auf der Übersicht ab `md` als Kachelraster, „Letzte Spiele“ daneben.
  - Erfolge ab `lg` zweispaltig.
- **Bewusst nicht:** eine Seitenleiste statt der Tab-Leiste auf dem Desktop. Das wäre ein zweites Navigationskonzept für einen Nebenschauplatz; gezählt wird am Handy.

### Fragen

1. **Umfang:** Was soll umgesetzt werden: nur A und B, alles (A–D) oder einzelne Punkte? Default: zuerst A und B, getrennt committet, danach C und D nach deinem Blick auf die Screenshots.
2. **Diagramm-Fix:** Soll der Fix des Average-Diagramms (Punkt 2 im Befund) vorgezogen werden, auch wenn der Rest wartet? Default: ja, er ist auch auf dem Tablet ein Fehler.
3. **Breiten:** Passen schmal `max-w-xl` (576 px) und breit `max-w-5xl` (1024 px)? Default: ja.
4. **Seitenleiste:** Bleibt es beim Verzicht auf eine Seitenleiste für den Desktop? Default: ja, die Tab-Leiste bleibt unten.
5. **Wohin damit:** Gehört die Umsetzung als Punkt in `docs/m11-plan.md` (Komfort) oder als eigener kleiner Plan? Default: Abschnitt in M11.

---

## 2. Dezente Animationen wie unter iOS (6.11.2026)

### Befund

- Animiert ist bisher fast nichts: nur das Keypad hat `active:scale-95`.
- Legacy hat keine eigenen Animationen. `withAnimation` steht nur im Xcode-Template `ContentView.swift`; was die App unter iOS bewegt, macht SwiftUI von selbst (Sheets, Navigation, Disclosure, Segmented Control).
- Animationen wären also eine Ergänzung und keine Abweichung von einer Legacy-Regel. Deshalb frage ich vorher.

### Grundsätze

- **Kurz und ruhig:** 150–350 ms mit der iOS-Kurve (schnell an, weich aus), keine Federn, kein Wackeln.
- **Tokens statt Einzelwerte:** `--duration-fast`, `--duration-base`, `--duration-slow` und `--ease-ios` in `globals.css`, dazu ein Abschnitt „Bewegung“ in `theme.md`.
- **Reduzierte Bewegung:** Alles läuft nur mit `motion-safe:`. Wer „Bewegung reduzieren“ eingeschaltet hat, sieht keine Animation.
- **Billig fürs Handy:** nur `transform` und `opacity`, keine Bibliothek. Erscheinen per CSS `@starting-style`, Aufklappen über den `grid-rows-[0fr→1fr]`-Trick, der in allen Browsern läuft.
- **Zählen bleibt sofort:** Keine Animation verzögert eine Eingabe, einen Wechsel des Spielers oder den Sieg-Screen. Im Zählscreen gibt es nur Rückmeldung, nie Wartezeit.

### Kandidaten

| # | Wo | Was | Aufwand |
|---|----|-----|---------|
| 1 | `ConfirmSheet` (Abbrechen, Aufgeben, Löschen) | Abdunklung blendet ein, das Sheet gleitet von unten herein wie ein iOS-Action-Sheet | klein |
| 2 | `FoldCard`, `ChoiceMenu` (Konto, Rangliste, Admin, Setup) | Chevron dreht sich, der Inhalt klappt in der Höhe auf statt zu springen | klein |
| 3 | `PillLinks`, Optionspillen (Zeitraum, Best of, Eingabe) | Die weiße Markierung gleitet zur gewählten Option wie beim iOS-Segmented-Control | mittel |
| 4 | Tab-Leiste | Die Markierung des aktiven Tabs blendet weich über; kein Gleiten, weil die Seite neu lädt | klein |
| 5 | Tippbare Zeilen und Buttons (`CardLinkRow`, Spielerliste, Spielmenü) | Kurzes Abdunkeln beim Antippen wie bei iOS-Listenzeilen; dasselbe Muster wie beim Keypad, aber als Hintergrund statt Skalierung | klein |
| 6 | Zählscreen: Dart-Felder | Ein neu eingetragener Dart „setzt sich“ (kurz von 0,9 auf 1 skaliert); der Rahmen des aktiven Spielers wechselt weich | klein |
| 7 | Sieg- und Leg-Sieg-Screen | Inhalt blendet mit leichtem Hochschieben ein; das Erfolgs-Banner gleitet von oben herein | klein |
| 8 | Statistik | Fortschrittsbalken („x von 21“) und die Linie im Average-Diagramm zeichnen sich beim ersten Anzeigen | mittel |
| 9 | Seitenwechsel (Konto → Unterseite, Zurück) | Unterseite schiebt von rechts herein, Zurück nach rechts hinaus, wie die iOS-Navigation; über die View Transitions API (Next 16 experimentell, React `<ViewTransition>`) | groß, experimentell |

### Fragen

1. **Umfang:** Welche Kandidaten sollen umgesetzt werden? Default: 1, 2, 5, 6 und 7 (klein, sichtbar, typisch iOS); 3 und 8 danach; 9 erst, wenn die View Transitions in Next stabil sind.
2. **Zählscreen:** Sind die Animationen aus 6 im Zählscreen gewünscht, oder soll er ganz ruhig bleiben? Default: ja, aber nur 6, und nur ohne Verzögerung.
3. **Reduzierte Bewegung:** Reicht die Systemeinstellung, oder soll es zusätzlich einen Schalter in der App geben (wie den Theme-Schalter)? Default: nur die Systemeinstellung.
4. **Wohin damit:** Gehört das als Abschnitt „Animationen“ in `docs/m11-plan.md` (Komfort) oder als Prompt-A-Kleinkram jetzt sofort? Default: Abschnitt in M11, ein Commit pro Kandidat.
