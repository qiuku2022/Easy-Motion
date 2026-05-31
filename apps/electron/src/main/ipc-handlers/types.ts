import type { IpcMainInvokeEvent } from 'electron';
import type { IPCResponse } from '@easymotion/shared';
import { AppError } from '../errors';

/**
 * 包装 IPC 处理器，自动捕获错误并返回标准响应格式
 */
export function wrapHandler<T, R>(
  handler: (event: IpcMainInvokeEvent, payload: T) => Promise<R>
): (event: IpcMainInvokeEvent, payload: T) => Promise<IPCResponse<R>> {
  return async (event, payload) => {
    try {
      const data = await handler(event, payload);
      return { success: true, data };
    } catch (error) {
      if (error instanceof AppError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        };
      }

      const err = error as Error;
      return {
        success: false,
        error: {
          code: 'E2000',
          message: err.message ?? '未知错误',
        },
      };
    }
  };
}
