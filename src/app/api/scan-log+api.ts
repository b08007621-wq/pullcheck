const EVENTS = new Set(['shown', 'yes', 'notit', 'picked', 'unsure', 'reader']);
const MAX_FRAME_CHARS = 4_000_000;
const KEEP_FILES = 800;

export async function POST(request: Request) {
  if (process.env.PULLCHECK_HOSTED === '1') return Response.json({ ok: false, disabled: true });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const event = typeof body?.event === 'string' ? body.event : '';
  if (!body || !EVENTS.has(event)) return Response.json({ ok: false }, { status: 400 });

  try {
    await save(event, body);
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
  return Response.json({ ok: true });
}

async function save(event: string, body: Record<string, unknown>) {
  const [fs, path] = await Promise.all([import('node:fs/promises'), import('node:path')]);
  const directory = path.join(process.cwd(), 'scan-log');
  const { frame, ...details } = body;
  const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${event}`;
  await fs.mkdir(directory, { recursive: true });
  if (typeof frame === 'string' && frame.length < MAX_FRAME_CHARS) {
    await fs.writeFile(
      path.join(directory, `${name}.jpg`),
      Buffer.from(frame.replace(/^data:image\/\w+;base64,/, ''), 'base64'),
    );
  }
  await fs.writeFile(path.join(directory, `${name}.json`), JSON.stringify(details, null, 1));

  const files = (await fs.readdir(directory)).sort();
  const extra = files.length - KEEP_FILES;
  if (extra > 0) {
    await Promise.all(files.slice(0, extra).map((file) => fs.unlink(path.join(directory, file)).catch(() => {})));
  }
}
