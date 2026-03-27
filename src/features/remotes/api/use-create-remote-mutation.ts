import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"
import type { CreateRemoteInput } from "@/shared/api/contracts/remotes"

function useCreateRemoteMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: (input: CreateRemoteInput) => api.remotes.create(input),
    onSuccess: async (remote) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.remotes(connectionScope) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.remote(connectionScope, remote.name) })
    },
  })
}

export { useCreateRemoteMutation }
