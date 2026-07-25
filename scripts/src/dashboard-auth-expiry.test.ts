import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dashboardPath = new URL("../../artifacts/birthday-invite/src/pages/admin/Dashboard.tsx", import.meta.url);
const source = readFileSync(dashboardPath, "utf8");

assert.ok(
  source.includes("function isUnauthorizedError("),
  "Dashboard should recognize expired or invalid admin tokens from API errors.",
);

assert.ok(
  source.includes("function useAdminAuthExpiry("),
  "Dashboard should centralize auth-expiry handling for protected admin queries.",
);

assert.ok(
  source.includes("error: statsError"),
  "Admin stats query errors should be observed.",
);

assert.ok(
  source.includes("error: guestsError"),
  "Guest list query errors should be observed.",
);

assert.ok(
  source.includes("useAdminAuthExpiry(statsError, logout);"),
  "Expired tokens from the stats query should log the organizer out.",
);

assert.ok(
  source.includes("useAdminAuthExpiry(guestsError, logout);"),
  "Expired tokens from the guest list query should log the organizer out.",
);

console.log("Dashboard auth-expiry checks passed.");
