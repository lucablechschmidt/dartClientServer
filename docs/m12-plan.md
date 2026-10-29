# M12-Plan – Betrieb und Härtung

> Detailplan zu `project.md` M12. **Teil A** (unten, §0–§8): Neustart-Robustheit, Updates, PWA. **Teil B** (§B0–§B8, früher eigener Meilenstein „Ingress prüfen“): messen, ob Caddy noch gebraucht wird und ob das Rate-Limit die echte IP der Handys kennt. Teil B steht hier, weil er für die Nutzer keinen spürbaren Unterschied macht; eine kurze Rate-Limit-Probe von Hand gehört schon zur DoD von M4 und entscheidet, ob Teil B vorgezogen wird. Hier entsteht wenig App-Code; der Großteil ist Konfiguration auf dem Pi, die Luca mit `ssh pi` ausführt und Claude vorbereitet. Reihenfolge: Robustheit beim Neustart, dann PWA, zuletzt optional SSD. **Kein Backup** (E14, bewusste Entscheidung vom 23.10.2026).
> Stand: zweite Fassung, 23.10.2026, ohne Backup. Noch nicht umgesetzt.
> Luca: §0 und §8.

---

## 0. Was Luca tut

1. Die Kommandos aus §4 und §5 auf dem Pi ausführen, Claude liefert sie fertig.
2. Für die DoD den Pi einmal hart vom Strom trennen.

---

## 1. Grundentscheidungen

- **Kein Backup (E14).** Geht die Datenbank verloren, legt der nächste Start sie samt Admin neu an; Mitspieler werden neu eingeladen. Dafür gibt es in der README den Abschnitt „Datenbank neu anlegen“.
- **Healthchecks**: der App-Container hat schon einen; Caddy bekommt einen (`wget` auf `/`), Compose startet beide bei Fehlern neu (`restart: unless-stopped` gibt es schon). Ein `cron`-Job auf dem Host prüft stündlich die Funnel-URL und schreibt bei Fehlern nach `syslog`.
- **Updates**: `unattended-upgrades` für Sicherheitsupdates des Pi OS, automatischer Neustart nachts nur, wenn nötig (`Unattended-Upgrade::Automatic-Reboot "true"`, Zeit 04:00). Docker-Images werden nicht automatisch aktualisiert; Caddy-Image bei Bedarf über den Deploy.
- **PWA** nur das Nötige: Manifest (Name, Icons, `display: standalone`, Theme-Farben aus dem Theme), Icons in 192/512 px aus dem Legacy-App-Icon, `apple-touch-icon`, `viewport-fit=cover` (gibt es). Kein Service Worker: Offline-Puffer macht die Warteschlange aus M6, und ein Service Worker würde die Session-Umleitung verkomplizieren.
- **SSD (E6)**: optional, nur wenn die SD-Karte Probleme macht oder Luca es will. Umzug = `rpi-clone` oder frisches OS plus `docker compose up` mit zurückkopiertem `~/darts/`.

## 2. Datenbank neu anlegen (statt Backup)

- README-Abschnitt mit den drei Zeilen: App stoppen, `data/darts.db*` löschen, `docker compose up -d`; danach Login als Admin aus `.env` und Einladungen neu erzeugen.
- **Commit:** „M12: Datenbank-Neustart dokumentiert“

## 4. Neustart-Robustheit und Monitoring

- `docker-compose.yml`: Healthcheck für Caddy; `deploy/check-funnel.sh` mit `cron` stündlich (`curl -sf -o /dev/null https://dartserver…/api/health || logger -t darts "funnel down"`).
- `tailscale funnel` ist persistent (README); zusätzlich `tailscale set --auto-update`.
- `unattended-upgrades` einrichten (`sudo apt install unattended-upgrades`, Konfiguration aus `deploy/50unattended-upgrades`).
- README „Nach einem Neustart“ ergänzen um die neuen Jobs.
- **Commit:** „M12: Healthchecks, Updates, Monitoring“

## 5. PWA

- `src/app/manifest.ts` (Next-Metadata-Route), Icons unter `public/icons/`, `apple-touch-icon` im Root-Layout, `theme-color` je Farbschema.
- Test: Lighthouse-PWA-Check lokal, am Handy „Zum Home-Bildschirm“ und Start ohne Browserleiste.
- **Commit:** „M12: PWA-Manifest und Icons“

## 5a. Security-Durchgang

Einmal über den ganzen Code, nicht nur über einen Diff: prüfen, ob der Code §10 in `architecture.md` einhält. Befunde mit Datei, Schweregrad und Fix oder begründeter Akzeptanz in §7 protokollieren.

