// bring-the-humans-03 — entrypoint (Node 22, standard library only).
//
// The entry is the video itself: an original 18-second vertical TikTok ad
// for make.fun, rendered in the agent session that built this repository
// and posted publicly on TikTok. All this program does is hand the house
// the video's address: it reads VIDEO.json at the repository root and
// writes the same file to /output/VIDEO.json, where the gate picks it up.
//
// The gate scores the video by reading it from TikTok, never by anything
// this program prints. The program needs no network and no clock, and it
// reads nothing outside the repository, so repeated runs produce the
// same output bytes for the same VIDEO.json.
//
// VIDEO.json still carries the placeholder address until the ad is posted
// on TikTok; swap the placeholder for the posted video's full address
// before submitting. A placeholder is passed through with a warning on
// stderr (exit code stays 0, exactly like the kit's starter), and the
// gate scores it 0 until a real address is in place.
//
// Run it the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const BOT_DIR = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const FILE_NAME = 'VIDEO.json';

// A canonical TikTok video address, as the browser shows it: no short
// links, no query string, no extra path segments. The house reads this
// same address from TikTok, so anything shaped differently is refused
// at the gate anyway.
const TIKTOK_VIDEO_URL =
  /^https:\/\/www\.tiktok\.com\/@[^/\s]+\/video\/\d+\/?$/;

function fail(message: string): never {
  console.error(`${FILE_NAME}: ${message}`);
  process.exit(1);
}

const sourcePath = join(BOT_DIR, FILE_NAME);
if (!existsSync(sourcePath)) {
  fail(`not found in ${BOT_DIR}`);
}

let doc: unknown;
try {
  doc = JSON.parse(readFileSync(sourcePath, 'utf8'));
} catch (error) {
  fail(`could not be parsed as JSON: ${(error as Error).message}`);
}

const url = (doc as { url?: unknown } | null)?.url;
if (typeof url !== 'string' || url === '') {
  fail('must be an object with a non-empty string "url"');
}

if (!TIKTOK_VIDEO_URL.test(url)) {
  const stillPlaceholder = url.includes('<handle>') || url.includes('<id>');
  console.error(
    `warning: ${FILE_NAME} does not name a posted TikTok video yet ` +
      `(${url}); ` +
      (stillPlaceholder
        ? 'it still holds the placeholder — '
        : '') +
      'replace it with the video\'s full address before submitting',
  );
}

mkdirSync(OUTPUT_DIR, { recursive: true });
try {
  copyFileSync(sourcePath, join(OUTPUT_DIR, FILE_NAME));
} catch (error) {
  fail(`could not be copied to ${OUTPUT_DIR}: ${(error as Error).message}`);
}

// Read the copy back and confirm it is byte-for-byte the file we were
// given: the gate reads /output, so a silent short write here would
// cost the entry its video address.
const handedOver = readFileSync(join(OUTPUT_DIR, FILE_NAME), 'utf8');
if (handedOver !== readFileSync(sourcePath, 'utf8')) {
  fail(`copy in ${OUTPUT_DIR} differs from ${sourcePath}`);
}

console.log(`${FILE_NAME} handed to the gate: ${url}`);
