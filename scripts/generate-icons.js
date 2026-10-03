import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function createPNG(width, height, drawFn) {
  // RGBA buffer
  const rgbaBuffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rgbaBuffer[idx] = r;
      rgbaBuffer[idx + 1] = g;
      rgbaBuffer[idx + 2] = b;
      rgbaBuffer[idx + 3] = a;
    }
  }

  // Filter type 0 (None) before every scanline
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  let scanIdx = 0;
  for (let y = 0; y < height; y++) {
    scanlines[scanIdx++] = 0; // Filter byte
    const lineStart = y * width * 4;
    rgbaBuffer.copy(scanlines, scanIdx, lineStart, lineStart + width * 4);
    scanIdx += width * 4;
  }

  const idatData = zlib.deflateSync(scanlines);

  // PNG chunks: Signature, IHDR, IDAT, IEND
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', idatData);
  const iendChunk = chunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function renderRFIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = w * 0.44;

  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background gradient: dark navy #0a0f1d to #0d1527
  const bgGrad = (y / h);
  let r = Math.round(10 + bgGrad * 6);
  let g = Math.round(15 + bgGrad * 8);
  let b = Math.round(29 + bgGrad * 12);
  let a = 255;

  // Smith chart circular boundary
  const circleThickness = Math.max(1.5, w * 0.008);
  if (Math.abs(dist - radius * 0.85) < circleThickness) {
    // Outer Smith Chart ring
    return [30, 58, 95, 255];
  }

  // Smith horizontal axis
  if (dist < radius * 0.85 && Math.abs(dy) < circleThickness) {
    return [37, 99, 235, 180];
  }

  // Constant resistance circle (r=1, passing through infinity on right)
  const r1Cx = cx + radius * 0.85 * 0.5;
  const r1Dist = Math.hypot(x - r1Cx, y - cy);
  const r1Radius = radius * 0.85 * 0.5;
  if (dist < radius * 0.85 && Math.abs(r1Dist - r1Radius) < circleThickness * 1.2) {
    return [14, 165, 233, 230];
  }

  // Center matching dot (50 ohm)
  if (dist < w * 0.035) {
    return [56, 189, 248, 255];
  }

  // Active RF matching trajectory curve (spiral towards center)
  // Distance to spiral: r(theta) = R0 * (1 - theta / 4pi)
  const angle = Math.atan2(dy, dx) + Math.PI;
  for (let rot = 0; rot < 2; rot++) {
    const spiralR = radius * 0.75 * (1 - (angle + rot * 2 * Math.PI) / (4.5 * Math.PI));
    if (dist < radius * 0.85 && Math.abs(dist - spiralR) < circleThickness * 1.8 && spiralR > w * 0.04) {
      return [56, 189, 248, 240];
    }
  }

  // Accent target dot
  const dotX = cx + radius * 0.45;
  const dotY = cy - radius * 0.15;
  if (Math.hypot(x - dotX, y - dotY) < w * 0.03) {
    return [245, 158, 11, 255];
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

console.log('Generating PNG icons...');
const png192 = createPNG(192, 192, (x, y, w, h) => renderRFIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

const png512 = createPNG(512, 512, (x, y, w, h) => renderRFIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

const pngMaskable = createPNG(512, 512, (x, y, w, h) => renderRFIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

const appleTouch = createPNG(180, 180, (x, y, w, h) => renderRFIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouch);

console.log('Icons successfully generated!');
