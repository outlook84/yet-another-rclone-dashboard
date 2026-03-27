import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerDeleteDirInput {
  remote: string
  currentPath: string
  targetPath: string
}

function useExplorerDeleteDirMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async ({ remote, targetPath }: ExplorerDeleteDirInput) => {
      await api.explorer.deleteDir({ remote, path: targetPath })
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

export { useExplorerDeleteDirMutation }
