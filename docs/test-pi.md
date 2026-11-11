# Test am Pi – offene Abnahmen am Board

> Sammelt die DoD aller Meilensteine, die im Code fertig sind, aber noch nicht am echten Board (Pi, Handys) abgenommen wurden. Die Detailpläne dazu liegen seit 11.11.2026 in `docs/archive/` (M5–M10, M13, M14); die Paragraphen unten verweisen dorthin. Was automatisch geprüft wird (Vitest, Abdeckung, Playwright in `e2e/`), ist erledigt und steht hier nicht.
> Ablauf: Luca deployt (`./scripts/deploy.sh`), spielt die Punkte durch, hakt sie ab und trägt Auffälliges unten unter „Beobachtungen vom Board“ ein. Ist ein Meilenstein komplett abgehakt: in `docs/project.md` abhaken, Commit „Mn: done“.
> Luca: alles.

---

## 0. Vorbereitung

- [ ] Aktuellen Stand deployen; was läuft: `ssh pi 'grep IMAGE_TAG darts/.env'`.
- [ ] Mindestens zwei Handys mit Login, eines davon im Mobilfunk ohne WLAN.
- Vieles lässt sich an einem Abend verbinden: das Best-of-3 aus M5 ist das aus M6 (mit Flugmodus), ein 180er darin deckt M10 ab, und das Match eignet sich zum Nachrechnen für M8. Für M9 braucht es vier bzw. sechs Spieler (Gäste gehen auch).

---

## M5 – X01 vollständig

Plan: `archive/m5-plan.md` §0, §7.

- [ ] Best-of-3-Legs-Match zu zweit am Board: Leg-Sieg-Screen, Anwurf wechselt pro Leg, Undo über die Leg-Grenze zurück ins vorige Leg.
- [ ] 4-Spieler-Spiel mit Platzierungen bis Platz 4; der Letzte kann zu Ende spielen oder aufgeben.
- [ ] Historie zeigt beendete und abgebrochene Matches.

## M6 – Robustheit am Board

Plan: `archive/m6-plan.md` §0, §6.

- [ ] Komplettes Best-of-3 am Board mit zwei bis vier Mitspielern, Handy im Mobilfunk ohne WLAN.
- [ ] Während des Matches den Flugmodus etwa eine Minute einschalten, weiterwerfen, wieder ausschalten: nichts geht verloren. Notieren, was die Statuszeile gezeigt hat.
- [ ] Was auffällt (Schriftgrößen, Tippfehler am Keypad, Verzögerungen) unten eintragen; wird als Nachbesserung in M6 erledigt.

## M7 – Cricket, Elimination, SplitScore

Plan: `archive/m7-plan.md` §0, §7.

- [ ] Cricket zu dritt am Board durchspielen, Undo stimmt.
- [ ] Elimination am Board durchspielen, Undo stimmt (auch das Zurücknehmen einer Elimination).
- [ ] SplitScore am Board durchspielen, Undo stimmt.

## M8 – Statistiken und Reporting

Plan: `archive/m8-plan.md` §0, §7, §8.

- [ ] Ein reales X01-Match aussuchen und für einen Spieler von Hand nachrechnen: Average, First-9, 180er, Highest Finish, Best Leg. Alle Kennzahlen stimmen mit `/account/stats` und `/match/[id]/stats`.
- [ ] Elo eines Modus an zwei, drei Matches von Hand nachrechnen (Start 1000, K 32, nur 1 vs 1), stimmt mit `/account/rankings`.
- [ ] Turnier mit festgelegter Setzliste startet in der angetippten Reihenfolge.
- [ ] Performance: siehe §Messungen unten.

## M9 – Turniere

Plan: `archive/m9-plan.md` §0, §5.

- [ ] Round Robin zu viert komplett über die App; die Tabelle stimmt mit der Handrechnung.
- [ ] K.-o. zu sechst mit Freilosen läuft bis zum Finale.

## M10 – Achievements

Plan: `archive/m10-plan.md` §0, §7.

- [ ] Ein 180er im Spiel zeigt den Banner „Neu für …“ auf dem Sieg-Screen.
- [ ] Danach steht er unter Konto → Erfolge.
- [ ] Undo vom Sieg-Screen nimmt ihn wieder weg.
- [ ] Alte Spiele mit 180ern zählen sofort (Galerie eines Spielers mit älterem 180er prüfen).

## M13 – Code-Review und Konsolidierung

Plan: `archive/m13-plan.md` §0.3, §3.2 Schritt 4, §7. Die offenen Entscheidungen (Kontrast, `synchronous = NORMAL`) stehen in `docs/fragen.md`, nicht hier.

- [ ] Statistik-Seiten mit der Pi-Datenbank messen, Zielwert < 500 ms (siehe §Messungen).
- [ ] Optional: `curl /api/health` bei gesperrter Datenbank liefert `{"ok":false}` ohne Pfad (wurde nicht von Hand geprüft).

## M14 – Styling

Plan: `archive/m14-plan.md` §0, §4.4, §5.

- [ ] Screenshots `docs/screenshots/*-desktop.png` ansehen: auf 1440 px sitzen Überschrift, Labels und Karten jeder Tab-Seite in einer Spalte; die Statistik zeigt Diagramm und Dartscheibe nebeneinander mit normaler Achsenschrift.
- [ ] Am Handy (375 px) sieht alles aus wie vorher.
- [ ] Animationen am Handy abnehmen (Kandidaten 1, 2, 4, 5, 6, 7); der Zählscreen nimmt Eingaben ohne Wartezeit an.
- [ ] Mit „Bewegung reduzieren“ (System-Einstellung) läuft keine Animation.
- Nach der Abnahme kommt Schritt 3 als Code (Kandidaten 3 und 8, `archive/m14-plan.md` §4.4; Checkliste in `project.md` M14).

---

## Messungen

Statistik-Performance auf dem Pi (`archive/m8-plan.md` §7, `archive/m13-plan.md` §3.2 Schritt 4). Messen z. B. mit `time curl -s -b cookie https://…/account/stats`. Schwelle 500 ms; erst wenn die nicht reicht, kommt eine Aggregat-Tabelle (`archive/m13-plan.md` §5).

| Datum | DB-Größe | beendete Matches | `/account/stats` | `/account/rankings` | Sieg-Screen | Bemerkung |
|---|---|---|---|---|---|---|
| | | | | | | |

---

## Beobachtungen vom Board

(Aus `archive/m6-plan.md` §7 übernommen; hier weiterführen. Was nicht sofort gemacht wird, kann auch als Punkt in `m11-plan.md` „Kleinkram vom Board“ landen.)

Bekannt aus den Tests (1.11.2026):

- Reißt das Netz ab, **bevor** der Zählscreen fertig geladen ist, fehlt ein nachgeladenes Code-Stück und es erscheint die Fehlerseite („Nochmal versuchen“). Ist die Seite einmal geladen und die erste Aufnahme gespeichert, geht nichts mehr verloren. Am Board heißt das: Spiel bei Netz öffnen. Abhilfe wäre ein Service Worker, der die Seite vorhält (PWA in M12).
- Nach einem Abriss der Live-Verbindung (SSE) lädt jedes Gerät beim Wiederverbinden einmal nach; vorher konnte ein zuschauendes Handy den alten Stand behalten.

Vom Board:

- 7.11.2026: Checkout-Hinweise geprüft, vier falsche Einträge (10, 53, 86, 143) korrigiert (erledigt).
- 7.11.2026: allein spielend steht die vorherige Aufnahme blass hinter den leeren Feldern (erledigt).
