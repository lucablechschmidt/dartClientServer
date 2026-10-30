import { describe, expect, it } from "vitest";
import type { AuthRepository } from "./auth-repository";
import { openDatabase, type Db } from "./client";
import { MemoryAuthRepository } from "./memory-auth-repository";
import { SqliteAuthRepository } from "./sqlite-auth-repository";
import { SqlitePlayerRepository } from "./sqlite-player-repository";

const impls: [string, () => { auth: AuthRepository; db?: Db }][] = [
  [
    "sqlite (in-memory file)",
    () => {
      const db = openDatabase(":memory:");
      new SqlitePlayerRepository(db).createPlayer({ id: "p1", name: "Casey", createdAt: 1, guestUntil: null, passwordHash: "h" });
      return { auth: new SqliteAuthRepository(db), db };
    },
  ],
  ["memory", () => ({ auth: new MemoryAuthRepository() })],
];

const session = (id: string, expiresAt: number) => ({ id, playerId: "p1", createdAt: 1, expiresAt });
const invite = (id: string, expiresAt: number) => ({
  id,
  kind: "register" as const,
  playerId: null,
  resetSessions: false,
  createdAt: 1,
  expiresAt,
});

describe.each(impls)("AuthRepository: %s", (_name, make) => {
  it("sessions: valid until expiresAt, deletable singly, per player (with exception) and when expired", () => {
    const { auth } = make();
    auth.createSession(session("s1", 100));
    auth.createSession(session("s2", 100));
    auth.createSession(session("s3", 50));
    expect(auth.findSession("s1", 99)?.playerId).toBe("p1");
    expect(auth.findSession("s1", 100)).toBeNull();
    expect(auth.findSession("nope", 0)).toBeNull();
    expect(auth.deleteExpiredSessions(50)).toBe(1);
    expect(auth.findSession("s3", 0)).toBeNull();
    auth.deleteSessionsOfPlayer("p1", "s2");
    expect(auth.findSession("s1", 0)).toBeNull();
    expect(auth.findSession("s2", 0)).not.toBeNull();
    auth.deleteSession("s2");
    expect(auth.findSession("s2", 0)).toBeNull();
  });

  it("invites: valid once, not after use or expiry", () => {
    const { auth } = make();
    auth.createInvite(invite("i1", 100));
    expect(auth.findInvite("i1", 99)?.kind).toBe("register");
    expect(auth.findInvite("i1", 100)).toBeNull();
    auth.markInviteUsed("i1", 10);
    expect(auth.findInvite("i1", 20)).toBeNull();
    auth.createInvite({ id: "i2", kind: "password", playerId: "p1", resetSessions: true, createdAt: 1, expiresAt: 100 });
    expect(auth.findInvite("i2", 50)).toMatchObject({ playerId: "p1", resetSessions: true });
  });
});

describe("AuthRepository: sqlite cascade", () => {
  it("deleting the player removes its sessions and invites", () => {
    const db = openDatabase(":memory:");
    const repo = new SqlitePlayerRepository(db);
    const auth = new SqliteAuthRepository(db);
    repo.createPlayer({ id: "p1", name: "Casey", createdAt: 1, guestUntil: null, passwordHash: "h" });
    auth.createSession(session("s1", 100));
    auth.createInvite({ id: "i1", kind: "password", playerId: "p1", resetSessions: false, createdAt: 1, expiresAt: 100 });
    expect(repo.deletePlayer("p1")).toBe("deleted");
    expect(auth.findSession("s1", 0)).toBeNull();
    expect(auth.findInvite("i1", 0)).toBeNull();
  });
});
