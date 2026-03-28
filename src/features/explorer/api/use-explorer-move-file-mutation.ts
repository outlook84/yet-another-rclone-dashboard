import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerMoveItem {
  srcPath: string
  dstPath: string
}

interface ExplorerMoveFileInput {
  srcRemote: string
  currentPath: string
  dstRemote: string
  items: ExplorerMoveItem[]
}

function useExplorerMoveFileMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async (input: ExplorerMoveFileInput) => {
      if (input.items.length === 0) {
        return
      }

      if (input.items.length === 1) {
        return api.explorer.moveFile({
          src: { remote: input.srcRemote, path: input.items[0].srcPath },
          dst: { remote: input.dstRemote, path: input.items[0].dstPath },
        })
      }

      // Use batch for multiple files
      return api.jobs.batch(
        input.items.map((item) => ({
          _path: "operations/movefile",
          srcFs: `${input.srcRemote}:`,
          srcRemote: item.srcPath,
          dstFs: `${input.dstRemote}:`,
          dstRemote: item.dstPath,
        }))
      )
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

export { useExplorerMoveFileMutation }
