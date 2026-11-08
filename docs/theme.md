# Theme – Farben, Dark Mode, Layout

> Quelle: `Legacy/Dart/Assets.xcassets/*.colorset` und die Farbzuweisungen in `ButtonsView.swift` / `PlayerDetailView.swift`.
> Das Theme wird in M1 **vor** dem ersten Screen angelegt (`archive/m1-plan.md` Schritt 1b). Kein Screen verwendet Hex-Werte direkt, nur Tokens.

---

## 1. Tokens

Alle Tokens sind CSS Custom Properties auf `:root`, mit Dark-Werten unter `:root[data-theme="dark"]` und, wenn kein `data-theme` gesetzt ist, unter `@media (prefers-color-scheme: dark)`. Tailwind bindet sie als Farben ein (`bg-keypad`, `text-fg` …), damit shadcn-Komponenten und eigene Komponenten dieselbe Quelle haben.

iOS-Systemfarben sind mit ihren offiziellen Werten übersetzt (Light / Dark).

| Token | Legacy-Name | Verwendung | Light | Dark |
|---|---|---|---|---|
| `--bg` | systemBackground | Seitenhintergrund | `#FFFFFF` | `#000000` |
| `--fg` | `TextColor` (labelColor) | Fließtext, Zahlen, Namen | `#000000` | `#FFFFFF` |
| `--fg-muted` | secondaryLabel | Nebeninfos (Darts, Average) | `rgb(60 60 67 / .6)` | `rgb(235 235 245 / .6)` |
| `--frame-bg` | `FrameBackground` | Füllung der Spieler-Panels | `rgb(0 0 0 / .10)` | `#1C1C1E` (bis 6.11.2026 Legacy `rgb(255 255 255 / .90)`) |
| `--frame-fg` | `FrameForeground` | Rahmen inaktiver Panels | `#C8C8C8` | `#3A3A3C` (Legacy: `rgb(200 200 200 / .01)`, unsichtbar) |
| `--frame-active` | systemBlue (fest `Color.blue`) | Rahmen des Spielers am Zug | `#007AFF` | `#0A84FF` |
| `--key-bg` | `ScoreButtonsBackgroundColor` | Zahlentasten und Bull | `#000000` | `#2C2C2E` (Legacy: `rgb(255 255 255 / .50)`) |
| `--key-fg` | `ScoreButtonsForegroundColor` | Beschriftung aller Tasten | `#FFFFFF` | `#FFFFFF` |
| `--key-zero` | `zero` | Taste 0 | `rgb(0 0 0 / .50)` | `#48484A` (Legacy: `rgb(255 255 255 / .25)`) |
| `--key-double` | `double` (systemYellow) | Taste Double, Zahlentasten-Text im Double-Modus | `#FFCC00` | `#FFD60A` |
| `--key-triple` | `triple` (systemGreen) | Taste Triple, Zahlentasten-Text im Triple-Modus | `#34C759` | `#30D158` |
| `--key-undo` | `undo` (systemRed) | Taste Undo | `#FF3B30` | `#FF453A` |
| `--slot-bg` | `FrameBackground` (DartScoreView, über dem Panel) | Füllung der drei Dart-Kästen | `rgb(0 0 0 / .10)` | `rgb(255 255 255 / .10)` |
| `--hint-bg` | `Color.gray.opacity(0.5)` | Checkout-Hinweis-Leiste | `rgb(142 142 147 / .5)` | `rgb(142 142 147 / .5)` |
| `--cricket-closed` | `CricketFieldClosed` (M7) | Cricket-Feld, das alle geschlossen haben (Zeile und Felder, Symbol in `--on-accent`) | `#8E8E93` | `rgb(200 200 200 / .5)` |
| `--cricket-scoring` | – (Figma-Cricket) | Feld, das der Spieler geschlossen hat, aber nicht alle; Symbol in `--key-triple` | `--key-triple` 20 % | `--key-triple` 20 % |
| `--accent` | `AccentColor` (leer) | Links, aktiver Tab | `= --frame-active` | `= --frame-active` |
| `--bg-grouped` | systemGroupedBackground (`List`) | Hintergrund der Listen-Screens (Setup, Spieler) | `#F2F2F7` | `#000000` |
| `--card-bg` | secondarySystemGroupedBackground | Karte mit den Listenzeilen | `#FFFFFF` | `#1C1C1E` |
| `--separator` | separator | Trennlinie zwischen Listenzeilen | `rgb(60 60 67 / .29)` | `rgb(84 84 88 / .6)` |
| `--accent-soft` | – (Figma-Setup) | Avatar, Kästchen mit dem Ziel-Icon | `--accent` 15 % | `--accent` 15 % |
| `--accent-wash` | – (Figma-Setup) | gewählte Option, geöffnete Kachel | `--accent` 10 % | `--accent` 10 % |
| `--fill` | – (Figma-Setup) | Kacheln Einstieg/Abschluss, Plus-Taste | `--fg` 5 % | `--fg` 5 % |
| `--fill-strong` | – (Figma-Setup) | Gast-Avatar, „GAST“-Kennzeichen, aktiver Tab | `--fg` 10 % | `--fg` 10 % |
| `--on-accent` | – | Text und Icons auf Akzent, Undo-Rot und Hinweis-Grau | `#FFFFFF` | `#FFFFFF` |
| `--scrim` | – | Abdunklung hinter dem Bestätigungs-Dialog | `rgb(0 0 0 / .4)` | `rgb(0 0 0 / .4)` |
| `--modifier-ring` | – (Fokus der Modifier in `ButtonsView`) | Ring um aktives Double/Triple | `--fg` 60 % | `--fg` 60 % |
| `--heat-1` … `--heat-5` | – (neu, M8) | Feldtreffer-Heatmap auf der Dartscheibe: ein Farbton (Akzentblau), sequentiell nach Trefferanteil | oklch L 0,92 → 0,42 (hell → dunkel) | oklch L 0,32 → 0,80 (dunkel → hell) |
| `--qr-bg` | – | heller Grund des QR-Codes (muss in beiden Modi scanbar sein) | `#FFFFFF` | `#FFFFFF` |
| `--tab-bg` | Tab-Bar-Material | Tab-Leiste unten | `rgb(242 242 247 / .92)` | `rgb(28 28 30 / .92)` |

