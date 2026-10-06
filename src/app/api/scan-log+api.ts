import fs from 'node:fs/promises';
import path from 'node:path';

const DIRECTORY = path.join(process.cwd(), 'scan-log');
const EVENTS = new Set(['shown', 'yes', 'notit', 'picked', 'unsure', 'reader']);
const MAX_FRAME_CHARS = 4_000_000;
const KEEP_FILES = 800;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const event = typeof body?.event === 'string' ? body.event : '';
  if (!body || !EVENTS.has(event)) return Response.json({ ok: false }, { status: 400 });

  const { frame, ...details } = body;
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${event}`;
  await fs.mkdir(DIRECTORY, { recursive: true });
  if (typeof frame === 'string' && frame.length < MAX_FRAME_CHARS) {
    await fs.writeFile(
      path.join(DIRECTORY, `${name}.jpg`),
      Buffer.from(frame.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
    );
  }
  await fs.writeFile(path.join(DIRECTORY, `${name}.json`), JSON.stringify(details, null, 1));
  await prune();
  return Response.json({ ok: true });
}

async function prune() {
  const files = (await fs.readdir(DIRECTORY)).sort();
  const extra = files.length - KEEP_FILES;
  if (extra <= 0) return;
  await Promise.all(files.slice(0, extra).map((file) => fs.unlink(path.join(DIRECTORY, file)).catch(() => {})));
}
