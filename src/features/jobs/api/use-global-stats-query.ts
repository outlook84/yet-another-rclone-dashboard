import { useQuery } from "@tanstack/react-query"
import { useStatsPollingStore } from "@/features/jobs/store/stats-polling-store"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useGlobalStatsQuery(group?: string, enabled = true, intervalMs = 5000) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()

  return useQuery({
    queryKey: queryKeys.combinedStats(connectionScope, group),
    queryFn: () => api.jobs.getCombinedStats(group),
    enabled,
    refetchInterval: intervalMs > 0 ? intervalMs : false,
  })
}

function useSharedGlobalStatsQuery(group?: string, enabled = true) {
  const intervalMs = useStatsPollingStore((state) => state.intervalMs)
  return useGlobalStatsQuery(group, enabled, intervalMs)
}

export { useGlobalStatsQuery, useSharedGlobalStatsQuery }
