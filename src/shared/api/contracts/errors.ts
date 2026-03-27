class AppApiError extends Error {
  code: string
  status?: number
  cause?: unknown

  constructor(message: string, options: { code: string; status?: number; cause?: unknown }) {
    super(message)
    this.name = "AppApiError"
    this.code = options.code
    this.status = options.status
    this.cause = options.cause
  }
}

class AuthError extends AppApiError {}
class PermissionError extends AppApiError {}
class ValidationError extends AppApiError {}
class ConflictError extends AppApiError {}
class NetworkError extends AppApiError {}
class BackendUnavailableError extends AppApiError {
  type?: "timeout" | "network" | "other"

  constructor(
    message: string,
    options: {
      code: string
      status?: number
      cause?: unknown
      type?: "timeout" | "network" | "other"
    },
  ) {
    super(message, options)
    this.type = options.type
  }
}
class UnknownApiError extends AppApiError {}

export {
  AppApiError,
  AuthError,
  PermissionError,
  ValidationError,
  ConflictError,
  NetworkError,
  BackendUnavailableError,
  UnknownApiError,
}
