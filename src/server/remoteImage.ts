import https from 'node:https';

const PRODUCT_HOST = 'tcgplayer-cdn.tcgplayer.com';
const CARD_HOSTS = new Set([PRODUCT_HOST, 'images.pokemontcg.io', 'images.scrydex.com']);
const MAX_BYTES = 8_000_000;
const TIMEOUT_MS = 15_000;

export function productImageUrl(productId: number): string {
  return `https://${PRODUCT_HOST}/product/${productId}_in_1000x1000.jpg`;
}

export function fetchProductImage(productId: number): Promise<Uint8Array> {
  return download(productImageUrl(productId), 3);
}

export function isCardImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && CARD_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

export function fetchCardImage(url: string): Promise<Uint8Array> {
  return download(url, 3);
}

function download(url: string, redirects: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    if (target.protocol !== 'https:' || !CARD_HOSTS.has(target.hostname)) {
      reject(new Error('blocked_host'));
      return;
    }
    const request = https.get(target, { headers: { 'User-Agent': 'PullCheck/1.0 (iOS; Expo)' } }, (response) => {
      const status = response.statusCode ?? 0;
      const location = response.headers.location;
      if (status >= 300 && status < 400 && location && redirects > 0) {
        response.resume();
        download(new URL(location, target).toString(), redirects - 1).then(resolve, reject);
        return;
      }
      if (status !== 200) {
        response.resume();
        reject(new Error(`status_${status}`));
        return;
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_BYTES) {
          request.destroy(new Error('too_large'));
          return;
        }
        chunks.push(chunk);
      });
      response.on('end', () => resolve(new Uint8Array(Buffer.concat(chunks))));
      response.on('error', reject);
    });
    request.setTimeout(TIMEOUT_MS, () => request.destroy(new Error('timeout')));
    request.on('error', reject);
  });
}
