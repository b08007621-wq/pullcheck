export const CARD_VISION_VERSION = 1;

export const CARD_VISION_JS = String.raw`var PullVision = (function () {
  var RASTER_W = 64;
  var RASTER_H = 88;
  var WORK_WIDTH = 240;
  var CARD_ASPECT = 63 / 88;
  var SUPER = 4;
  var SIZE_PRIOR = 0.97;
  var SIZE_SPREAD = 0.16;

  var shrink = function (img, targetWidth) {
    var factor = Math.max(1, Math.floor(img.width / targetWidth));
    if (factor === 1) return img;
    var w = Math.floor(img.width / factor);
    var h = Math.floor(img.height / factor);
    var src = img.data;
    var out = new Uint8ClampedArray(w * h * 4);
    var area = factor * factor;
    for (var y = 0; y < h; y += 1) {
      for (var x = 0; x < w; x += 1) {
        var r = 0, g = 0, b = 0;
        for (var sy = 0; sy < factor; sy += 1) {
          var row = ((y * factor + sy) * img.width + x * factor) * 4;
          for (var sx = 0; sx < factor; sx += 1) {
            var k = row + sx * 4;
            r += src[k]; g += src[k + 1]; b += src[k + 2];
          }
        }
        var o = (y * w + x) * 4;
        out[o] = r / area; out[o + 1] = g / area; out[o + 2] = b / area; out[o + 3] = 255;
      }
    }
    return { width: w, height: h, data: out };
  };

  var squareToQuad = function (q) {
    var x0 = q[0][0], y0 = q[0][1], x1 = q[1][0], y1 = q[1][1];
    var x2 = q[2][0], y2 = q[2][1], x3 = q[3][0], y3 = q[3][1];
    var sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
    var g = 0, h = 0;
    if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
      var dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
      var den = dx1 * dy2 - dx2 * dy1;
      g = (sx * dy2 - dx2 * sy) / den;
      h = (dx1 * sy - sx * dy1) / den;
    }
    return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h];
  };

  var warp = function (img, quad, w, h) {
    var m = squareToQuad(quad);
    var src = img.data, iw = img.width, ih = img.height;
    var out = new Float32Array(w * h * 3);
    var n = SUPER * SUPER;
    for (var j = 0; j < h; j += 1) {
      for (var i = 0; i < w; i += 1) {
        var r = 0, g = 0, b = 0;
        for (var sj = 0; sj < SUPER; sj += 1) {
          var v = (j + (sj + 0.5) / SUPER) / h;
          for (var si = 0; si < SUPER; si += 1) {
            var u = (i + (si + 0.5) / SUPER) / w;
            var z = m[6] * u + m[7] * v + 1;
            var px = (m[0] * u + m[1] * v + m[2]) / z - 0.5;
            var py = (m[3] * u + m[4] * v + m[5]) / z - 0.5;
            if (px < 0) px = 0; else if (px > iw - 1.001) px = iw - 1.001;
            if (py < 0) py = 0; else if (py > ih - 1.001) py = ih - 1.001;
            var ix = px | 0, iy = py | 0, fx = px - ix, fy = py - iy;
            var k = (iy * iw + ix) * 4, k2 = k + iw * 4;
            var w00 = (1 - fx) * (1 - fy), w10 = fx * (1 - fy), w01 = (1 - fx) * fy, w11 = fx * fy;
            r += src[k] * w00 + src[k + 4] * w10 + src[k2] * w01 + src[k2 + 4] * w11;
            g += src[k + 1] * w00 + src[k + 5] * w10 + src[k2 + 1] * w01 + src[k2 + 5] * w11;
            b += src[k + 2] * w00 + src[k + 6] * w10 + src[k2 + 2] * w01 + src[k2 + 6] * w11;
          }
        }
        var o = (j * w + i) * 3;
        out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n;
      }
    }
    return out;
  };

  var cosines = {};
  var cosTable = function (size, count) {
    var key = size + ':' + count;
    if (cosines[key]) return cosines[key];
    var table = new Float32Array(size * count);
    for (var u = 0; u < count; u += 1) {
      for (var x = 0; x < size; x += 1) table[u * size + x] = Math.cos((Math.PI * (2 * x + 1) * u) / (2 * size));
    }
    cosines[key] = table;
    return table;
  };

  var dct = function (plane, w, h, count) {
    var cx = cosTable(w, count), cy = cosTable(h, count);
    var rows = new Float32Array(h * count);
    for (var y = 0; y < h; y += 1) {
      for (var u = 0; u < count; u += 1) {
        var s = 0;
        for (var x = 0; x < w; x += 1) s += plane[y * w + x] * cx[u * w + x];
        rows[y * count + u] = s;
      }
    }
    var out = new Float32Array(count * count);
    for (var v = 0; v < count; v += 1) {
      for (var u2 = 0; u2 < count; u2 += 1) {
        var t = 0;
        for (var y2 = 0; y2 < h; y2 += 1) t += rows[y2 * count + u2] * cy[v * h + y2];
        out[v * count + u2] = t;
      }
    }
    return out;
  };

  var planes = function (rgb, w, h, x0, y0, x1, y1, ow, oh) {
    var Y = new Float32Array(ow * oh), Cb = new Float32Array(ow * oh), Cr = new Float32Array(ow * oh);
    for (var j = 0; j < oh; j += 1) {
      var ya = y0 + ((y1 - y0) * j) / oh, yb = y0 + ((y1 - y0) * (j + 1)) / oh;
      for (var i = 0; i < ow; i += 1) {
        var xa = x0 + ((x1 - x0) * i) / ow, xb = x0 + ((x1 - x0) * (i + 1)) / ow;
        var r = 0, g = 0, b = 0, n = 0;
        for (var y = Math.floor(ya); y < Math.ceil(yb); y += 1) {
          for (var x = Math.floor(xa); x < Math.ceil(xb); x += 1) {
            var k = (Math.min(h - 1, y) * w + Math.min(w - 1, x)) * 3;
            r += rgb[k]; g += rgb[k + 1]; b += rgb[k + 2]; n += 1;
          }
        }
        r /= n; g /= n; b /= n;
        var p = j * ow + i;
        Y[p] = 0.299 * r + 0.587 * g + 0.114 * b;
        Cb[p] = -0.1687 * r - 0.3313 * g + 0.5 * b;
        Cr[p] = 0.5 * r - 0.4187 * g - 0.0813 * b;
      }
    }
    return [Y, Cb, Cr];
  };

  var take = function (coefs, count, keep, skipDc, out, at) {
    var n = 0;
    for (var v = 0; v < keep; v += 1) {
      for (var u = 0; u < keep; u += 1) {
        if (skipDc && u === 0 && v === 0) continue;
        out[at + n] = coefs[v * count + u];
        n += 1;
      }
    }
    return n;
  };

  var normalize = function (vec, start, end, weight) {
    var s = 0;
    for (var i = start; i < end; i += 1) s += vec[i] * vec[i];
    var f = s > 0 ? weight / Math.sqrt(s) : 0;
    for (var j = start; j < end; j += 1) vec[j] *= f;
  };

  var REGIONS = [
    { box: [0, 0, 1, 1], size: [32, 44], luma: 8, chroma: 4 },
    { box: [0.06, 0.09, 0.94, 0.54], size: [32, 24], luma: 8, chroma: 4 }
  ];
  var CHROMA_WEIGHT = 0.6;
  var DIMS = 0;
  for (var ri = 0; ri < REGIONS.length; ri += 1) DIMS += REGIONS[ri].luma * REGIONS[ri].luma - 1 + 2 * REGIONS[ri].chroma * REGIONS[ri].chroma;

  var describeRaster = function (rgb) {
    var vec = new Float32Array(DIMS);
    var at = 0;
    for (var r = 0; r < REGIONS.length; r += 1) {
      var region = REGIONS[r];
      var b = region.box;
      var p = planes(rgb, RASTER_W, RASTER_H, b[0] * RASTER_W, b[1] * RASTER_H, b[2] * RASTER_W, b[3] * RASTER_H, region.size[0], region.size[1]);
      var lumaCount = Math.max(region.luma, region.chroma);
      var start = at;
      at += take(dct(p[0], region.size[0], region.size[1], lumaCount), lumaCount, region.luma, true, vec, at);
      normalize(vec, start, at, 1);
      var chromaStart = at;
      at += take(dct(p[1], region.size[0], region.size[1], region.chroma), region.chroma, region.chroma, false, vec, at);
      at += take(dct(p[2], region.size[0], region.size[1], region.chroma), region.chroma, region.chroma, false, vec, at);
      normalize(vec, chromaStart, at, CHROMA_WEIGHT);
    }
    normalize(vec, 0, DIMS, 1);
    return vec;
  };

  var gradients = function (img) {
    var w = img.width, h = img.height, d = img.data;
    var gx = new Float32Array(w * h), gy = new Float32Array(w * h);
    for (var y = 1; y < h - 1; y += 1) {
      for (var x = 1; x < w - 1; x += 1) {
        var sx = 0, sy = 0;
        for (var c = 0; c < 3; c += 1) {
          var tl = d[((y - 1) * w + x - 1) * 4 + c], tc = d[((y - 1) * w + x) * 4 + c], tr = d[((y - 1) * w + x + 1) * 4 + c];
          var ml = d[(y * w + x - 1) * 4 + c], mr = d[(y * w + x + 1) * 4 + c];
          var bl = d[((y + 1) * w + x - 1) * 4 + c], bc = d[((y + 1) * w + x) * 4 + c], br = d[((y + 1) * w + x + 1) * 4 + c];
          sx += Math.abs(tr + 2 * mr + br - tl - 2 * ml - bl);
          sy += Math.abs(bl + 2 * bc + br - tl - 2 * tc - tr);
        }
        gx[y * w + x] = sx;
        gy[y * w + x] = sy;
      }
    }
    return { gx: gx, gy: gy };
  };

  var percentile = function (values, q) {
    var step = Math.max(1, Math.floor(values.length / 4000));
    var sample = [];
    for (var i = 0; i < values.length; i += step) sample.push(values[i]);
    sample.sort(function (a, b) { return a - b; });
    return sample[Math.min(sample.length - 1, Math.floor(sample.length * q))] || 1;
  };

  var EDGE_CAP = 0.85;

  var scanSide = function (grad, w, h, vertical, from, to, cap) {
    var along = vertical ? h : w;
    var across = vertical ? w : h;
    var lo = Math.max(1, Math.round(from * across)), hi = Math.min(across - 2, Math.round(to * across));
    var a0 = 0.25 * along, a1 = 0.75 * along;
    var tilt = Math.round(0.5 * along * 0.16);
    var t0 = Math.round(0.08 * along), t1 = Math.round(0.92 * along);
    var best = [];
    for (var pa = lo; pa <= hi; pa += 1) {
      var top = 0, topPb = pa;
      for (var pb = Math.max(lo, pa - tilt); pb <= Math.min(hi, pa + tilt); pb += 1) {
        var slope = (pb - pa) / (a1 - a0);
        var s = 0;
        for (var t = t0; t <= t1; t += 1) {
          var p = Math.round(pa + slope * (t - a0));
          if (p < 1 || p > across - 2) continue;
          var g = vertical ? grad[t * w + p] : grad[p * w + t];
          s += g < cap ? g : cap;
        }
        if (s > top) { top = s; topPb = pb; }
      }
      best.push({ pa: pa, pb: topPb, score: top / ((t1 - t0 + 1) * cap) });
    }
    var max = 0;
    for (var m = 0; m < best.length; m += 1) if (best[m].score > max) max = best[m].score;
    var peaks = [];
    for (var i = 0; i < best.length; i += 1) {
      var here = best[i].score;
      if (here < max * 0.3) continue;
      var isPeak = true;
      for (var j = Math.max(0, i - 2); j <= Math.min(best.length - 1, i + 2); j += 1) if (best[j].score > here) isPeak = false;
      if (isPeak) peaks.push(best[i]);
    }
    peaks.sort(function (a, b) { return b.score - a.score; });
    return peaks.slice(0, 6).map(function (peak) {
      return { a0: a0, a1: a1, pa: peak.pa, pb: peak.pb, score: peak.score, vertical: vertical };
    });
  };

  var refine = function (line, grad, w, h) {
    var along = line.vertical ? h : w;
    var across = line.vertical ? w : h;
    var slope = (line.pb - line.pa) / (line.a1 - line.a0);
    var ts = [], ps = [];
    for (var t = Math.round(0.08 * along); t <= Math.round(0.92 * along); t += 1) {
      var center = line.pa + slope * (t - line.a0);
      var bestP = -1, bestG = 0;
      for (var p = Math.round(center) - 2; p <= Math.round(center) + 2; p += 1) {
        if (p < 1 || p > across - 2) continue;
        var g = line.vertical ? grad[t * w + p] : grad[p * w + t];
        if (g > bestG) { bestG = g; bestP = p; }
      }
      if (bestP < 0) continue;
      var gm = line.vertical ? grad[t * w + bestP - 1] : grad[(bestP - 1) * w + t];
      var gp = line.vertical ? grad[t * w + bestP + 1] : grad[(bestP + 1) * w + t];
      var den = gm - 2 * bestG + gp;
      var offset = den < 0 ? (0.5 * (gm - gp)) / den : 0;
      ts.push(t);
      ps.push(bestP + offset + 0.5);
    }
    if (ts.length < 10) return line;
    var fit = function (keep) {
      var n = 0, st = 0, sp = 0, stt = 0, stp = 0;
      for (var i = 0; i < ts.length; i += 1) {
        if (!keep[i]) continue;
        n += 1; st += ts[i]; sp += ps[i]; stt += ts[i] * ts[i]; stp += ts[i] * ps[i];
      }
      var k = (n * stp - st * sp) / (n * stt - st * st);
      return { k: k, c: (sp - k * st) / n };
    };
    var keep = ts.map(function () { return true; });
    var model = fit(keep);
    for (var round = 0; round < 3; round += 1) {
      var res = ts.map(function (t, i) { return Math.abs(ps[i] - (model.c + model.k * t)); });
      var sorted = res.slice().sort(function (a, b) { return a - b; });
      var limit = Math.max(0.75, sorted[Math.floor(sorted.length * 0.6)] * 2);
      keep = res.map(function (r) { return r <= limit; });
      model = fit(keep);
    }
    return { a0: line.a0, a1: line.a1, pa: model.c + model.k * line.a0, pb: model.c + model.k * line.a1, score: line.score, vertical: line.vertical };
  };

  var intersect = function (v, hz) {
    var sv = (v.pb - v.pa) / (v.a1 - v.a0), sh = (hz.pb - hz.pa) / (hz.a1 - hz.a0);
    var x = (v.pa + sv * (hz.pa - sh * hz.a0 - v.a0)) / (1 - sv * sh);
    return [x, hz.pa + sh * (x - hz.a0)];
  };

  var locate = function (img, margin) {
    var w = img.width, h = img.height;
    var g = gradients(img);
    var capX = percentile(g.gx, EDGE_CAP), capY = percentile(g.gy, EDGE_CAP);
    var lefts = scanSide(g.gx, w, h, true, 0, 0.42, capX);
    var rights = scanSide(g.gx, w, h, true, 0.58, 1, capX);
    var tops = scanSide(g.gy, w, h, false, 0, 0.36, capY);
    var bottoms = scanSide(g.gy, w, h, false, 0.64, 1, capY);
    var guideW = w / (1 + 2 * margin);
    var best = null;
    for (var a = 0; a < lefts.length; a += 1) for (var b = 0; b < rights.length; b += 1) for (var c = 0; c < tops.length; c += 1) for (var e = 0; e < bottoms.length; e += 1) {
      var L = lefts[a], R = rights[b], T = tops[c], B = bottoms[e];
      var tl = intersect(L, T), tr = intersect(R, T), br = intersect(R, B), bl = intersect(L, B);
      var width = (Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) + Math.hypot(br[0] - bl[0], br[1] - bl[1])) / 2;
      var height = (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 2;
      if (width < 0.45 * w || height < 0.45 * h) continue;
      var aspect = width / height;
      var fit = Math.exp(-Math.pow((aspect - CARD_ASPECT) / 0.05, 2));
      var size = Math.exp(-Math.pow((width / guideW - SIZE_PRIOR) / SIZE_SPREAD, 2));
      var lines = (L.score + R.score + T.score + B.score) / 4;
      var weakest = Math.min(L.score, R.score, T.score, B.score);
      var score = (lines * 0.7 + weakest * 0.3) * fit * size;
      if (!best || score > best.score) best = { score: score, lines: lines, sides: [L, R, T, B] };
    }
    if (!best) return null;
    var sides = best.sides.map(function (line) { return refine(line, line.vertical ? g.gx : g.gy, w, h); });
    var Lr = sides[0], Rr = sides[1], Tr = sides[2], Br = sides[3];
    return { score: best.score, lines: best.lines, quad: [intersect(Lr, Tr), intersect(Rr, Tr), intersect(Rr, Br), intersect(Lr, Br)] };
  };

  var guideQuad = function (img, margin) {
    var span = 1 + 2 * margin;
    var mx = (margin / span) * img.width, my = (margin / span) * img.height;
    return [[mx, my], [img.width - mx, my], [img.width - mx, img.height - my], [mx, img.height - my]];
  };

  var scaleQuad = function (quad, dx, dy) {
    var u = function (p, q, t) { return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
    var tl = quad[0], tr = quad[1], br = quad[2], bl = quad[3];
    var at = function (s, t) {
      var top = u(tl, tr, s), bottom = u(bl, br, s);
      return u(top, bottom, t);
    };
    return [at(dx, dy), at(1 - dx, dy), at(1 - dx, 1 - dy), at(dx, 1 - dy)];
  };

  var FINE_W = 60;
  var FINE_H = 84;
  var FINE_SHIFT = 2;
  var FINE_RADIUS = 4;

  var localContrast = function (rgb, w, h) {
    var n = w * h;
    var gray = new Float32Array(n);
    for (var p = 0; p < n; p += 1) gray[p] = 0.299 * rgb[p * 3] + 0.587 * rgb[p * 3 + 1] + 0.114 * rgb[p * 3 + 2];
    var sum = new Float64Array((w + 1) * (h + 1)), sq = new Float64Array((w + 1) * (h + 1));
    for (var y = 0; y < h; y += 1) {
      var rs = 0, rq = 0;
      for (var x = 0; x < w; x += 1) {
        var v = gray[y * w + x];
        rs += v; rq += v * v;
        sum[(y + 1) * (w + 1) + x + 1] = sum[y * (w + 1) + x + 1] + rs;
        sq[(y + 1) * (w + 1) + x + 1] = sq[y * (w + 1) + x + 1] + rq;
      }
    }
    var out = new Float32Array(n);
    for (var j = 0; j < h; j += 1) {
      var y0 = Math.max(0, j - FINE_RADIUS), y1 = Math.min(h, j + FINE_RADIUS + 1);
      for (var i = 0; i < w; i += 1) {
        var x0 = Math.max(0, i - FINE_RADIUS), x1 = Math.min(w, i + FINE_RADIUS + 1);
        var area = (x1 - x0) * (y1 - y0);
        var s = sum[y1 * (w + 1) + x1] - sum[y0 * (w + 1) + x1] - sum[y1 * (w + 1) + x0] + sum[y0 * (w + 1) + x0];
        var q = sq[y1 * (w + 1) + x1] - sq[y0 * (w + 1) + x1] - sq[y1 * (w + 1) + x0] + sq[y0 * (w + 1) + x0];
        var mean = s / area;
        var sd = Math.sqrt(Math.max(0, q / area - mean * mean));
        out[j * w + i] = (gray[j * w + i] - mean) / (sd + 6);
      }
    }
    return out;
  };

  var fineFrom = function (work, quad) {
    return localContrast(warp(work, quad, FINE_W, FINE_H), FINE_W, FINE_H);
  };

  var fineReference = function (img) {
    var work = shrink(img, WORK_WIDTH);
    return fineFrom(work, [[0, 0], [work.width, 0], [work.width, work.height], [0, work.height]]);
  };

  var fineScore = function (queries, ref) {
    var best = -1;
    var m = FINE_SHIFT + 1;
    for (var h = 0; h < queries.length; h += 1) {
      var q = queries[h];
      for (var dy = -FINE_SHIFT; dy <= FINE_SHIFT; dy += 1) {
        for (var dx = -FINE_SHIFT; dx <= FINE_SHIFT; dx += 1) {
          var s = 0, qq = 0, rr = 0;
          for (var y = m; y < FINE_H - m; y += 1) {
            var row = y * FINE_W, rrow = (y + dy) * FINE_W + dx;
            for (var x = m; x < FINE_W - m; x += 1) {
              var a = q[row + x], b = ref[rrow + x];
              s += a * b; qq += a * a; rr += b * b;
            }
          }
          var c = s / Math.sqrt(qq * rr + 1e-9);
          if (c > best) best = c;
        }
      }
    }
    return best;
  };

  var HYPOTHESES = [[0, 0], [0.025, 0.0175], [-0.035, -0.025]];

  var describeQuery = function (img, margin) {
    var work = shrink(img, WORK_WIDTH);
    var found = locate(work, margin);
    var base = found && found.lines > 0.18 ? found.quad : guideQuad(work, margin);
    var out = [], fine = [];
    for (var i = 0; i < HYPOTHESES.length; i += 1) {
      var quad = scaleQuad(base, HYPOTHESES[i][0], HYPOTHESES[i][1]);
      out.push(describeRaster(warp(work, quad, RASTER_W, RASTER_H)));
      fine.push(fineFrom(work, quad));
    }
    return { descriptors: out, fine: fine, quad: base, found: found };
  };

  var describeReference = function (img) {
    var work = shrink(img, WORK_WIDTH);
    var quad = [[0, 0], [work.width, 0], [work.width, work.height], [0, work.height]];
    return describeRaster(warp(work, quad, RASTER_W, RASTER_H));
  };

  var QUANT = 360;
  var quantize = function (vec) {
    var out = new Int8Array(vec.length);
    for (var i = 0; i < vec.length; i += 1) {
      var q = Math.round(vec[i] * QUANT);
      out[i] = q > 127 ? 127 : q < -127 ? -127 : q;
    }
    return out;
  };

  var search = function (index, dims, count, queries, k) {
    var qs = queries.map(function (q) { return quantize(q); });
    var top = [];
    for (var n = 0; n < count; n += 1) {
      var base = n * dims;
      var bestScore = -1e9;
      for (var h = 0; h < qs.length; h += 1) {
        var q = qs[h], s = 0;
        for (var d = 0; d < dims; d += 1) s += q[d] * index[base + d];
        if (s > bestScore) bestScore = s;
      }
      if (top.length < k || bestScore > top[top.length - 1].score) {
        top.push({ index: n, score: bestScore });
        top.sort(function (a, b) { return b.score - a.score; });
        if (top.length > k) top.pop();
      }
    }
    var norm = QUANT * QUANT;
    return top.map(function (t) { return { index: t.index, score: t.score / norm }; });
  };

  var SAME_PICTURE = 0.93;

  var rank = function (index, dims, count, queries, k) {
    var top = search(index, dims, count, queries, k);
    if (top.length === 0) return { results: [], best: 0, gap: 0 };
    var norm = function (n) {
      var s = 0;
      for (var d = 0; d < dims; d += 1) s += index[n * dims + d] * index[n * dims + d];
      return Math.sqrt(s) || 1;
    };
    var first = top[0].index, firstNorm = norm(first), other = null;
    var results = top.map(function (t, i) {
      var same = i === 0;
      if (!same) {
        var s = 0;
        for (var d = 0; d < dims; d += 1) s += index[first * dims + d] * index[t.index * dims + d];
        same = s / (firstNorm * norm(t.index)) >= SAME_PICTURE;
      }
      if (!same && other === null) other = t.score;
      return { index: t.index, score: t.score, same: same };
    });
    return { results: results, best: top[0].score, gap: top[0].score - (other === null ? 0 : other) };
  };


  var FINE_WEIGHT = 2;

  var regroup = function (index, dims, results) {
    if (results.length === 0) return { results: [], best: 0, gap: 0, fine: null, fineGap: 0 };
    var norm = function (n) {
      var s = 0;
      for (var d = 0; d < dims; d += 1) s += index[n * dims + d] * index[n * dims + d];
      return Math.sqrt(s) || 1;
    };
    var combined = function (r) { return r.fine === null ? r.score - 10 : r.score + FINE_WEIGHT * r.fine; };
    var sorted = results.slice().sort(function (a, b) { return combined(b) - combined(a); });
    var first = sorted[0].index, firstNorm = norm(first), other = null, otherFine = null;
    var out = sorted.map(function (r, i) {
      var same = i === 0;
      if (!same) {
        var s = 0;
        for (var d = 0; d < dims; d += 1) s += index[first * dims + d] * index[r.index * dims + d];
        same = s / (firstNorm * norm(r.index)) >= SAME_PICTURE;
      }
      if (!same && (other === null || r.score > other)) other = r.score;
      if (!same && r.fine !== null && (otherFine === null || r.fine > otherFine)) otherFine = r.fine;
      return { index: r.index, score: r.score, fine: r.fine, same: same };
    });
    var top = out[0];
    return {
      results: out,
      best: top.score,
      gap: top.score - (other === null ? 0 : other),
      fine: top.fine,
      fineGap: top.fine === null ? 0 : top.fine - (otherFine === null ? 0 : otherFine)
    };
  };

  return {
    DIMS: DIMS,
    regroup: regroup,
    rank: rank,
    fineReference: fineReference,
    fineScore: fineScore,
    shrink: shrink,
    warp: warp,
    locate: locate,
    describeQuery: describeQuery,
    describeReference: describeReference,
    quantize: quantize,
    search: search
  };
})();
`;
