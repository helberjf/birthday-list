import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboardPath = new URL("../../artifacts/birthday-invite/src/pages/admin/Dashboard.tsx", import.meta.url);
const source = readFileSync(dashboardPath, "utf8");

assert.ok(
  source.includes("function formatDateSafe("),
  "Dashboard should format possibly invalid API dates through a safe helper.",
);

assert.ok(
  source.includes("Number.isNaN(date.getTime()) ? fallback : format(date, pattern)"),
  "Dashboard date helper should avoid date-fns RangeError for invalid dates.",
);

assert.doesNotMatch(
  source,
  /format\(new Date\((?:guest|g|entry)\.createdAt\)/,
  "Dashboard guest and audit dates should not call date-fns directly with unvalidated dates.",
);

console.log("Dashboard date safety checks passed.");
