/**
 * 通用错误码 E2000-E2099
 */
export const CommonErrorCodes = {
  UNKNOWN_ERROR: 'E2000',
  INVALID_PARAMS: 'E2001',
  NOT_IMPLEMENTED: 'E2002',
  INTERNAL_ERROR: 'E2003',
  TIMEOUT: 'E2004',
} as const;

import { AppError } from './app-error';

export function createUnknownError(message?: string, details?: Record<string, unknown>): AppError {
  return new AppError(CommonErrorCodes.UNKNOWN_ERROR, message ?? '未知错误', details);
}

export function createInvalidParamsError(
  message?: string,
  details?: Record<string, unknown>
): AppError {
  return new AppError(CommonErrorCodes.INVALID_PARAMS, message ?? '参数无效', details);
}

export function createNotImplementedError(feature?: string): AppError {
  return new AppError(CommonErrorCodes.NOT_IMPLEMENTED, `功能未实现: ${feature ?? ''}`);
}

export function createInternalError(message?: string, details?: Record<string, unknown>): AppError {
  return new AppError(CommonErrorCodes.INTERNAL_ERROR, message ?? '内部错误', details);
}

export function createTimeoutError(operation?: string): AppError {
  return new AppError(CommonErrorCodes.TIMEOUT, `操作超时: ${operation ?? ''}`);
}
