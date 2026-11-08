# Weiterarbeiten nach einem `/clear`

Nach einem `/clear` einen der beiden Prompts unten als erste Nachricht an Claude Code geben, den Teil in `<…>` ausfüllen. Kurzform: „lies docs/prompt.md, Prompt A: <Liste>“ oder „lies docs/prompt.md, Prompt B: M8“.

- **Prompt A:** Kleinkram aus dem Test am Board (Bugs, UI-Anpassungen, Texte).
- **Prompt B:** einen Meilenstein angehen, den nächsten sinnvollen oder einen bestimmten.

Beide setzen den Abschnitt „Stand“ und „So arbeiten wir“ unten voraus; Claude liest ihn mit.

---

## Prompt A – Bugs und UI-Anpassungen vom Board

```
Lies CLAUDE.md und docs/prompt.md (Stand, So arbeiten wir). Wir haben am Board getestet.
Bitte diese Punkte fixen bzw. anpassen:

1. <was passiert ist / was anders sein soll, mit Screen und Modus, z. B. „Cricket, Zählscreen: …“>
2. <…>

Vorgehen:
- Geh die Liste zuerst durch und sag mir pro Punkt kurz, was du für die Ursache hältst und was du
  ändern willst. Bei Punkten, die eine Regel aus Legacy, einen Plan (docs/mN-plan.md) oder eine
  Entscheidung (architecture.md §11) berühren, frag, bevor du abweichst. Eindeutige Kleinigkeiten
  (Tippfehler, Abstände, Texte) direkt machen.
- Für jeden Bug zuerst ein Test, der ihn zeigt (Vitest oder e2e/), dann der Fix.
- UI nur mit Tokens und Bausteinen aus src/components/ui/, Texte in src/i18n/de.ts.
- Ein Commit pro Punkt (Conventional Commits, englisch). Am Ende lint, typecheck, npm test und
  ./scripts/smoke.sh; bei sichtbaren Änderungen die Screenshots mit committen.
- Was vom Board kommt und nicht sofort gemacht wird: in docs/m6-plan.md §7 (Beobachtungen) oder
  als Punkt in docs/m11-plan.md („Kleinkram vom Board“) eintragen.
- Nicht pushen und nicht deployen, das mache ich selbst. Zum Schluss eine kurze Liste: was erledigt
  ist, was offen ist, was ich am Board noch einmal prüfen soll.
```

---

## Prompt B – Mit einem Meilenstein weitermachen

```
Lies CLAUDE.md, docs/prompt.md (Stand, So arbeiten wir), docs/project.md (Übersicht oben) und
docs/architecture.md (§5 Grenzen, §9 Konventionen, §11 Entscheidungen).

Meilenstein: <Mx, oder: „schlag den nächsten sinnvollen vor“>

Vorgehen:
- Wenn ich keinen nenne: schlag mir anhand von project.md und dem Stand unten den nächsten
  sinnvollen offenen Meilenstein vor, mit zwei Sätzen Begründung, und warte auf mein Ok.
- Lies den Plan docs/mN-plan.md. Die offenen Pläne stammen vom 23.10.2026, also von vor M5–M9:
  gleiche ihn mit dem heutigen Code ab (Dateinamen, Schnittstellen, was es schon gibt) und zeig mir,
  was du anpassen würdest. Stell mir die offenen Fragen aus dem Plan (§ „Offene Fragen“) mit den
  Defaults, gesammelt in einer Runde. Erst nach meinen Antworten den Plan aktualisieren und
  committen (docs(mN): …).
- Dann Schritt für Schritt umsetzen, Test-first bei Logik, ein Commit pro grünem Schritt.
  Abweichungen vom Plan oder von Legacy-Regeln vorher mit mir klären.
- Am Ende: e2e-Tests für den neuen Ablauf in e2e/, ./scripts/smoke.sh grün, Screenshots
  aktualisiert, project.md abgehakt (Übersicht und Checkliste), Status im Plan, architecture.md
  und README nachgezogen, wo sich etwas geändert hat.
- Nicht pushen und nicht deployen. Zum Schluss: was fertig ist, was ich am Board prüfen soll (DoD),
  was offen bleibt.
```

---

## Stand (8.11.2026)

