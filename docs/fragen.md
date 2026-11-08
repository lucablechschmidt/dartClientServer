# Offene Fragen an Luca

> Fragen, die auf eine Entscheidung warten. Antworten direkt darunter eintragen („**Antwort:** …“); beantwortete Fragen wandern in den passenden Plan oder nach `architecture.md` §11 und werden hier gelöscht.

---

## Checkout-Hinweis bei Single-out und Triple-out (7.11.2026)

**Befund:** Die Finish-Tabelle (`src/domain/checkouts.ts`) nimmt wie im Legacy Double-out an und wird unabhängig von der Out-Regel gezeigt. Bei Single-out sind die Wege gültig, aber nicht die kürzesten (19 Rest mit einem Dart bekommt keinen Hinweis). Bei Triple-out sind sie falsch (D20 beendet das Leg nicht).

**Optionen:** (a) so lassen wie im Legacy, (b) bei Triple-out keinen Hinweis zeigen, (c) Wege für Single- und Triple-out berechnen.

**Frage:** Welche Option? Default ohne Antwort: (a), die Regeln werden am Board kaum gespielt.

---

## `/dev/theme` als Baustein-Galerie (8.11.2026, M13 Paket D)

**Befund:** `architecture.md` §9 verlangt seit M1: „Jeder neue `ui`-Baustein bekommt einen Eintrag auf `/dev/theme` (ersetzt Storybook).“ Umgesetzt wurde das nie: `/dev/theme` zeigt Tokens und einen Zählscreen, keinen der heute 20 Bausteine (`ChoiceMenu`, `Stepper`, `FoldCard`, `Skeleton`, Buttons mit `pending` …). Schon in `m11-plan.md` §4 notiert. Das Aussehen prüfen heute die Screenshots aus `smoke.sh` (hell, dunkel, Desktop), das Verhalten die UI-Tests.

**Optionen:** (a) Galerie bauen: jeder Baustein in seinen Zuständen, hell und dunkel, auf `/dev/theme` (etwa ein halber Tag, danach Pflege bei jedem neuen Baustein). (b) Regel streichen: Screenshots und UI-Tests reichen; `/dev/theme` bleibt Token-Seite. (c) Nur die Bausteine mit Zuständen, die kein Screen zeigt (Fehler, Pending, Skeleton), auf die Seite.

**Frage:** Welche Option? Default ohne Antwort: (b), weil die Regel in sechs Meilensteinen nie gebraucht wurde und die Screenshots die echten Screens zeigen.

---

Zuletzt beantwortet (6.11.2026): Desktop-Layout und Animationen, jetzt `docs/m14-plan.md`.
