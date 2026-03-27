import { AppApiError, BackendUnavailableError } from "@/shared/api/contracts/errors"

function shouldRetryExplorerQuery(failureCount: number, error: unknown) {
  if (error instanceof BackendUnavailableError && error.type === "timeout") {
    return false
  }

  if (error instanceof AppApiError) {
    if (error.status === 401 || error.status === 403 || error.status === 404) {
      return false
    }
  }

  return failureCount < 3
}

export { shouldRetryExplorerQuery }
