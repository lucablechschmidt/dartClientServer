# M14-Plan – Styling

> Detailplan zu `project.md` M14. Zusammengeführt aus zwei Fragen in `docs/fragen.md` (6.11.2026): „Responsives Layout auf dem Desktop“ und „Dezente Animationen wie unter iOS“. Luca hat beide beantwortet und als eigenen Meilenstein „Styling“ eingeordnet.
> Stand: erste Fassung, 6.11.2026. Umsetzung beginnt mit Teil A.
> Luca: §0.

---

## 0. Was Luca tut

1. Nach Teil A die Screenshots `docs/screenshots/*-desktop.png` ansehen.
2. Nach Teil B Schritt 2 die Animationen am Board am Handy abnehmen. Erst danach kommt Schritt 3 (Kandidaten 3 und 8).
3. Die zurückgestellten Punkte (§3) bei Bedarf wieder aufnehmen.

## 1. Entscheidungen (aus `fragen.md`, 6.11.2026)

| Frage | Entscheidung |
|---|---|
| Umfang Layout | A wie vorgeschlagen; B angepasst (§2.2); C und D zurückgestellt, ohne Entscheidung |
| Diagramm-Fix vorziehen | ja (Default): der Fehler betrifft auch Tablets |
| Breiten | schmal `max-w-xl` (576 px), breit `max-w-5xl` (1024 px) (Default) |
| Seitenleiste auf dem Desktop | nein, die Tab-Leiste bleibt unten (Default) |
| Umfang Animationen | 1, 2, 5, 6 und 7 zuerst; 3 und 8 erst nach Abnahme am Board; 9 gar nicht |
| Zählscreen | nur Kandidat 6, ohne Verzögerung (Default) |
| Reduzierte Bewegung | nur die Systemeinstellung, kein Schalter in der App (Default) |
| Einordnung | eigener Meilenstein „Styling“, hier |

Animationen sind eine Ergänzung: Legacy hat keine eigenen, nur die SwiftUI-Standardbewegungen (Sheets, Navigation, Disclosure).

---

## 2. Teil A – Responsives Layout

Grundlage sind die Screenshots `docs/screenshots/*-desktop.png` (1440×900, aus `e2e/desktop.spec.ts`). Der Zählscreen ist im Querformat brauchbar und bleibt unverändert.

### 2.1 Average-Diagramm (zuerst)

- Heute streckt die viewBox auf die volle Breite, und die Achsenschrift wächst mit (bei 1440 px ist die „200“ riesig).
- Neu: Das Diagramm misst seine Breite (`ResizeObserver`) und rechnet die viewBox in Pixeln. Die Höhe ist fest (Token), die Schrift bleibt bei `text-xs`, die Linie bei 2 px.
- Test: Breite 320 und 1000 ergeben dieselbe Höhe und dieselbe Schriftgröße; der nächstgelegene Punkt wird weiter richtig gewählt.
- **Commit:** `fix(stats): keep the average chart's size and text fixed on wide screens`

### 2.2 Seitenrahmen `PageFrame` (A)

- Neuer Baustein `src/components/ui/page-frame.tsx` mit `width="narrow" | "wide"`.
- Zwei Breiten als Tokens in `globals.css`: `--container-page` (schmal, 36rem = `max-w-xl`) und `--container-page-wide` (breit, 64rem = `max-w-5xl`), Klassen `max-w-page` und `max-w-page-wide`.
- Überschrift, Zurück-Button, Abschnittslabels, `FoldCard` und Karten sitzen in derselben mittigen Spalte.
- Die einzelnen Bausteine (`CardList`, Setup) verlieren ihr eigenes `max-w-xl`.
- Schmal: Übersicht, Spieler, Konto, Verwaltung, Turniere, Setup, Erfolge. Breit: Statistik, Rangliste, Spielstatistik.
- `theme.md` bekommt Abschnitt §4 „Breiten“, `/dev/theme` zeigt den Baustein.
- **Commit:** `feat(ui): page frame with a narrow and a wide column`

### 2.3 Statistik im breiten Rahmen (B, angepasst)

- **Handy:** alles untereinander wie heute.
- **Breiter Rahmen (ab `lg`):**
  - Kacheln oben, 3 Spalten am Handy, im breiten Rahmen 5.
  - Darunter Average-Diagramm und Dartscheibe nebeneinander.
  - Die letzten Spiele immer ganz unten, über die volle Breite.
