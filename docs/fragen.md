# Offene Fragen an Luca

> Fragen, die auf eine Entscheidung warten. Antworten direkt darunter eintragen („**Antwort:** …“); beantwortete Fragen wandern in den passenden Plan oder nach `architecture.md` §11 und werden hier gelöscht.

---

## Checkout-Hinweis bei Single-out und Triple-out (7.11.2026)

**Befund:** Die Finish-Tabelle (`src/domain/checkouts.ts`) nimmt wie im Legacy Double-out an und wird unabhängig von der Out-Regel gezeigt. Bei Single-out sind die Wege gültig, aber nicht die kürzesten (19 Rest mit einem Dart bekommt keinen Hinweis). Bei Triple-out sind sie falsch (D20 beendet das Leg nicht).

**Optionen:** (a) so lassen wie im Legacy, (b) bei Triple-out keinen Hinweis zeigen, (c) Wege für Single- und Triple-out berechnen.

**Frage:** Welche Option? Default ohne Antwort: (a), die Regeln werden am Board kaum gespielt.

---

Zuletzt beantwortet (6.11.2026): Desktop-Layout und Animationen, jetzt `docs/m14-plan.md`.
