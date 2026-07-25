import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dataStorePath = new URL("../../artifacts/api-server/src/lib/data-store.ts", import.meta.url);
const source = readFileSync(dataStorePath, "utf8");

assert.match(
  source,
  /process\.env\["VERCEL"\]/,
  "Vercel runtime must be detected before falling back to MemoryStore.",
);

assert.match(
  source,
  /DATABASE_PROVIDER or DATABASE_URL must be configured/,
  "Vercel runtime without a configured database must fail loudly instead of using MemoryStore.",
);

console.log("Vercel database provider checks passed.");
