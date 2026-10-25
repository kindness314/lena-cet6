import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

const BG = [23, 20, 30];
const ROSE = [229, 138, 160];
const IRIS = [155, 148, 224];
const GOLD = [242, 207, 138];

function star(x, y, cx, cy, outer, inner, points = 5) {
  const n = points * 2;
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 === 0 ? outer : inner;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function colorAt(x, y, size) {
  const cx = size / 2;
  const cy = size / 2;
  const px = x - cx;
  const py = y - cy;
  const d = Math.hypot(px, py);
  const mask = size * 0.5;
  if (d > mask * 0.98) return null;

  // soft diagonal halo
  const t = Math.max(0, Math.min(1, (x / size) * 0.55 + (y / size) * 0.45));
  let out = BG.map((v, i) => Math.round(v + (ROSE[i] - v) * 0.055 * (1 - t)));

  const ringR = size * 0.335;
  const ringW = size * 0.022;
  if (Math.abs(d - ringR) < ringW) out = ROSE;

  const starOuter = size * 0.205;
  const starInner = size * 0.086;
  if (star(x, y, cx, cy - size * 0.004, starOuter, starInner)) out = GOLD;

  // tiny orbit dot, upper right
  const dotD = Math.hypot(x - (cx + size * 0.285), y - (cy - size * 0.27));
  if (dotD < size * 0.032) out = IRIS;

  return out;
}

function icon(size) {
  const ss = 3;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const c = colorAt(x + (sx + 0.5) / ss, y + (sy + 0.5) / ss, size);
          if (c) {
            r += c[0];
            g += c[1];
            b += c[2];
            n++;
          }
        }
      }
      const i = y * (size * 3 + 1) + 1 + x * 3;
      if (n === 0) {
        raw[i] = BG[0];
        raw[i + 1] = BG[1];
        raw[i + 2] = BG[2];
      } else {
        raw[i] = Math.round(r / n);
        raw[i + 1] = Math.round(g / n);
        raw[i + 2] = Math.round(b / n);
      }
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync(new URL("../public/icon-192.png", import.meta.url), icon(192));
writeFileSync(new URL("../public/icon-512.png", import.meta.url), icon(512));
console.log("icons written");
