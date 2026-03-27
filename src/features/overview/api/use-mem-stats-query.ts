import { useGlobalStatsQuery, useSharedGlobalStatsQuery } from "@/features/jobs/api/use-global-stats-query"

function useMemStatsQuery(enabled = true, intervalMs = 5000) {
  const query = useGlobalStatsQuery(undefined, enabled, intervalMs)
  
  return {
    ...query,
    data: query.data?.mem,
  }
}

function useSharedMemStatsQuery(enabled = true) {
  const query = useSharedGlobalStatsQuery(undefined, enabled)
  
  return {
    ...query,
    data: query.data?.mem,
  }
}

export { useMemStatsQuery, useSharedMemStatsQuery }
