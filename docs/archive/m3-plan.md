# M3-Plan – Accounts per Einladung

> Detailplan zu `project.md` M3 und Entscheidung E10 (`architecture.md` §11). Reihenfolge wie bisher: Schema und Services mit Tests zuerst, dann Seiten, zuletzt Caddy, `.env` und Deploy. Jeder grüne Schritt ist ein Commit. Bis zum letzten Schritt bleibt Basic Auth in Caddy aktiv, die App-Sessions laufen dahinter; erst wenn die DoD lokal durch ist, fällt Basic Auth.
> Stand: umgesetzt am 22.10.2026 (Schritte 4–8), offen ist der Deploy mit Datenbank-Neustart und die DoD mit zwei Handys.
> Luca: Deine Aufgaben stehen in §0, die beantworteten Fragen in §10.

---

## 0. Was Luca tut

1. DoD von M1 und M2 am Handy abnehmen, bevor M3 deployt wird.
2. Beim Deploy von M3 wird die Datenbank auf dem Pi **geleert** (`darts.db` im Volume löschen, siehe §8). Die bisherigen Spieler und Testmatches sind dann weg; alle kommen per Einladung neu hinein.
3. Für die Umstellung der `.env` auf dem Pi ein Terminal mit `ssh pi` bereithalten. Der bestehende Passwort-Hash bleibt gültig, nur die Variablennamen ändern sich.

---

## 1. Begriffe, Rollen und Rechte

Es gibt nur **Spieler** (`player`). Ein Spieler mit `password_hash` kann sich einloggen; ohne ist er ein Gast (`guest_until` gesetzt), ein übernommener Gast oder ein Spieler, dessen Login der Admin gelöscht hat. `is_admin` ist eine Spalte am Spieler. Der Name ist über alle Spieler eindeutig (M2).

| Wer | darf |
|---|---|
| **Nicht eingeloggt** | nur `/login` und `/einladung/<token>` sehen |
| **Spieler mit Login** | alles spielen; Gäste anlegen, umbenennen und entfernen; **sich selbst umbenennen**; eigenes Passwort ändern (altes Passwort nötig); abmelden |
| **Admin** (`is_admin`) | zusätzlich: Einladungen und Passwort-Resets erzeugen; **alle Spieler umbenennen**; **Spieler und Logins löschen, außer sich selbst und andere Admins**; Gäste dauerhaft übernehmen; Login für Spieler ohne Login erzeugen |

- Reguläre Spieler entstehen **nur über eine Einladung**. Die Zeile „Spieler anlegen“ im Tab „Spieler“ entfällt, dort bleibt „Gast hinzufügen“ (Gäste leben weiter wie in M2, Aufräumen täglich).
- **Login löschen** setzt `password_hash` auf NULL und löscht die Sessions; der Spieler bleibt samt Historie. **Spieler löschen** geht wie bisher nur ohne Matches. Beides nur Admin, nie für sich selbst oder andere Admins.
- Umbenennen prüft der Service: eigener Spieler (der aus der Session), Gast oder Admin.

## 2. Einladungsprozess

**Erzeugen (Admin, Tab „Konto“):** Button „Einladungslink erzeugen“ → Token, 24 h gültig, einmal nutzbar, ohne Namen. Anzeige als QR-Code (SVG) plus Link als Text. Die Seite `/einladung/<token>` ist ohne Login erreichbar und zeigt je nach Art der Einladung das passende Formular.

| Fall | Eingabe | Verhalten |
|---|---|---|
| **A** Neu | Name ist nirgends vergeben | Spieler mit `password_hash` wird angelegt, Token verbraucht, Session gesetzt, Weiterleitung auf `/`. Der Spieler steht sofort bei „Neues Spiel“. |
| **C** Name eines Spielers mit Login | „Finn“, Finn hat schon einen Login | Ablehnen: „Diesen Namen hat schon jemand. Bitte einen anderen wählen.“ Token bleibt gültig, Formular bleibt offen. Der echte Finn bekommt bei Bedarf einen Reset. |
| **D** Name eines Gastes oder Spielers ohne Login | Gast „Mara“ vom selben Abend ist sichtbar, oder ein Spieler ohne Login heißt so | Ablehnen: „Diesen Namen gibt es schon. Der Admin kann dafür einen Login erzeugen.“ Der Admin übernimmt den Gast (falls Gast) und erzeugt dann Fall F. |
| **E** Token ungültig | abgelaufen, benutzt, falsch | Nur Hinweis „Diese Einladung ist nicht mehr gültig. Frag den Admin nach einer neuen.“, kein Formular. |
| **F** Login für vorhandenen Spieler | Admin wählt bei einem Spieler ohne Login „Login erzeugen“ | Einladung `kind = link` mit festem `player_id`; die Seite zeigt den Namen nur an und fragt das Passwort; beim Einlösen wird `password_hash` gesetzt. |
| **Reset** | Admin wählt bei einem Spieler mit Login „Passwort zurücksetzen“ | Einladung `kind = reset` mit `player_id`; die Seite fragt nur das neue Passwort; beim Einlösen werden alle Sessions des Spielers beendet und eine neue gesetzt. |

