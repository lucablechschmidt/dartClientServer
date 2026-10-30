import type { Texts } from "@/i18n/de";

/** Knockout rounds for `entrants` players: a bracket of the next power of two. */
export function knockoutRounds(entrants: number): number {
  let rounds = 0;
  while (2 ** rounds < entrants) rounds++;
  return Math.max(rounds, 1);
}

/** "Finale", "Halbfinale", "Viertelfinale", otherwise "Runde n" (round counted from 1). */
export function knockoutRoundLabel(round: number, rounds: number, t: Texts["tournaments"]): string {
  const fromEnd = rounds - round;
  if (fromEnd === 0) return t.final;
  if (fromEnd === 1) return t.semifinal;
  if (fromEnd === 2) return t.quarterfinal;
  return t.roundOf.replace("{n}", String(round));
}
