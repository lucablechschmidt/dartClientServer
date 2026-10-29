#!/usr/bin/env node
// Generates the ADMIN_PASSWORD_HASH line for the local .env (Next expands $VAR, hence \$)
// and for the Compose .env on the Pi (Compose interpolates, hence $$).
// Usage: node scripts/hash-password.mjs 'secret'   or without an argument to be prompted in the terminal.
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";

let password = process.argv[2];
if (!password) {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  password = await rl.question("Password: ");
  rl.close();
}
if (!password) {
  console.error("Empty password.");
  process.exit(1);
}
const hash = bcrypt.hashSync(password, 12);
console.log("# local .env (Next):");
console.log("ADMIN_PASSWORD_HASH=" + hash.replaceAll("$", "\\$"));
console.log("# ~/darts/.env on the Pi (Docker Compose):");
console.log("ADMIN_PASSWORD_HASH=" + hash.replaceAll("$", "$$$$"));
console.log("# plain hash, e.g. to set it directly in the database (README: forgotten admin password):");
console.log(hash);
