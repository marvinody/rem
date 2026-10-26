import { AxiosError } from 'axios';

// Upstream bodies can be whole HTML pages; keep enough to recognise a block/captcha page.
const RESPONSE_BODY_LIMIT = 2000;
const LOG_BODY_LIMIT = 8000;

// Never echo these back to clients or into logs.
const SECRET_PARAMS = ['applicationId', 'api-key', 'apikey', 'key', 'token'];
const SECRET_HEADERS = ['set-cookie', 'cookie', 'authorization', 'dpop'];

/**
 * An error carrying extra context (e.g. a snippet of an unexpected upstream page).
 */
export class DetailedError extends Error {
  details: Record<string, unknown>;

  constructor(message: string, details: Record<string, unknown>) {
    super(message);
    this.name = 'DetailedError';
    this.details = details;
  }
}

export const truncate = (value: string, limit: number): string =>
  value.length > limit ? `${value.slice(0, limit)}… [${value.length - limit} more chars]` : value;

const stringifyBody = (data: unknown): string => {
  if (data === undefined || data === null) {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
};

const redactUrl = (url: string | undefined, baseURL: string | undefined): string | undefined => {
  if (!url && !baseURL) {
    return undefined;
  }
  try {
    const parsed = new URL(url ?? '', baseURL);
    SECRET_PARAMS.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, 'REDACTED');
      }
    });
    return parsed.toString();
  } catch {
    return url;
  }
};

const redactParams = (params: unknown): unknown => {
  if (!params || typeof params !== 'object') {
    return params;
  }
  const copy: Record<string, unknown> = { ...(params as Record<string, unknown>) };
  SECRET_PARAMS.forEach((param) => {
    if (param in copy) {
      copy[param] = 'REDACTED';
    }
  });
  return copy;
};

const redactHeaders = (headers: unknown): Record<string, unknown> | undefined => {
  if (!headers || typeof headers !== 'object') {
    return undefined;
  }
  const copy: Record<string, unknown> = {};
  Object.entries(headers as Record<string, unknown>).forEach(([name, value]) => {
    copy[name] = SECRET_HEADERS.includes(name.toLowerCase()) ? 'REDACTED' : value;
  });
  return copy;
};

const isAxiosError = (err: unknown): err is AxiosError =>
  Boolean(err) && typeof err === 'object' && (err as AxiosError).isAxiosError === true;

/**
 * Collects everything useful for tracing a failed upstream call.
 * `bodyLimit` controls how much of the upstream body is kept.
 */
export const describeError = (err: unknown, bodyLimit = RESPONSE_BODY_LIMIT) => {
  if (isAxiosError(err)) {
    const { config, response } = err;
    return {
      type: 'upstream',
      code: err.code,
      request: {
        method: config?.method?.toUpperCase(),
        url: redactUrl(config?.url, config?.baseURL),
        params: redactParams(config?.params),
        timeout: config?.timeout,
      },
      response: response
        ? {
          status: response.status,
          statusText: response.statusText,
          headers: redactHeaders(response.headers),
          body: truncate(stringifyBody(response.data), bodyLimit),
        }
        : undefined,
    };
  }
  if (err instanceof DetailedError) {
    return {
      type: 'detailed',
      ...err.details,
    };
  }
  return undefined;
};

export { RESPONSE_BODY_LIMIT, LOG_BODY_LIMIT };
