import { tally, CRICKET_FIELDS } from "../cricket/tally";
import { dartScore, visitScore } from "../game/scoring";
import { MAX_DARTS_PER_VISIT, type LegState, type PlayerId, type Visit } from "../game/types";
import { rounds } from "../splitscore/rounds";
import { winnerOf } from "../x01/selectors";
import { doubleFact, type AchievementKey, type AchievementMatch } from "./types";

/**
 * What a finished match brings a player (m10-plan §1): achievement keys plus one fact `double-N` per
 * double a won double-out X01 leg was finished on ("Gotta catch 'Em All!" counts them).
 */
export function factsOf(match: AchievementMatch, player: PlayerId): Set<string> {
  const facts = new Set<string>();
  const add = (key: AchievementKey) => facts.add(key);
  const legs = match.state.legs.filter((l) => l.players.includes(player));
  const won = match.placements[player] === 1;

  if (legs.some((l) => l.visits.some((v) => v.playerId === player && is180(v)))) add("180");
  switch (match.mode) {
    case "x01":
      for (const leg of legs) x01Facts(leg, player, facts);
      break;
    case "elimination":
      for (const leg of legs) eliminationFacts(leg, player, facts);
      break;
    case "splitscore":
      for (const leg of legs) splitFacts(leg, player, facts);
      break;
    case "cricket":
      if (won && legs.some((leg) => closedAtZero(leg, player))) add("almostDone");
      break;
  }
  return facts;
}

const is180 = (v: Visit) =>
  !v.isBust && v.darts.length === MAX_DARTS_PER_VISIT && v.darts.every((d) => d.type === "triple" && d.field === 20);

/** X01: the player's checkout visits (rest brought to 0) with the rest before them. */
function checkouts(leg: LegState, player: PlayerId): { visit: Visit; rest: number }[] {
  let rest = leg.rules.startScore;
  const out: { visit: Visit; rest: number }[] = [];
  for (const v of leg.visits) {
    if (v.playerId !== player) continue;
    const score = visitScore(v);
    if (!v.isBust && score === rest) out.push({ visit: v, rest });
    rest -= score;
  }
  return out;
}

function x01Facts(leg: LegState, player: PlayerId, facts: Set<string>) {
  const outs = checkouts(leg, player);
  if (outs.some((o) => o.rest === 170)) facts.add("gone-fishing");
  if (outs.some((o) => isShanghai(o.visit))) facts.add("shanghai");
  if (winnerOf(leg) !== player || leg.rules.outRule !== "double") return;
  const last = outs.at(0)?.visit.darts.at(-1);
  if (last?.type === "double") facts.add(doubleFact(last.field));
  const darts = leg.visits.filter((v) => v.playerId === player).reduce((n, v) => n + v.darts.length, 0);
  if (leg.rules.startScore === 501 && darts === 9) facts.add("nine-darter");
}

/** Single, double and triple of the same field (1–20) in one visit. */
function isShanghai(v: Visit): boolean {
  const [a] = v.darts;
  if (v.darts.length !== MAX_DARTS_PER_VISIT || a.field < 1 || a.field > 20) return false;
  const types = new Set(v.darts.filter((d) => d.field === a.field).map((d) => d.type));
  return types.has("single") && types.has("double") && types.has("triple");
}

/** Elimination replayed dart by dart: who first sent someone to 0, and visits of 170 that reach the target. */
function eliminationFacts(leg: LegState, player: PlayerId, facts: Set<string>) {
  const target = leg.rules.startScore;
  const points: Record<PlayerId, number> = Object.fromEntries(leg.players.map((p) => [p, 0]));
  let firstBlood: PlayerId | null = null;
  for (const v of leg.visits) {
    const before = points[v.playerId];
    for (const d of v.darts) {
      if (d.type === "overthrown") continue;
      const after = points[v.playerId] + dartScore(d);
      for (const p of leg.players) {
        if (p === v.playerId || points[p] !== after || after === 0) continue;
        points[p] = 0;
        firstBlood ??= v.playerId;
      }
      points[v.playerId] = after;
    }
    if (v.playerId === player && points[player] === target && points[player] - before === 170) facts.add("gone-fishing");
  }
  if (firstBlood === player) facts.add("first-blood");
}

/** SplitScore: final score, and whether one of the player's complete visits missed (halved). */
function splitFacts(leg: LegState, player: PlayerId, facts: Set<string>) {
  const final = rounds(leg).points[player];
  const halved = leg.visits.some(
    (v) => v.playerId === player && v.darts.length === MAX_DARTS_PER_VISIT && v.darts.every((d) => d.type === "overthrown"),
  );
  if (final === 1) facts.add("split-one");
  if (!halved) {
    facts.add("never-halved");
    if (final === 175) facts.add("bearly-never-halved");
  }
}

/** Cricket: the moment the player's last field closed, were their points still 0? */
function closedAtZero(leg: LegState, player: PlayerId): boolean {
  const visits: Visit[] = [];
  for (const v of leg.visits) {
    for (let i = 1; i <= v.darts.length; i++) {
      const t = tally({ ...leg, visits: [...visits, { ...v, darts: v.darts.slice(0, i) }] });
      if (CRICKET_FIELDS.every((f) => t.marks[player][f] >= 3)) return t.points[player] === 0;
    }
    visits.push(v);
  }
  return false;
}
