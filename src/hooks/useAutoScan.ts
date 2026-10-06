import type { CameraView } from 'expo-camera';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import type { FoilDrift, OcrHandle, OcrRegion, OcrState, VisionMatch } from '@/services/ocrBridge';
import { captureScanFrame } from '@/services/scanImage';
import { logScan, summarizeMatch } from '@/services/scanLog';
import { findScanCandidates, isConfirmed, type ScanCandidate } from '@/services/scanMatch';
import {
  alternativeKeys,
  canGuess,
  guessKeys,
  judgeMatch,
  numberPickKeys,
  printedMatches,
  samePictureKeys,
  visionCandidates,
} from '@/services/visionMatch';
import type { Rect, Size } from '@/types/scan';
import type { DexLanguage } from '@/types/tcgdex';
import { AUTO_CROP_MARGIN } from '@/utils/scanFrame';
import { parseScanText, type ScanText } from '@/utils/scanText';

export type AutoScanPhase = 'looking' | 'reading' | 'handled';

export type AutoScanResult = {
  id: number;
  printed: string | null;
  language: DexLanguage | null;
  candidates: ScanCandidate[];
  confirmed: boolean;
  frame: string | null;
};

export type AutoScanGuess = AutoScanResult & {
  key: string;
  alternatives: string[];
  foil: FoilDrift | null;
  seenAt: number;
};

type Options = {
  camera: RefObject<CameraView | null>;
  frame: Rect | null;
  view: Size | null;
  reader: OcrState;
  enabled: boolean;
};

type Side = 'left' | 'right';

type NumberRead = { text: ScanText; band: [number, number] };

type Found = {
  key: string;
  source: 'picture' | 'text';
  printed: string | null;
  language: DexLanguage | null;
  candidates: ScanCandidate[];
  alternatives: string[];
  confirmed: boolean;
  frame: string | null;
  match: VisionMatch | null;
};

type PictureOutcome = { kind: 'found'; found: Found } | { kind: 'maybe'; number: NumberRead | null } | { kind: 'none' };

const MAIN_BAND: [number, number] = [0.875, 1.0];
const BOTTOM_BANDS: [number, number][] = [MAIN_BAND, [0.85, 0.975], [0.9, 1.03], [0.95, 1.08], [0.8, 0.93]];
const SIDES: Record<Side, [number, number]> = { left: [0, 0.55], right: [0.45, 1] };
const NAME_BAND: [number, number, number, number] = [0, -0.02, 0.75, 0.17];
const BOTTOM_WIDTH = 1000;
const NAME_WIDTH = 900;
const STEP_PAUSE_MS = 80;
const ERROR_PAUSE_MS = 700;
const EMPTY_TO_RESET = 2;
const AGREEMENT = 3;
const MAX_CANDIDATES = 4;
const GUESS_HIDE_MS = 2000;
const LIBRARY_MARGIN = 0;

