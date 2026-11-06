# Offene Fragen an Luca

> Fragen, die auf eine Entscheidung warten. Antworten direkt darunter eintragen („**Antwort:** …“); beantwortete Fragen wandern in den passenden Plan oder nach `architecture.md` §11 und werden hier gelöscht.

---

## 1. Responsives Layout auf dem Desktop (6.11.2026)

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
