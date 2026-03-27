import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useDeleteRemoteMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: (name: string) => api.remotes.delete(name),
    onSuccess: async (_data, name) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remotes(connectionScope) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.remote(connectionScope, name) })
    },
  })
}

export { useDeleteRemoteMutation }
