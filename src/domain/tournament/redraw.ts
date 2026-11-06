import type { PlayerId } from "../game/types";
import { buildPlan, draw, type PlanInput } from "./schedule";
import type { Fixture, Source } from "./types";

export type DrawInput = Omit<PlanInput, "seeds">;

/**
 * What a draw decides, independent of any order: who meets whom in the knockout tree (sides sorted at
 * every node, byes included) and who plays in which group (groups unordered). Two seed lists with the
 * same key give the same tournament, only listed differently.
 */
export function drawKey(input: DrawInput, seeds: readonly PlayerId[]): string {
  const plan = buildPlan({ ...input, seeds: [...seeds] });
  const byId = new Map(plan.fixtures.map((f) => [f.id, f]));
  const side = (s: Source): string => {
    switch (s.kind) {
      case "player":
        return s.id;
      case "bye":
        return "~";
      case "group":
        return `#${s.group}.${s.place}`;
      case "winner": {
        const f = byId.get(s.fixture);
        return f ? `(${node(f)})` : "?";
      }
    }
  };
  const node = (f: Fixture): string => [side(f.a), side(f.b)].sort().join(" v ");
  const groups = new Map<number, Set<PlayerId>>();
  for (const f of plan.fixtures) {
    if (f.phase !== "group") continue;
    const members = groups.get(f.group ?? 1) ?? new Set<PlayerId>();
    for (const s of [f.a, f.b]) if (s.kind === "player") members.add(s.id);
    groups.set(f.group ?? 1, members);
  }
  const groupPart = [...groups.values()]
    .map((m) => [...m].sort().join("+"))
    .sort()
    .join(" | ");
  const final = plan.fixtures.filter((f) => f.phase === "knockout").at(-1);
  return `${groupPart} / ${final ? node(final) : ""}`;
}

/** Every order of `items`, lazily (Heap's algorithm). */
function* permutations<T>(items: readonly T[]): Generator<T[]> {
  const a = [...items];
  const c = new Array<number>(a.length).fill(0);
  yield [...a];
  let i = 0;
  while (i < a.length) {
    if (c[i] < i) {
      const j = i % 2 === 0 ? 0 : c[i];
      [a[j], a[i]] = [a[i], a[j]];
      yield [...a];
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

/** Up to this many variants the redraw steps through them in turn instead of drawing at random. */
export const FEW_VARIANTS = 3;

/**
 * The distinct draws for these players, one seed list each, in a fixed order; null when there are more
 * than FEW_VARIANTS. A round robin (or a single group) has exactly one. Beyond seven players a knockout
 * or two and more groups always have far more than three, so only small fields are enumerated.
 */
export function drawVariants(input: DrawInput, players: readonly PlayerId[]): PlayerId[][] | null {
  const sorted = [...players].sort();
  if (input.format === "round-robin" || (input.format === "groups-knockout" && (input.groups ?? 1) <= 1)) return [sorted];
  if (sorted.length > 7) return null;
  const variants = new Map<string, PlayerId[]>();
  for (const order of permutations(sorted)) {
    const key = drawKey(input, order);
    if (variants.has(key)) continue;
    variants.set(key, order);
    if (variants.size > FEW_VARIANTS) return null;
  }
  return [...variants.values()];
}

/**
 * A new draw that really differs from the current one; null when there is only one possible draw.
 * Two or three variants: the next one in turn (a coin would often repeat). More: a fair random draw,
 * drawn again while it gives the current tournament.
 */
export function redraw(input: DrawInput, seeds: readonly PlayerId[], randomInt: (n: number) => number): PlayerId[] | null {
  const current = drawKey(input, seeds);
  const variants = drawVariants(input, seeds);
  if (variants) {
    if (variants.length < 2) return null;
    const at = variants.findIndex((v) => drawKey(input, v) === current);
    return variants[(at + 1) % variants.length];
  }
  // More than three variants: a repeat is at most 1 in 4, so 64 in a row does not happen in practice.
  for (let attempt = 0; attempt < 64; attempt++) {
    const next = draw(seeds, randomInt);
    if (drawKey(input, next) !== current) return next;
  }
  return draw(seeds, randomInt);
}
