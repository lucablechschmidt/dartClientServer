# M11-Plan – Sound und Komfort am Board

> Detailplan zu `project.md` M11 (aus dem Backlog). Kleine, voneinander unabhängige Dinge, die das Zählen am Board angenehmer machen. Jeder Punkt ist ein eigener Commit und kann einzeln weggelassen werden. Reihenfolge nach Nutzen.
> Stand: erste Fassung, 23.10.2026. Noch nicht umgesetzt.
> Luca: §0 und §7.

---

## 0. Was Luca tut

1. Die drei `.m4a`-Aufnahmen aus `Legacy/Dart/Assets.xcassets/180-*.dataset` freigeben (sind Eigenaufnahmen, oder? Ja!) und sagen, ob sie zufällig abwechseln sollen wie in Legacy. zufällig
2. Entscheiden, ob die Schnelleingabe pro Aufnahme überhaupt gewünscht ist (§7, Frage 2). Laut `project.md` nur, falls die Dart-Eingabe am Board nervt; M6 am Board zeigt das.

---

## 1. 180-Sound

- Die drei `.m4a` nach `public/sounds/180-1.m4a` … (M4A/AAC spielt in Safari, Chrome und Firefox); kein Konvertieren nötig, außer Firefox auf Linux stört, dann zusätzlich `.ogg`.
- `src/components/darts/use-sound.ts`: Hook, der die Dateien einmal vorlädt (`<audio preload>`), und `play180()` zufällig eine abspielt. Mobile Browser spielen Audio erst nach einer Nutzerinteraktion: Das erste Tippen auf dem Keypad „entsperrt“ den Audio-Kontext (`AudioContext.resume()` oder ein stummes `play()`), danach geht es ohne Interaktion.
- Ausgelöst im Zählscreen, wenn eine abgeschlossene Aufnahme 180 Punkte hat, auf **jedem** Gerät, das die Aufnahme sieht (auch per SSE), damit es am Board aus dem Host-Handy kommt, egal wer geworfen hat; Schalter „Ton“ im Tab Konto (localStorage, Default an).
- Test: Hook mit `HTMLMediaElement.play`-Mock; Auswahl zufällig aus drei.
- **Commit:** „M11: 180-Sound“

## 2. Haptik und Tastenrückmeldung

- Kurze Vibration bei Bust und bei Leg-/Match-Ende (`navigator.vibrate`, nur Android, Safari ignoriert es), Schalter zusammen mit „Ton“.
- Keypad: `active:scale-95` gibt es; dazu ein kurzer Farbwechsel beim Tippen, damit am Board sichtbar ist, dass der Tipp angekommen ist, auch wenn das Netz gerade hängt.
- **Commit:** „M11: Haptik“

## 3. Schnelleingabe pro Aufnahme (nur bei Bedarf, §7)

- Idee: statt drei Darts die Summe der Aufnahme tippen („Schnell: 60“), wie bei anderen Dart-Apps. Das passt nicht ins Datenmodell (drei Dart-Plätze, Feldtreffer, Checkout-Hinweis), deshalb nur als **Darstellungs-Trick**: Die Summe wird in drei Darts zerlegt (z. B. 60 → S20 S20 S20, 100 → T20 S20 S20, 26 → S20 S5 S1), gespeichert wird die Zerlegung mit einem Flag `visit.is_quick = 1`, und Feldtreffer-Statistiken lassen solche Aufnahmen aus. Checkout und Bust gelten weiter pro Dart der Zerlegung.
- Schalter im Setup („Eingabe: Darts / Aufnahme“), Keypad bekommt dann ein Zahlenfeld 0–180 mit Schnelltasten 26, 41, 45, 60, 85, 100, 140, 180.
- Domäne: `src/domain/x01/quick-entry.ts` mit `splitScore(total) → Dart[]` und Tests (jede Summe 0–180 ist zerlegbar oder ungültig, z. B. 179, 178, 176, 175, 173, 172, 169, 166, 163).
- **Commit:** „M11: Schnelleingabe pro Aufnahme“

## 4. Kleinkram vom Board

Sammelstelle für das, was in M6 auffällt und nicht dort erledigt wurde (Schriftgrößen im Querformat, Position der Statuszeile, Checkout-Hinweis mit zwei Wegen, „Bust“ groß einblenden). Jeder Punkt eine Zeile hier, dann ein Commit.

## 5. DoD

Am Board: 180 löst den Sound aus, auch auf dem Zuschauer-Handy; Bust vibriert auf Android; die Schnelleingabe (falls gebaut) zählt ein Leg korrekt zu Ende.
- **Commit:** „M11: done“

---

## 6. Nicht in M11

Sprachausgabe der Reste („Caller“), Sounds für andere Ereignisse, Musik.

## 7. Offene Fragen (Defaults gelten ohne Antwort)

1. **Sound auf allen Geräten** (Default) oder nur auf dem Host-Handy.
2. **Schnelleingabe**: erst entscheiden, wenn M6 am Board gelaufen ist (Default: nicht bauen).
3. **Vibration** bei Bust und Match-Ende (Default) oder nur Match-Ende. Ohne Vibration
