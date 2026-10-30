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
| `--frame-bg` | `FrameBackground` | Füllung der Spieler-Panels | `rgb(0 0 0 / .10)` | `rgb(255 255 255 / .90)` |
| `--frame-fg` | `FrameForeground` | Rahmen inaktiver Panels | `#C8C8C8` | `rgb(200 200 200 / .01)` |
| `--frame-active` | systemBlue (fest `Color.blue`) | Rahmen des Spielers am Zug | `#007AFF` | `#0A84FF` |
| `--key-bg` | `ScoreButtonsBackgroundColor` | Zahlentasten und Bull | `#000000` | `rgb(255 255 255 / .50)` |
| `--key-fg` | `ScoreButtonsForegroundColor` | Beschriftung aller Tasten | `#FFFFFF` | `#FFFFFF` |
| `--key-zero` | `zero` | Taste 0 | `rgb(0 0 0 / .50)` | `rgb(255 255 255 / .25)` |
| `--key-double` | `double` (systemYellow) | Taste Double, Zahlentasten-Text im Double-Modus | `#FFCC00` | `#FFD60A` |
| `--key-triple` | `triple` (systemGreen) | Taste Triple, Zahlentasten-Text im Triple-Modus | `#34C759` | `#30D158` |
| `--key-undo` | `undo` (systemRed) | Taste Undo | `#FF3B30` | `#FF453A` |
| `--slot-bg` | `FrameBackground` (DartScoreView, über dem Panel) | Füllung der drei Dart-Kästen | `rgb(0 0 0 / .10)` | `rgb(0 0 0 / .10)` |
| `--hint-bg` | `Color.gray.opacity(0.5)` | Checkout-Hinweis-Leiste | `rgb(142 142 147 / .5)` | `rgb(142 142 147 / .5)` |
| `--cricket-closed` | `CricketFieldClosed` (M7) | geschlossenes Cricket-Feld | `#8E8E93` | `rgb(200 200 200 / .5)` |
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
| `--qr-bg` | – | heller Grund des QR-Codes (muss in beiden Modi scanbar sein) | `#FFFFFF` | `#FFFFFF` |
| `--tab-bg` | Tab-Bar-Material | Tab-Leiste unten | `rgb(242 242 247 / .92)` | `rgb(28 28 30 / .92)` |

**Zustände aus `ButtonsView`**, nicht als eigene Tokens, sondern abgeleitet:
- Modifier aktiv (Double oder Triple): Zahlentasten `--key-bg` mit Opacity .75, Text in `--key-double` bzw. `--key-triple`; Bull im Triple-Modus bleibt weiß, im Legacy ist er ausgeblendet.
- Dart-Plätze im Panel: Kästen (Radius 14 px) mit Rahmen 3 px in `--frame-text`, der aktuelle Platz 4 px in `--frame-active`, Text der gebusteten Aufnahme in `--key-undo`. Tasten, Panels und Checkout-Hinweis haben wie Legacy `cornerRadius(18)`.

Dark-Mode-Hinweis: `--frame-bg` ist im Dark Mode zu 90 % weiß, die Panels sind dort also hell auf schwarzem Grund mit schwarzem Text. Das ist so im Legacy und wird übernommen; `--fg` innerhalb eines Panels muss im Dark Mode deshalb auf `#000000` gesetzt werden (`--frame-fg-text`). Falls dich das am Board stört, ist es ein Token-Wechsel, kein Umbau.

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
8. **Nur Tokens, kein Inline-Style, keine Ad-hoc-Werte.** Farben, Radien, feste Größen und fluide `clamp()`-Größen stehen als Tokens in `globals.css` (`@theme`: `--color-*`, `--radius-panel|slot|pill|tile|box`, `--shadow-floating`, `--text-title|display`, `--spacing-row|tab|panel-x|keypad-gap|icon-inline|icon|icon-sm|icon-xs|avatar|check|icon-box|cta|qr|panel-sm|slot-w|slot-h|slot-gap`); Komponenten nutzen nur die daraus erzeugten Klassen (`rounded-panel`, `w-slot-w`, `gap-keypad-gap` …). Safe-Area-Abstände über `pt-safe`, `pb-safe`, `pb-safe-min`; wiederkehrende Layouts als Klasse in `@layer components` (`score-grid`, `header-grid`). `style={…}` ist per ESLint verboten (`react/forbid-dom-props`), Tailwind-Ad-hoc-Werte wie `rounded-[18px]` sind es per Konvention: ein neuer Wert wird ein Token.

Testgeräte für die DoD: iPhone-Breite 375 px hoch und quer, Tablet 768 px hoch und quer, Desktop-Fenster 1280 px. Der Zählscreen darf in keinem davon scrollen oder abschneiden.
