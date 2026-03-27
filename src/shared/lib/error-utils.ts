import { BackendUnavailableError } from "@/shared/api/contracts/errors"
import type { AppMessages } from "@/shared/i18n/messages/types"

function toErrorMessage(error: unknown, commonMessages?: AppMessages["common"], fallback = "Unknown error") {
  if (error instanceof Error) {
    if (error instanceof BackendUnavailableError && commonMessages) {
      if (error.type === "timeout") {
        return commonMessages.errorTimeout()
      }
      if (error.type === "network") {
        return commonMessages.errorNetwork()
      }
    }

    const cause = "cause" in error ? (error as { cause?: unknown }).cause : undefined

    if (cause && typeof cause === "object") {
      const apiError = "error" in cause ? cause.error : undefined
      if (typeof apiError === "string" && apiError.trim()) {
        return apiError
      }

      const message = "message" in cause ? cause.message : undefined
      if (typeof message === "string" && message.trim()) {
        return message
      }
    }

    return error.message
  }

  return commonMessages?.unknownError() ?? fallback
}

export { toErrorMessage }
