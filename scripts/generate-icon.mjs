// Generates the Workroom app icons from the real Workroom mark: the web app's
// app/icon.svg (workroom repo). Same shapes, same coordinates (32x32 viewBox),
// same colours.
//
//   node scripts/generate-icon.mjs
//
// <svg viewBox="0 0 32 32" fill="none">
//   <rect width="32" height="32" rx="8" fill="#221F1B"/>
//   <rect x="7" y="8" width="18" height="15" rx="2.5" stroke="#F3EFE6" stroke-width="1.6"/>
//   <path d="M7 13h18" stroke="#F3EFE6" stroke-width="1.6"/>
//   <path d="M12 18.5h8" stroke="#1F6B4A" stroke-width="1.8" stroke-linecap="round"/>
// </svg>
import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'images');
const SPLASH_FRAME = 22;
const LOGO = {
  name: 'Workroom',
  elements: [
    { type: 'rect', x: 0, y: 0, width: 32, height: 32, rx: 8, fill: '#221F1B' },
    { type: 'rect', x: 7, y: 8, width: 18, height: 15, rx: 2.5, stroke: '#F3EFE6', strokeWidth: 1.6 },
    { type: 'path', d: 'M7 13h18', stroke: '#F3EFE6', strokeWidth: 1.6 },
    { type: 'path', d: 'M12 18.5h8', stroke: '#1F6B4A', strokeWidth: 1.8 },
  ],
};

// ---------------------------------------------------------------------------
// Dependency-free renderer (same approach as stamply-mobile's generate-icon:
// plain Node, hand-written PNG encoder, no image libraries). Shapes are drawn
// with signed-distance anti-aliasing, so edges stay smooth at every size.
// ---------------------------------------------------------------------------

function crc(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let i = 0; i < 8; i += 1) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([length, body, sum]);
}

function png(size, rgba) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size * 4; x += 1) {
      raw[row + 1 + x] = Math.round(Math.min(1, Math.max(0, rgba[y * size * 4 + x])) * 255);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hex(value) {
  const v = value.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
}

// Minimal SVG path parser: M L H V C S Z (absolute and relative).
// Curves are flattened into polylines; returns a list of subpaths.
function parsePath(d) {
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g);
  const subpaths = [];
  let current = null;
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  let lastCtrl = null;
  let cmd = '';
  let i = 0;
  const num = () => parseFloat(tokens[i++]);
  const cubic = (x1, y1, x2, y2, x3, y3) => {
    const steps = 48;
    for (let s = 1; s <= steps; s += 1) {
      const t = s / steps;
      const mt = 1 - t;
      current.push([
        mt * mt * mt * x + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3,
        mt * mt * mt * y + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3,
      ]);
    }
    lastCtrl = [x2, y2];
    x = x3;
    y = y3;
  };
  while (i < tokens.length) {
    if (/[a-zA-Z]/.test(tokens[i])) cmd = tokens[i++];
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    switch (cmd.toUpperCase()) {
      case 'M':
        x = ox + num();
        y = oy + num();
        current = [[x, y]];
        subpaths.push(current);
        startX = x;
        startY = y;
        cmd = rel ? 'l' : 'L';
        lastCtrl = null;
        break;
      case 'L':
        x = ox + num();
        y = oy + num();
        current.push([x, y]);
        lastCtrl = null;
        break;
      case 'H':
        x = ox + num();
        current.push([x, y]);
        lastCtrl = null;
        break;
      case 'V':
        y = oy + num();
        current.push([x, y]);
        lastCtrl = null;
        break;
      case 'C': {
        const x1 = ox + num();
        const y1 = oy + num();
        const x2 = ox + num();
        const y2 = oy + num();
        cubic(x1, y1, x2, y2, ox + num(), oy + num());
        break;
      }
      case 'S': {
        const x1 = lastCtrl ? 2 * x - lastCtrl[0] : x;
        const y1 = lastCtrl ? 2 * y - lastCtrl[1] : y;
        const x2 = ox + num();
        const y2 = oy + num();
        cubic(x1, y1, x2, y2, ox + num(), oy + num());
        break;
      }
      case 'Z':
        current.push([startX, startY]);
        x = startX;
        y = startY;
        lastCtrl = null;
        break;
      default:
        throw new Error(`unsupported path command ${cmd}`);
    }
  }
  return subpaths;
}

function segmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function roundedBoxDistance(px, py, { x, y, width, height, rx = 0 }) {
  const cx = x + width / 2;
  const cy = y + height / 2;
  const qx = Math.abs(px - cx) - width / 2 + rx;
  const qy = Math.abs(py - cy) - height / 2 + rx;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - rx;
}

