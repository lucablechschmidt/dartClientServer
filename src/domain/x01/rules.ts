import { dartScore, isDart } from "../game/scoring";
import type { Dart, OutRule, Rules } from "../game/types";

const MIN_REST_AFTER: Record<OutRule, number> = { single: 1, double: 2, triple: 3 };

/**
 * Port of ClassicGame.isValidDartScore. `score` is the player's rest before this dart.
 * Deviation from legacy: a miss (field 0) is never a bust, not even before the double-in.
 */
export function isValidDart(score: number, rules: Rules, dart: Dart): boolean {
  if (!isDart(dart)) return false;
  if (dart.field === 0) return true;

  // Not "in" yet: in rule
  if (score === rules.startScore && rules.inRule !== "single" && dart.type !== rules.inRule) {
    return false;
  }

  const rest = score - dartScore(dart);

  // Exactly finished: out rule
  if (rest === 0) return rules.outRule === "single" || dart.type === rules.outRule;

  // Bust limit
  return rest >= MIN_REST_AFTER[rules.outRule];
}