export function useAutoScan({ camera, frame, view, reader, enabled }: Options) {
  const [phase, setPhase] = useState<AutoScanPhase>('looking');
  const [guess, setGuess] = useState<AutoScanGuess | null>(null);
  const [result, setResult] = useState<AutoScanResult | null>(null);
  const idleRef = useRef<Promise<void>>(Promise.resolve());
  const sequenceRef = useRef(0);
  const guessRef = useRef<AutoScanGuess | null>(null);
  const memoryRef = useRef({
    recent: [] as string[],
    handled: null as string | null,
    empty: 0,
    side: 'left' as Side,
    band: 0,
    top: null as string | null,
    images: new Map<string, string>(),
  });

  const ocr = reader.handle;
  const vision = reader.vision === 'ready';
  const text = reader.text === 'ready';
  const usable = ocr !== null && (vision || text);
  const running = enabled && usable && frame !== null && view !== null && result === null;

  useEffect(() => {
    guessRef.current = guess;
    if (!guess) return;
    const timer = setTimeout(() => setGuess(null), GUESS_HIDE_MS);
    return () => clearTimeout(timer);
  }, [guess]);

  const readNumber = useCallback(async (handle: OcrHandle): Promise<NumberRead | null> => {
    const memory = memoryRef.current;
    const band = BOTTOM_BANDS[memory.band] ?? MAIN_BAND;
    const order: Side[] = memory.side === 'left' ? ['left', 'right'] : ['right', 'left'];
    for (const side of order) {
      const parsed = parseScanText(await handle.read(region(SIDES[side], band), BOTTOM_WIDTH));
      if (parsed) {
        memory.side = side;
        return { text: parsed, band };
      }
    }
    memory.band = (memory.band + 1) % BOTTOM_BANDS.length;
    return null;
  }, []);

  const readByText = useCallback(
    async (handle: OcrHandle, source: string, known: NumberRead | null, signal: AbortSignal): Promise<Found | null> => {
      const number = known ?? (await readNumber(handle));
      if (!number) return null;
      setPhase('reading');
      const [x0, y0, x1, y1] = NAME_BAND;
      const shift = number.band[0] - MAIN_BAND[0];
      const nameText = await handle
        .read(region([x0, x1], [Math.max(-AUTO_CROP_MARGIN, y0 + shift), y1 + shift]), NAME_WIDTH)
        .catch(() => '');
      const candidates = await findScanCandidates(number.text, nameText, signal);
      const best = candidates[0];
      if (!best) return null;
      const confirmed = isConfirmed(candidates);
      return {
        key: `${best.language}:${best.card.id}`,
        source: 'text',
        printed: number.text.printed,
        language: number.text.language,
        candidates: confirmed ? candidates.slice(0, 1) : candidates.slice(0, MAX_CANDIDATES),
        alternatives: [],
        confirmed,
        frame: source,
        match: null,
      };
    },
    [readNumber],
  );

  const readByPicture = useCallback(
    async (
      handle: OcrHandle,
      source: string,
      margin: number,
      relaxed: boolean,
      signal: AbortSignal,
    ): Promise<PictureOutcome> => {
      const memory = memoryRef.current;
      const match = await handle.match(margin);
      for (const result of match.results) if (result.image) memory.images.set(result.key, result.image);
      const verdict = judgeMatch(match, memory.top);
      memory.top = match.results[0]?.key ?? null;

      const build = async (keys: string[], number: NumberRead | null, sure: boolean): Promise<Found | null> => {
        const candidates = await visionCandidates(keys, number?.text ?? null, signal, memory.images);
        const best = candidates[0];
        if (!best) return null;
        const settled = sure && (keys.length === 1 || (number !== null && printedMatches(best, number.text)));
        const shown = settled ? candidates.slice(0, 1) : candidates.slice(0, MAX_CANDIDATES);
        return {
          key: `${best.language}:${best.card.id}`,
          source: 'picture',
          printed: number?.text.printed ?? null,
          language: number?.text.language ?? null,
          candidates: shown,
          alternatives: alternativeKeys(match, shown.map((candidate) => `${candidate.language}:${candidate.card.id}`)),
          confirmed: settled,
          frame: source,
          match,
        };
      };

      if (verdict === 'sure') {
        const keys = samePictureKeys(match);
        const number = keys.length > 1 && text ? await readNumber(handle).catch(() => null) : null;
        const found = await build(keys, number, true);
        return found ? { kind: 'found', found } : { kind: 'none' };
      }

      if (verdict === 'maybe' && text) {
        const number = await readNumber(handle).catch(() => null);
        const picked = number ? numberPickKeys(match, number.text) : [];
        if (number && picked.length > 0) {
          const found = await build(picked, number, true);
          if (found) return { kind: 'found', found };
        }
        if (!relaxed) {
          logScan('unsure', source, { verdict, match: summarizeMatch(match), printed: number?.text.printed ?? null });
          return { kind: 'maybe', number };
        }
      }

      if (relaxed && canGuess(match)) {
        const found = await build(guessKeys(match), null, false);
        return found ? { kind: 'found', found } : { kind: 'none' };
      }
      return verdict === 'maybe' ? { kind: 'maybe', number: null } : { kind: 'none' };
    },
    [readNumber, text],
  );

  const recognize = useCallback(
    async (source: string, margin: number, relaxed: boolean, signal: AbortSignal): Promise<Found | null> => {
      if (!ocr) return null;
      await ocr.load(source);
      let number: NumberRead | null = null;
      if (vision) {
        const outcome = await readByPicture(ocr, source, margin, relaxed, signal);
        if (outcome.kind === 'found') return outcome.found;
        if (outcome.kind === 'none' && !relaxed) return null;
        const current = guessRef.current;
        if (outcome.kind === 'maybe' && current && current.key === memoryRef.current.top) {
          return { ...current, source: 'picture', match: null };
        }
        if (outcome.kind === 'maybe') number = outcome.number;
      }
      return text ? readByText(ocr, source, number, signal) : null;
    },
    [ocr, vision, text, readByPicture, readByText],
  );

  useEffect(() => {
    if (!running || !frame || !view) return;
    let cancelled = false;
    const controller = new AbortController();
    const memory = memoryRef.current;

    const step = async (): Promise<Found | null> => {
      const lens = camera.current;
      if (!lens) return null;
      const source = await captureScanFrame(lens, frame, view);
      if (!source || cancelled) return null;
      return recognize(source, AUTO_CROP_MARGIN, false, controller.signal);
    };

    const decide = (found: Found | null) => {
      if (!found) {
        memory.empty += 1;
        if (memory.empty >= EMPTY_TO_RESET) {
          memory.handled = null;
          memory.recent = [];
          setPhase('looking');
        }
        return;
      }
      memory.empty = 0;
      if (found.key === memory.handled) {
        setPhase('handled');
        return;
      }
      const current = guessRef.current;
      if (current && current.key === found.key) {
        setGuess({ ...current, foil: found.match?.foil ?? current.foil, seenAt: Date.now() });
        return;
      }
      if (found.source === 'text') {
        memory.recent = [...memory.recent.slice(-(AGREEMENT + 1)), found.key];
        const agreed = memory.recent.filter((entry) => entry === found.key).length >= AGREEMENT;
        if (!found.confirmed && !agreed) return;
      }
      memory.recent = [];
      sequenceRef.current += 1;
      setPhase('looking');
      logScan('shown', found.frame, {
        key: found.key,
        source: found.source,
        confirmed: found.confirmed,
        printed: found.printed,
        candidates: found.candidates.map((candidate) => `${candidate.language}:${candidate.card.id}`),
        match: found.match ? summarizeMatch(found.match) : null,
        foil: found.match?.foil ?? null,
      });
      setGuess({
        id: sequenceRef.current,
        key: found.key,
        printed: found.printed,
        language: found.language,
        candidates: found.candidates,
        alternatives: found.alternatives,
        confirmed: found.confirmed,
        frame: found.frame,
        foil: found.match?.foil ?? null,
        seenAt: Date.now(),
      });
    };

    const loop = async () => {
      while (!cancelled) {
        const attempt = step();
        idleRef.current = attempt.then(
          () => undefined,
          () => undefined,
        );
        let pause = STEP_PAUSE_MS;
        try {
          const found = await attempt;
          if (cancelled) break;
          decide(found);
        } catch {
          pause = ERROR_PAUSE_MS;
        }
        await wait(pause);
      }
    };

    loop();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [running, frame, view, camera, recognize]);

  const open = useCallback((found: AutoScanResult & { key: string }) => {
    sequenceRef.current += 1;
    memoryRef.current.handled = found.key;
    setGuess(null);
    setResult({
      id: sequenceRef.current,
      printed: found.printed,
      language: found.language,
      candidates: found.candidates,
      confirmed: found.confirmed,
      frame: found.frame,
    });
  }, []);

  const scanSource = useCallback(
    async (source: string, margin = LIBRARY_MARGIN): Promise<boolean> => {
      const controller = new AbortController();
      const found = await recognize(source, margin, true, controller.signal).catch(() => null);
      if (!found) return false;
      const extra = found.confirmed
        ? []
        : await visionCandidates(found.alternatives.slice(0, MAX_CANDIDATES), null, undefined, memoryRef.current.images).catch(
            () => [],
          );
      const known = new Set(found.candidates.map((candidate) => candidate.card.id));
      open({ ...found, id: 0, candidates: [...found.candidates, ...extra.filter((entry) => !known.has(entry.card.id))] });
      return true;
    },
    [recognize, open],
  );

  const scanCamera = useCallback(async (): Promise<boolean> => {
    const lens = camera.current;
    if (!lens || !frame || !view || !usable) return false;
    await idleRef.current;
    const source = await captureScanFrame(lens, frame, view).catch(() => null);
    return source ? scanSource(source, AUTO_CROP_MARGIN) : false;
  }, [camera, frame, view, usable, scanSource]);

  const openGuess = useCallback(() => {
    const current = guessRef.current;
    if (current) open(current);
  }, [open]);

  const confirmGuess = useCallback((cardId: string, variant: string | null) => {
    const current = guessRef.current;
    if (!current) return;
    memoryRef.current.handled = current.key;
    logScan('yes', current.frame, { key: current.key, added: cardId, variant, foil: current.foil });
  }, []);

  const rejectGuess = useCallback(async () => {
    const current = guessRef.current;
    if (!current) return;
    memoryRef.current.handled = current.key;
    logScan('notit', current.frame, { key: current.key, alternatives: current.alternatives });
    const others = await visionCandidates(
      current.alternatives.slice(0, MAX_CANDIDATES + 2),
      null,
      undefined,
      memoryRef.current.images,
    ).catch(() => []);
    const seen = new Set([current.key]);
    const rest: ScanCandidate[] = [];
    for (const candidate of [...current.candidates.slice(1), ...others]) {
      const key = `${candidate.language}:${candidate.card.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rest.push(candidate);
    }
    setGuess(null);
    if (rest.length === 0) return;
    sequenceRef.current += 1;
    setResult({
      id: sequenceRef.current,
      printed: current.printed,
      language: current.language,
      candidates: rest,
      confirmed: false,
      frame: current.frame,
    });
  }, []);

  const clear = useCallback(() => setResult(null), []);
  const whenIdle = useCallback(() => idleRef.current, []);
  const forget = useCallback(() => {
    memoryRef.current.handled = null;
    memoryRef.current.recent = [];
    setGuess(null);
  }, []);

  return {
    phase: running ? phase : 'looking',
    guess: running ? guess : null,
    result,
    ready: usable,
    clear,
    whenIdle,
    forget,
    openGuess,
    confirmGuess,
    rejectGuess,
    scanCamera,
    scanSource,
  };
}

function region([x0, x1]: [number, number], [y0, y1]: [number, number]): OcrRegion {
  const span = 1 + AUTO_CROP_MARGIN * 2;
  return {
    x: (x0 + AUTO_CROP_MARGIN) / span,
    y: (y0 + AUTO_CROP_MARGIN) / span,
    width: (x1 - x0) / span,
    height: (y1 - y0) / span,
  };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
