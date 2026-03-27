import { useSharedGlobalStatsQuery, useGlobalStatsQuery } from "./use-global-stats-query"

function useJobStatsQuery(group?: string, enabled = true, intervalMs = 5000) {
  const query = useGlobalStatsQuery(group, enabled, intervalMs)
  
  return {
    ...query,
    data: query.data?.stats,
  }
}

function useSharedJobStatsQuery(group?: string, enabled = true) {
  const query = useSharedGlobalStatsQuery(group, enabled)
  
  return {
    ...query,
    data: query.data?.stats,
  }
}

export { useJobStatsQuery, useSharedJobStatsQuery }
