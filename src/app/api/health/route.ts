import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";
import { log } from "@/server/log";

/** For the Docker healthcheck and monitoring: 200 if the DB answers, otherwise 503. Public, so the reason goes to the log only. */
export async function GET() {
  await connection();
  try {
    getDb().run(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    log.error("health.db", e);
    return Response.json({ ok: false }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
