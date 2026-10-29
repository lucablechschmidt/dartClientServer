import { connection } from "next/server";
import { matchHub } from "@/server/match-events";
import { currentSession } from "@/server/request";

const HEARTBEAT_MS = 25_000;

/**
 * Server-Sent Events (M4): one `change` event per stored change to the match, plus a
 * comment as heartbeat against proxy timeouts. The client then reloads the state itself.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await connection();
  if (!(await currentSession())) return new Response(null, { status: 401 });
  const { id } = await params;
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };
      send(": connected\n\n");
      const off = matchHub().subscribe(id, () => send("event: change\ndata: {}\n\n"));
      const timer = setInterval(() => send(": ping\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        off();
        clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      request.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
