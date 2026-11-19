import { connection } from "next/server";
import { DIAG_TICK_MS, DIAG_TICKS, diagEnabled } from "@/server/diag";
import { currentSession } from "@/server/request";

/**
 * M12 part B (m12-plan §B2): ten server-sent events a second apart, each with the server time, then
 * an `end` event. The page compares the arrival gaps: about 1000 ms means nothing buffers on the way.
 */
export async function GET(request: Request) {
  await connection();
  if (!diagEnabled()) return new Response(null, { status: 404 });
  if (!(await currentSession())) return new Response(null, { status: 401 });
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let n = 0;
      const stop = () => {
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      timer = setInterval(() => {
        n++;
        try {
          controller.enqueue(encoder.encode(`data: ${Date.now()}\n\n`));
          if (n >= DIAG_TICKS) {
            controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
            stop();
          }
        } catch {
          stop();
        }
      }, DIAG_TICK_MS);
      request.signal.addEventListener("abort", stop);
    },
    cancel() {
      clearInterval(timer);
    },
  });
  return new Response(stream, {
    // The same headers as the live route of a match (/api/match/[id]/events), so the probe measures that path.
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
