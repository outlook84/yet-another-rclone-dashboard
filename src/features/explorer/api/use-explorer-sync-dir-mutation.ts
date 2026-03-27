import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerSyncDirInput {
  srcRemote: string
  srcPath: string
  currentPath: string
  dstRemote: string
  dstPath: string
}

function useExplorerSyncDirMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async (input: ExplorerSyncDirInput) => {
      return api.explorer.syncDir({
        src: { remote: input.srcRemote, path: input.srcPath },
        dst: { remote: input.dstRemote, path: input.dstPath },
      })
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.explorer(connectionScope, variables.srcRemote, variables.currentPath),
      })
      await queryClient.refetchQueries({
        queryKey: queryKeys.jobs(connectionScope),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats(connectionScope),
      })
    },
  })
}

export { useExplorerSyncDirMutation }
