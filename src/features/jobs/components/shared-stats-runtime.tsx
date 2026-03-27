import { useEffect } from "react"
import { getCurrentThroughput } from "@/features/jobs/lib/display-utils"
import { useOverviewStore } from "@/features/overview/store/overview-store"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useSharedGlobalStatsQuery } from "@/features/jobs/api/use-global-stats-query"

const OVERVIEW_WINDOW_MS = 5 * 60 * 1000

function SharedStatsRuntime() {
  const connectionScope = useConnectionScope()
  const isValidated = useConnectionStore((state) => Boolean(state.lastValidatedAt && state.lastServerInfo))
  const globalQuery = useSharedGlobalStatsQuery(undefined, isValidated)
  
  const statsData = globalQuery.data?.stats
  const memData = globalQuery.data?.mem
  const dataUpdatedAt = globalQuery.dataUpdatedAt

  const setOverviewScope = useOverviewStore((state) => state.setScope)
  const appendSpeedSample = useOverviewStore((state) => state.appendSpeedSample)
  const setMemStats = useOverviewStore((state) => state.setMemStats)

  useEffect(() => {
    setOverviewScope(connectionScope)
  }, [connectionScope, setOverviewScope])

  useEffect(() => {
    if (!isValidated || !statsData) {
      return
    }

    const activeTransfers = statsData.transferring?.length ?? 0
    const currentThroughput = activeTransfers > 0 ? getCurrentThroughput(statsData) : 0

    appendSpeedSample(currentThroughput, dataUpdatedAt || Date.now(), OVERVIEW_WINDOW_MS)
  }, [appendSpeedSample, isValidated, statsData, dataUpdatedAt])

  useEffect(() => {
    if (!isValidated) {
      setMemStats(null)
      return
    }

    setMemStats(memData ?? null)
  }, [isValidated, memData, setMemStats])

  useEffect(() => {
    setMemStats(null)
  }, [connectionScope, setMemStats])

  return null
}

export { SharedStatsRuntime }
