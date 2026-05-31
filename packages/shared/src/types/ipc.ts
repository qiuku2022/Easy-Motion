export interface IPCError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface IPCResponse<T> {
  success: boolean;
  data?: T;
  error?: IPCError;
}

export interface IPCRequest<T> {
  payload: T;
}
