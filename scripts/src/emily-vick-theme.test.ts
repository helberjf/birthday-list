import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { DEFAULT_THEMES } from "../../lib/db/src/theme-presets.ts";

const theme = DEFAULT_THEMES.find((item) => item.slug === "emily-vik");
assert.ok(theme, "Emily Vick theme must be available in the versioned fallback catalog.");
assert.equal(theme.name, "Emilly Vick");
assert.match(theme.cssPrimary, /323|326/, "Emily Vick primary color should be pink, not green.");
assert.match(theme.cssSecondary, /333|332/, "Emily Vick secondary color should be pink, not green.");

const homePath = new URL("../../artifacts/birthday-invite/src/pages/Home.tsx", import.meta.url);
const homeSource = readFileSync(homePath, "utf8");

assert.equal(
  homeSource.includes("const THEME_PRESETS = ["),
  false,
  "Home should use the shared theme catalog only, without a legacy Minecraft-first fallback.",
);

const dashboardPath = new URL("../../artifacts/birthday-invite/src/pages/admin/Dashboard.tsx", import.meta.url);
const dashboardSource = readFileSync(dashboardPath, "utf8");
assert.equal(
  dashboardSource.includes('?? "minecraft"'),
  false,
  "Admin event form should not fall back to Minecraft when the event theme is missing.",
);

const cssPath = new URL("../../artifacts/birthday-invite/src/index.css", import.meta.url);
const cssSource = readFileSync(cssPath, "utf8");

for (const minecraftDefault of [
  "hsl(130 60% 12%)",
  "hsl(130 55% 28%)",
  "hsl(122 45% 42%)",
]) {
  assert.equal(
    cssSource.includes(minecraftDefault),
    false,
    `Base CSS should not default to Minecraft green (${minecraftDefault}).`,
  );
}

assert.ok(
  cssSource.includes("hsl(323 72% 34%)"),
  "Base CSS should default to the Emily Vick pink palette.",
);

console.log("Emily Vick theme regression checks passed.");