- **Authentifizierung:** `requireSession`/`requireAdmin` in jeder Seite, jeder Server Action und jeder API-Route (auch `/api/match/[id]/events`); öffentlich nur `/login`, `/einladung/<token>`, `/api/health`.
- **Objektrechte:** kein Lesen oder Ändern fremder Matches allein über die ID; Eingaberechte nur über `permissions.ts` im Service.
- **Token:** Einladungs- und Reset-Token einmalig, auch bei zwei gleichzeitigen Einlösungen (Prüfen und Verbrauchen in einer Transaktion); Ablauf nach 24 h.
- **Eingaben:** jede Action validiert mit Zod; keine rohen SQL-Strings mit Nutzereingaben; kein `dangerouslySetInnerHTML` mit Nutzerdaten (Spielernamen).
- **Secrets und Logs:** `git log -p` und Arbeitskopie ohne Secrets oder `.env`; Logs ohne Passwörter, Hashes, Token.
- **Header:** CSP und Sicherheits-Header am Pi über den Funnel nachgemessen (nicht nur lokal).
- Werkzeug: für spätere Änderungen an Auth oder Rechten vor dem Merge `/security-review` in Claude Code über den Branch.
- **Commit:** „M12: Security-Durchgang“

## 6. DoD

1. Pi hart vom Strom trennen, 2 Minuten warten, Funnel-URL erreichbar, Login funktioniert, laufendes Match ist noch da.
2. Die App ist am Handy als Icon auf dem Home-Bildschirm und startet im Vollbild.
- **Commit:** „M12: done“

## 7. Protokoll der Proben

(wird nach dem Stromtest gefüllt)

## 8. Offene Fragen (Defaults gelten ohne Antwort)

1. **Automatischer Reboot** nach Kernel-Updates nachts um 4 (Default ja).
2. **PWA-Name** auf dem Home-Bildschirm: „Darts“ (Default) oder „Darts Scorer“. "DART"

---

# Teil B – Ingress prüfen und vereinfachen (Caddy, Rate-Limit)

## B0. Was Luca tut

1. Deploy auf Zuruf; die Diagnose-Seite aus §B2 ist enthalten.
2. Probe A (§B3) am Handy im Mobilfunknetz, ohne WLAN: Diagnose-Seite öffnen, Screenshot schicken.
3. Probe B (§B4): auf dem Pi zwei Befehle ausführen, die Claude vorbereitet; danach dieselbe Seite noch einmal öffnen, Screenshot schicken; Funnel wieder zurückstellen.

---

## B1. Fragen und Hypothesen

| Frage | Warum sie zählt | Vermutung |
|---|---|---|
| Kommt die IP des Handys im Header `X-Forwarded-For` bei der App an? | Das Rate-Limit beim Login zählt Fehlversuche pro IP (`src/server/rate-limit.ts`). Ohne echte IP teilen sich alle Geräte einen Zähler: zehn Fehlversuche eines Spielers sperren den Login für alle für 15 Minuten. | Caddy setzt `X-Forwarded-For` auf die Adresse der Verbindung, die es sieht: das ist `tailscaled` auf dem Pi, nicht das Handy. Einen von `tailscaled` gesetzten Header ersetzt Caddy ohne `trusted_proxies`. **Das Rate-Limit ist dann heute schon für alle gemeinsam.** |
| Setzt Tailscale Funnel selbst `X-Forwarded-For` (und `X-Forwarded-Host`, `X-Forwarded-Proto`)? | Entscheidet, ob die App die IP überhaupt erfahren kann, mit oder ohne Caddy. Caddy kann keine IP erfinden, die `tailscaled` nicht weitergibt. | unbekannt |
| Kommen Server-Sent Events ohne Caddy sofort an? | Live-Stand bei „jeder selbst“ (E13). Caddy hat dafür `flush_interval -1`. | `tailscaled` ist ein Go-Proxy, und Gos Reverse Proxy reicht `text/event-stream` sofort durch; zu prüfen. |
| Funktionieren Login und Server Actions ohne Caddy? | Next prüft bei Server Actions `Origin` gegen den Host (`X-Forwarded-Host` oder `Host`). | ja, zu prüfen |

## B2. Diagnose-Seite (Code, Test-first wo sinnvoll)

**Dateien**

- `src/app/diag/page.tsx` + `src/components/screens/diag-screen.tsx`: nur für Admins (`requireAdmin`), zeigt
  - die Request-Header, die bei der App ankommen: `x-forwarded-for`, `x-forwarded-host`, `x-forwarded-proto`, `x-real-ip`, `host`, `origin`, `user-agent`, alle `tailscale-*`;
  - die IP, die das Rate-Limit daraus ableitet (`clientIp()`);
  - einen SSE-Test: `EventSource` auf `/api/diag/ticks`, Liste der Ankunftszeiten mit Abstand zum vorigen Tick (Soll: etwa 1000 ms, gepuffert wären es Sprünge oder ein Block am Ende);
  - einen Button „Server Action testen“, der eine harmlose Action ruft und „ok“ anzeigt.
