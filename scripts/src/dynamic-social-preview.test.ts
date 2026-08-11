import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "../..");
const vercelConfig = JSON.parse(readFileSync(resolve(repoRoot, "vercel.json"), "utf8")) as {
  rewrites?: Array<{ source: string; destination: string }>;
};
const appSource = readFileSync(resolve(repoRoot, "artifacts/api-server/src/app.ts"), "utf8");
const routeSource = readFileSync(resolve(repoRoot, "artifacts/api-server/src/routes/social-preview.ts"), "utf8");
const apiBuildSource = readFileSync(resolve(repoRoot, "artifacts/api-server/build.mjs"), "utf8");
const pageFunctionSource = readFileSync(resolve(repoRoot, "api/page.js"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8")) as {
  scripts?: Record<string, string>;
};

const rootRewrite = vercelConfig.rewrites?.find((rewrite) => rewrite.source === "/");
assert.equal(
  rootRewrite?.destination,
  "/api/page",
  "Root requests must reach the API so WhatsApp sees fresh event metadata.",
);

assert.match(
  appSource,
  /app\.get\(\["\/",\s*"\/api\/page"\],\s*socialPreviewHandler\)/,
  "The API app must expose the dynamic social preview page route.",
);

assert.match(
  routeSource,
  /dataStore\.getOrCreateEventConfig\(\)/,
  "Social preview metadata must be loaded from the current event config.",
);
assert.match(
  routeSource,
  /!process\.env\["VERCEL"\]/,
  "The Vercel route must not serve the development HTML template as a production fallback.",
);
assert.match(
  routeSource,
  /frontend-index\.html/,
  "The Vercel route must prefer the frontend HTML copied into the API bundle.",
);
assert.match(
  apiBuildSource,
  /frontend-index\.html/,
  "The API build must copy the built frontend HTML into the serverless bundle.",
);
assert.match(
  packageJson.scripts?.["build:vercel"] ?? "",
  /birthday-invite run build.*api-server run build/,
  "The frontend must build before the API bundle copies its HTML template.",
);
assert.match(routeSource, /config\.location/, "Social preview description must include the editable address.");
assert.match(routeSource, /config\.neighborhood/, "Social preview description must include the editable neighborhood.");
assert.match(routeSource, /replaceMetaTag\(\s*html,\s*"property",\s*"og:description"/, "Open Graph description must be injected dynamically.");
assert.match(routeSource, /replaceMetaTag\(\s*html,\s*"name",\s*"twitter:description"/, "Twitter description must be injected dynamically.");
assert.match(pageFunctionSource, /dist\/vercel\.mjs/, "The /api/page function must boot the compiled API app.");

console.log("Dynamic social preview routing checks passed.");
