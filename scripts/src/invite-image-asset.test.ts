import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const imagePath = new URL("../../artifacts/birthday-invite/public/images/convite-julia.jpg", import.meta.url);
const bytes = readFileSync(imagePath);
const hash = createHash("sha256").update(bytes).digest("hex").toUpperCase();

function readJpegSize(data: Buffer) {
  let offset = 2;
  while (offset < data.length) {
    if (data[offset] !== 0xff) break;
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("Could not read JPEG dimensions.");
}

assert.equal(hash, "8C0D3BB79094CD7CF8E73A0EECCA4B1CC9A6A992B33F3AFD5A077A5386C5C03A");
assert.deepEqual(readJpegSize(bytes), { width: 1024, height: 1535 });

console.log("Invite image asset checks passed.");
