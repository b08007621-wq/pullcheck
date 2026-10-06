import type { CardReading } from '@/types/identify';

import { apiUrl } from './apiBase';
import { ApiError, postJson } from './http';

const IDENTIFY_TIMEOUT_MS = 60000;

type IdentifyResponse = {
  reading?: CardReading;
};

export async function readCardPhoto(imageBase64: string, signal?: AbortSignal): Promise<CardReading> {
  const response = await postJson<IdentifyResponse>(
    apiUrl('/api/identify'),
    { image: imageBase64, mediaType: 'image/jpeg' },
    { signal, timeoutMs: IDENTIFY_TIMEOUT_MS, maxAttempts: 1 },
  );
  if (!response.reading) throw new ApiError('badResponse');
  return response.reading;
}
