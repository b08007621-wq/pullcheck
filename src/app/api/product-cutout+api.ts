import { getProductCutout } from '@/server/productCutout';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const product = params.get('product') ?? '';
  const requested = Number(params.get('size') ?? 600);
  if (!/^\d{1,9}$/.test(product) || !Number.isFinite(requested)) {
    return new Response('Bad request', { status: 400 });
  }
  const size = Math.min(1000, Math.max(96, Math.round(requested)));

  try {
    const png = await getProductCutout(Number(product), size);
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Cutout unavailable', { status: 502 });
  }
}
