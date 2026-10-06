import { getCardLayout } from '@/server/cardLayouts';
import { isCardImageUrl } from '@/server/remoteImage';

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('src') ?? '';
  if (!isCardImageUrl(source)) {
    return Response.json({ error: { code: 'bad_request', message: 'Pass ?src=<card image URL>.' } }, { status: 400 });
  }

  try {
    const layout = await getCardLayout(source);
    return Response.json(layout, { headers: { 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return Response.json({ error: { code: 'layout_unavailable', message: 'Couldn’t read this card image.' } }, { status: 502 });
  }
}
