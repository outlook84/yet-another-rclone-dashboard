import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CreateMountInput } from "@/shared/api/contracts/mounts"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useCreateMountMutation() {
  const api = useAppApi()
  const queryClient = useQueryClient()
  const connectionScope = useConnectionScope()

  return useMutation({
    mutationFn: async (input: CreateMountInput) => {
      await api.mounts.create(input)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.mounts(connectionScope),
      })
    },
  })
}

export { useCreateMountMutation }