- **Fertig, DoD am Board offen:** M5 X01 vollständig, M6 Robustheit (Praxistest mit Flugmodus offen), M7 Cricket, Elimination, SplitScore, M8 Statistiken (Tab Konto, Ranglisten je Modus, Match-Seite; Turnier-Setzliste ausgelost oder festgelegt), M9 Turniere, M10 Achievements (Galerie im Konto, Banner auf dem Sieg-Screen). M1–M4 sind am Handy abgenommen. Dazu die Board-Änderungen vom 5.11. (Tab „Verwaltung“, Spieler/Spiele/Turniere löschen, Eingabefelder im Setup, Elimination-Hinweis, nächster Spieler ab drei).
- **M13 Code-Review und Konsolidierung** (`docs/m13-plan.md`): Pakete A (Eingabevalidierung, Fehler-Log, Restart-Rechte), C (Lebenszyklus der Hooks, Pending-Buttons, Lade-Platzhalter, globale Fehlerseite) und D (Duplikate, `import type` aus `@/server` in Komponenten, Komponenten-Coverage, Doku) sind umgesetzt; B (Statistik-Matches gebündelt laden) im Code fertig, die Messung (§7) und `synchronous = NORMAL` (Frage in `docs/fragen.md`) sind offen; E (nur `choice-menu` teilen) und F (Barrierefreiheit, nie auf Kosten der UX für Sehende) folgen. M14 Styling wartet auf die Abnahme am Board.
- **Offen:** M11 Sound und Komfort, M12 Betrieb und Härtung (bewusst zuletzt; PWA/Service Worker dort würde auch das Laden ohne Netz abdecken, siehe `docs/m6-plan.md` §7), später vielleicht ein Meilenstein Checkout-Quote. Ebenfalls offen aus M0: Entscheidung SD oder SSD (E6).
- **Deploy und Push macht Luca selbst.** Was auf dem Pi läuft: `ssh pi 'grep IMAGE_TAG darts/.env'`. Admin dort ist `darts`. Die URL steht im README.
- **Pläne** für die offenen Meilensteine liegen in `docs/m11-plan.md` und `docs/m12-plan.md` (Stand 23.10.2026, vor dem Abgleich mit dem Code); `docs/m8-plan.md` und `docs/m10-plan.md` sind abgeglichen und umgesetzt. Erledigte Pläne wandern erst nach der DoD am Board nach `docs/archive/`.
- **Mehrsprachigkeit** ist vorbereitet, aber noch keine Sprachwahl gebaut: erst wenn eine zweite Sprache kommt (README „Adding a language“).

## So arbeiten wir

- **Plan vor Code:** Jeder Meilenstein hat `docs/mN-plan.md` mit Schritten und offenen Fragen; vor dem Start mit Luca abstimmen. Regeln aus Plan und Legacy werden so umgesetzt, wie sie dort stehen; Verbesserungen werden vorgeschlagen, nicht einfach gebaut.
- **Commits:** Conventional Commits auf Englisch, eine zusammenhängende Änderung pro Commit (`feat(cricket): …`, `fix(sync): …`, `docs(m8): …`; Details in `CLAUDE.md`). Hooks prüfen Prettier, ESLint und das Commit-Format.
- **Prüfen:** vor jedem Commit `npm run lint`, `npm run typecheck`, `npm test`; vor dem Abschluss `./scripts/smoke.sh` (Produktions-Build plus die Playwright-Tests in `e2e/`, Screenshots nach `docs/screenshots/`). `./scripts/ci.sh` macht alles wie die CI. Nie gegen `next dev` testen.
- **Tests:** sichtbare Texte immer aus `de` (`de.game.undo`), nie als Literal; Logik test-first.
- **Sprachen:** Antworten an Luca auf Deutsch. Code, Kommentare, Testnamen, Logs, Skripte, Commits und README auf Englisch; Deutsch nur in `docs/` und `src/i18n/de.ts`.
- **UI:** nur Theme-Tokens aus `globals.css` (`docs/theme.md`), kein `style={…}`, keine Ad-hoc-Werte, keine Texte im Markup; neue Screens aus den Bausteinen in `src/components/ui/` zusammensetzen, DRY.
- **Statistik:** nur echte Treffer zählen; Darts, die nichts zählen (daneben, Bust), sind `overthrown` und tauchen in keiner Statistik positiv auf.
- **Services:** alles über `Deps` (`players`, `matches`, `auth`, `tournaments`, Uhr, Ids, Events, `transaction`); mehrere Schreibvorgänge in `deps.transaction`; Tests mit `memoryDeps()`/`sqliteDeps()`.
- **Nicht neu aufmachen:** kein `git pull` auf dem Pi (Build nur auf dem Mac); Speicherung pro Aufnahme; Bust zählt 0; kein Backup (E14); CI-Inhalt nur in `scripts/ci.sh` (E15); `Legacy/Dart/` nie ändern.