**Zustände aus `ButtonsView`**, nicht als eigene Tokens, sondern abgeleitet:
- Modifier aktiv (Double oder Triple): Zahlentasten `--key-bg` mit Opacity .75, Text in `--key-double` bzw. `--key-triple`; Bull im Triple-Modus bleibt weiß, im Legacy ist er ausgeblendet.
- Dart-Plätze im Panel: Kästen (Radius 14 px) mit Rahmen 3 px in `--frame-text`, der aktuelle Platz 4 px in `--frame-active`, Text der gebusteten Aufnahme in `--key-undo`. Tasten, Panels und Checkout-Hinweis haben wie Legacy `cornerRadius(18)`.

Dark-Mode-Hinweis (geändert am 6.11.2026, Luca): Im Legacy war `--frame-bg` im Dark Mode zu 90 % weiß, die Panels also hell auf schwarzem Grund mit schwarzem Text, die Tasten mittelgrau; das war am Board zu hell. Jetzt nimmt der Zählscreen im Dark Mode die iOS-Dunkelgrautöne wie die Karten: Panels `#1C1C1E` mit weißem Text (`--frame-text`), Dart-Kästen Weiß 10 %, Rahmen inaktiver Panels `#3A3A3C`, Zifferntasten `#2C2C2E`, Taste 0 `#48484A`. Der Hellmodus und die farbigen Tasten bleiben wie Legacy. Prüfen über `docs/screenshots/*-dark.png` (`e2e/dark.spec.ts`).

## 2. Umschalten

