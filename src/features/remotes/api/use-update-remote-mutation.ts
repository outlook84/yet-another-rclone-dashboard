import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"
import type { UpdateRemoteInput } from "@/shared/api/contracts/remotes"

function useUpdateRemoteMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: (input: UpdateRemoteInput) => api.remotes.update(input),
    onSuccess: async (remote) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remotes(connectionScope) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.remote(connectionScope, remote.name) })
    },
  })
}

export { useUpdateRemoteMutation }
