# Weiterarbeiten nach einem `/clear`

Diesen Text als erste Nachricht an Claude Code geben (oder darauf verweisen: „lies docs/prompt.md und mach weiter“).

---

Lies `CLAUDE.md`, `docs/project.md` (oben die Übersicht aller Meilensteine) und `docs/architecture.md` (§5 Grenzen, §9 Konventionen, §11 Entscheidungen E1–E15). Für den schnellen Überblick: README, Abschnitt „Architecture at a glance“.

**Stand (23.10.2026)**

- **Auf dem Pi** (https://dartserver.swallow-pythagorean.ts.net) läuft alles bis einschließlich **M4 „Eingabe auf mehreren Geräten“**. Die DoDs von M1 bis M4 sind am Handy abgenommen, inklusive der Rate-Limit-Probe aus M4. Was dabei auffällt, meldet Luca; das wird eingearbeitet, bevor oder während es mit M5 weitergeht. Admin ist `darts`; Kontrolle des laufenden Stands: `ssh pi 'grep IMAGE_TAG darts/.env'`.
- Seit M3 außerdem umgesetzt und getestet:
  - CI (`scripts/ci.sh`, Abdeckungsschwellen)
  - Transaktionen über `deps.transaction`
  - Sicherheits-Header, Fehlerseiten, JSON-Log
  - Theme nur über Tokens, kein Inline-Style
  - gemeinsame Formular-Bausteine
  - Repositories `players`, `matches`, `auth`
  - Code, Kommentare, Commits und README auf Englisch
- Meilensteine sind in Umsetzungsreihenfolge nummeriert (M0–M12); die Tabelle oben in `project.md` nennt die alten Nummern aus älteren Commits. Die Status-Spalte dort und das Abhaken der DoDs zieht Luca selbst nach.
- **Die Pläne für alle offenen Meilensteine existieren bereits** (`docs/m5-plan.md` bis `docs/m12-plan.md`), jeweils mit Schritten, Dateien, Testfällen und offenen Fragen am Ende. Vor dem Start eines Meilensteins wird der Plan nur noch mit Luca durchgesehen, die Fragen werden beantwortet und der Plan bei Bedarf angepasst; ein neuer Plan entsteht nur für neue Themen.

**Als Nächstes, in dieser Reihenfolge**

1. Rückmeldungen aus den DoDs von M1 bis M4 einarbeiten, sobald Luca sie nennt.
2. **M5 „X01 vollständig“** (Sets, Legs, Platzierungen, Anwurf, Undo über Leg-Grenzen, Historie): Plan `docs/m5-plan.md` mit Luca durchgehen. Er beantwortet die vier Fragen in §9. Sonst gelten die Defaults: Anwurf läuft über Set-Grenzen zyklisch weiter; der letzte Spieler bekommt seinen Platz ohne weiterzuwerfen; Leg-Overlay 2 s oder Tipp; „Legs 1:0“ in der Kopfzeile. Dann Schritt für Schritt umsetzen.
3. Danach M6 bis M11, M12 (Betrieb, inklusive Ingress und Caddy prüfen) bewusst zuletzt.

**So arbeiten wir**

- Kein Code ohne abgestimmten Plan: Jeder Meilenstein hat `docs/mN-plan.md` mit Schritten (Dateien, Tests, Prüfung) und offenen Fragen; vor dem Start mit Luca durchgehen und anpassen, dann Umsetzung Schritt für Schritt, ein Commit pro grünem Schritt. Erledigte Pläne wandern nach `docs/archive/`, `project.md` wird abgehakt.
- Commits nach Conventional Commits auf Englisch, ein Commit pro zusammenhängender Änderung (`feat(cricket): …`, `fix(setup): …`, `docs(architecture): …`; Details in `CLAUDE.md`).
- Vor jedem Commit: `npm run lint`, `npm run typecheck`, `npm test`. Vor jedem Deploy: `./scripts/ci.sh` oder mindestens `./scripts/smoke.sh` (Produktions-Build, Standalone auf Port 3100, Browser-Durchlauf, Screenshots nach `docs/screenshots/`). Nie gegen `next dev` testen (lädt in Schleife neu), `next start` geht mit `output: standalone` nicht.
- **Deploy nur auf ausdrücklichen Zuruf**, nie zusammen mit dem Commit in einem Befehl. Vorher committen, sonst heißt das Image `<sha>-dirty`. Ablauf und Rollback: README „Deploying to the Pi“.
- `ssh pi` braucht den Schlüssel im Agent: `ssh-add -l` muss den ED25519-Schlüssel zeigen, sonst `ssh-add --apple-use-keychain ~/.ssh/id_ed25519` in einem echten Terminal.
- **Sprachen:** Antworten an Luca auf Deutsch. Code, Kommentare, Testnamen, Log- und Fehlermeldungen, Skripte, Commit-Nachrichten und README auf Englisch. Deutsch nur in `docs/` und in den UI-Texten (`src/i18n/de.ts`).
- **Theme:** nur Tokens aus `globals.css`; kein `style={…}` (ESLint), keine Ad-hoc-Werte wie `rounded-[18px]` (`docs/theme.md` §3 Regel 8).
- **Services:** alles über `Deps` (`players`, `matches`, `auth`, Uhr, Ids, Events, `transaction`); mehrere Schreibvorgänge immer in `deps.transaction`, Tests mit `memoryDeps()`/`sqliteDeps()` aus `src/server/testing.ts`.
- **Nicht neu aufmachen:** kein `git pull` auf dem Pi (Build nur auf dem Mac); Speicherung pro Aufnahme; Bust zählt 0; Undo stellt den letzten regulären Stand her; kein Backup (E14); CI-Inhalt nur in `scripts/ci.sh` (E15, Umzug nach GitHub geplant).
- Kleine eindeutige Fixes direkt machen, bei Struktur-Änderungen vorher vorschlagen.
