import { CARD_VISION_JS, CARD_VISION_VERSION } from './cardVisionSource';

const TESSERACT_VERSION = '7.0.0';
const CDN = 'https://cdn.jsdelivr.net/npm';
const INDEX_URL = `https://cdn.jsdelivr.net/gh/b08007621-wq/pullcheck@card-index/v${CARD_VISION_VERSION}/`;
const INDEX_REFRESH_MS = 3 * 24 * 60 * 60 * 1000;
const MATCH_RESULTS = 12;

export const OCR_BASE_URL = `${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/`;

export const OCR_PAGE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js"></script>
<script>${CARD_VISION_JS}</script>
</head>
<body style="margin:0;background:transparent">
<canvas id="pc-canvas" style="display:none"></canvas>
<canvas id="pc-vision" style="display:none"></canvas>
<script>
(function () {
  var send = function (message) {
    var text = JSON.stringify(message);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(text);
    else if (window.parent && window.parent !== window) window.parent.postMessage({ pullcheckOcr: text }, '*');
  };
  var describe = function (error) {
    return String((error && error.message) || error || 'unknown');
  };
  var canvas = document.getElementById('pc-canvas');
  var visionCanvas = document.getElementById('pc-vision');
  var image = null;
  send({ type: 'boot' });

  var ready = window.Tesseract
    ? window.Tesseract.createWorker('eng', 1, {
        workerPath: '${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/worker.min.js',
        corePath: '${CDN}/tesseract.js-core@${TESSERACT_VERSION}',
        langPath: '${CDN}/@tesseract.js-data/eng/4.0.0_best_int'
      }).then(function (worker) {
        return worker.setParameters({ tessedit_pageseg_mode: '6' }).then(function () { return worker; });
      })
    : Promise.reject(new Error('Text reader failed to download'));

  ready.then(function () { send({ type: 'ready' }); }, function (error) { send({ type: 'failed', message: describe(error) }); });

  var database = function () {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('No storage'));
      var request = indexedDB.open('pullcheck-vision', 1);
      request.onupgradeneeded = function () { request.result.createObjectStore('files'); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { reject(request.error); };
    });
  };
  var stored = function (mode, work) {
    return database().then(function (db) {
      return new Promise(function (resolve, reject) {
        var request = work(db.transaction('files', mode).objectStore('files'));
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error); };
      });
    });
  };
  var INDEX_KEY = 'index-v${CARD_VISION_VERSION}';
  var download = function () {
    return Promise.all([
      fetch('${INDEX_URL}meta.json').then(function (response) {
        if (!response.ok) throw new Error('Card index unavailable');
        return response.json();
      }),
      fetch('${INDEX_URL}vectors.bin').then(function (response) {
        if (!response.ok) throw new Error('Card index unavailable');
        return response.arrayBuffer();
      })
    ]).then(function (parts) {
      var entry = { meta: parts[0], vectors: parts[1], savedAt: Date.now() };
      stored('readwrite', function (store) { return store.put(entry, INDEX_KEY); }).catch(function () {});
      return entry;
    });
  };
  var usable = function (entry) {
    return !!(entry && entry.meta && entry.vectors && entry.meta.dims === PullVision.DIMS &&
      entry.vectors.byteLength === entry.meta.ids.length * entry.meta.dims);
  };
  var visionIndex = null;
  var adopt = function (entry) {
    visionIndex = { ids: entry.meta.ids, dims: entry.meta.dims, count: entry.meta.ids.length, data: new Int8Array(entry.vectors) };
  };
  var indexReady = stored('readonly', function (store) { return store.get(INDEX_KEY); })
    .catch(function () { return null; })
    .then(function (cached) {
      if (!usable(cached)) return download();
      if (Date.now() - cached.savedAt > ${INDEX_REFRESH_MS}) {
        download().then(function (fresh) { if (usable(fresh)) adopt(fresh); }, function () {});
      }
      return cached;
    })
    .then(function (entry) {
      if (!usable(entry)) throw new Error('Card index is out of date');
      adopt(entry);
    });

  indexReady.then(
    function () { send({ type: 'vision', status: 'ready', count: visionIndex.count }); },
    function (error) { send({ type: 'vision', status: 'failed', message: describe(error) }); }
  );

  var stretch = function (context, width, height) {
    var pixels = context.getImageData(0, 0, width, height);
    var data = pixels.data;
    var histogram = new Array(256).fill(0);
    var gray = new Uint8ClampedArray(width * height);
    for (var i = 0, p = 0; i < data.length; i += 4, p += 1) {
      var value = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
      gray[p] = value;
      histogram[gray[p]] += 1;
    }
    var total = width * height;
    var low = 0, high = 255, seen = 0;
    for (var a = 0; a < 256; a += 1) { seen += histogram[a]; if (seen > total * 0.02) { low = a; break; } }
    seen = 0;
    for (var b = 255; b >= 0; b -= 1) { seen += histogram[b]; if (seen > total * 0.02) { high = b; break; } }
    var range = Math.max(1, high - low);
    for (var j = 0, q = 0; j < data.length; j += 4, q += 1) {
      var out = ((gray[q] - low) * 255) / range;
      data[j] = data[j + 1] = data[j + 2] = out;
      data[j + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
  };

  window.pullcheckLoad = function (id, source) {
    var next = new Image();
    next.onload = function () {
      image = next;
      send({ type: 'loaded', id: id, width: next.naturalWidth, height: next.naturalHeight });
    };
    next.onerror = function () { send({ type: 'error', id: id, message: 'Couldn’t decode the frame' }); };
    next.src = source;
  };

  window.pullcheckRead = function (id, region, targetWidth) {
    ready.then(function (worker) {
      if (!image) throw new Error('No frame loaded');
      var fullWidth = image.naturalWidth;
      var fullHeight = image.naturalHeight;
      var sx = Math.max(0, Math.min(fullWidth - 2, region.x * fullWidth));
      var sy = Math.max(0, Math.min(fullHeight - 2, region.y * fullHeight));
      var sw = Math.max(2, Math.min(fullWidth - sx, region.width * fullWidth));
      var sh = Math.max(2, Math.min(fullHeight - sy, region.height * fullHeight));
      var scale = targetWidth / sw;
      canvas.width = Math.max(2, Math.round(sw * scale));
      canvas.height = Math.max(2, Math.round(sh * scale));
      var context = canvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      stretch(context, canvas.width, canvas.height);
      return worker.recognize(canvas);
    }).then(function (result) {
      send({ type: 'text', id: id, text: result.data.text || '', confidence: result.data.confidence || 0 });
    }, function (error) {
      send({ type: 'error', id: id, message: describe(error) });
    });
  };

  window.pullcheckMatch = function (id, margin) {
    indexReady.then(function () {
      if (!image) throw new Error('No frame loaded');
      var factor = Math.max(1, Math.floor(image.naturalWidth / 240));
      var width = Math.max(2, Math.floor(image.naturalWidth / factor));
      var height = Math.max(2, Math.floor(image.naturalHeight / factor));
      visionCanvas.width = width;
      visionCanvas.height = height;
      var context = visionCanvas.getContext('2d', { willReadFrequently: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);
      var query = PullVision.describeQuery(context.getImageData(0, 0, width, height), margin);
      var ranked = PullVision.rank(visionIndex.data, visionIndex.dims, visionIndex.count, query.descriptors, ${MATCH_RESULTS});
      send({
        type: 'match',
        id: id,
        best: ranked.best,
        gap: ranked.gap,
        results: ranked.results.map(function (result) {
          return { key: visionIndex.ids[result.index], score: result.score, same: result.same };
        })
      });
    }).catch(function (error) {
      send({ type: 'error', id: id, message: describe(error) });
    });
  };
})();
</script>
</body>
</html>`;
