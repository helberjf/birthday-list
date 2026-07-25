import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const homePath = new URL("../../artifacts/birthday-invite/src/pages/Home.tsx", import.meta.url);
const source = readFileSync(homePath, "utf8");

assert.ok(
  source.includes("const [active, setActive] = useState(true);"),
  "YouTube music player should mount active and attempt autoplay.",
);

const musicEffect = source.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[musicUrl, youtubeEmbedUrl\]\);/);
assert.ok(musicEffect, "MusicPlayer setup effect should be present.");
assert.equal(
  musicEffect[0].includes("audio.play()"),
  true,
  "Audio music should attempt autoplay when a direct music file is configured.",
);

assert.ok(
  source.includes("<SpotifySection event={EVENT} />"),
  "Spotify playlist URL should still be rendered on the public page.",
);

const spotifySection = source.match(/function SpotifySection[\s\S]*?^}/m);
assert.ok(spotifySection, "SpotifySection should be present.");
assert.ok(
  spotifySection[0].includes("event.spotifyPlaylistUrl || DEFAULT_EVENT.spotifyPlaylistUrl"),
  "Spotify card should fall back to the default playlist when the event config has no playlist URL.",
);
assert.equal(
  spotifySection[0].includes("allow=\"autoplay;"),
  false,
  "Spotify embed must not allow autoplay.",
);

console.log("Home music autoplay checks passed.");
