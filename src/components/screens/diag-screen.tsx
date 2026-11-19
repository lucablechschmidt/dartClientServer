"use client";

import { useRef, useState } from "react";
import { CardList, DetailRow } from "@/components/ui/card-list";
import { Button, SectionHeading } from "@/components/ui/form-controls";
import type { Texts } from "@/i18n/de";

type Props = {
  headers: [string, string | null][];
  ip: string;
  texts: Texts["diag"];
  onPing: () => Promise<{ ok: boolean; at: number }>;
};

/** Gaps in ms between arrivals; the first tick has none (m12-plan §B2: about 1000 ms means no buffering). */
export function tickGaps(arrivals: readonly number[]): number[] {
  return arrivals.slice(1).map((t, i) => Math.round(t - arrivals[i]));
}

type Ticks = { state: "idle" | "running" | "done" | "failed"; arrivals: number[] };

/**
 * M12 part B: what arrives at the app through Funnel (and Caddy). Headers and the IP the rate limit
 * derives, a server-sent event test and a Server Action test. Admins only, while DIAG_ENABLED is on.
 */
export function DiagScreen({ headers, ip, texts, onPing }: Props) {
  const [ticks, setTicks] = useState<Ticks>({ state: "idle", arrivals: [] });
  const [action, setAction] = useState<string | null>(null);
  const source = useRef<EventSource | null>(null);

  const startTicks = () => {
    source.current?.close();
    setTicks({ state: "running", arrivals: [] });
    const es = new EventSource("/api/diag/ticks");
    source.current = es;
    es.onmessage = () => setTicks((t) => ({ ...t, arrivals: [...t.arrivals, performance.now()] }));
    es.addEventListener("end", () => {
      es.close();
      setTicks((t) => ({ ...t, state: "done" }));
    });
    es.onerror = () => {
      es.close();
      setTicks((t) => (t.state === "running" ? { ...t, state: "failed" } : t));
    };
  };

  const ping = async () => {
    const start = performance.now();
    try {
      const r = await onPing();
      setAction(r.ok ? texts.actionOk.replace("{ms}", String(Math.round(performance.now() - start))) : texts.actionFailed);
    } catch {
      setAction(texts.actionFailed);
    }
  };

  const gaps = tickGaps(ticks.arrivals);
  const max = gaps.length > 0 ? Math.max(...gaps) : 0;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-2">
        <SectionHeading>{texts.headers}</SectionHeading>
        <CardList label={texts.headers}>
          {headers.map(([name, value]) => (
            <DetailRow key={name} title={name} detail={value ?? texts.missing} />
          ))}
          <DetailRow title={texts.ip} detail={ip} />
        </CardList>
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>{texts.ticks}</SectionHeading>
        <Button onClick={startTicks} pending={ticks.state === "running"}>
          {ticks.state === "running" ? texts.ticksRunning : texts.startTicks}
        </Button>
        {ticks.arrivals.length > 0 && (
          <CardList label={texts.ticks}>
            {ticks.arrivals.map((_, i) => (
              <DetailRow key={i} title={texts.tickLine.replace("{n}", String(i + 1)).replace("{gap}", String(i === 0 ? 0 : gaps[i - 1]))} />
            ))}
          </CardList>
        )}
        {ticks.state === "done" && (
          <p role="status">{texts.ticksDone.replace("{n}", String(ticks.arrivals.length)).replace("{max}", String(max))}</p>
        )}
        {ticks.state === "failed" && <p role="alert">{texts.ticksFailed}</p>}
      </section>

      <section className="flex flex-col gap-2">
        <SectionHeading>{texts.action}</SectionHeading>
        <Button onClick={() => void ping()}>{texts.runAction}</Button>
        {action && <p role="status">{action}</p>}
      </section>
    </div>
  );
}
