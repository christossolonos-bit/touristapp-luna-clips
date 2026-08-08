// Generates flat PNG app icons (a location pin) for the PWA manifest.
// Pure Node — no image libraries. Run: `node scripts/gen-icons.mjs`
import zlib from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const TEAL = [15, 118, 110];
const WHITE = [240, 253, 250];

function sign(ax, ay, bx, by, cx, cy) {
  return (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
}
function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

// Colour of a single pixel — full-bleed teal with a white pin in the safe zone.
function pixel(x, y, S) {
  const cx = 0.5 * S;
  const cyHead = 0.4 * S;
  const rh = 0.225 * S; // pin head radius
  const ri = 0.092 * S; // inner hole radius
  const tipY = 0.8 * S;
  const baseY = 0.52 * S;
  const halfW = 0.19 * S;

  const dxh = x - cx;
  const dyh = y - cyHead;
  const dist2 = dxh * dxh + dyh * dyh;
  const inHead = dist2 <= rh * rh;
  const inTri = inTriangle(x, y, cx, tipY, cx - halfW, baseY, cx + halfW, baseY);
  const inInner = dist2 <= ri * ri;

  return (inHead || inTri) && !inInner ? WHITE : TEAL;
}

// --- minimal PNG encoder (truecolor, no filter) ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}
function encodePng(S) {
  const raw = Buffer.alloc(S * (1 + S * 3));
  let o = 0;
  for (let y = 0; y < S; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < S; x++) {
      const [r, g, b] = pixel(x, y, S);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0);
  ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolor
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(OUT_DIR, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(resolve(OUT_DIR, `icon-${size}.png`), encodePng(size));
  console.log(`wrote icon-${size}.png`);
}
