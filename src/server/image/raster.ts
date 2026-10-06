import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

export type Raster = {
  width: number;
  height: number;
  data: Uint8Array;
};

export function createRaster(width: number, height: number): Raster {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

export function decodeJpeg(buffer: Uint8Array): Raster {
  const decoded = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 256 });
  return { width: decoded.width, height: decoded.height, data: decoded.data };
}

export function decodeImage(buffer: Uint8Array): Raster {
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  if (!isPng) return decodeJpeg(buffer);
  const png = PNG.sync.read(Buffer.from(buffer));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

export function encodeJpeg(raster: Raster, quality = 88): Uint8Array {
  return jpeg.encode({ width: raster.width, height: raster.height, data: raster.data }, quality).data;
}

export function sampleInto(raster: Raster, x: number, y: number, out: number[]) {
  const fx = Math.min(raster.width - 1, Math.max(0, x - 0.5));
  const fy = Math.min(raster.height - 1, Math.max(0, y - 0.5));
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(raster.width - 1, x0 + 1);
  const y1 = Math.min(raster.height - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const { data, width } = raster;
  for (let channel = 0; channel < 3; channel++) {
    const top = data[(y0 * width + x0) * 4 + channel]! * (1 - tx) + data[(y0 * width + x1) * 4 + channel]! * tx;
    const bottom = data[(y1 * width + x0) * 4 + channel]! * (1 - tx) + data[(y1 * width + x1) * 4 + channel]! * tx;
    out[channel] = top * (1 - ty) + bottom * ty;
  }
}

export function downscale(raster: Raster, maxSide: number): { raster: Raster; scale: number } {
  const scale = Math.min(1, maxSide / Math.max(raster.width, raster.height));
  if (scale === 1) return { raster, scale };
  const width = Math.max(1, Math.round(raster.width * scale));
  const height = Math.max(1, Math.round(raster.height * scale));
  const out = createRaster(width, height);
  const step = 1 / scale;
  for (let y = 0; y < height; y++) {
    const sy0 = Math.floor(y * step);
    const sy1 = Math.min(raster.height, Math.max(sy0 + 1, Math.floor((y + 1) * step)));
    for (let x = 0; x < width; x++) {
      const sx0 = Math.floor(x * step);
      const sx1 = Math.min(raster.width, Math.max(sx0 + 1, Math.floor((x + 1) * step)));
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const index = (sy * raster.width + sx) * 4;
          red += raster.data[index]!;
          green += raster.data[index + 1]!;
          blue += raster.data[index + 2]!;
          count++;
        }
      }
      const target = (y * width + x) * 4;
      out.data[target] = red / count;
      out.data[target + 1] = green / count;
      out.data[target + 2] = blue / count;
      out.data[target + 3] = 255;
    }
  }
  return { raster: out, scale: width / raster.width };
}

export function boxBlur(raster: Raster, radius: number, passes = 3): Raster {
  let current = raster;
  for (let pass = 0; pass < passes; pass++) {
    current = blurAxis(blurAxis(current, radius, true), radius, false);
  }
  return current;
}

export function resize(raster: Raster, width: number, height: number): Raster {
  const out = createRaster(width, height);
  const color = [0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      sampleInto(raster, ((x + 0.5) / width) * raster.width, ((y + 0.5) / height) * raster.height, color);
      const index = (y * width + x) * 4;
      out.data[index] = color[0]!;
      out.data[index + 1] = color[1]!;
      out.data[index + 2] = color[2]!;
      out.data[index + 3] = 255;
    }
  }
  return out;
}

function blurAxis(raster: Raster, radius: number, horizontal: boolean): Raster {
  const { width, height, data } = raster;
  const out = createRaster(width, height);
  const lines = horizontal ? height : width;
  const length = horizontal ? width : height;
  const span = radius * 2 + 1;
  for (let line = 0; line < lines; line++) {
    for (let channel = 0; channel < 3; channel++) {
      let sum = 0;
      for (let offset = -radius; offset <= radius; offset++) {
        sum += data[pixelIndex(line, clamp(offset, 0, length - 1), horizontal, width) + channel]!;
      }
      for (let position = 0; position < length; position++) {
        out.data[pixelIndex(line, position, horizontal, width) + channel] = sum / span;
        const leaving = clamp(position - radius, 0, length - 1);
        const entering = clamp(position + radius + 1, 0, length - 1);
        sum += data[pixelIndex(line, entering, horizontal, width) + channel]! - data[pixelIndex(line, leaving, horizontal, width) + channel]!;
      }
    }
    for (let position = 0; position < length; position++) {
      out.data[pixelIndex(line, position, horizontal, width) + 3] = 255;
    }
  }
  return out;
}

function pixelIndex(line: number, position: number, horizontal: boolean, width: number): number {
  return (horizontal ? line * width + position : position * width + line) * 4;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
