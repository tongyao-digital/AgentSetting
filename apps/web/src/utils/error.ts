import type { ApiErrorCode } from '../types/api-contract';

import { ApiError } from '../services/api-client';

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return fallback;
}

export function getErrorCode(error: unknown): ApiErrorCode | null {
  if (error instanceof ApiError) {
    return error.code;
  }

  return null;
}