- **Commit:** `feat(stats): chart and dartboard side by side in the wide frame`

---

## 3. Zurückgestellt (ohne Entscheidung)

- **C:** Spielstatistik mit den Legs nebeneinander (Raster aus Leg-Tabellen); Rangliste im breiten Rahmen einspaltig. Den breiten Rahmen bekommen beide schon mit 2.2.
- **D:** Spielmenü ab `md` als Kachelraster mit „Letzte Spiele“ daneben; Erfolge ab `lg` zweispaltig.
- **Animation 9:** Seitenwechsel per View Transitions, gar nicht.

---

## 4. Teil B – Animationen

### 4.1 Grundsätze

- **Kurz und ruhig:** 150–350 ms mit der iOS-Kurve (schnell an, weich aus). Keine Federn, kein Wackeln, kein Konfetti.
- **Tokens statt Einzelwerte:** `--duration-fast`, `--duration-base`, `--duration-slow` und `--ease-ios` in `globals.css`. `theme.md` bekommt Abschnitt §5 „Bewegung“.
- **Reduzierte Bewegung:** alles nur mit `motion-safe:`. Wer „Bewegung reduzieren“ eingeschaltet hat, sieht keine Animation.
- **Billig fürs Handy:** nur `transform` und `opacity`, keine Bibliothek. Erscheinen per CSS `@starting-style`, Aufklappen über `grid-rows-[0fr→1fr]` (als `@utility`).
- **Zählen bleibt sofort:** Keine Animation verzögert eine Eingabe, einen Spielerwechsel oder den Sieg-Screen.
- **Keine animierten Zahlen:** hoch- oder runterzählende Punktstände verzögern das Ablesen.

### 4.2 Schritt 1: Tokens

- Tokens und Utilities in `globals.css`, Abschnitt in `theme.md`, `/dev/theme` zeigt sie.
- **Commit:** `style(theme): motion tokens`

### 4.3 Schritt 2: die kleinen Kandidaten (je ein Commit)

| # | Wo | Was | Commit |
|---|----|-----|--------|
| 1 | `ConfirmSheet` | Abdunklung blendet ein, das Sheet gleitet von unten herein | `style(ui): slide in the confirm sheet` |
| 2 | `FoldCard`, `ChoiceMenu` | Chevron dreht sich, der Inhalt klappt in der Höhe auf | `style(ui): animate folding cards and choice menus` |
| 5 | `CardLinkRow`, Spielerliste, Spielmenü | kurzes Abdunkeln beim Antippen wie iOS-Listenzeilen | `style(ui): tap feedback on rows` |
| 6 | Zählscreen | neuer Dart „setzt sich“ (0,9 → 1); Rahmen des aktiven Spielers wechselt weich | `style(scoreboard): settle new darts, fade the active frame` |
| 7 | Sieg- und Leg-Sieg-Screen | Inhalt blendet mit leichtem Hochschieben ein; Erfolgs-Banner gleitet von oben herein | `style(game): fade in the victory screens` |

Hinweis zu M13 Paket F: Wird `ConfirmSheet` dort auf `<dialog>` umgestellt, zieht die Animation aus 1 mit (`@starting-style` funktioniert auch für `dialog[open]` und `::backdrop`).

### 4.4 Schritt 3: nach Abnahme am Board

| # | Wo | Was |
|---|----|-----|
| 3 | `PillLinks`, Optionspillen | die Markierung gleitet zur gewählten Option (Segmented Control) |
| 8 | Statistik | Fortschrittsbalken und Average-Linie zeichnen sich beim ersten Anzeigen |

Kandidat 4 (Tab-Leiste blendet über) steht nicht in der Antwort und bleibt offen.

---

## 5. DoD

- Auf 1440 px sitzen Überschrift, Labels und Karten jeder Tab-Seite in einer Spalte; die Statistik zeigt Diagramm und Dartscheibe nebeneinander mit normaler Achsenschrift (`docs/screenshots/*-desktop.png`).
- Am Handy (375 px) sieht alles aus wie vorher.
- Mit „Bewegung reduzieren“ läuft keine Animation; der Zählscreen nimmt Eingaben ohne Wartezeit an (e2e unverändert grün).
