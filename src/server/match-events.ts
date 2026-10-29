/**
 * Live state (M4, E13): per match a list of subscribers in process memory. `publish` after
 * every stored change; the clients then reload the state via `loadMatchAction`.
 * One process, one hub (globalThis, like the rate limiter). No state besides the subscribers.
 */
export type MatchEvents = { publish(matchId: string): void };

export class MatchHub implements MatchEvents {
  private readonly subscribers = new Map<string, Set<() => void>>();

  subscribe(matchId: string, send: () => void): () => void {
    let set = this.subscribers.get(matchId);
    if (!set) {
      set = new Set();
      this.subscribers.set(matchId, set);
    }
    set.add(send);
    return () => {
      set.delete(send);
      if (set.size === 0) this.subscribers.delete(matchId);
    };
  }

  publish(matchId: string): void {
    for (const send of this.subscribers.get(matchId) ?? []) {
      try {
        send();
      } catch {
        /* aborted stream: the subscriber removes itself */
      }
    }
  }

  subscriberCount(matchId: string): number {
    return this.subscribers.get(matchId)?.size ?? 0;
  }
}

const globalForHub = globalThis as unknown as { __dartsMatchHub?: MatchHub };
export function matchHub(): MatchHub {
  return (globalForHub.__dartsMatchHub ??= new MatchHub());
}
