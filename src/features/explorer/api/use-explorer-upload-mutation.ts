import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerUploadFilesInput {
  remote: string
  path: string
  files: File[]
}

function useExplorerUploadMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async ({ remote, path, files }: ExplorerUploadFilesInput) => {
      await api.explorer.uploadFiles({
        dst: { remote, path },
        files,
      })
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.explorer(connectionScope, variables.remote, variables.path),
      })
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.explorer(connectionScope, variables.remote, ""), "usage"],
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.stats(connectionScope),
      })
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transferred(connectionScope),
      })
    },
  })
}

export { useExplorerUploadMutation }