- Default: Systemeinstellung (`prefers-color-scheme`).
- Override per Toggle in der Kopfzeile, gespeichert in `localStorage` (`theme = light | dark | system`), gesetzt als `data-theme` auf `<html>` durch ein Inline-Script vor dem ersten Paint (kein Flackern). Kein Server-Roundtrip, kein Cookie.
- `color-scheme: light dark` auf `:root`, damit Formulare und Scrollbars mitgehen.

## 3. Layout: warum Legacy nicht skaliert und was die Web-App anders macht

Legacy setzt Höhen und Breiten als Bruchteile von `UIScreen.main.bounds` (Panels 2/5 der Höhe, Keypad 2/5, Hinweis 1/30), Schriftgröße ist fest (`.font(.system(size: 50))`). Auf kleinen Geräten überlappt es, auf Tablets bleibt Platz leer, und im Querformat passt gar nichts.

Regeln für die Web-App:

1. **Zählscreen = ein CSS Grid über `100dvh`**, keine Seite scrollt: `grid-template-rows: auto minmax(0, 2fr) auto minmax(0, 2fr)` (Kopfzeile, Panels, Hinweis, Keypad). `dvh` statt `vh`, damit die Browser-Leiste am Handy eingerechnet ist.
2. **Keypad** ist ein Grid 5 × 5 mit `aspect-ratio` auf den Tasten nur als Untergrenze; Tasten füllen die Zelle. Mindesthöhe 48 px (Touch), Schrift `clamp(1.1rem, 4.5vmin, 2rem)`.
3. **Spieler-Panels**: bis 2 Spieler `grid-template-columns: 1fr` (untereinander), ab 3 Spielern großes Panel plus horizontal scrollbare Kleinpanels wie Legacy. Im **Querformat** (`@media (orientation: landscape)`) stehen Panels links und Keypad rechts, Grid 1 × 2.
4. **Schriftgrößen** nur über `clamp()` mit `vmin`, Rest- und Punktezahlen bekommen `font-variant-numeric: tabular-nums`.
5. **Container Queries** für die Panels (`container-type: inline-size`), damit ein Panel in der Kleinvariante ohne JavaScript Average und Darts ausblendet.
6. Keine festen Pixelhöhen außer der Touch-Mindesthöhe; keine `window.innerHeight`-Berechnungen in JavaScript.
7. **Safe Areas**: `padding: env(safe-area-inset-*)` auf dem Grid, `viewport-fit=cover` im Meta-Tag, damit die PWA (M12) randlos sein kann.
8. **Nur Tokens, kein Inline-Style, keine Ad-hoc-Werte.** Farben, Radien, feste Größen und fluide `clamp()`-Größen stehen als Tokens in `globals.css` (`@theme`: `--color-*`, `--radius-panel|slot|pill|tile|box`, `--shadow-floating`, `--text-title|display|fluid-sm|fluid-lg|fluid-xl`, `--spacing-row|tab|panel-x|keypad-gap|icon-inline|icon|icon-sm|icon-xs|avatar|check|icon-box|cta|qr|cricket-label|cricket-col|chart|panel-sm|slot-w|slot-h|slot-gap`); Komponenten nutzen nur die daraus erzeugten Klassen (`rounded-panel`, `w-slot-w`, `gap-keypad-gap` …). Safe-Area-Abstände über `pt-safe`, `pb-safe`, `pb-safe-min`; wiederkehrende Layouts als `@utility` (`score-grid`, `header-grid`); fluide Schriftgrößen sind die Tokens `--text-fluid-sm|lg|xl` (Klassen `text-fluid-*`), Ziffern gleich breit mit `tabular-nums`. `style={…}` ist per ESLint verboten (`react/forbid-dom-props`), Tailwind-Ad-hoc-Werte wie `rounded-[18px]` sind es per Konvention: ein neuer Wert wird ein Token.

Testgeräte für die DoD: iPhone-Breite 375 px hoch und quer, Tablet 768 px hoch und quer, Desktop-Fenster 1280 px. Der Zählscreen darf in keinem davon scrollen oder abschneiden.

