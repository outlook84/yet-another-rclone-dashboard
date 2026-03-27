import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { RcBatchInput } from "@/shared/api/contracts/jobs"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

interface ExplorerBatchInput {
  remote: string
  currentPath: string
  inputs: RcBatchInput[]
}

function useExplorerBatchMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async ({ inputs }: ExplorerBatchInput) => {
      if (inputs.length === 0) return []
      return api.jobs.batch(inputs)
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

export { useExplorerBatchMutation }
