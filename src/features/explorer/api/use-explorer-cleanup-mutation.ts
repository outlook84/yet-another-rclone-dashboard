import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"
import type { JobHandle } from "@/shared/api/contracts/explorer"

interface ExplorerCleanupInput {
  remote: string
}

function useExplorerCleanupMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: ({ remote }: ExplorerCleanupInput): Promise<JobHandle | void> =>
      api.explorer.cleanup({ remote, path: "" }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.explorer(connectionScope, variables.remote, ""), "fs-info"],
      })
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.explorer(connectionScope, variables.remote, ""), "usage"],
      })
    },
  })
}

export { useExplorerCleanupMutation }
