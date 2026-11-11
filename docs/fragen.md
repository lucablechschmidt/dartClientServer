# Offene Fragen an Luca

> Fragen, die auf eine Entscheidung warten. Antworten direkt darunter eintragen („**Antwort:** …“); beantwortete Fragen wandern in den passenden Plan oder nach `architecture.md` §11 und werden hier gelöscht.

---

## SQLite `synchronous = NORMAL` statt `FULL` (8.11.2026, M13 R-21)

**Befund:** SQLite läuft im WAL-Modus mit dem Default `synchronous = FULL`: jede gespeicherte Aufnahme wartet auf die Bestätigung der SD-Karte für die WAL-Datei, beim Checkpoint auch für die Datenbankdatei. Für WAL empfiehlt SQLite `NORMAL`. Die SD-Karte ist laut `architecture.md` §5 das größte Betriebsrisiko.

**Optionen:** (a) `NORMAL`: weniger Sync-Vorgänge, weniger Verschleiß, schnellere Commits. Stürzt die App ab (Container-Neustart, Node-Fehler), geht nichts verloren. Fällt der Strom aus, können die letzten Transaktionen vor dem Ausfall fehlen, meist Sekunden; die Datenbank bleibt konsistent. Was fehlt, liegt bei einem offenen Spiel meist noch in der Warteschlange des Handys und wird beim nächsten Öffnen gesendet. (b) `FULL` behalten: jede bestätigte Aufnahme übersteht auch einen Stromausfall, um den Preis von mehr Schreiblast.

**Frage:** Welche Option? Default ohne Antwort: (b), bis du entschieden hast (zurückgestellt am 8.11.2026). Bei (a) wird die Entscheidung ein neuer Eintrag in `architecture.md` §11, weil sie E14 berührt.

**Antwort:** weiter zurückgestellt (11.11.2026): beim Eingeben gab es bisher keine Geschwindigkeitsprobleme, `FULL` bleibt.

---

## Kontrast der Tastenfarben und der Hinweis-Leiste (11.11.2026)

**Befund:** Seit „Kontrast erhöhen“ (Option c, umgesetzt) prüft der Axe-Lauf den Kontrast mit `prefers-contrast: more`. Grau und Blau bestehen; vier Legacy-Farben mit weißer Schrift nicht (WCAG AA verlangt 4,5:1, große Schrift 3:1):

| Stelle | Farbe | Kontrast |
|---|---|---|
| Taste Double | weiß auf `#FFCC00` (dunkel `#FFD60A`) | 1,5 |
| Taste Triple | weiß auf `#34C759` (dunkel `#30D158`) | 2,2 |
| Undo-Taste, „Spiel Abbrechen“ | weiß auf `#FF3B30` (dunkel `#FF453A`) | 3,6 |
| Checkout-/Ziel-Hinweis | weiß auf Grau 50 % über Weiß | etwa 1,7 |

Der Test lässt diese vier Stellen bis zur Entscheidung aus (`e2e/a11y.spec.ts`).

**Optionen:** (a) so lassen, die Farben sind Legacy und am Board gut erkennbar; Ausnahme in `theme.md` begründen. (b) Nur bei „Kontrast erhöhen“: schwarze Schrift auf Double und Triple (wie iOS bei gelben Flächen), Rot `#D70015` (iOS-Rot für erhöhten Kontrast), Hinweis-Leiste dunkelgrau (`#636366`). (c) Wie (b), aber für alle.

**Frage:** Welche Option? Default ohne Antwort: (a). Ich würde (b) empfehlen, passend zu deiner Entscheidung beim Grau.

**Antwort:** zurückgestellt (11.11.2026), die Farben bleiben vorerst.

---

Zuletzt beantwortet (11.11.2026): Spielregeln je Modus werden in der jetzigen Form angezeigt und laufend in `src/domain/<mode>/regeln.md` bearbeitet (jeder Build nimmt den aktuellen Stand; eine Datei, deren erste Zeile mit `<!-- Entwurf` beginnt, bleibt ausgeblendet), Anzeige mit `react-markdown` auf dem Server; `/dev/theme`-Regel gestrichen (`architecture.md` §9); Checkout-Hinweis je Out-Regel, jetzt `architecture.md` (Abschnitt `checkouts.ts`); Kontrast von Grau und Akzent (Option c), jetzt `theme.md` §1. Davor (8.11.2026): Code-Review M13 (Einordnung, Fehlertext im Setup, `import type` aus dem Server, Dateigröße nur für `ui`-Bausteine, `useAsyncAction`, Umleitung bei abgelaufener Session, Host bleibt beim Restart, Hover bleibt), jetzt `docs/archive/m13-plan.md` §6 und §3. Davor (6.11.2026): Desktop-Layout und Animationen, jetzt `docs/archive/m14-plan.md`.
