import { Platform } from 'react-native';

import { apiUrl } from './apiBase';
import type { VisionMatch } from './ocrBridge';

export type ScanLogEvent = 'shown' | 'yes' | 'notit' | 'picked' | 'unsure';

const UNSURE_EVERY_MS = 4000;
const SUMMARY_RESULTS = 6;

let lastUnsure = 0;

export function logScan(event: ScanLogEvent, frame: string | null, details: Record<string, unknown>) {
  if (!__DEV__) return;
  if (event === 'unsure') {
    const now = Date.now();
    if (now - lastUnsure < UNSURE_EVERY_MS) return;
    lastUnsure = now;
  }
  fetch(apiUrl('/api/scan-log'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, frame, platform: Platform.OS, at: new Date().toISOString(), ...details }),
  }).catch(() => {});
}

export function summarizeMatch(match: VisionMatch) {
  return {
    best: round(match.best),
    gap: round(match.gap),
    fine: match.fine === null ? null : round(match.fine),
    fineGap: round(match.fineGap),
    top: match.results.slice(0, SUMMARY_RESULTS).map((result) => ({
      key: result.key,
      score: round(result.score),
      fine: result.fine === null ? null : round(result.fine),
      same: result.same,
    })),
  };
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