F und Reset sind technisch dasselbe (Einladung mit festem Spieler, Passwort setzen); Reset beendet zusätzlich die alten Sessions. Im Code ist es ein `kind = 'password'`-Token, das beides abdeckt.

## 3. Grundentscheidungen

- **Keine Auth-Bibliothek.** Tabellen `session` und `invite`; Session-Token = 32 zufällige Bytes, base64url im Cookie, in der DB nur dessen SHA-256. Ein Datenbank-Leak gibt damit keine gültigen Cookies her.
- **Passwörter mit bcrypt** über `bcryptjs` (reines JavaScript, kein nativer Build, kein Eintrag in `allowScripts`). Caddys `hash-password` erzeugt `$2a$14$…`, das `bcryptjs` verifiziert; der Admin-Hash aus `.env` gilt weiter. Neue Hashes mit Kostenfaktor 12.
- **Admin in der DB.** Beim App-Start legt `instrumentation.ts` aus `ADMIN_USER` und `ADMIN_PASSWORD_HASH` den ersten Admin-Spieler **nur an, wenn noch kein Spieler mit `is_admin` existiert** (Bootstrap). Danach gilt die DB; die `.env`-Werte sind nur noch der Notzugang.
- **Der Hash bleibt im Server.** `Player` (UI, Domäne) kennt `hasLogin: boolean` und `isAdmin`, nie den Hash. Nur der Auth-Service liest `password_hash` über eine eigene Repository-Methode.
- **Zugriffsschutz an zwei Stellen.** `src/proxy.ts` leitet ohne Session-Cookie auf `/login` um, kennt aber keine DB. Die eigentliche Prüfung macht `requireSession()` in `src/server/request.ts` bei jeder Seite und jeder Action; Admin-Actions prüfen zusätzlich `is_admin`.
- **Session 1 Jahr ab Login, ohne Verlängerung.** Cookie `httpOnly`, `sameSite=lax`, `secure` (abschaltbar über `COOKIE_SECURE=false` für den lokalen Smoke-Test gegen `http://127.0.0.1`). Abgelaufene Sessions löscht das tägliche Aufräumen mit.
- **Einladungslinks** brauchen die öffentliche URL: `APP_URL` in `.env`, lokal Default `http://127.0.0.1:3100`. QR-Code als SVG serverseitig mit `qrcode`, kein Client-JavaScript nötig.
- **Rate-Limit** in der App, im Prozess-Speicher: pro IP (aus `x-forwarded-for`, gesetzt von Caddy) höchstens 10 fehlgeschlagene Logins oder Token-Versuche in 15 Minuten, danach Wartezeit.
- **Dritter Tab „Konto“** für alle Eingeloggten: eigener Name (umbenennen), Passwort ändern, Abmelden. Der Admin sieht dort zusätzlich „Einladen“, „Spieler“ (alle, mit Umbenennen, Login erzeugen oder Reset, Login löschen, Spieler löschen) und „Gäste heute“ mit „Dauerhaft übernehmen“.

## 4. Schema und Repository

**Dateien**

- `src/db/schema.ts`:
  - `player` + `password_hash NULL`, `is_admin` (default false)
  - `session (id = sha256(token), player_id → player ON DELETE CASCADE, created_at, expires_at)`
  - `invite (id = sha256(token), kind 'register'|'password', player_id NULL → player ON DELETE CASCADE, reset_sessions, created_at, expires_at, used_at NULL)`
  - `npm run db:generate` → Migration 0003.
- `src/domain/player.ts`: `Player` + `hasLogin`, `isAdmin`. `PlayerCredentials = { id, name, passwordHash, isAdmin }` nur für den Server.
- `src/db/repository.ts` (`MatchRepository`) erweitert um `credentialsByName`, `credentialsById`, `setPasswordHash(id, hash | null)`, `promoteGuest(id)`; `createPlayer` nimmt `passwordHash` und `isAdmin` mit; `listPlayers` liefert `hasLogin`/`isAdmin` ohne Hash.
- `src/db/auth-repository.ts` (neu, eigenes Interface `AuthRepository` für Sessions und Einladungen): `createSession`, `findSession(id, now)`, `deleteSession`, `deleteSessionsOfPlayer`, `deleteExpiredSessions(now)`, `createInvite`, `findInvite(id, now)`, `markInviteUsed`, `hasAdmin()`.
- `src/db/sqlite-auth-repository.ts`, `src/db/memory-auth-repository.ts`, `src/db/auth-repository.test.ts` (gegen beide, wie `repository.test.ts`).
- `src/server/deps.ts`: `Deps` bekommt `auth: AuthRepository` und `random: () => Uint8Array` (im Test deterministisch).

