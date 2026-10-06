import type { CameraView } from 'expo-camera';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

import type { OcrHandle, OcrRegion } from '@/services/ocrBridge';
import { captureScanFrame } from '@/services/scanImage';
import { findScanCandidates, isConfirmed, type ScanCandidate } from '@/services/scanMatch';
import type { Rect, Size } from '@/types/scan';
import type { DexLanguage } from '@/types/tcgdex';
import { AUTO_CROP_MARGIN } from '@/utils/scanFrame';
import { parseScanText, type ScanText } from '@/utils/scanText';

export type AutoScanPhase = 'looking' | 'reading' | 'handled';

export type AutoScanResult = {
  id: number;
  printed: string;
  language: DexLanguage | null;
  candidates: ScanCandidate[];
  confirmed: boolean;
};

type Options = {
  camera: RefObject<CameraView | null>;
  frame: Rect | null;
  view: Size | null;
  ocr: OcrHandle | null;
  enabled: boolean;
};

type Side = 'left' | 'right';

type StepOutcome =
  | { kind: 'empty' }
  | { kind: 'read'; text: ScanText; candidates: ScanCandidate[] };

const MAIN_BAND: [number, number] = [0.875, 1.0];
const BOTTOM_BANDS: [number, number][] = [MAIN_BAND, [0.85, 0.975], [0.9, 1.03], [0.95, 1.08], [0.8, 0.93]];
const SIDES: Record<Side, [number, number]> = { left: [0, 0.55], right: [0.45, 1] };
const NAME_BAND: [number, number, number, number] = [0, -0.02, 0.75, 0.17];
const BOTTOM_WIDTH = 1000;
const NAME_WIDTH = 900;
const STEP_PAUSE_MS = 120;
const ERROR_PAUSE_MS = 700;
const EMPTY_TO_RESET = 2;
const AGREEMENT = 3;
const MAX_CANDIDATES = 4;

export function useAutoScan({ camera, frame, view, ocr, enabled }: Options) {
  const [phase, setPhase] = useState<AutoScanPhase>('looking');
  const [result, setResult] = useState<AutoScanResult | null>(null);
  const idleRef = useRef<Promise<void>>(Promise.resolve());
  const sequenceRef = useRef(0);
  const memoryRef = useRef({
    recent: [] as string[],
    lastShown: null as string | null,
    empty: 0,
    side: 'left' as Side,
    band: 0,
  });

  const running = enabled && ocr !== null && frame !== null && view !== null && result === null;

  useEffect(() => {
    if (!running || !ocr || !frame || !view) return;
    let cancelled = false;
    const controller = new AbortController();
    const memory = memoryRef.current;

    const step = async (): Promise<StepOutcome> => {
      const lens = camera.current;
      if (!lens) return { kind: 'empty' };
      const source = await captureScanFrame(lens, frame, view);
      if (!source || cancelled) return { kind: 'empty' };
      await ocr.load(source);
      const band = BOTTOM_BANDS[memory.band] ?? MAIN_BAND;
      const order: Side[] = memory.side === 'left' ? ['left', 'right'] : ['right', 'left'];
      let text: ScanText | null = null;
      for (const side of order) {
        if (cancelled) return { kind: 'empty' };
        text = parseScanText(await ocr.read(region(SIDES[side], band), BOTTOM_WIDTH));
        if (text) {
          memory.side = side;
          break;
        }
      }
      if (!text) {
        memory.band = (memory.band + 1) % BOTTOM_BANDS.length;
        return { kind: 'empty' };
      }
      setPhase('reading');
      const [x0, y0, x1, y1] = NAME_BAND;
      const shift = band[0] - MAIN_BAND[0];
      const nameText = await ocr
        .read(region([x0, x1], [Math.max(-AUTO_CROP_MARGIN, y0 + shift), y1 + shift]), NAME_WIDTH)
        .catch(() => '');
      const candidates = await findScanCandidates(text, nameText, controller.signal);
      return { kind: 'read', text, candidates };
    };

    const decide = (outcome: StepOutcome) => {
      if (outcome.kind === 'empty') {
        memory.empty += 1;
        if (memory.empty >= EMPTY_TO_RESET) {
          memory.lastShown = null;
          memory.recent = [];
          setPhase('looking');
        }
        return;
      }
      memory.empty = 0;
      const best = outcome.candidates[0];
      const key = best ? `${best.language}:${best.card.id}` : `none:${outcome.text.printed}`;
      if (key === memory.lastShown) {
        setPhase('handled');
        return;
      }
      if (!best) return;
      memory.recent = [...memory.recent.slice(-(AGREEMENT + 1)), key];
      const confirmed = isConfirmed(outcome.candidates);
      const agreed = memory.recent.filter((entry) => entry === key).length >= AGREEMENT;
      if (!confirmed && !agreed) return;
      memory.lastShown = key;
      memory.recent = [];
      sequenceRef.current += 1;
      setResult({
        id: sequenceRef.current,
        printed: outcome.text.printed,
        language: outcome.text.language,
        candidates: confirmed ? outcome.candidates.slice(0, 1) : outcome.candidates.slice(0, MAX_CANDIDATES),
        confirmed,
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
          const outcome = await attempt;
          if (cancelled) break;
          decide(outcome);
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
  }, [running, ocr, frame, view, camera]);

  const clear = useCallback(() => setResult(null), []);
  const whenIdle = useCallback(() => idleRef.current, []);
  const forget = useCallback(() => {
    memoryRef.current.lastShown = null;
    memoryRef.current.recent = [];
  }, []);

  return { phase: running ? phase : 'looking', result, clear, whenIdle, forget };
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
