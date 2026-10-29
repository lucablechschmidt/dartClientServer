import { connection } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db/client";

/** For the Docker healthcheck and monitoring: 200 if the DB answers, otherwise 503. */
export async function GET() {
  await connection();
  try {
    getDb().run(sql`select 1`);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
