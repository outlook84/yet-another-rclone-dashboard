import { QueryClient } from "@tanstack/react-query"
import { AppApiError } from "@/shared/api/contracts/errors"

const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof AppApiError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            return false
          }
        }

        return failureCount < 3
      },
    },
  },
})

export { appQueryClient }
