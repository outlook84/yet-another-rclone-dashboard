import { useQuery } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useRemoteDetailQuery(queryName: string | null) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()
  const remoteName = queryName ?? ""

  return useQuery({
    queryKey: queryKeys.remote(connectionScope, remoteName),
    queryFn: () => api.remotes.get(remoteName),
    enabled: Boolean(remoteName),
  })
}

export { useRemoteDetailQuery }
