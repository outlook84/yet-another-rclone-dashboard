import { useQuery } from "@tanstack/react-query"
import { useStatsPollingStore } from "@/features/jobs/store/stats-polling-store"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useTransferredQuery(group?: string, enabled = true, intervalMs = 5000) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()

  return useQuery({
    queryKey: queryKeys.transferred(connectionScope, group),
    queryFn: () => api.jobs.getTransferred(group),
    enabled,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  })
}

function useSharedTransferredQuery(group?: string, enabled = true) {
  const intervalMs = useStatsPollingStore((state) => state.intervalMs)
  return useTransferredQuery(group, enabled, intervalMs)
}

export { useSharedTransferredQuery, useTransferredQuery }