- `src/app/api/diag/ticks/route.ts`: nur mit Session, sendet 10 Ereignisse im Sekundentakt mit Server-Zeitstempel, dann Ende.
- `src/server/log.ts`: beim Öffnen der Seite eine Logzeile `diag.headers` mit denselben Headern (ohne Cookie), damit die Werte auch im Log stehen.
- Alles hinter einem Schalter `DIAG_ENABLED=true` in der Pi-`.env`; ohne den Schalter antworten Seite und Route mit 404. So bleibt der Code bis zur Entscheidung im Deploy, ist aber nicht dauerhaft offen.
- Test: `diag-screen.test.tsx` mit Fixture-Headern und Tick-Liste (Abstände werden korrekt berechnet).
- **Commit:** „feat(diag): admin-only header and SSE diagnostics behind DIAG_ENABLED“

## B3. Probe A: heutiger Weg mit Caddy

Handy im Mobilfunknetz → `https://dartserver…/diag`. Erwartet laut Hypothese: `x-forwarded-for` ist eine Pi-interne Adresse (Docker-Gateway oder `127.0.0.1`), nicht die Mobilfunk-IP. Ticks kommen im Sekundentakt. Ergebnis in §B6 eintragen.

## B4. Probe B: Funnel direkt auf die App, ohne Caddy

Vorübergehend, etwa zehn Minuten:

1. Claude liefert eine `docker-compose.override.yml`, die der App zusätzlich `127.0.0.1:8081:3000` gibt; Deploy wie üblich (Caddy bleibt auf 8080).
2. Luca auf dem Pi: `sudo tailscale funnel --bg 8081` (lenkt die öffentliche Adresse auf die App direkt).
3. Diagnose-Seite am Handy öffnen, Login einmal neu (Cookie bleibt gültig, die Adresse ändert sich nicht), Server-Action-Button, SSE-Ticks.
4. Zurück: `sudo tailscale funnel --bg 8080`, Override entfernen.

Ergebnis in §B6 eintragen.

## B5. Entscheidung und Umsetzung

| Ergebnis | Folge |
|---|---|
| Funnel setzt `X-Forwarded-For` mit der Handy-IP, SSE und Server Actions laufen ohne Caddy | **Caddy entfällt.** App bekommt `127.0.0.1:8080:3000`, `Caddyfile` und Caddy-Dienst raus, `scripts/deploy.sh` prüft Health direkt, README und `architecture.md` §2, §3, §4, §5 nachziehen, neue Entscheidung **E16**. Das Rate-Limit vertraut `X-Forwarded-For`, weil nur `tailscaled` den Port erreicht (an `127.0.0.1` gebunden). |
| Funnel setzt keine Client-IP | Weder mit noch ohne Caddy kennt die App die IP. **Rate-Limit umstellen auf pro Name** (Fehlversuche je eingegebenem Spielernamen, zusätzlich ein großzügiger globaler Deckel gegen Durchprobieren vieler Namen). Caddy entfällt trotzdem, sofern SSE und Server Actions ohne ihn laufen. E16 hält beides fest. |
| SSE puffert ohne Caddy oder Server Actions scheitern | Caddy bleibt; §3 bekommt einen Satz, wofür genau. Das Rate-Limit wird je nach erster Zeile trotzdem korrigiert (mit `trusted_proxies` in Caddy, falls Funnel die IP liefert). |

In jedem Fall danach: Diagnose-Code und `DIAG_ENABLED` entfernen.

- **Commits:** „feat(auth): rate limit per …“ (falls nötig), „chore(deploy): remove Caddy, app listens on 127.0.0.1:8080“ (falls entschieden), „chore(diag): remove diagnostics“, „docs: E16 ingress“, nach der DoD „M12: done“.

## B6. Messwerte

| Probe | x-forwarded-for | x-forwarded-host / host | tailscale-* | SSE-Abstände | Server Action |
|---|---|---|---|---|---|
| A (mit Caddy) | | | | | |
| B (ohne Caddy) | | | | | |

---

## B7. Nicht in diesem Teil

Eigene Domain, Cloudflare Tunnel (Option aus §4 von `architecture.md`; mit Cloudflare Tunnel bräuchte es Caddy ebenfalls nicht), weitere Härtung des Pi (M12).

## B8. DoD (Teil B)

Die Messwerte in §6 sind eingetragen; die Entscheidung steht als E16 in `architecture.md`; das Rate-Limit zählt nachweislich pro Gerät oder pro Name (Probe: zehn Fehlversuche von Handy A, Handy B kann sich danach sofort anmelden); der Diagnose-Code ist wieder entfernt; Pipeline grün und, falls Caddy entfällt, die App nach einem Neustart des Pi wieder erreichbar.