// Signed distance (negative inside) for every supported element, in SVG units.
function compile(element) {
  if (element.type === 'rect') {
    const pad = element.stroke ? element.strokeWidth / 2 : 0;
    const box = [element.x - pad, element.y - pad, element.x + element.width + pad, element.y + element.height + pad];
    if (element.stroke) {
      return { ...element, box, sdf: (px, py) => Math.abs(roundedBoxDistance(px, py, element)) - element.strokeWidth / 2 };
    }
    return { ...element, box, sdf: (px, py) => roundedBoxDistance(px, py, element) };
  }
  const subpaths = parsePath(element.d);
  const points = subpaths.flat();
  const pad = element.stroke ? element.strokeWidth / 2 : 0;
  const box = [
    Math.min(...points.map((p) => p[0])) - pad,
    Math.min(...points.map((p) => p[1])) - pad,
    Math.max(...points.map((p) => p[0])) + pad,
    Math.max(...points.map((p) => p[1])) + pad,
  ];
  const edgeDistance = (px, py) => {
    let best = Infinity;
    for (const sub of subpaths) {
      for (let k = 1; k < sub.length; k += 1) {
        best = Math.min(best, segmentDistance(px, py, sub[k - 1][0], sub[k - 1][1], sub[k][0], sub[k][1]));
      }
    }
    return best;
  };
  if (element.stroke) {
    // Round caps/joins. Where the SVG uses butt caps, the cap only ever lands on
    // an area of the same colour, so the result is visually identical.
    return { ...element, box, sdf: (px, py) => edgeDistance(px, py) - element.strokeWidth / 2 };
  }
  return {
    ...element,
    box,
    sdf: (px, py) => {
      let winding = 0;
      for (const sub of subpaths) {
        const ring = [...sub, sub[0]];
        for (let k = 1; k < ring.length; k += 1) {
          const [ax, ay] = ring[k - 1];
          const [bx, by] = ring[k];
          if (ay <= py && by > py && (bx - ax) * (py - ay) - (px - ax) * (by - ay) > 0) winding += 1;
          else if (ay > py && by <= py && (bx - ax) * (py - ay) - (px - ax) * (by - ay) < 0) winding -= 1;
        }
      }
      const distance = edgeDistance(px, py);
      return winding !== 0 ? -distance : distance;
    },
  };
}

/**
 * Render elements into a square PNG.
 * view: [x, y, size] of the SVG-space square mapped onto the image.
 * background: hex colour or null (transparent).
 * paint(element) -> hex colour, or 'erase' to cut the shape out (monochrome).
 */
function render(size, { view, background = null, elements, paint = (element) => element.stroke || element.fill }) {
  const shapes = elements.map(compile);
  const rgba = new Float64Array(size * size * 4);
  const scale = view[2] / size;
  const bg = background ? hex(background) : null;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const o = (py * size + px) * 4;
      if (bg) {
        rgba[o] = bg[0];
        rgba[o + 1] = bg[1];
        rgba[o + 2] = bg[2];
        rgba[o + 3] = 1;
      }
      const ux = view[0] + (px + 0.5) * scale;
      const uy = view[1] + (py + 0.5) * scale;
      for (const shape of shapes) {
        if (ux < shape.box[0] - scale || ux > shape.box[2] + scale || uy < shape.box[1] - scale || uy > shape.box[3] + scale) {
          continue;
        }
        const coverage = Math.max(0, Math.min(1, 0.5 - shape.sdf(ux, uy) / scale));
        if (coverage === 0) continue;
        const colour = paint(shape);
        if (colour === 'erase') {
          // Premultiplied-free cut-out: reduce alpha, keep colour.
          rgba[o + 3] *= 1 - coverage;
          continue;
        }
        const [r, g, b] = hex(colour);
        const a = rgba[o + 3];
        const outA = coverage + a * (1 - coverage);
        rgba[o] = (r * coverage + rgba[o] * a * (1 - coverage)) / outA;
        rgba[o + 1] = (g * coverage + rgba[o + 1] * a * (1 - coverage)) / outA;
        rgba[o + 2] = (b * coverage + rgba[o + 2] * a * (1 - coverage)) / outA;
        rgba[o + 3] = outA;
      }
    }
  }
  return png(size, rgba);
}

// ---------------------------------------------------------------------------
// Outputs. The tile (first element) is the brand background; everything after
// it is the glyph.
// ---------------------------------------------------------------------------

const [tile, ...glyph] = LOGO.elements;
const brand = tile.fill;
// Android adaptive icons crop to a circle of ~66% of the canvas, so the glyph
// is drawn at 72% of its web size to keep it inside the safe zone.
const adaptiveView = [16 - 16 / 0.72, 16 - 16 / 0.72, 32 / 0.72];
// Splash: just the glyph, tightly framed; the native splash paints the brand
// colour behind it (backgroundColor in the app config).
const splashView = [16 - SPLASH_FRAME / 2, 16 - SPLASH_FRAME / 2, SPLASH_FRAME];
// Monochrome (Android 13 themed icons): one colour; parts marked mono: 'cut'
// (details drawn on top of a light shape) become transparent cut-outs.
const mono = (element) => (element.mono === 'cut' ? 'erase' : '#ffffff');

const outputs = [
  // iOS/App Store: opaque, full-bleed (the OS applies its own rounded mask).
  ['icon.png', 1024, { view: [0, 0, 32], background: brand, elements: glyph }],
  ['splash-icon.png', 1024, { view: splashView, elements: glyph }],
  // Web favicon: the exact rounded tile from the web app's icon.svg.
  ['favicon.png', 48, { view: [0, 0, 32], elements: LOGO.elements }],
  ['android-icon-background.png', 512, { view: [0, 0, 32], background: brand, elements: [] }],
  ['android-icon-foreground.png', 1024, { view: adaptiveView, elements: glyph }],
  ['android-icon-monochrome.png', 1024, { view: adaptiveView, elements: glyph, paint: mono }],
];

fs.mkdirSync(OUT_DIR, { recursive: true });
for (const [name, size, options] of outputs) {
  fs.writeFileSync(path.join(OUT_DIR, name), render(size, options));
}
console.log(`wrote ${outputs.length} ${LOGO.name} icons to ${path.relative(process.cwd(), OUT_DIR) || '.'}`);
