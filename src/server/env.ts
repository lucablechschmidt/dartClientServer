import { z } from "zod";

/**
 * Configuration from the environment (M3). Admin data is optional as long as Basic Auth in Caddy
 * protects the app; if it is missing, there is no bootstrap and startup only warns.
 */
const schema = z.object({
  ADMIN_USER: z.string().trim().min(1).optional(),
  ADMIN_PASSWORD_HASH: z.string().trim().regex(/^\$2[aby]\$\d\d\$/, "bcrypt hash expected").optional(),
  APP_URL: z.string().url().default("http://127.0.0.1:3100"),
  COOKIE_SECURE: z.enum(["true", "false"]).default("true"),
});

export type Env = {
  admin: { name: string; passwordHash: string } | null;
  appUrl: string;
  cookieSecure: boolean;
};

export function readEnv(source: Record<string, string | undefined> = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Invalid environment: ${lines.join("; ")}. ` +
        "Note: in .env every $ of a bcrypt hash must be written as \\$ (Next expands $VAR), in the Compose .env on the Pi as $$.",
    );
  }
  const e = parsed.data;
  return {
    admin: e.ADMIN_USER && e.ADMIN_PASSWORD_HASH ? { name: e.ADMIN_USER, passwordHash: e.ADMIN_PASSWORD_HASH } : null,
    appUrl: e.APP_URL.replace(/\/$/, ""),
    cookieSecure: e.COOKIE_SECURE === "true",
  };
}
