import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useStatsResetMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: (group?: string) => api.jobs.resetStats(group),
    onSuccess: (_, group) => {
      // Invalidate both the specific group stats and the global stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.stats(connectionScope, group),
      })
      if (group) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.stats(connectionScope),
        })
      }
    },
  })
}

export { useStatsResetMutation }
