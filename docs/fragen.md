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

## SQLite `synchronous = NORMAL` statt `FULL` (8.11.2026, M13 R-21)

**Befund:** SQLite läuft im WAL-Modus mit dem Default `synchronous = FULL`: jede gespeicherte Aufnahme wartet auf die Bestätigung der SD-Karte für die WAL-Datei, beim Checkpoint auch für die Datenbankdatei. Für WAL empfiehlt SQLite `NORMAL`. Die SD-Karte ist laut `architecture.md` §5 das größte Betriebsrisiko.

**Optionen:** (a) `NORMAL`: weniger Sync-Vorgänge, weniger Verschleiß, schnellere Commits. Stürzt die App ab (Container-Neustart, Node-Fehler), geht nichts verloren. Fällt der Strom aus, können die letzten Transaktionen vor dem Ausfall fehlen, meist Sekunden; die Datenbank bleibt konsistent. Was fehlt, liegt bei einem offenen Spiel meist noch in der Warteschlange des Handys und wird beim nächsten Öffnen gesendet. (b) `FULL` behalten: jede bestätigte Aufnahme übersteht auch einen Stromausfall, um den Preis von mehr Schreiblast.

**Frage:** Welche Option? Default ohne Antwort: (b), bis du entschieden hast (zurückgestellt am 8.11.2026). Bei (a) wird die Entscheidung ein neuer Eintrag in `architecture.md` §11, weil sie E14 berührt.

---

Zuletzt beantwortet (8.11.2026): Code-Review M13 (Einordnung, Fehlertext im Setup, `import type` aus dem Server, Dateigröße nur für `ui`-Bausteine, `useAsyncAction`, Umleitung bei abgelaufener Session, Host bleibt beim Restart, Hover bleibt), jetzt `docs/m13-plan.md` §6 und §3. Davor (6.11.2026): Desktop-Layout und Animationen, jetzt `docs/m14-plan.md`.
