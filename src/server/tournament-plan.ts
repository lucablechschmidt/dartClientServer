import type { RoundFormat, StoredTournament } from "@/db/tournament-repository";
import type { MatchFormat } from "@/domain/game";
import { buildPlan, type Fixture, type Plan } from "@/domain/tournament";
import type { Deps } from "./deps";

/** The schedule of a stored tournament, rebuilt by the domain from format and seed list. */
export function planOf(t: StoredTournament): Plan {
  return buildPlan({ format: t.format, seeds: t.seeds.map((p) => p.id), groups: t.groupCount, advance: t.advancePerGroup });
}

/** Best of legs/sets of a fixture: the group phase has one, every knockout round its own (m9-plan §9.4). */
export function formatOf(formats: RoundFormat[], fixture: Pick<Fixture, "phase" | "round">): MatchFormat {
  const phase = formats.filter((f) => f.phase === fixture.phase);
  const own = phase.find((f) => f.round === (fixture.phase === "group" ? 0 : fixture.round)) ?? phase.at(-1);
  return own ? { legsToWinSet: own.legsToWinSet, setsToWinMatch: own.setsToWinMatch } : { legsToWinSet: 1, setsToWinMatch: 1 };
}

/**
 * A finished tournament match may be reopened by undo only while nothing that depends on it has
 * started: the fixture its winner moves on to, or (for a group game) the knockout fed by its group.
 */
export function isTournamentMatchLocked(deps: Deps, matchId: string): boolean {
  const at = deps.tournaments.fixtureOfMatch(matchId);
  if (!at) return false;
  const t = deps.tournaments.loadTournament(at.tournamentId);
  if (!t) return false;
  const plan = planOf(t);
  const fixture = plan.fixtures.find((f) => f.id === at.fixtureId);
  if (!fixture) return false;
  const dependsOnIt = (f: Fixture) =>
    [f.a, f.b].some((s) => (s.kind === "winner" && s.fixture === fixture.id) || (s.kind === "group" && s.group === fixture.group));
  const started = new Set(t.links.filter((l) => deps.matches.loadMatch(l.matchId)?.status !== "abandoned").map((l) => l.fixtureId));
  return plan.fixtures.some((f) => dependsOnIt(f) && started.has(f.id));
}
