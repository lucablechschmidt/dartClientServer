"use server";

import { diagEnabled } from "./diag";
import { requireAdmin } from "./request";

/** M12 part B: a harmless Server Action, so the page shows whether actions get through the ingress (Origin check). */
export async function diagPingAction(): Promise<{ ok: boolean; at: number }> {
  await requireAdmin();
  return { ok: diagEnabled(), at: Date.now() };
}
