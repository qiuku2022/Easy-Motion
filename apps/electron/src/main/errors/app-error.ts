/**
 * EasyMotion 应用错误基类
 * 所有业务错误都应继承此类
 */
export class AppError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;

    // 修复原型链（TypeScript 继承 Error 时的已知问题）
    Object.setPrototypeOf(this, AppError.prototype);
  }

  toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
