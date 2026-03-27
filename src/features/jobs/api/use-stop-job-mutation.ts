import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useStopJobMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async (jobId: number | string) => {
      await api.jobs.stop(jobId)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.jobs(connectionScope),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats(connectionScope),
      })
    },
  })
}

export { useStopJobMutation }
