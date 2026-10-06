const TESSERACT_VERSION = '7.0.0';
const CDN = 'https://cdn.jsdelivr.net/npm';

export const OCR_BASE_URL = `${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/`;

export const OCR_PAGE_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script src="${CDN}/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.min.js"></script>
</head>
<body style="margin:0;background:transparent">
<canvas id="pc-canvas" style="display:none"></canvas>
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
  var image = null;
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
})();
</script>
</body>
</html>`;
