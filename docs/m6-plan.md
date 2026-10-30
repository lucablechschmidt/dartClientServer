# M6-Plan – Robustheit am Board

> Detailplan zu `project.md` M6. Der erste Punkt (lokales Zählen, Warteschlange mit Retry, offene Aufnahme im localStorage) ist seit M1 erledigt. Übrig sind die Tests, die beweisen, dass nichts verloren geht, der Umbau der Smoke-Skripte zu echten Playwright-Tests, und der Praxistest. Kommt nach M5, weil die Tests dann das vollständige X01 abdecken.
> Stand: erste Fassung 23.10.2026; am 30.10.2026 an den Code nach M5, M7 und M9 angepasst (§2a) und Frage 1 aus §8 eingearbeitet. Umsetzung läuft.
> Luca: §0 und §8.

---

## 0. Was Luca tut

1. Einen Abend am echten Board mit zwei bis vier Mitspielern einplanen, Handy im Mobilfunknetz, ohne WLAN.
2. Während eines Matches einmal bewusst den Flugmodus für etwa eine Minute einschalten, weiterwerfen, wieder ausschalten, und melden, was die Statuszeile gezeigt hat.
3. Die Fragen in §8 beantworten.

---

## 1. Was heute schon da ist und was fehlt

Da: Darts werden lokal gezählt, nur fertige Aufnahmen gehen an den Server, Aufrufe laufen sequentiell mit Backoff (0,5 s bis 8 s, unbegrenzt), die Statuszeile zeigt „nicht gespeichert“, die offene Aufnahme überlebt einen Reload im localStorage, ein fachlicher Fehler vom Server lädt den Server-Stand nach.

Fehlt: ein automatischer Nachweis dafür (heute nur `scripts/smoke-match.mjs` als Skript ohne Assertions-Framework), das Verhalten bei langem Ausfall (Minuten, Tab im Hintergrund, Handy gesperrt), ein sichtbarer Hinweis, wie viele Aufnahmen noch unterwegs sind, und das Zusammenspiel mit SSE aus M4 (Ereignis kommt, während die eigene Warteschlange hängt).

## 2. Grundentscheidungen

- **Playwright als Test-Runner** (`@playwright/test` ist installiert, bisher nur als Bibliothek genutzt): `playwright.config.ts` mit `webServer`, der den Produktions-Build startet (`node .next/standalone/server.js`, Port 3100, eigene Test-DB, `ADMIN_*`, `COOKIE_SECURE=false`). `npm run test:e2e`. Die Smoke-Skripte werden in Tests zerlegt; `scripts/smoke-match.mjs` verschwindet danach.
- **Netzausfall im Test** über `context.setOffline(true)` und `page.route(...)`, der die Server Actions mit einem Netzfehler abbrechen lässt; Flugmodus am Handy wird nicht simuliert, sondern am Board geprobt (§0).
- **Warteschlange sichtbar**: Statuszeile zeigt „2 Aufnahmen nicht gespeichert“ statt nur „nicht gespeichert“, und ein Tipp darauf löst sofort einen neuen Versuch aus (statt auf den Backoff zu warten).
- **Warteschlange überlebt einen Reload**: heute liegt nur die offene Aufnahme im localStorage; die noch nicht bestätigten, abgeschlossenen Aufnahmen gehen bei einem Reload während eines Ausfalls verloren. Ab M6 liegt die komplette Warteschlange (`commitVisit`-Aufrufe mit `seq` und Darts, `undoVisit`) im localStorage und wird nach dem Laden abgespielt, bevor der Client den Server-Stand übernimmt. Das macht aus dem Client einen kleinen Offline-Puffer, ohne Service Worker.
- **Aufwachen**: bei `online`, `visibilitychange` und `pageshow` sofort ein Versuch, nicht erst nach dem Backoff; Backoff-Obergrenze bleibt 8 s, dazu ein Jitter, damit mehrere Geräte nicht gleichzeitig hämmern.
- **Konflikt mit SSE (M4)**: Solange die eigene Warteschlange nicht leer ist, werden SSE-Ereignisse ignoriert (gibt es schon über `open.current`); nach dem Leeren einmal nachladen. Ein Ereignis, das einen fremden Commit auf denselben `seq` meldet, führt beim nächsten eigenen Commit zu `out-of-sync` → Server-Stand gewinnt, der Spieler sieht „Stand vom Server übernommen“ und muss die Aufnahme neu eingeben. Das ist bei `per-player` nur möglich, wenn zwei Geräte für denselben Spieler eingeben (zwei Logins desselben Spielers), und wird so hingenommen.

## 2a. Anpassungen an den Stand nach M5, M7, M9 (30.10.2026)

- Sync liegt inzwischen in `src/components/darts/use-visit-sync.ts` (nicht mehr in `scoreboard-screen.tsx`); die offene Aufnahme in `open-visit-storage.ts`. Position eines Commits ist `legIndex` + `seq`.
- Über die Warteschlange laufen außer `commitVisit` und `undoVisit` auch Zu-Ende-spielen/Aufgeben (`setPlayOut`), Anwurf (`setStarter`) und Sieger festlegen (`decideWinner`, M9). Alle fünf werden gespeichert und nach einem Reload abgespielt.
- **Wiederholung ohne Doppelwirkung:** Geht die Antwort verloren, nachdem der Server schon gespeichert hat, schickt der Client denselben Aufruf noch einmal. Ein Commit, dessen Aufnahme mit denselben Darts schon an dieser Position liegt, gilt deshalb als erfolgreich. Ein Undo nennt den Schritt, den es zurücknehmen will (Aufnahme an Position, Zu-Ende-spielen eines Legs, festgelegter Sieger); passt der nicht mehr, kommt `out-of-sync` statt eines zweiten Undos.
- Lehnt der Server einen Eintrag fachlich ab, übernimmt der Client den Server-Stand, zeigt die Meldung und schickt die übrigen Einträge weiter (sie passen meist noch, z. B. nach einem doppelt angekommenen Undo).
- **Frage 1 (§8), Antwort Luca:** kein Hinweis auf das Aufräumen nach 24 h. Ist eine Aufnahme 10 Minuten lang nicht gespeichert, zeigt der Zählscreen „Stand konnte nicht gespeichert werden“ mit zwei Knöpfen: „Erneut senden“ (sofortiger Versuch) und „Neu eingeben“ (Warteschlange verwerfen, Server-Stand übernehmen).
- Fragen 2 und 3: Defaults (Tipp auf die Statuszeile löst einen Versuch aus; `test:e2e` getrennt von `npm test`).

