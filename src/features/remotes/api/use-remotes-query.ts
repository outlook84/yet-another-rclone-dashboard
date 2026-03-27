import { useQuery } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useRemotesQuery(enabled = true) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()

  return useQuery({
    queryKey: queryKeys.remotes(connectionScope),
    queryFn: () => api.remotes.list(),
    enabled,
  })
}

export { useRemotesQuery }
