import https from 'node:https';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');

const BROWSER_UA = 'Mozilla/5.0 (compatible; PullCheck/1.0; +https://github.com/b08007621-wq/pullcheck)';
const WHITE = 232;
const WHITE_SHARE = 0.9;

export function download(url, attempts = 4) {
  return new Promise((resolve, reject) => {
    const tryOnce = (attempt) => {
      const request = https.get(url, { headers: { 'User-Agent': BROWSER_UA }, timeout: 20000 }, (response) => {
        if (response.statusCode === 404) {
          response.resume();
          resolve(null);
          return;
        }
        if (response.statusCode !== 200) {
          response.resume();
          retry(attempt, new Error(`HTTP ${response.statusCode}`));
          return;
        }
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', (error) => retry(attempt, error));
      });
      request.on('timeout', () => request.destroy(new Error('timeout')));
      request.on('error', (error) => retry(attempt, error));
    };
    const retry = (attempt, error) => {
      if (attempt >= attempts) reject(error);
      else setTimeout(() => tryOnce(attempt + 1), attempt * 1500);
    };
    tryOnce(1);
  });
}

export function decode(bytes) {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const png = PNG.sync.read(bytes);
    return { width: png.width, height: png.height, data: png.data };
  }
  return jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 256 });
}

export function trimWhite(image) {
  const { width, height, data } = image;
  const white = (x, y) => {
    const k = (y * width + x) * 4;
    const alpha = data[k + 3] ?? 255;
    return alpha < 16 || (data[k] > WHITE && data[k + 1] > WHITE && data[k + 2] > WHITE);
  };
  const rowWhite = (y) => {
    let count = 0;
    for (let x = 0; x < width; x += 1) if (white(x, y)) count += 1;
    return count / width > WHITE_SHARE;
  };
  const colWhite = (x, top, bottom) => {
    let count = 0;
    for (let y = top; y < bottom; y += 1) if (white(x, y)) count += 1;
    return count / Math.max(1, bottom - top) > WHITE_SHARE;
  };
  let top = 0;
  let bottom = height;
  while (top < bottom - 10 && rowWhite(top)) top += 1;
  while (bottom > top + 10 && rowWhite(bottom - 1)) bottom -= 1;
  let left = 0;
  let right = width;
  while (left < right - 10 && colWhite(left, top, bottom)) left += 1;
  while (right > left + 10 && colWhite(right - 1, top, bottom)) right -= 1;
  if (left === 0 && top === 0 && right === width && bottom === height) return image;
  const w = right - left;
  const h = bottom - top;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    const from = ((top + y) * width + left) * 4;
    out.set(data.subarray(from, from + w * 4), y * w * 4);
  }
  return { width: w, height: h, data: out };
}
