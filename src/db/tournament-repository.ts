import type { InputMode, PlayerId, Rules } from "@/domain/game";
import type { TournamentFormat } from "@/domain/tournament";
import type { Player } from "./repository";

/** Best of legs/sets for the group phase (round 0) or one knockout round (m9-plan §9.4). */
export type RoundFormat = { phase: "group" | "knockout"; round: number; legsToWinSet: number; setsToWinMatch: number };

export type NewTournament = {
  id: string;
  name: string;
  format: TournamentFormat;
  groupCount: number;
  advancePerGroup: number;
  rules: Rules;
  inputMode: InputMode;
  createdBy: PlayerId | null;
  createdAt: number;
  /** Player ids in seed order. */
  seeds: PlayerId[];
  roundFormats: RoundFormat[];
};

export type StoredTournament = Omit<NewTournament, "seeds"> & {
  /** In seed order. */
  seeds: Player[];
  /** Which match was played for which fixture. */
  links: { fixtureId: string; matchId: string }[];
};

/** Tournaments (M9): seed list, rules and fixture → match links; the schedule is the domain's. */
export type TournamentRepository = {
  createTournament(t: NewTournament): void;
  /** Newest first. */
  listTournaments(): StoredTournament[];
  loadTournament(id: string): StoredTournament | null;
  /** A new draw (only while no fixture has a match). */
  setSeeds(id: string, seeds: PlayerId[]): void;
  /** Links (or relinks, after a cancelled match) the match of a fixture. */
  linkMatch(id: string, fixtureId: string, matchId: string): void;
  /** The tournament and fixture a match was played for, if any. */
  fixtureOfMatch(matchId: string): { tournamentId: string; fixtureId: string } | null;
  deleteTournament(id: string): void;
};
