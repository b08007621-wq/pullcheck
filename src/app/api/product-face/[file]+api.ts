import { getProductArt, isArtKind, isFaceName } from '@/server/productArt';

const FILE_PATTERN = /^(\d{1,9})-([a-z0-9]{2,12})-(front|side|top)\.jpg$/;

export async function GET(_request: Request, { file }: Record<string, string>) {
  const match = FILE_PATTERN.exec(file ?? '');
  const [, product, kind, face] = match ?? [];
  if (!product || !isArtKind(kind) || !isFaceName(face)) {
    return new Response('Not found', { status: 404 });
  }

  try {
    const art = await getProductArt(Number(product), kind);
    return new Response(new Uint8Array(art.faces[face]), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch {
    return new Response('Artwork unavailable', { status: 502 });
  }
}
