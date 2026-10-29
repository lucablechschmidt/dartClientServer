import { sql } from "drizzle-orm";
import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** Data model per docs/architecture.md §6. Times as Unix milliseconds. */

export const players = sqliteTable(
  "player",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: integer("created_at").notNull(),
    /** E12: guest visible until this time; NULL = regular player. */
    guestUntil: integer("guest_until"),
    /** E10: set = login possible. No separate user table. */
    passwordHash: text("password_hash"),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  },
  /** Names are unique across all players, guests included, case-insensitive. */
  (t) => [uniqueIndex("player_name_unique").on(sql`lower(${t.name})`)],
);

/** M3: login session. id = SHA-256 of the cookie token, expires 1 year after login (E10). */
export const sessions = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("session_player_idx").on(t.playerId)],
);

/**
 * M3: invite via QR code. id = SHA-256 of the token. kind 'register' = new player picks name and
 * password; 'password' = existing player sets a password (create login or reset, then reset_sessions).
 */
export const invites = sqliteTable("invite", {
  id: text("id").primaryKey(),
  kind: text("kind", { enum: ["register", "password"] }).notNull(),
  playerId: text("player_id").references(() => players.id, { onDelete: "cascade" }),
  resetSessions: integer("reset_sessions", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at").notNull(),
  expiresAt: integer("expires_at").notNull(),
  usedAt: integer("used_at"),
});

/** E12: field hits of regular players from deleted guest matches (single 1, double 2, triple 3). */
export const playerFieldHits = sqliteTable(
  "player_field_hits",
  {
    playerId: text("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    field: integer("field").notNull(),
    hits: integer("hits").notNull(),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.field] })],
);

export const matches = sqliteTable("match", {
  id: text("id").primaryKey(),
  mode: text("mode", { enum: ["x01", "cricket", "elimination", "splitscore"] }).notNull(),
  startScore: integer("start_score").notNull(),
  inRule: text("in_rule", { enum: ["single", "double", "triple"] }).notNull(),
  outRule: text("out_rule", { enum: ["single", "double", "triple"] }).notNull(),
  legsToWinSet: integer("legs_to_win_set").notNull().default(1),
  setsToWinMatch: integer("sets_to_win_match").notNull().default(1),
  status: text("status", { enum: ["running", "finished", "abandoned"] }).notNull().default("running"),
  isTournament: integer("is_tournament", { mode: "boolean" }).notNull().default(false),
  /** E13: one phone for everyone or each player on their own device. */
  inputMode: text("input_mode", { enum: ["single", "per-player"] }).notNull().default("single"),
  /** E13: player whose device started the match; NULL only for matches before M4. */
  hostPlayerId: text("host_player_id").references(() => players.id),
  createdBy: text("created_by"),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
});

export const matchPlayers = sqliteTable(
  "match_player",
  {
    matchId: text("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    playerId: text("player_id").notNull().references(() => players.id),
    seat: integer("seat").notNull(),
    placement: integer("placement"),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

export const legs = sqliteTable(
  "leg",
  {
    id: text("id").primaryKey(),
    matchId: text("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    setNo: integer("set_no").notNull().default(1),
    legNo: integer("leg_no").notNull().default(1),
    starterPlayerId: text("starter_player_id").notNull().references(() => players.id),
    winnerPlayerId: text("winner_player_id").references(() => players.id),
    finishedAt: integer("finished_at"),
  },
  (t) => [index("leg_match_idx").on(t.matchId)],
);

const dartType = { enum: ["single", "double", "triple", "overthrown"] } as const;

export const visits = sqliteTable(
  "visit",
  {
    id: text("id").primaryKey(),
    legId: text("leg_id").notNull().references(() => legs.id, { onDelete: "cascade" }),
    playerId: text("player_id").notNull().references(() => players.id),
    seq: integer("seq").notNull(),
    d1Field: integer("d1_field"),
    d1Type: text("d1_type", dartType),
    d2Field: integer("d2_field"),
    d2Type: text("d2_type", dartType),
    d3Field: integer("d3_field"),
    d3Type: text("d3_type", dartType),
    isBust: integer("is_bust", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("visit_leg_seq_idx").on(t.legId, t.seq)],
);

export type PlayerRow = typeof players.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type InviteRow = typeof invites.$inferSelect;
export type MatchRow = typeof matches.$inferSelect;
export type MatchPlayerRow = typeof matchPlayers.$inferSelect;
export type LegRow = typeof legs.$inferSelect;
export type VisitRow = typeof visits.$inferSelect;
