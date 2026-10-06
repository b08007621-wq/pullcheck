export type ApiErrorKind =
  | 'network'
  | 'timeout'
  | 'rateLimited'
  | 'server'
  | 'notFound'
  | 'badResponse';

type RequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  retryBudgetMs?: number;
  maxAttempts?: number;
  headers?: Record<string, string>;
};

type RequestInitOptions = {
  method: 'GET' | 'POST';
  body?: unknown;
  as?: 'json' | 'text';
};

type ErrorBody = {
  error?: { code?: unknown; message?: unknown };
};

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRY_BUDGET_MS = 20000;
const MAX_ATTEMPTS = 8;
const RETRY_BASE_DELAY_MS = 250;
const RETRY_MAX_DELAY_MS = 1000;

const ERROR_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Couldn't connect. Check your internet connection and try again.",
  timeout: 'The server took too long to respond. Try again.',
  rateLimited: 'Too many requests in a short time. Wait a minute and try again.',
  server: 'The server is having trouble right now. Try again in a moment.',
  notFound: 'That item couldn’t be found. It may have been removed from the database.',
  badResponse: 'Got an unexpected response from the server.',
};

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;
  readonly code: string | undefined;

  constructor(kind: ApiErrorKind, status?: number, message?: string, code?: string) {
    super(message ?? ERROR_MESSAGES[kind]);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function toApiError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError('network');
}

export function toQueryString(params: Record<string, string | number>): string {
  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

export function getJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return requestWithRetry<T>(url, { method: 'GET' }, options);
}

export function getText(url: string, options: RequestOptions = {}): Promise<string> {
  return requestWithRetry<string>(url, { method: 'GET', as: 'text' }, options);
}

export function postJson<T>(url: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return requestWithRetry<T>(url, { method: 'POST', body }, options);
}

async function requestWithRetry<T>(
  url: string,
  init: RequestInitOptions,
  options: RequestOptions,
): Promise<T> {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retryBudgetMs = DEFAULT_RETRY_BUDGET_MS,
    maxAttempts = MAX_ATTEMPTS,
    headers = {},
  } = options;
  const startedAt = Date.now();

  for (let attempt = 1; ; attempt++) {
    try {
      return await requestJson<T>(url, init, timeoutMs, headers, signal);
    } catch (error) {
      if (signal?.aborted) throw createAbortError();
      const apiError = toApiError(error);
      const delay = Math.min(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1), RETRY_MAX_DELAY_MS);
      const outOfBudget = Date.now() - startedAt + delay > retryBudgetMs;
      if (!isRetryable(apiError) || attempt >= maxAttempts || outOfBudget) throw apiError;
      await wait(delay, signal);
    }
  }
}

async function requestJson<T>(
  url: string,
  init: RequestInitOptions,
  timeoutMs: number,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) throw createAbortError();

  const controller = new AbortController();
  const forwardAbort = () => controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  signal?.addEventListener('abort', forwardAbort);

  try {
    const hasBody = init.body !== undefined;
    const response = await fetch(url, {
      method: init.method,
      signal: controller.signal,
      headers: {
        Accept: init.as === 'text' ? 'text/plain' : 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: hasBody ? JSON.stringify(init.body) : undefined,
    });
    if (!response.ok) throw await errorFromResponse(response);
    if (init.as === 'text') return (await response.text()) as T;
    return await parseJson<T>(response);
  } catch (error) {
    if (timedOut) throw new ApiError('timeout');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('badResponse', response.status);
  }
}

async function errorFromResponse(response: Response): Promise<ApiError> {
  const kind = kindForStatus(response.status);
  try {
    const body = (await response.json()) as ErrorBody;
    const message = typeof body.error?.message === 'string' ? body.error.message : undefined;
    const code = typeof body.error?.code === 'string' ? body.error.code : undefined;
    return new ApiError(kind, response.status, message, code);
  } catch {
    return new ApiError(kind, response.status);
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 429) return 'rateLimited';
  if (status === 404) return 'notFound';
  if (status >= 500) return 'server';
  return 'badResponse';
}

function isRetryable(error: ApiError): boolean {
  return error.kind === 'server' || error.kind === 'network' || error.kind === 'timeout';
}

export function withAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise((resolve, reject) => {
    const onAbort = () => reject(createAbortError());
    signal.addEventListener('abort', onAbort);
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

function createAbortError(): Error {
  const error = new Error('Request was cancelled');
  error.name = 'AbortError';
  return error;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(createAbortError());
    }
    signal?.addEventListener('abort', onAbort);
  });
}
