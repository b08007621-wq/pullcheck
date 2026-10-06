export const CARD_VISION_VERSION = 1;

export const CARD_VISION_JS = String.raw`var PullVision = (function () {
  var RASTER_W = 64;
  var RASTER_H = 88;
  var WORK_WIDTH = 240;
  var CARD_ASPECT = 63 / 88;
  var SUPER = 4;
  var SIZE_PRIOR = 0.97;
  var SIZE_SPREAD = 0.35;
  var QUAD_CANDIDATES = 4;
  var PEAKS = 8;
  var SPAN = [0.25, 0.75];
  var MAX_TILT = 0.27;

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
    var tilt = Math.round(0.5 * along * MAX_TILT);
    var t0 = Math.round(SPAN[0] * along), t1 = Math.round(SPAN[1] * along);
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
    return peaks.slice(0, PEAKS).map(function (peak) {
      return { a0: a0, a1: a1, pa: peak.pa, pb: peak.pb, score: peak.score, vertical: vertical };
    });
  };

  var refine = function (line, grad, w, h) {
    var along = line.vertical ? h : w;
    var across = line.vertical ? w : h;
    var slope = (line.pb - line.pa) / (line.a1 - line.a0);
    var ts = [], ps = [];
    for (var t = Math.round(SPAN[0] * along); t <= Math.round(SPAN[1] * along); t += 1) {
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

  var quadDistance = function (a, b) {
    var d = 0;
    for (var i = 0; i < 4; i += 1) d = Math.max(d, Math.hypot(a[i][0] - b[i][0], a[i][1] - b[i][1]));
    return d;
  };

  var pixelAt = function (img, x, y) {
    var ix = Math.max(0, Math.min(img.width - 2, Math.floor(x)));
    var iy = Math.max(0, Math.min(img.height - 2, Math.floor(y)));
    var d = img.data, r = 0, g = 0, b = 0;
    for (var dy = 0; dy < 2; dy += 1) {
      for (var dx = 0; dx < 2; dx += 1) {
        var k = ((iy + dy) * img.width + ix + dx) * 4;
        r += d[k]; g += d[k + 1]; b += d[k + 2];
      }
    }
    return [r / 4, g / 4, b / 4];
  };

  var BORDER_SAMPLES = 20;

  var borderScore = function (img, quad) {
    var cx = (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4;
    var cy = (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4;
    var width = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
    var total = 0, sideMeans = [];
    for (var s = 0; s < 4; s += 1) {
      var p = quad[s], q = quad[(s + 1) % 4];
      var mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
      var len = Math.hypot(mx, my) || 1;
      var nx = mx / len, ny = my / len;
      var inner = 0.022 * width, outer = 0.02 * width;
      var ins = [], contrast = 0;
      for (var i = 1; i <= BORDER_SAMPLES; i += 1) {
        var t = 0.12 + (0.76 * (i - 0.5)) / BORDER_SAMPLES;
        var ex = p[0] + (q[0] - p[0]) * t, ey = p[1] + (q[1] - p[1]) * t;
        var a = pixelAt(img, ex - nx * inner, ey - ny * inner);
        var o = pixelAt(img, ex + nx * outer, ey + ny * outer);
        ins.push(a);
        contrast += Math.abs(a[0] - o[0]) + Math.abs(a[1] - o[1]) + Math.abs(a[2] - o[2]);
      }
      var mean = [0, 0, 0];
      for (var j = 0; j < ins.length; j += 1) for (var c = 0; c < 3; c += 1) mean[c] += ins[j][c] / ins.length;
      var spread = 0;
      for (var m = 0; m < ins.length; m += 1) {
        spread += Math.abs(ins[m][0] - mean[0]) + Math.abs(ins[m][1] - mean[1]) + Math.abs(ins[m][2] - mean[2]);
      }
      spread /= ins.length;
      contrast /= BORDER_SAMPLES;
      sideMeans.push(mean);
      total += Math.exp(-spread / 45) * Math.min(1, contrast / 60);
    }
    var all = [0, 0, 0];
    for (var u = 0; u < 4; u += 1) for (var v = 0; v < 3; v += 1) all[v] += sideMeans[u][v] / 4;
    var cross = 0;
    for (var w2 = 0; w2 < 4; w2 += 1) {
      cross += Math.abs(sideMeans[w2][0] - all[0]) + Math.abs(sideMeans[w2][1] - all[1]) + Math.abs(sideMeans[w2][2] - all[2]);
    }
    return (total / 4) * Math.exp(-cross / 4 / 60);
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
    var combos = [];
    for (var a = 0; a < lefts.length; a += 1) for (var b = 0; b < rights.length; b += 1) for (var c = 0; c < tops.length; c += 1) for (var e = 0; e < bottoms.length; e += 1) {
      var L = lefts[a], R = rights[b], T = tops[c], B = bottoms[e];
      var tl = intersect(L, T), tr = intersect(R, T), br = intersect(R, B), bl = intersect(L, B);
      var width = (Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) + Math.hypot(br[0] - bl[0], br[1] - bl[1])) / 2;
      var height = (Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) + Math.hypot(br[0] - tr[0], br[1] - tr[1])) / 2;
      if (width < 0.3 * w || height < 0.3 * h) continue;
      var aspect = width / height;
      var fit = Math.exp(-Math.pow((aspect - CARD_ASPECT) / 0.05, 2));
      var size = Math.exp(-Math.pow((width / guideW - SIZE_PRIOR) / SIZE_SPREAD, 2));
      var lines = (L.score + R.score + T.score + B.score) / 4;
      var weakest = Math.min(L.score, R.score, T.score, B.score);
      var score = (lines * 0.7 + weakest * 0.3) * fit * (0.4 + 0.6 * size);
      combos.push({ score: score, lines: lines, sides: [L, R, T, B], quad: [tl, tr, br, bl] });
    }
    combos.sort(function (x, y) { return y.score - x.score; });
    combos = combos.slice(0, 120);
    for (var z = 0; z < combos.length; z += 1) {
      combos[z].border = borderScore(img, combos[z].quad);
      combos[z].score *= 0.25 + 0.75 * combos[z].border;
    }
    combos.sort(function (x, y) { return y.score - x.score; });
    var picked = [];
    for (var i = 0; i < combos.length && picked.length < QUAD_CANDIDATES; i += 1) {
      var combo = combos[i];
      var distinct = true;
      for (var j = 0; j < picked.length; j += 1) if (quadDistance(picked[j].quad, combo.quad) < 0.04 * w) distinct = false;
      if (distinct) picked.push(combo);
    }
    return picked.map(function (combo) {
      var sides = combo.sides.map(function (line) { return refine(line, line.vertical ? g.gx : g.gy, w, h); });
      var Lr = sides[0], Rr = sides[1], Tr = sides[2], Br = sides[3];
      return { score: combo.score, lines: combo.lines, quad: [intersect(Lr, Tr), intersect(Rr, Tr), intersect(Rr, Br), intersect(Lr, Br)] };
    });
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

  var FOIL_ART = [0.08, 0.11, 0.92, 0.52];
  var FOIL_BODY = [0.08, 0.58, 0.92, 0.9];

  var regionDrift = function (a, b, box) {
    var x0 = Math.round(box[0] * RASTER_W), x1 = Math.round(box[2] * RASTER_W);
    var y0 = Math.round(box[1] * RASTER_H), y1 = Math.round(box[3] * RASTER_H);
    var la = 0, lb = 0, n = 0;
    for (var y = y0; y < y1; y += 1) {
      for (var x = x0; x < x1; x += 1) {
        var k = (y * RASTER_W + x) * 3;
        la += a[k] + a[k + 1] + a[k + 2];
        lb += b[k] + b[k + 1] + b[k + 2];
        n += 1;
      }
    }
    var gain = lb > 0 ? la / lb : 1;
    var drift = 0;
    for (var yy = y0; yy < y1; yy += 1) {
      for (var xx = x0; xx < x1; xx += 1) {
        var p = (yy * RASTER_W + xx) * 3;
        drift += Math.abs(a[p] - b[p] * gain) + Math.abs(a[p + 1] - b[p + 1] * gain) + Math.abs(a[p + 2] - b[p + 2] * gain);
      }
    }
    return drift / (3 * n);
  };

  var foilDrift = function (a, b) {
    return { art: regionDrift(a, b, FOIL_ART), body: regionDrift(a, b, FOIL_BODY) };
  };

  var CENTER_W = 630;
  var CENTER_H = 880;
  var EDGE_SAMPLES = 48;

  var colorAt = function (img, x, y) {
    var w = img.width, h = img.height, d = img.data;
    if (x < 0) x = 0; else if (x > w - 1.001) x = w - 1.001;
    if (y < 0) y = 0; else if (y > h - 1.001) y = h - 1.001;
    var ix = x | 0, iy = y | 0, fx = x - ix, fy = y - iy;
    var k = (iy * w + ix) * 4, k2 = k + w * 4;
    var out = [0, 0, 0];
    for (var c = 0; c < 3; c += 1) {
      out[c] = d[k + c] * (1 - fx) * (1 - fy) + d[k + 4 + c] * fx * (1 - fy) + d[k2 + c] * (1 - fx) * fy + d[k2 + 4 + c] * fx * fy;
    }
    return out;
  };

  var fitLine = function (points) {
    var keep = points.slice();
    var line = null;
    for (var round = 0; round < 3 && keep.length >= 6; round += 1) {
      var mx = 0, my = 0;
      for (var i = 0; i < keep.length; i += 1) { mx += keep[i][0]; my += keep[i][1]; }
      mx /= keep.length; my /= keep.length;
      var sxx = 0, syy = 0, sxy = 0;
      for (var j = 0; j < keep.length; j += 1) {
        var dx = keep[j][0] - mx, dy = keep[j][1] - my;
        sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
      }
      var angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
      line = { x: mx, y: my, dx: Math.cos(angle), dy: Math.sin(angle) };
      var dist = keep.map(function (p) { return Math.abs((p[0] - line.x) * line.dy - (p[1] - line.y) * line.dx); });
      var sorted = dist.slice().sort(function (a, b) { return a - b; });
      var limit = Math.max(0.8, sorted[Math.floor(sorted.length * 0.6)] * 2.5);
      keep = keep.filter(function (_, k) { return dist[k] <= limit; });
    }
    return line;
  };

  var crossLines = function (a, b) {
    var det = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(det) < 1e-9) return null;
    var t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / det;
    return [a.x + a.dx * t, a.y + a.dy * t];
  };

  var refineQuad = function (img, quad) {
    var cx = (quad[0][0] + quad[1][0] + quad[2][0] + quad[3][0]) / 4;
    var cy = (quad[0][1] + quad[1][1] + quad[2][1] + quad[3][1]) / 4;
    var lines = [];
    for (var s = 0; s < 4; s += 1) {
      var p = quad[s], q = quad[(s + 1) % 4];
      var len = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      var tx = (q[0] - p[0]) / len, ty = (q[1] - p[1]) / len;
      var nx = -ty, ny = tx;
      var mx = (p[0] + q[0]) / 2 - cx, my = (p[1] + q[1]) / 2 - cy;
      if (nx * mx + ny * my < 0) { nx = -nx; ny = -ny; }
      var reach = Math.max(5, len * 0.012);
      var found = [];
      for (var i = 0; i < EDGE_SAMPLES; i += 1) {
        var t = 0.12 + (0.76 * (i + 0.5)) / EDGE_SAMPLES;
        var bx = p[0] + (q[0] - p[0]) * t, by = p[1] + (q[1] - p[1]) * t;
        var offsets = [], grads = [], best = 0;
        for (var o = -reach; o <= reach; o += 0.5) {
          var a = colorAt(img, bx + nx * (o + 1), by + ny * (o + 1));
          var b = colorAt(img, bx + nx * (o - 1), by + ny * (o - 1));
          var g = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
          offsets.push(o);
          grads.push(g);
          if (g > best) best = g;
        }
        var pick = grads.indexOf(best);
        if (pick >= 0 && best > 30) found.push([bx + nx * offsets[pick], by + ny * offsets[pick]]);
      }
      var line = found.length >= 8 ? fitLine(found) : null;
      lines.push(line || { x: p[0], y: p[1], dx: tx, dy: ty });
    }
    var corners = [];
    for (var c = 0; c < 4; c += 1) {
      var point = crossLines(lines[(c + 3) % 4], lines[c]);
      corners.push(point || quad[c]);
    }
    return corners;
  };

  var CENTER_MARGIN = 0.07;

  var sidePixel = function (rgb, w, side, depth, line, edge) {
    var x, y;
    if (side === 0) { x = edge.x0 + depth; y = line; }
    else if (side === 1) { x = edge.x1 - 1 - depth; y = line; }
    else if (side === 2) { x = line; y = edge.y0 + depth; }
    else { x = line; y = edge.y1 - 1 - depth; }
    var k = (y * w + x) * 3;
    return [rgb[k], rgb[k + 1], rgb[k + 2]];
  };

  var colorGap = function (a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  };

  var STEP_SPAN = 3;
  var STEP_MIN = 34;
  var FLAT_MAX = 20;

  var sideProfile = function (rgb, w, edge, side) {
    var cardW = edge.x1 - edge.x0, cardH = edge.y1 - edge.y0;
    var vertical = side < 2;
    var span = vertical ? cardH : cardW;
    var start = vertical ? edge.y0 : edge.x0;
    var lines = [];
    if (vertical) {
      for (var a = Math.round(span * 0.22); a < Math.round(span * 0.78); a += 2) lines.push(start + a);
    } else {
      for (var b = Math.round(span * 0.09); b < Math.round(span * 0.25); b += 2) lines.push(start + b);
      for (var c = Math.round(span * 0.75); c < Math.round(span * 0.91); c += 2) lines.push(start + c);
    }
    var outside = Math.min(edge.x0, edge.y0) - 1;
    var deepest = Math.round((vertical ? cardW : cardH) * 0.16);
    var profile = [];
    for (var d = -outside; d < deepest; d += 1) {
      var sum = [0, 0, 0];
      for (var i = 0; i < lines.length; i += 1) {
        var px = sidePixel(rgb, w, side, d, lines[i], edge);
        sum[0] += px[0]; sum[1] += px[1]; sum[2] += px[2];
      }
      profile.push([sum[0] / lines.length, sum[1] / lines.length, sum[2] / lines.length]);
    }
    return { profile: profile, offset: outside };
  };

  var meanColor = function (profile, from, to) {
    var sum = [0, 0, 0], n = 0;
    for (var i = Math.max(0, from); i < Math.min(profile.length, to); i += 1) {
      sum[0] += profile[i][0]; sum[1] += profile[i][1]; sum[2] += profile[i][2]; n += 1;
    }
    return n ? [sum[0] / n, sum[1] / n, sum[2] / n] : [0, 0, 0];
  };

  var plateausOf = function (profile, minWidth, maxWidth) {
    var steps = [];
    for (var i = STEP_SPAN; i <= profile.length - STEP_SPAN; i += 1) {
      steps.push(colorGap(meanColor(profile, i, i + STEP_SPAN), meanColor(profile, i - STEP_SPAN, i)));
    }
    var edges = [];
    for (var j = 1; j < steps.length - 1; j += 1) {
      if (steps[j] >= STEP_MIN && steps[j] >= steps[j - 1] && steps[j] >= steps[j + 1]) {
        var curve = steps[j - 1] - 2 * steps[j] + steps[j + 1];
        var at = j + STEP_SPAN + (curve < 0 ? Math.max(-0.5, Math.min(0.5, (steps[j - 1] - steps[j + 1]) / (2 * curve))) : 0);
        if (edges.length && at - edges[edges.length - 1].at < 3) {
          if (steps[j] > edges[edges.length - 1].strength) edges[edges.length - 1] = { at: at, strength: steps[j] };
        } else edges.push({ at: at, strength: steps[j] });
      }
    }
    var found = [];
    for (var a = 0; a < edges.length; a += 1) {
      for (var b = a + 1; b < edges.length; b += 1) {
        var width = edges[b].at - edges[a].at;
        if (width < minWidth) continue;
        if (width > maxWidth) break;
        var inset = Math.min(2, Math.floor(width / 4));
        var from = Math.ceil(edges[a].at) + inset, to = Math.floor(edges[b].at) - inset;
        var color = meanColor(profile, from, to);
        var wobble = 0, n = 0;
        for (var k = from; k < to; k += 1) { wobble += colorGap(profile[k], color); n += 1; }
        if (n && wobble / n <= FLAT_MAX) {
          var last = found[found.length - 1];
          if (!last || last.end !== edges[b].at) found.push({ start: edges[a].at, end: edges[b].at, color: color, strength: edges[a].strength + edges[b].strength });
          break;
        }
      }
    }
    return found;
  };

  var sameInk = function (a, b) {
    var sa = a[0] + a[1] + a[2], sb = b[0] + b[1] + b[2];
    if (sa < 120 || sb < 120) return colorGap(a, b) <= 60;
    var ratio = sa / sb;
    if (ratio < 0.7 || ratio > 1.43) return false;
    var drift = 0;
    for (var c = 0; c < 3; c += 1) drift += Math.abs(a[c] / sa - b[c] / sb);
    return drift <= 0.05;
  };

  var CARD_MM_W = 63;
  var CARD_MM_H = 88;
  var SHAPE_RANGE = [0.69, 0.765];
  var THICKNESS_RANGE = [0.8, 1.25];
  var CANDIDATES_PER_SIDE = 4;

  var shapeOf = function (edge, picks) {
    var outerW = edge.x1 - edge.x0 - picks[0].start - picks[1].start;
    var outerH = edge.y1 - edge.y0 - picks[2].start - picks[3].start;
    var acrossMm = ((picks[0].end - picks[0].start + picks[1].end - picks[1].start) / outerW) * CARD_MM_W;
    var downMm = ((picks[2].end - picks[2].start + picks[3].end - picks[3].start) / outerH) * CARD_MM_H;
    return { aspect: outerW / outerH, thickness: downMm / Math.max(0.01, acrossMm), acrossMm: acrossMm, downMm: downMm };
  };

  var outside = function (value, range) {
    return value < range[0] ? range[0] - value : value > range[1] ? value - range[1] : 0;
  };

  var borderRuns = function (rgb, w, h, edge) {
    var cardW = edge.x1 - edge.x0;
    var minWidth = Math.round(cardW * 0.012), maxWidth = Math.round(cardW * 0.1);
    var sides = [0, 1, 2, 3].map(function (side) {
      var p = sideProfile(rgb, w, edge, side);
      return plateausOf(p.profile, minWidth, maxWidth).slice(0, CANDIDATES_PER_SIDE).map(function (q) {
        return { start: q.start - p.offset, end: q.end - p.offset, color: q.color, strength: q.strength };
      });
    });
    var best = null;
    var picks = [];
    var depth = 0;
    var visit = function (side) {
      if (side === 4) {
        for (var a = 0; a < 4; a += 1) for (var b = a + 1; b < 4; b += 1) if (!sameInk(picks[a].color, picks[b].color)) return;
        var shape = shapeOf(edge, picks);
        var miss = outside(shape.aspect, SHAPE_RANGE) * 10 + outside(shape.thickness, THICKNESS_RANGE);
        var score = (miss > 0 ? 1000 + miss * 100 : 0) + depth;
        if (!best || score < best.score) best = { score: score, picks: picks.slice(), shape: shape };
        return;
      }
      for (var k = 0; k < sides[side].length; k += 1) {
        picks[side] = sides[side][k];
        depth += k;
        visit(side + 1);
        depth -= k;
      }
    };
    visit(0);
    if (!best) return { reason: 'border', sides: [null, null, null, null] };
    var fits = outside(best.shape.aspect, SHAPE_RANGE) === 0 && outside(best.shape.thickness, THICKNESS_RANGE) === 0;
    var color = [0, 0, 0];
    best.picks.forEach(function (q) { color[0] += q.color[0] / 4; color[1] += q.color[1] / 4; color[2] += q.color[2] / 4; });
    return {
      reason: fits ? null : 'shape',
      border: color,
      shape: best.shape,
      sides: best.picks.map(function (q) { return fits ? { width: q.end - q.start, start: q.start } : null; }),
    };
  };

  var measureCentering = function (img, margin) {
    var work = shrink(img, WORK_WIDTH);
    var found = locate(work, margin);
    if (found.length === 0) return null;
    var scale = img.width / work.width;
    var coarse = found[0].quad.map(function (p) { return [p[0] * scale, p[1] * scale]; });
    var quad = refineQuad(img, coarse);
    var mx = CENTER_MARGIN, my = CENTER_MARGIN * CARD_ASPECT;
    var wide = scaleQuad(quad, -mx, -my);
    var W2 = Math.round(CENTER_W * (1 + 2 * mx)), H2 = Math.round(CENTER_H * (1 + 2 * my));
    var rgb = warp(img, wide, W2, H2);
    var edge = { x0: Math.round(CENTER_W * mx), x1: W2 - Math.round(CENTER_W * mx), y0: Math.round(CENTER_H * my), y1: H2 - Math.round(CENTER_H * my) };
    var measured = borderRuns(rgb, W2, H2, edge);
    var left = measured.sides[0], right = measured.sides[1], top = measured.sides[2], bottom = measured.sides[3];
    return { quad: quad, width: W2, height: H2, edge: edge, rgb: rgb, border: measured.border, shape: measured.shape, reason: measured.reason, left: left, right: right, top: top, bottom: bottom };
  };

  var HYPOTHESES = [[0, 0], [0.025, 0.0175], [-0.035, -0.025]];

  var describeQuery = function (img, margin) {
    var work = shrink(img, WORK_WIDTH);
    var found = locate(work, margin);
    var quads = [];
    for (var f = 0; f < found.length; f += 1) if (found[f].lines > 0.18) quads.push(found[f].quad);
    var guide = guideQuad(work, margin);
    var near = false;
    for (var k = 0; k < quads.length; k += 1) if (quadDistance(quads[k], guide) < 0.04 * work.width) near = true;
    if (!near) quads.push(guide);
    var out = [], fine = [], raster = null;
    for (var q = 0; q < quads.length; q += 1) {
      var hypotheses = q < 2 ? HYPOTHESES : HYPOTHESES.slice(0, 1);
      for (var i = 0; i < hypotheses.length; i += 1) {
        var quad = scaleQuad(quads[q], hypotheses[i][0], hypotheses[i][1]);
        var flat = warp(work, quad, RASTER_W, RASTER_H);
        if (raster === null) raster = flat;
        out.push(describeRaster(flat));
        fine.push(fineFrom(work, quad));
      }
    }
    return { descriptors: out, fine: fine, raster: raster, quad: quads[0], quads: quads, found: found[0] || null };
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
    var fineOf = function (r) {
      if (r.fine !== null) return r.fine;
      var proxy = (r.score - 0.62) * 2.5;
      return proxy < 0 ? 0 : proxy > 1 ? 1 : proxy;
    };
    var combined = function (r) { return r.score + FINE_WEIGHT * fineOf(r); };
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
    measureCentering: measureCentering,
    foilDrift: foilDrift,
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
