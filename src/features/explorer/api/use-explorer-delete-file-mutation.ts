import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerDeleteFileInput {
  remote: string
  currentPath: string
  targetPaths: string[]
}

function useExplorerDeleteFileMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async ({ remote, targetPaths }: ExplorerDeleteFileInput) => {
      if (targetPaths.length === 0) {
        return
      }

      if (targetPaths.length === 1) {
        await api.explorer.deleteFile({ remote, path: targetPaths[0] })
        return
      }

      // Use batch for multiple files
      await api.jobs.batch(
        targetPaths.map((path) => ({
          _path: "operations/deletefile",
          remote,
          path,
        }))
      )
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.explorer(connectionScope, variables.remote, variables.currentPath),
      })
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.explorer(connectionScope, variables.remote, ""), "usage"],
      })
    },
  })
}

export { useExplorerDeleteFileMutation }
