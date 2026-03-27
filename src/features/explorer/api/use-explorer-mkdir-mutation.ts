import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerMkdirInput {
  remote: string
  path: string
  name: string
}

function useExplorerMkdirMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async ({ remote, path, name }: ExplorerMkdirInput) => {
      await api.explorer.mkdir({ remote, path }, name)
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.explorer(connectionScope, variables.remote, variables.path),
      })
      await queryClient.invalidateQueries({
        queryKey: [...queryKeys.explorer(connectionScope, variables.remote, ""), "usage"],
      })
    },
  })
}

export { useExplorerMkdirMutation }
