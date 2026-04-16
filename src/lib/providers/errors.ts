export type ProviderErrorCode = 
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "SERVER_ERROR"
  | "BAD_REQUEST"
  | "AUTH_ERROR"
  | "UNKNOWN_ERROR";

export class QuintiaProviderError extends Error {
  constructor(
    public readonly code: ProviderErrorCode,
    message: string,
    public readonly originalError?: any
  ) {
    super(`[${code}] ${message}`);
    this.name = "QuintiaProviderError";
  }

  get isTransient(): boolean {
    return this.code === "TIMEOUT" || this.code === "RATE_LIMIT" || this.code === "SERVER_ERROR";
  }
}
