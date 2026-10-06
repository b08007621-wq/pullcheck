import type { Size } from '@/types/scan';

export type OcrRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type VisionResult = {
  key: string;
  score: number;
  same: boolean;
};

export type VisionMatch = {
  best: number;
  gap: number;
  results: VisionResult[];
};

export type OcrHandle = {
  load: (source: string) => Promise<Size>;
  read: (region: OcrRegion, targetWidth: number) => Promise<string>;
  match: (margin: number) => Promise<VisionMatch>;
};

export type ReaderStatus = 'loading' | 'ready' | 'failed';

export type OcrState = {
  handle: OcrHandle | null;
  text: ReaderStatus;
  vision: ReaderStatus;
};

export const READER_LOADING: OcrState = { handle: null, text: 'loading', vision: 'loading' };
export const READER_FAILED: OcrState = { handle: null, text: 'failed', vision: 'failed' };

type PageMessage =
  | { type: 'boot' }
  | { type: 'ready' }
  | { type: 'failed'; message?: string }
  | { type: 'vision'; status: 'ready' | 'failed'; message?: string }
  | { type: 'loaded'; id: number; width: number; height: number }
  | { type: 'text'; id: number; text: string }
  | ({ type: 'match'; id: number } & VisionMatch)
  | { type: 'error'; id: number; message?: string };

type Pending = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

const LOAD_TIMEOUT_MS = 8000;
const READ_TIMEOUT_MS = 15000;
const MATCH_TIMEOUT_MS = 8000;

export type OcrBridge = ReturnType<typeof createOcrBridge>;

export function createOcrBridge(run: (script: string) => void, onState: (state: OcrState) => void) {
  let nextId = 1;
  const pending = new Map<number, Pending>();
  let state: OcrState = READER_LOADING;

  const update = (next: Partial<OcrState>) => {
    state = { ...state, ...next };
    onState(state);
  };

  const call = <T>(script: (id: number) => string, timeoutMs: number) =>
    new Promise<T>((resolve, reject) => {
      const id = nextId;
      nextId += 1;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error('The card reader timed out'));
      }, timeoutMs);
      pending.set(id, { resolve: resolve as (value: unknown) => void, reject, timer });
      run(script(id));
    });

  const handle: OcrHandle = {
    load: (source) =>
      call<Size>((id) => `window.pullcheckLoad(${id}, ${JSON.stringify(source)}); true;`, LOAD_TIMEOUT_MS),
    read: (region, targetWidth) =>
      call<string>(
        (id) => `window.pullcheckRead(${id}, ${JSON.stringify(region)}, ${Math.round(targetWidth)}); true;`,
        READ_TIMEOUT_MS,
      ),
    match: (margin) => call<VisionMatch>((id) => `window.pullcheckMatch(${id}, ${margin}); true;`, MATCH_TIMEOUT_MS),
  };

  const settle = (id: number, outcome: { value?: unknown; error?: string }) => {
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    clearTimeout(entry.timer);
    if (outcome.error !== undefined) entry.reject(new Error(outcome.error));
    else entry.resolve(outcome.value);
  };

  const receive = (raw: string) => {
    let message: PageMessage;
    try {
      message = JSON.parse(raw) as PageMessage;
    } catch {
      return;
    }
    if (message.type === 'boot') update({ handle });
    else if (message.type === 'ready') update({ handle, text: 'ready' });
    else if (message.type === 'failed') update({ handle, text: 'failed' });
    else if (message.type === 'vision') update({ handle, vision: message.status });
    else if (message.type === 'loaded') settle(message.id, { value: { width: message.width, height: message.height } });
    else if (message.type === 'text') settle(message.id, { value: message.text });
    else if (message.type === 'match') {
      settle(message.id, { value: { best: message.best, gap: message.gap, results: message.results } });
    } else if (message.type === 'error') settle(message.id, { error: message.message ?? 'Card reader error' });
  };

  const dispose = () => {
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error('The card reader closed'));
      pending.delete(id);
    }
  };

  return { receive, dispose };
}
