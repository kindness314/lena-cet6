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

function icon(size) {
  const bg = [16, 16, 20];
  const ring = [122, 162, 255];
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const r = size * 0.28;
  const thickness = size * 0.075;
  const dot = size * 0.09;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      const onRing = Math.abs(d - r) <= thickness / 2;
      const onDot = Math.hypot(x - cx, y - (cy + r + dot)) <= dot * 0.55;
      const c = onRing || onDot ? ring : bg;
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = c[0];
      raw[i + 1] = c[1];
      raw[i + 2] = c[2];
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
