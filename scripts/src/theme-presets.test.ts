import assert from "node:assert/strict";

import { DEFAULT_THEMES } from "../../lib/db/src/theme-presets";

const slugs = new Set(DEFAULT_THEMES.map((theme) => theme.slug));
const newThemeSlugs = [
  "emily-vik",
  "bluey",
  "patrulha-canina",
  "barbie",
  "moana",
  "encanto",
  "hot-wheels",
  "lol-surprise",
  "galinha-pintadinha",
  "circo",
  "fazendinha",
  "jardim-encantado",
  "ursinho",
  "toy-story",
  "minnie",
  "bailarina",
];

assert.ok(DEFAULT_THEMES.length >= 29, "expected at least 29 sellable themes");
assert.equal(slugs.size, DEFAULT_THEMES.length, "theme slugs must be unique");

for (const slug of newThemeSlugs) {
  assert.ok(slugs.has(slug), `missing new theme ${slug}`);
}

for (const theme of DEFAULT_THEMES) {
  assert.match(theme.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `bad slug ${theme.slug}`);
  assert.ok(theme.name.length >= 3, `missing name for ${theme.slug}`);
  assert.ok(theme.emoji.length >= 1, `missing emoji for ${theme.slug}`);
  assert.ok(theme.description.length >= 20, `missing description for ${theme.slug}`);
  assert.match(theme.heroBgFrom, /^#[0-9a-fA-F]{6}$/, `bad heroBgFrom for ${theme.slug}`);
  assert.match(theme.heroBgVia, /^#[0-9a-fA-F]{6}$/, `bad heroBgVia for ${theme.slug}`);
  assert.match(theme.heroBgTo, /^#[0-9a-fA-F]{6}$/, `bad heroBgTo for ${theme.slug}`);
  assert.ok(theme.cssPrimary.startsWith("hsl("), `bad primary CSS color for ${theme.slug}`);
  assert.ok(theme.cssSecondary.startsWith("hsl("), `bad secondary CSS color for ${theme.slug}`);
  assert.ok(theme.cssAccent.startsWith("hsl("), `bad accent CSS color for ${theme.slug}`);
  assert.ok(theme.confirmLabel.length >= 8, `missing confirm label for ${theme.slug}`);
  assert.ok(theme.successTitle.length >= 8, `missing success title for ${theme.slug}`);
  assert.ok(theme.successSub.length >= 12, `missing success subtitle for ${theme.slug}`);
  assert.ok(theme.confettiColors.length >= 4, `expected at least 4 confetti colors for ${theme.slug}`);
  assert.ok(theme.photoRecommendation.length >= 30, `missing photo recommendation for ${theme.slug}`);
  assert.ok(theme.photoPrompt.length >= 120, `missing detailed AI photo prompt for ${theme.slug}`);
}

console.log(`Theme preset checks passed for ${DEFAULT_THEMES.length} themes.`);
