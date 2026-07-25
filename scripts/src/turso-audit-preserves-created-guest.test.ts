import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tursoStorePath = new URL("../../artifacts/api-server/src/lib/turso-store.ts", import.meta.url);
const source = readFileSync(tursoStorePath, "utf8");

const auditMethodMatch = source.match(
  /async createGuestAudit\([\s\S]*?\r?\n  }\r?\n\r?\n  async listGuestAudit/,
);

assert.ok(auditMethodMatch, "TursoStore createGuestAudit method should exist.");

assert.doesNotMatch(
  auditMethodMatch[0],
  /const state = await this\.ensureLoaded\(\);/,
  "Turso audit writes must preserve the current in-memory state after createGuest instead of reloading stale DB state.",
);

assert.match(
  auditMethodMatch[0],
  /this\.state \?\? await this\.ensureLoaded\(\)/,
  "Turso audit writes should reuse the current state when it was already loaded by the same request.",
);

console.log("Turso audit persistence checks passed.");