## 4. Breiten

Die Tab-Seiten und die Seiten darunter (Setup, Turniere, Spielstatistik) legen ihren Inhalt in eine mittige Spalte, den Baustein `PageFrame` (`src/components/ui/page-frame.tsx`, seit M14). Zurück-Button, Überschrift, Abschnittslabels, `FoldCard` und Karten teilen sich deren Kanten; kein Baustein begrenzt seine Breite selbst.

| Token | Klasse | Breite | Verwendung |
|---|---|---|---|
| `--container-page` | `max-w-page` | 36rem (576 px, wie `max-w-xl`) | `narrow`, Default: Listen und Formulare (Übersicht, Spieler, Konto, Verwaltung, Turniere, Setup, Erfolge, Login) |
| `--container-page-wide` | `max-w-page-wide` | 64rem (1024 px, wie `max-w-5xl`) | `wide`: Statistik, Rangliste, Spielstatistik |

Regeln:

1. Die Seite um die Spalte trägt Hintergrund und seitlichen Abstand (`px-4`), die Spalte selbst hat keinen, damit alle Seiten dieselbe Kante haben.
2. `GroupedSection` und `SubPage` nehmen `width` und bauen den Rahmen selbst ein; andere Screens verwenden `PageFrame` direkt. Teile außerhalb des Rahmens (der klebende Start-Button im Setup) nehmen `pageColumn()`.
3. Mehrspaltig wird es nur im breiten Rahmen und erst ab `lg` (Statistik: Diagramm und Dartscheibe nebeneinander). Am Handy steht alles untereinander.
4. Der Zählscreen und die Sieg-Screens haben eigene Layouts (§3) und keinen `PageFrame`.

## 5. Bewegung

Legacy hat keine eigenen Animationen; was unter iOS ruhig gleitet, macht SwiftUI selbst (Sheets, Disclosure). Die Web-App ergänzt das sparsam (M14, `docs/m14-plan.md` §4).

| Token | Klasse | Wert | Verwendung |
|---|---|---|---|
| `--duration-fast` | `duration-fast` | 150 ms | Tipp-Rückmeldung, Dart setzt sich, Auswahlliste |
| `--duration-base` | `duration-base` | 250 ms | Aufklappen, Rahmenwechsel, Einblenden |
| `--duration-slow` | `duration-slow` | 350 ms | Sheet und Sieg-Screen kommen herein |
| `--delay-skeleton` | (in `animate-skeleton-in`) | 150 ms | Lade-Platzhalter warten so lange, bevor sie einblenden; schnelle Seiten flackern nicht (`m13-plan.md` R-04) |
| `--ease-ios` | `ease-ios` | `cubic-bezier(0.32, 0.72, 0, 1)` | alle Übergänge: schnell an, weich aus |

Regeln:

1. Jede Animation und jeder Übergang steht hinter `motion-safe:`. Wer am Gerät „Bewegung reduzieren“ eingeschaltet hat, sieht nichts davon; einen eigenen Schalter gibt es nicht.
2. Nur `transform` und `opacity` (Ausnahme: das Aufklappen in der Höhe über `grid-template-rows`), keine Bibliothek, keine Federn, kein Wackeln.
3. Erscheinen läuft als Keyframe-Animation beim Einhängen (`animate-*`, Keyframes in `globals.css`); Verschwinden ist sofort.
4. Zählen bleibt sofort: Keine Animation verzögert eine Eingabe, einen Spielerwechsel oder einen Screen. Punktestände zählen nie hoch oder runter.
5. Tippbare Zeilen und Links nehmen `tap-feedback` (Grund dunkelt beim Drücken sofort ab und blendet beim Loslassen aus), Zeilen in Karten zusätzlich `tap-row` statt `w-full`.
6. Neue Dauern oder Kurven werden Tokens; `duration-300` und Ad-hoc-Kurven gibt es nicht.