## 3. Warteschlange im localStorage (Test-first)

**Dateien**

- `src/components/darts/sync-queue.ts` (reine Logik, ohne React): `Queue = { matchId, items: QueueItem[] }`, `QueueItem = { kind: "commit", legIndex, seq, darts } | { kind: "undo", step } | { kind: "play-out", value } | { kind: "starter", playerId } | { kind: "decide", playerId }`, Funktionen `enqueue`, `dequeue`, `serialize`/`restore`, `collapse` (ein Undo direkt nach einem noch nicht gesendeten Commit, Zu-Ende-spielen oder Sieger festlegen hebt beide auf). Tests: `sync-queue.test.ts`.
- `use-visit-sync.ts`: Warteschlange aus `sync-queue.ts` statt der ad-hoc Promise-Kette; nach dem Mount erst die Warteschlange abspielen, dann die offene Aufnahme wiederherstellen; Statuszeile mit Anzahl; Tipp auf die Statuszeile = sofortiger Versuch; Listener für `online`, `visibilitychange`, `pageshow`.
- Backoff mit Jitter in `retrying`.
- **Commit:** „M6: Warteschlange überlebt Reload“

## 4. Playwright-Tests

**Dateien**

- `playwright.config.ts`, `e2e/` mit `fixtures.ts` (Login als Admin, Einladung einlösen in neuem Kontext, Gast anlegen), `e2e/match.spec.ts` (heutiger Smoke-Durchlauf: Setup, 180, Bust, Undo über den Spielerwechsel, Reload, Checkout, Sieg, Undo vom Sieg, Restart), `e2e/auth.spec.ts` (Login, Einladung A/C/D/E, Reset, Logout, Rate-Limit), `e2e/guests.spec.ts`, `e2e/devices.spec.ts` (M4: zwei Kontexte, Sperre, SSE), `e2e/legs.spec.ts` (M5: Best-of-3, Platzierungen), `e2e/offline.spec.ts` (§5).
- `package.json`: `test:e2e`, `test:e2e:ui`; `README.md` Abschnitt Testen.
- `scripts/smoke-match.mjs` und `scripts/screenshots.mjs` entfallen; der Layout-Check wird `e2e/layout.spec.ts` (fünf Viewports, hell und dunkel, kein Scrollen auf dem Zählscreen).
- **Commit:** „M6: Playwright-Tests statt Smoke-Skripte“

## 5. Netzausfall-Tests

`e2e/offline.spec.ts`:

| Fall | Erwartung |
|---|---|
| Offline mitten in einer Aufnahme (ein Dart geworfen), zwei weitere Darts, dann online | Statuszeile „1 Aufnahme nicht gespeichert“ während offline; nach online innerhalb von 10 s „gespeichert“; Reload zeigt dieselben drei Darts; DB hat die Aufnahme |
| Offline über drei komplette Aufnahmen und ein Undo | Warteschlange hat 2 Einträge (collapse), nach online beide gespeichert, Stand stimmt |
| Offline, dann Reload (Tab zu und wieder auf) | Warteschlange aus dem localStorage wird abgespielt, nichts verloren |
| Server antwortet 500 (Route-Mock) | Retry mit Backoff, nach Ende des Mocks gespeichert |
| Tipp auf die Statuszeile | löst sofort einen Versuch aus (Netzwerk-Aufruf innerhalb von 200 ms) |
| Zweites Gerät (M4) während der Ausfall läuft | sieht den alten Stand, nach der Nachlieferung den neuen |

- **Commit:** „M6: Netzausfall-Tests“

## 6. Praxistest und DoD

1. Deploy auf Zuruf.
2. Best-of-3 am Board (§0), einmal Flugmodus, Beobachtungen in `docs/m6-plan.md` §7 notieren.
3. Was auffällt, wird als Nachbesserung in diesem Meilenstein erledigt (Schriftgrößen, Tippfehler am Keypad, Verzögerungen).
- **Commit:** „M6: done“

## 7. Beobachtungen vom Board

(wird nach dem Praxistest gefüllt)

## 8. Offene Fragen (Defaults gelten ohne Antwort)

1. **Wie lange darf die Warteschlange warten?** Default: unbegrenzt, mit Hinweis; nach 24 h räumt der Server das Gast-Match eventuell weg, dann kommt `not-found` und der Client verwirft die Warteschlange mit Meldung. Alternative: nach 1 h Hinweis „Stand konnte nicht gespeichert werden“ mit Button „verwerfen“. Der Hinweis mit nach 24h wird aufgeräumt ist nicht nötig, zusätzlich nach 10 min ohne aufnahmen update, hinweis mit "Stand konnte nucht gespeichert werden" erneut eingeben oder button mit aufnahme erneut senden
2. **Statuszeile tippen für Sofort-Versuch** (Default ja) oder immer automatisch.
3. **Layout-Test als Pflicht in `npm test`** (Default: nein, `test:e2e` separat, weil Build nötig) oder als Teil von `npm test`.
