import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useUnmountAllMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async () => {
      await api.mounts.unmountAll()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mounts(connectionScope),
      })
    },
  })
}

export { useUnmountAllMutation }
