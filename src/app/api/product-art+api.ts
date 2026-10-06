import { ART_KIND_PATTERN, getProductArt, isArtKind } from '@/server/productArt';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const product = params.get('product') ?? '';
  const kind = params.get('kind');
  if (!/^\d{1,9}$/.test(product) || !isArtKind(kind)) {
    return failure(400, 'bad_request', `Pass ?product=<TCGplayer product id>&kind=${ART_KIND_PATTERN}.`);
  }

  try {
    const art = await getProductArt(Number(product), kind);
    const face = (name: string) => `/api/product-face/${product}-${kind}-${name}.jpg`;
    return Response.json({
      mode: art.mode,
      sideOnLeft: art.sideOnLeft,
      aspect: art.aspect,
      depth: art.depth,
      faces: { front: face('front'), side: face('side'), top: face('top') },
    });
  } catch {
    return failure(502, 'art_unavailable', 'Couldn’t prepare this product’s artwork. Try again.');
  }
}

function failure(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}