**Tests:** Session nach `expires_at` nicht mehr findbar; Invite nur einmal einlösbar; `setPasswordHash(null)` lässt den Spieler stehen; `promoteGuest` setzt `guest_until` auf NULL; `listPlayers` enthält keinen Hash.

- **Commit:** „M3: Schema Login, session, invite“

## 5. Passwörter, Tokens, Sessions, Bootstrap (Test-first)

**Dateien**

- `src/server/crypto.ts`: `hashPassword`, `verifyPassword` (bcryptjs), `newToken()` → `{ token, id }` mit `id = sha256(token)`, `tokenId(token)`.
- `src/server/env.ts`: liest und validiert `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `APP_URL`, `COOKIE_SECURE` einmal (Zod), wirft beim Start, wenn etwas fehlt.
- `src/server/auth-service.ts`: `bootstrapAdmin(deps, env)`; `login(deps, name, password)` → Session-Token oder `invalid-credentials`; `logout`; `sessionFromToken(deps, token, now)` → `Session = { playerId, name, isAdmin }` oder null; `changeOwnPassword(deps, session, old, new)`.
- `src/instrumentation.ts`: nach den Migrationen `bootstrapAdmin`, dann das tägliche Aufräumen (Gäste und abgelaufene Sessions).
- `src/server/auth-service.test.ts` gegen das In-Memory-Repository.

**Tests**

| Fall | Erwartung |
|---|---|
| Bootstrap ohne Admin | Spieler mit `is_admin` und Hash; zweiter Aufruf legt nichts an; umbenannter Admin bleibt der Admin |
| Richtiges Passwort (Hash im `caddy hash-password`-Format) | Session |
| Falsches Passwort, unbekannter Name, Spieler ohne Login | `invalid-credentials`, gleiche Antwort, immer ein Hash-Vergleich (gleiche Laufzeit) |
| Session nach 1 Jahr | ungültig, auch wenn täglich besucht |
| Passwort ändern mit falschem alten Passwort | abgelehnt; mit richtigem: alle anderen Sessions beendet, die eigene bleibt |
| Logout | Session weg, Token danach ungültig |

- **Commit:** „M3: Login, Logout, Sessions, Admin-Bootstrap“

## 6. Login-Seite und Zugriffsschutz

**Dateien**

- `src/server/session-cookie.ts`: Cookie-Name `darts_session`, `setSessionCookie`, `clearSessionCookie`, Optionen aus §3.
- `src/server/request.ts`: `requireSession()` liest das Cookie, validiert, leitet sonst mit `redirect("/login")` um; `requireAdmin()` baut darauf auf. Alle bestehenden Seiten und alle Actions in `match-actions.ts` und `player-actions.ts` rufen es auf.
- `player-service.ts`: `renamePlayer(deps, session, id, name)` erlaubt eigenen Spieler, Gäste oder Admin (`forbidden` sonst); `deletePlayer` für Gäste jeder, für reguläre Spieler nur Admin und nie für Admins; `createPlayer` (regulär) entfällt aus der UI, bleibt intern für Bootstrap und Einladung.
- `src/proxy.ts`: ohne Cookie `darts_session` Redirect auf `/login?next=<pfad>` für alles außer `/login`, `/einladung/*`, `/api/health`, `/_next/*`, Icons.
- `src/app/login/page.tsx` + `src/components/screens/login-screen.tsx`: Name, Passwort, Button, Fehlertext; Layout wie die Listen-Screens, keine Tab-Leiste.
- `src/server/auth-actions.ts`: `loginAction`, `logoutAction`.
- `src/i18n/de.ts`: `auth.*`.
- Smoke-Test: `scripts/smoke-match.mjs` beginnt mit dem Login als Admin (Werte aus `ADMIN_USER`/`ADMIN_PASSWORD` der Umgebung); `BASIC_AUTH` entfällt aus dem Script, sobald Caddy umgestellt ist.
- **Commit:** „M3: Login-Seite und Zugriffsschutz“

## 7. Tab „Konto“, Einladungen, Reset, Verwaltung

**Dateien**

- `src/server/invite-service.ts`: `createRegisterInvite(deps)`, `createPasswordInvite(deps, playerId, resetSessions)` → Token (24 h); `redeem(deps, token, input, now)` mit den Fällen aus §2 (`register`: Name + Passwort, Fehler `name-taken` mit Unterscheidung „hat Login“ / „ohne Login“ für den Text; `password`: nur Passwort, bei `reset_sessions` alte Sessions beenden); Fehler `invalid-token`, `password-too-short` (unter 8 Zeichen).
- `src/server/invite-service.test.ts`: jeder Fall aus §2 einmal; Token nach Einlösen ungültig; abgelaufen; Fall D auch mit abweichender Groß/Kleinschreibung.
- `src/server/admin-service.ts`: `removeLogin` (nicht sich selbst, keine Admins), `promoteGuest`, `renameAnyPlayer`; `deletePlayer` bleibt im `player-service` mit der Admin-Regel.
- `src/server/admin-actions.ts` (alle mit `requireAdmin()`), `src/server/account-actions.ts` (umbenennen, Passwort ändern, abmelden).
- `src/app/(site)/account/page.tsx` + `src/components/screens/account-screen.tsx`: Abschnitte aus §3. Löschen mit Bestätigung durch zweiten Tipp innerhalb von 5 s, kein Browser-`confirm`.
- `src/components/ui/qr-code.tsx`: zeigt den vom Server gerenderten SVG-String.
- `src/app/einladung/[token]/page.tsx` + `src/components/screens/invite-screen.tsx`: Formularvariante nach `kind`, Hinweis bei ungültigem Token.
- `TabBar`: dritter Tab „Konto“ (neues Icon `person.crop.circle` in `icons.tsx`). Tab „Spieler“: Zeile „Spieler anlegen“ raus, „Gast hinzufügen“ rein; Schraubenschlüssel nur dort, wo die Rolle umbenennen darf.
- **Commit:** „M3: Konto, Einladung per QR-Code, Reset, Verwaltung“

## 8. Rate-Limit, Caddy, `.env`, Datenbank, Deploy

- `src/server/rate-limit.ts`: `check(ip)` / `fail(ip)` / `reset(ip)`, Fenster 15 min, 10 Fehlversuche; genutzt in `loginAction` und beim Token-Einlösen. Test mit injizierter Uhr.
- `Caddyfile`: `basic_auth` raus, `header_up X-Forwarded-Proto https`.
- `docker-compose.yml`: `caddy` ohne `BASIC_AUTH_*`; `app` bekommt `ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `APP_URL`.
- `deploy/env.example`, `scripts/hash-password.sh` (gibt `ADMIN_PASSWORD_HASH=` aus), `README.md` (Erststart, Einladung, Reset, Löschen, `.env`-Umstellung, Datenbank-Neustart).
- `.env` auf dem Pi: `BASIC_AUTH_USER` → `ADMIN_USER`, `BASIC_AUTH_HASH` → `ADMIN_PASSWORD_HASH` (Wert unverändert), `APP_URL=https://dartserver.swallow-pythagorean.ts.net`. Claude liefert die `sed`-Zeile, Luca führt sie aus.
- Datenbank auf dem Pi leeren: `docker compose stop app && rm data/darts.db*`, beim Start legen Migrationen und Bootstrap alles neu an.
- `scripts/deploy.sh`: Health-Check erwartet von Caddy `302` (Redirect auf `/login`) statt `401`.
- Lokal: Produktions-Build mit `ADMIN_USER=admin ADMIN_PASSWORD_HASH=<Test-Hash> COOKIE_SECURE=false`, Smoke-Test komplett (Login, Match, Gast, Einladung A/C/D/E in einem zweiten Browser-Kontext, Login erzeugen F, Reset, Login löschen, Logout → Redirect).
- Deploy nur auf Zuruf. Danach DoD aus `project.md` M3 mit zwei Handys.
- **Commit:** „M3: Rate-Limit, Caddy ohne Basic Auth, Deploy“ und nach der DoD „M3: done“

---

## 9. Nicht in M3

E-Mail, 2FA, Selbstregistrierung ohne Einladung, weitere Admins ernennen oder Admins entfernen (nur direkt in der DB), gleitende Session-Verlängerung, mehrere Spieler pro Login.

## 10. Beantwortete Fragen (22.10.2026)

1. **Gäste entfernen:** jeder Eingeloggte, wie in M2.
2. **Passwort-Mindestlänge** 8 Zeichen, sonst keine Regeln.
3. **Eigenes Passwort ändern** im Tab „Konto“, altes Passwort muss stimmen.
4. **Weitere Admins ernennen:** nicht in M3.
5. **Session-Dauer** 1 Jahr ab Login, keine Verlängerung zwischendurch.
6. **Nutzer und Spieler:** keine getrennten Tabellen; ein Spieler mit `password_hash` ist ein Login.
