/**
 * Generates the app icons from the Muvo logo (assets/splash-icon.png, the desktop app's icon).
 * Usage: npm run icons   (needs ffmpeg on PATH; dev-only, the generated PNGs are committed)
 *
 * The logo is a blue mark on a navy tile with transparent rounded corners:
 * - icon.png: the tile with its corners filled (iOS refuses transparency).
 * - android-icon-foreground.png / -monochrome.png: the mark alone, keyed off the tile and scaled
 *   into the adaptive-icon safe zone. The background is app.json's `backgroundColor`.
 * - favicon.png: the logo, small.
 */
const { Buffer } = require('node:buffer');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS_DIR, 'splash-icon.png');

const ICON_SIZE_PX = 1024;
const FAVICON_SIZE_PX = 48;
// Android masks the 108 dp layer down to a 66 dp circle (61 %). The mark is a rounded cross whose
// corners reach a little past its bounding box's half-side, so the box gets 56 % of the canvas.
const ADAPTIVE_MARK_RATIO = 0.56;
const MARK_SIZE_PX = Math.round((ICON_SIZE_PX * ADAPTIVE_MARK_RATIO) / 2) * 2;
// Where the tile colour is sampled: top centre, inside the tile and away from the mark.
const TILE_SAMPLE_Y_RATIO = 0.02;
// The logo is a dithered palette PNG, so single pixels are unreliable: the key reads a blurred
// copy. A pixel belongs to the mark when the blurred copy is this far (RGB distance) from the tile
// colour; the darkest part of the mark is about 130 away.
const KEY_BLUR_SIGMA_PX = 2;
const MARK_MIN_DISTANCE = 100;
const CHANNELS = 4;
const OPAQUE = 255;
const MAX_BUFFER_BYTES = 256 * 1024 * 1024;

function ffmpeg(args, input) {
  return execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], {
    input,
    maxBuffer: MAX_BUFFER_BYTES,
  });
}

function readSource() {
  const size = execFileSync('ffprobe', [
    ...['-v', 'error', '-select_streams', 'v:0'],
    ...['-show_entries', 'stream=width,height', '-of', 'csv=p=0', SOURCE],
  ]);
  const [width, height] = String(size).trim().split(',').map(Number);
  const pixels = ffmpeg(['-i', SOURCE, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-']);
  if (pixels.length !== width * height * CHANNELS) {
    throw new Error(`Unexpected pixel data for ${SOURCE}: ${pixels.length} bytes`);
  }
  return { width, height, pixels };
}

/** Runs raw RGBA pixels through an ffmpeg filter chain that keeps their size. */
function filterPixels({ width, height, pixels }, filter) {
  const rawInput = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-i', '-'];
  return ffmpeg([...rawInput, '-vf', filter, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], pixels);
}

/** Writes raw RGBA pixels as a PNG, through an ffmpeg filter chain. */
function writePng({ width, height, pixels }, { name, filter, pixelFormat = 'rgba' }) {
  const rawInput = ['-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${width}x${height}`, '-i', '-'];
  const output = ['-vf', filter, '-frames:v', '1', '-pix_fmt', pixelFormat];
  ffmpeg([...rawInput, ...output, path.join(ASSETS_DIR, name)], pixels);
  console.log(`wrote assets/${name}`);
}

/** The tile with its transparent corners filled with the tile colour. */
function flattenOnTile({ width, height, pixels }, tile) {
  const out = Buffer.from(pixels);
  for (let i = 0; i < out.length; i += CHANNELS) {
    const alpha = out[i + 3] / OPAQUE;
    for (let c = 0; c < 3; c += 1)
      out[i + c] = Math.round(out[i + c] * alpha + tile[c] * (1 - alpha));
    out[i + 3] = OPAQUE;
  }
  return { width, height, pixels: out };
}

/**
 * Keys the mark off the tile. Returns the mark in colour and in white (for themed icons), plus
 * the mark's bounding box.
 */
function extractMark({ width, height, pixels }, tile) {
  const blurred = filterPixels(
    flattenOnTile({ width, height, pixels }, tile),
    `gblur=sigma=${KEY_BLUR_SIGMA_PX}`,
  );
  const color = Buffer.alloc(pixels.length);
  const white = Buffer.alloc(pixels.length);
  const box = { left: width, top: height, right: -1, bottom: -1 };
  for (let i = 0; i < pixels.length; i += CHANNELS) {
    const distance = Math.hypot(...[0, 1, 2].map((c) => blurred[i + c] - tile[c]));
    if (pixels[i + 3] !== OPAQUE || distance < MARK_MIN_DISTANCE) continue;
    pixels.copy(color, i, i, i + CHANNELS);
    white.fill(OPAQUE, i, i + CHANNELS);
    const x = (i / CHANNELS) % width;
    const y = Math.floor(i / CHANNELS / width);
    box.left = Math.min(box.left, x);
    box.right = Math.max(box.right, x);
    box.top = Math.min(box.top, y);
    box.bottom = Math.max(box.bottom, y);
  }
  if (box.right < 0) throw new Error(`No mark found in ${SOURCE}`);
  return { color, white, box };
}

function adaptiveFilter(box) {
  const crop = `crop=${box.right - box.left + 1}:${box.bottom - box.top + 1}:${box.left}:${box.top}`;
  const scale = `scale=${MARK_SIZE_PX}:${MARK_SIZE_PX}:force_original_aspect_ratio=decrease:flags=lanczos`;
  const pad = `pad=${ICON_SIZE_PX}:${ICON_SIZE_PX}:-1:-1:color=black@0`;
  // Scaling premultiplied keeps the transparent pixels' colour out of the edges.
  return [crop, 'premultiply=inplace=1', scale, 'unpremultiply=inplace=1', pad].join(',');
}

function main() {
  const source = readSource();
  const { width, height, pixels } = source;
  const sample =
    (Math.round(height * TILE_SAMPLE_Y_RATIO) * width + Math.round(width / 2)) * CHANNELS;
  const tile = [pixels[sample], pixels[sample + 1], pixels[sample + 2]];
  const mark = extractMark(source, tile);
  const adaptive = adaptiveFilter(mark.box);
  const square = (size) => `scale=${size}:${size}:flags=lanczos`;

  writePng(flattenOnTile(source, tile), {
    name: 'icon.png',
    filter: square(ICON_SIZE_PX),
    pixelFormat: 'rgb24',
  });
  writePng(
    { width, height, pixels: mark.color },
    { name: 'android-icon-foreground.png', filter: adaptive },
  );
  writePng(
    { width, height, pixels: mark.white },
    { name: 'android-icon-monochrome.png', filter: adaptive },
  );
  writePng(source, {
    name: 'favicon.png',
    filter: `premultiply=inplace=1,${square(FAVICON_SIZE_PX)},unpremultiply=inplace=1`,
  });
}

main();
