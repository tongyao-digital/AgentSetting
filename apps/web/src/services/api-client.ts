import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';

import type { ApiErrorCode, ApiFailure, ApiSuccess } from '../types/api-contract';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isApiSuccess<T>(value: unknown): value is ApiSuccess<T> {
  if (!isRecord(value)) {
    return false;
  }

  return value.code === '0' && value.message === 'ok' && 'data' in value && typeof value.request_id === 'string';
}

function isApiFailure(value: unknown): value is ApiFailure {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.code === 'string' && value.code !== '0' && typeof value.message === 'string' && typeof value.request_id === 'string';
}

function normalizeHeaders(headers?: RequestInit['headers']): Record<string, string> {
  const result: Record<string, string> = {};

  if (!headers) {
    return result;
  }

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      result[String(key)] = String(value);
    }
    return result;
  }

  return {
    ...headers,
  };
}

function normalizeBody(body?: RequestInit['body']): unknown {
  if (body == null) {
    return undefined;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  }

  if (body instanceof URLSearchParams) {
    return body.toString();
  }

  return body;
}

export class ApiError extends Error {
  public readonly code: ApiErrorCode;
  public readonly status: number;
  public readonly requestId: string;

  constructor(code: ApiErrorCode, message: string, status: number, requestId = '') {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.requestId = requestId;
  }
}

export class ApiClient {
  private readonly axiosInstance: AxiosInstance;

  constructor(basePath: string, axiosInstance?: AxiosInstance) {
    this.axiosInstance =
      axiosInstance ||
      axios.create({
        baseURL: basePath,
        validateStatus: () => true,
      });
  }

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    const method = (init?.method || 'GET').toUpperCase();
    const body = normalizeBody(init?.body);

    const config: AxiosRequestConfig = {
      url: path,
      method,
      headers: {
        // 'Content-Type': 'application/json',
        ...normalizeHeaders(init?.headers),
      },
    };

    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      config.data = body;
    }

    let response;
    try {
      response = await this.axiosInstance.request(config);
    } catch {
      throw new ApiError('CAP_5002', 'Network error', 500, '');
    }

    const payload: unknown = response.data;

    if (isApiSuccess<T>(payload)) {
      return payload.data;
    }

    if (isApiFailure(payload)) {
      throw new ApiError(payload.code as ApiErrorCode, payload.message, response.status, payload.request_id);
    }

    throw new ApiError('CAP_5002', 'Invalid API response payload', response.status || 500, '');
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}